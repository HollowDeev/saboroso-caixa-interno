
import { supabase } from '@/integrations/supabase/client';
import { Order, NewOrderItem, PaymentMethod, User, CashRegister } from '@/types';

export const addOrder = async (
  order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
  currentUser: User,
  currentCashRegister: CashRegister | null
) => {
  const ownerId = currentUser?.role === 'employee'
    ? (currentUser as any).owner_id || currentUser.id
    : currentUser?.id;

  // CORRIGIDO: usar ownerId para user_id quando for funcionário
  const userIdForOrder = currentUser?.role === 'employee' ? ownerId : currentUser?.id;

  // Primeiro, criar a comanda
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: userIdForOrder,
      cash_register_id: currentCashRegister?.id || '',
      customer_name: order.customerName,
      table_number: order.tableNumber,
      subtotal: order.subtotal,
      tax: 0,
      total: order.subtotal,
      status: order.status,
      payment_method: order.paymentMethod
    }])
    .select()
    .single();

  if (orderError) throw orderError;

  // Depois, criar os itens da comanda
  if (order.items && order.items.length > 0) {
    const orderItems = order.items.map(item => ({
      order_id: orderData.id,
      product_id: item.productId,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      product_type: 'current_stock' in item.product ? 'external_product' : 'food',
      cash_register_id: currentCashRegister?.id || ''
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;
  }
};

export const updateOrder = async (id: string, updates: Partial<Order>) => {
  const dbUpdates: any = {};
  if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
  if (updates.tableNumber !== undefined) dbUpdates.table_number = updates.tableNumber;
  if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
  if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.cash_register_id !== undefined) dbUpdates.cash_register_id = updates.cash_register_id;

  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
};

export const addItemToOrder = async (
  orderId: string,
  item: NewOrderItem,
  currentCashRegister: CashRegister | null
) => {
  // Determinar o tipo de produto
  const isExternalProduct = 'current_stock' in item.product;

  // Primeiro, adicionar o item
  const { data, error } = await supabase
    .from('order_items')
    .insert([{
      order_id: orderId,
      product_id: item.productId,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      product_type: isExternalProduct ? 'external_product' : 'food',
      cash_register_id: currentCashRegister?.id || ''
    }])
    .select()
    .single();

  if (error) throw error;

  // Buscar todos os itens da comanda para recalcular os totais
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (itemsError) throw itemsError;

  // Calcular novos totais
  const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
  const total = subtotal; // Removida a taxa automática

  // Atualizar os totais da comanda
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      subtotal,
      tax: 0,
      total,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (updateError) throw updateError;
};

export const closeOrder = async (
  orderId: string,
  paymentMethod: PaymentMethod,
  currentUser: User,
  currentCashRegister: CashRegister
) => {
  // Buscar a comanda e seus itens
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  // Processar o consumo de estoque
  const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
  const stockResult = await processOrderItemsStockConsumption(
    order.order_items.map((item: any) => ({
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
    currentUser!.id,
    'Fechamento de Comanda'
  );

  // Se há erros críticos de estoque, mostrar aviso mas permitir continuar
  if (!stockResult.success && stockResult.errors.some(error => error.includes('Estoque insuficiente'))) {
    const proceed = window.confirm(
      `Atenção: Alguns itens têm estoque insuficiente:\n\n${stockResult.errors.join('\n')}\n\nDeseja continuar mesmo assim?`
    );

    if (!proceed) {
      throw new Error('Operação cancelada pelo usuário');
    }
  }

  // Criar a venda
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      order_id: orderId,
      total: order.total,
      subtotal: order.total,
      tax: 0,
      payment_method: paymentMethod,
      user_id: currentUser!.id,
      cash_register_id: currentCashRegister!.id,
      is_direct_sale: false,
      customer_name: order.customer_name,
      items: order.order_items.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_type: item.product_type || 'food'
      }))
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // Atualizar o status da comanda
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'closed',
      payment_method: paymentMethod,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (updateError) throw updateError;
};
