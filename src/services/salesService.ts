
import { supabase } from '@/integrations/supabase/client';
import { Sale, User, CashRegister } from '@/types';

export const addSale = async (
  sale: Omit<Sale, 'id' | 'createdAt'>,
  currentUser: User,
  currentCashRegister: CashRegister
) => {
  if (!currentUser) throw new Error('Usuário não autenticado');
  if (!currentCashRegister) throw new Error('Não há caixa aberto');

  const ownerId = currentUser.role === 'employee'
    ? (currentUser as any).owner_id || currentUser.id
    : currentUser.id;

  // CORRIGIDO: usar ownerId para user_id quando for funcionário  
  const userIdForSale = currentUser.role === 'employee' ? ownerId : currentUser.id;

  // Converter os itens para o formato esperado pelo Supabase
  const formattedItems = sale.items.map(item => ({
    product_id: item.productId,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    product_type: item.product_type
  }));

  const { data, error } = await supabase
    .from('sales')
    .insert({
      user_id: userIdForSale,
      customer_name: sale.customerName,
      items: formattedItems,
      subtotal: sale.total,
      tax: 0,
      total: sale.total,
      payment_method: sale.paymentMethod,
      cash_register_id: sale.cash_register_id,
      order_id: sale.order_id,
      is_direct_sale: sale.is_direct_sale
    })
    .select()
    .single();

  if (error) throw error;

  // Atualizar o caixa
  const { error: updateError } = await supabase
    .from('cash_registers')
    .update({
      total_sales: currentCashRegister.total_sales + sale.total,
      total_orders: currentCashRegister.total_orders + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentCashRegister.id);

  if (updateError) throw updateError;
};

export const updateSale = async (id: string, updates: Partial<Sale>) => {
  const dbUpdates: any = {};
  if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
  if (updates.items !== undefined) dbUpdates.items = updates.items;
  if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
  if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.cash_register_id !== undefined) dbUpdates.cash_register_id = updates.cash_register_id;
  if (updates.order_id !== undefined) dbUpdates.order_id = updates.order_id;
  if (updates.is_direct_sale !== undefined) dbUpdates.is_direct_sale = updates.is_direct_sale;

  const { error } = await supabase
    .from('sales')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
};

export const deleteSale = async (
  id: string,
  currentUser: User,
  currentCashRegister: CashRegister,
  onSuccess: () => void
) => {
  if (!currentUser || !currentCashRegister) {
    throw new Error('Usuário não autenticado ou caixa não está aberto');
  }

  // Primeiro, buscar os dados da venda antes de excluir
  const { data: sale, error: fetchError } = await supabase
    .from('sales')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Atualizar o caixa (subtrair o valor da venda)
  const { error: updateCashError } = await supabase
    .from('cash_registers')
    .update({
      total_sales: currentCashRegister.total_sales - sale.total,
      total_orders: currentCashRegister.total_orders - 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', sale.cash_register_id);

  if (updateCashError) throw updateCashError;

  // Reverter o consumo de estoque
  const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
  const items = Array.isArray(sale.items) ? sale.items : [];

  console.log('Revertendo estoque para os itens:', items);

  // Reverter o estoque (quantidade negativa para adicionar de volta)
  if (items.length > 0) {
    await processOrderItemsStockConsumption(
      items.map((item: any) => {
        console.log('Processando item para reversão:', item);
        return {
          productId: item.product_id,
          quantity: -(item.quantity), // Quantidade negativa para reverter
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            available: true,
            product_type: item.product_type
          }
        };
      }),
      currentUser.id,
      'Exclusão de Venda'
    );
  }

  // Finalmente, excluir a venda
  const { error: deleteError } = await supabase
    .from('sales')
    .delete()
    .eq('id', id)
    .eq('cash_register_id', currentCashRegister.id);

  if (deleteError) throw deleteError;

  // Chamar callback de sucesso
  onSuccess();
};
