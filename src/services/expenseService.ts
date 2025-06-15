
import { supabase } from '@/integrations/supabase/client';
import { Expense, NewExpense, User, CashRegister, Product, ExternalProduct } from '@/types';

export const addExpense = async (
  expense: NewExpense,
  currentUser: User,
  currentCashRegister: CashRegister,
  products: Product[],
  externalProducts: ExternalProduct[]
) => {
  if (!currentUser) throw new Error('Usuário não autenticado');
  if (!currentCashRegister) throw new Error('Não há caixa aberto');

  const ownerId = currentUser.role === 'employee'
    ? (currentUser as any).owner_id || currentUser.id
    : currentUser.id;

  const userIdForExpense = currentUser.role === 'employee' ? ownerId : currentUser.id;

  let calculatedAmount = expense.amount;

  // Calcular valor automático baseado no tipo
  if (expense.type === 'product_loss' && expense.product_id && expense.quantity) {
    const externalProduct = externalProducts.find(p => p.id === expense.product_id);
    if (externalProduct) {
      calculatedAmount = externalProduct.cost * expense.quantity;
    }
  } else if (expense.type === 'ingredient_loss' && expense.ingredient_ids && expense.quantity) {
    // Para ingredientes, calcular custo total dos ingredientes de uma comida
    const food = products.find(p => p.id === expense.product_id);
    if (food && food.ingredients) {
      calculatedAmount = food.cost * expense.quantity;
    }
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userIdForExpense,
      cash_register_id: expense.cash_register_id || currentCashRegister.id,
      type: expense.type,
      product_id: expense.product_id,
      ingredient_ids: expense.ingredient_ids,
      description: expense.description,
      amount: calculatedAmount,
      quantity: expense.quantity,
      reason: expense.reason
    })
    .select()
    .single();

  if (error) throw error;

  // Atualizar estoque se for perda de produto
  if (expense.type === 'product_loss' && expense.product_id && expense.quantity) {
    const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
    
    await processOrderItemsStockConsumption(
      [{
        productId: expense.product_id,
        quantity: expense.quantity,
        product: {
          id: expense.product_id,
          name: expense.description,
          price: 0,
          available: true,
          product_type: 'external_product'
        }
      }],
      currentUser.id,
      `Perda/Consumo: ${expense.reason || expense.description}`
    );
  }

  return data;
};

export const updateExpense = async (id: string, updates: Partial<Expense>) => {
  const dbUpdates: any = {};
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
  if (updates.reason !== undefined) dbUpdates.reason = updates.reason;

  const { error } = await supabase
    .from('expenses')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
};

export const deleteExpense = async (
  id: string,
  currentUser: User,
  currentCashRegister: CashRegister,
  onSuccess: () => void
) => {
  if (!currentUser || !currentCashRegister) {
    throw new Error('Usuário não autenticado ou caixa não está aberto');
  }

  // Buscar dados da despesa antes de excluir
  const { data: expense, error: fetchError } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Atualizar o caixa (subtrair o valor da despesa)
  const { error: updateCashError } = await supabase
    .from('cash_registers')
    .update({
      total_expenses: currentCashRegister.total_expenses - expense.amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', expense.cash_register_id);

  if (updateCashError) throw updateCashError;

  // Excluir a despesa
  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('cash_register_id', currentCashRegister.id);

  if (deleteError) throw deleteError;

  onSuccess();
};
