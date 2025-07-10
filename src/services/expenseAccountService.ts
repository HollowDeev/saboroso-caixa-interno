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
export async function addExpenseAccountItems(expenseAccountId: string, items: Array<{ product_id: string, product_type: string, quantity: number, unit_price: number, product_name: string }>) {
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