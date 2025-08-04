import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, NewOrderItem, PaymentMethod, User, CashRegister } from '@/types';
import { PostgrestError } from '@supabase/supabase-js';

interface OrderData {
  user_id: string;
  cash_register_id: string;
  customer_name?: string | null;
  table_number?: number | null;
  subtotal: number;
  tax: number;
  total: number;
  status: 'open' | 'closed';
}

interface OrderItemData {
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_type: 'food' | 'external_product';
  cash_register_id: string;
  // Campos de desconto
  original_price?: number;
  discount_value?: number;
  discount_id?: string;
}

interface CreatedOrder extends OrderData {
  id: string;
  created_at: string;
  updated_at: string;
}

export const addOrder = async (
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>,
  currentUser: User | null,
  currentCashRegister: CashRegister | null
): Promise<Order> => {
  if (!currentUser) throw new Error('Usuário não autenticado');
  if (!currentCashRegister) throw new Error('Não há caixa aberto');

  const ownerId = currentUser.role === 'employee'
    ? currentUser.owner_id || currentUser.id
    : currentUser.id;

  // CORRIGIDO: usar ownerId para user_id quando for funcionário
  const userIdForOrder = currentUser.role === 'employee' ? ownerId : currentUser.id;

  try {
    // Primeiro, criar a comanda
    const orderData: OrderData = {
      user_id: userIdForOrder,
      cash_register_id: currentCashRegister.id,
      customer_name: order.customer_name,
      table_number: order.table_number,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      status: order.status
    };

    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;
    if (!createdOrder) throw new Error('Erro ao criar comanda: nenhum dado retornado');

    // Depois, criar os itens da comanda
    if (order.items && order.items.length > 0) {
      const orderItems: OrderItemData[] = order.items.map(item => ({
        order_id: createdOrder.id,
        product_id: item.productId,
        product_name: item.product?.name || item.product_name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        total_price: Number(item.totalPrice),
        product_type: item.product_type,
        cash_register_id: currentCashRegister.id,
        // Campos de desconto
        original_price: item.originalPrice || null,
        discount_value: item.discountValue || null,
        discount_id: item.discountId || null
      }));

      console.log('addOrder - itens para inserção:', orderItems);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('addOrder - erro ao inserir itens:', itemsError);
        // Se houver erro ao criar os itens, excluir a comanda para manter consistência
        await supabase.from('orders').delete().eq('id', createdOrder.id);
        throw itemsError;
      }
    }

    // Retornar a comanda com os itens
    return {
      ...createdOrder,
      items: order.items
    } as Order;
  } catch (error) {
    if (error instanceof PostgrestError) {
      throw new Error(`Erro ao criar comanda: ${error.message}`);
    }
    throw error;
  }
};

export const updateOrder = async (id: string, updates: Partial<Order>) => {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.customer_name !== undefined) dbUpdates.customer_name = updates.customer_name;
  if (updates.table_number !== undefined) dbUpdates.table_number = updates.table_number;
  if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
  if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.payment_method !== undefined) dbUpdates.payment_method = updates.payment_method;
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
  // Debug: verificar dados recebidos
  console.log('addItemToOrder - item recebido:', item);
  console.log('addItemToOrder - dados de desconto:', {
    originalPrice: item.originalPrice,
    discountValue: item.discountValue,
    discountId: item.discountId
  });

  // Determinar o tipo de produto
  const isExternalProduct = 'current_stock' in item.product;

  // Dados para inserção
  const insertData = {
    order_id: orderId,
    product_id: item.productId,
    product_name: item.product.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    product_type: isExternalProduct ? 'external_product' : 'food',
    cash_register_id: currentCashRegister?.id || '',
    // Campos de desconto
    original_price: item.originalPrice || null,
    discount_value: item.discountValue || null,
    discount_id: item.discountId || null
  };

  console.log('addItemToOrder - dados para inserção:', insertData);

  // Primeiro, adicionar o item
  const { data, error } = await supabase
    .from('order_items')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error('addItemToOrder - erro na inserção:', error);
    throw error;
  }

  console.log('addItemToOrder - item inserido com sucesso:', data);

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
  payments: Array<{ method: PaymentMethod; amount: number }>,
  currentUser: User,
  currentCashRegister: CashRegister,
  manualDiscount: number = 0
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
    order.order_items.map((item: { product_id: string; quantity: number; product_name: string; unit_price: number; product_type: string }) => ({
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

  // Calcular o total de desconto dos itens
  const totalItemDiscount = order.order_items.reduce((acc, item) => acc + (item.discount_value ? Number(item.discount_value) : 0), 0);
  
  // Total de desconto (itens + manual)
  const totalDiscount = totalItemDiscount + manualDiscount;
  
  // Total final com desconto
  const totalWithDiscount = order.total - manualDiscount;

  // Criar a venda
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      order_id: orderId,
      total: totalWithDiscount, // Usar o total com desconto
      subtotal: order.subtotal,
      tax: order.tax,
      payments: payments,
      user_id: currentUser!.id,
      cash_register_id: currentCashRegister!.id,
      is_direct_sale: false,
      customer_name: order.customer_name,
      total_discount: totalDiscount, // Total de descontos (itens + manual)
      items: order.order_items.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_type: item.product_type || 'food',
        // Campos de desconto
        original_price: item.original_price ?? null,
        discount_value: item.discount_value ?? null,
        discount_id: item.discount_id ?? null
      }))
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // Atualizar o status da comanda e salvar o total_discount
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'closed',
      total_discount: totalDiscount,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (updateError) throw updateError;
};
