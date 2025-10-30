import { supabase } from '@/integrations/supabase/client';

export async function getOpenExpenseAccount(employeeProfileId: string) {
  const { data, error } = await supabase
    .from('expense_accounts')
    .select('*')
    .eq('employee_profile_id', employeeProfileId)
    .eq('status', 'open')
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
}

export async function openExpenseAccount(ownerId: string, employeeProfileId: string) {
  const { data, error } = await supabase
    .from('expense_accounts')
    .insert({ owner_id: ownerId, employee_profile_id: employeeProfileId, status: 'open' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getExpenseAccountItems(expenseAccountId: string) {
  const { data, error } = await supabase
    .from('expense_account_items')
    .select('*')
    .eq('expense_account_id', expenseAccountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// items: [{ product_id, product_type, quantity, unit_price, product_name }]
export async function addExpenseAccountItems(expenseAccountId: string, items: Array<{ product_id: string, product_type: string, quantity: number, unit_price: number, product_name: string }>, userId?: string) {
  // Remover do estoque antes de inserir
  if (userId) {
    const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
    const stockResult = await processOrderItemsStockConsumption(
      items.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.unit_price,
          available: true,
          product_type: item.product_type
        }
      })),
      userId,
      'Consumo por conta de despesa'
    );
    if (!stockResult.success) {
      const stockErrors = stockResult.errors.join('\n');
      throw new Error(`Erro ao processar estoque:\n${stockErrors}`);
    }
  }
  const insertData = items.map(item => ({
    expense_account_id: expenseAccountId,
    product_id: item.product_id,
    product_type: item.product_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    product_name: item.product_name,
  }));
  const { data, error } = await supabase
    .from('expense_account_items')
    .insert(insertData)
    .select();
  if (error) throw error;
  return data;
}

export async function contestExpenseAccountItem(itemId: string, message: string) {
  const updateObj = message
    ? { contested: true, contest_message: message }
    : { contested: false, contest_message: null };
  const { error } = await supabase
    .from('expense_account_items')
    .update(updateObj)
    .eq('id', itemId);
  if (error) throw error;
  return true;
}

// Função para adicionar pagamento parcial
export async function addPartialPayment(expenseAccountId: string, amount: number) {
  // Primeiro, buscar a conta atual para obter os pagamentos existentes
  const { data: account, error: fetchError } = await supabase
    .from('expense_accounts')
    .select('partial_payments')
    .eq('id', expenseAccountId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Criar novo pagamento
  const newPayment = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    amount: amount
  };
  
  // Adicionar ao array de pagamentos existentes
  const currentPayments = account?.partial_payments || [];
  const updatedPayments = [...currentPayments, newPayment];
  
  // Atualizar a conta com o novo pagamento
  const { error: updateError } = await supabase
    .from('expense_accounts')
    .update({ partial_payments: updatedPayments })
    .eq('id', expenseAccountId);
  
  if (updateError) throw updateError;
  return newPayment;
}

// Função para calcular o total pago em pagamentos parciais
export function calculateTotalPaid(partialPayments: any[]): number {
  if (!partialPayments || !Array.isArray(partialPayments)) return 0;
  return partialPayments.reduce((total, payment) => total + (payment.amount || 0), 0);
}

// Função para calcular o valor restante da conta
export function calculateRemainingAmount(totalItems: number, totalPaid: number): number {
  return Math.max(0, totalItems - totalPaid);
}

// Função para remover pagamento parcial
export async function removePartialPayment(expenseAccountId: string, paymentId: string) {
  // Primeiro, buscar a conta atual para obter os pagamentos existentes
  const { data: account, error: fetchError } = await supabase
    .from('expense_accounts')
    .select('partial_payments')
    .eq('id', expenseAccountId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Remover o pagamento do array
  const currentPayments = account?.partial_payments || [];
  const updatedPayments = currentPayments.filter((payment: any) => payment.id !== paymentId);
  
  // Atualizar a conta com os pagamentos atualizados
  const { error: updateError } = await supabase
    .from('expense_accounts')
    .update({ partial_payments: updatedPayments })
    .eq('id', expenseAccountId);
  
  if (updateError) throw updateError;
  return true;
} 

// ---------- Advances (Vales) related helpers ----------

export type ExpenseAccountAdvance = {
  id: string;
  expense_account_id: string;
  employee_id: string;
  amount: number;
  reason: string;
  note?: string | null;
  created_at: string;
  created_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export async function listAdvances(expenseAccountId: string): Promise<ExpenseAccountAdvance[]> {
  const res = await supabase
    .from<any, any>('expense_account_advances')
    .select('*')
    .eq('expense_account_id', expenseAccountId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (res.error) throw res.error;
  return (res.data as ExpenseAccountAdvance[]) || [];
}

export async function createAdvance(params: { expenseAccountId: string; employeeId?: string | null; amount: number; reason?: string; createdBy?: string | null; }) {
  const { expenseAccountId, employeeId = null, amount, reason = null, createdBy = null } = params;
  if (!expenseAccountId) throw new Error('expenseAccountId is required');
  if (!amount || amount <= 0) throw new Error('amount must be greater than zero');

  const insert = {
    expense_account_id: expenseAccountId,
    employee_id: employeeId,
    amount: Number(Number(amount).toFixed(2)),
    reason: reason,
    created_by: createdBy,
  };

  const res = await supabase
    .from<any, any>('expense_account_advances')
    .insert(insert)
    .select()
    .single();
  if (res.error) throw res.error;
  return res.data as ExpenseAccountAdvance;
}

export async function deleteAdvance(advanceId: string, deletedBy?: string | null) {
  if (!advanceId) throw new Error('advanceId is required');
  const res = await supabase
    .from<any, any>('expense_account_advances')
    .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy || null })
    .eq('id', advanceId)
    .is('deleted_at', null)
    .select()
    .single();
  if (res.error) throw res.error;
  return res.data as ExpenseAccountAdvance;
}

export async function getAdvancesTotal(expenseAccountId: string): Promise<number> {
  const advances = await listAdvances(expenseAccountId);
  return advances.reduce((s, a) => s + (a.amount || 0), 0);
}