import { supabase } from '@/integrations/supabase/client';
import { Sale, User, CashRegister, PaymentMethod } from '@/types';
import { Database } from '@/integrations/supabase/types';

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_type: string;
}

interface Payment {
  method: PaymentMethod;
  amount: number;
}

// Define a type alias for the sales insert type
type SalesInsert = Database['public']['Tables']['sales']['Insert'];

export const addSale = async (
  sale: Omit<Sale, 'id' | 'createdAt'>,
  currentUser: User,
  currentCashRegister: CashRegister
) => {
  if (!currentUser) throw new Error('Usuário não autenticado');
  if (!currentCashRegister) throw new Error('Não há caixa aberto');

  const ownerId = currentUser.role === 'employee'
    ? currentUser.owner_id || currentUser.id
    : currentUser.id;

  // CORRIGIDO: usar ownerId para user_id quando for funcionário
  const userIdForSale = currentUser.role === 'employee' ? ownerId : currentUser.id;

  // Converter os itens para o formato esperado pelo Supabase
  const formattedItems: SaleItem[] = sale.items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    total_price: Number(item.total_price),
    product_type: item.product_type,
    // Novos campos de desconto
    original_price: item.original_price ?? null,
    discount_value: item.discount_value ?? null,
    discount_id: item.discount_id ?? null
  }));

  // Calcular o total de desconto da venda
  const totalDiscount = sale.items.reduce((acc, item) => acc + (item.discount_value ? Number(item.discount_value) : 0), 0);

  const formattedPayments: Payment[] = sale.payments.map(p => ({
    method: p.method,
    amount: Number(p.amount)
  }));

  // Processar o consumo de estoque
  const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
  console.log('Iniciando processamento de estoque para venda direta:', {
    items: formattedItems,
    userId: currentUser.id
  });

  const stockResult = await processOrderItemsStockConsumption(
    sale.items.map(item => ({
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
    'Venda Direta Registrada'
  );

  console.log('Resultado do processamento de estoque:', stockResult);

  // Se houver erros no processamento do estoque, não permitir a venda
  if (!stockResult.success) {
    const stockErrors = stockResult.errors.join('\n');
    console.error('Erros no processamento de estoque:', stockErrors);
    
    // Se houver erros de estoque insuficiente, mostrar mensagem específica
    if (stockResult.errors.some(error => error.includes('Estoque insuficiente'))) {
      throw new Error(`Não é possível completar a venda: Estoque insuficiente\n\n${stockErrors}`);
    } else {
      throw new Error(`Erro ao processar estoque:\n\n${stockErrors}`);
    }
  }

  const { id: cash_register_id } = currentCashRegister;

  const { data, error } = await supabase
    .from('sales')
    .insert<Database['public']['Tables']['sales']['Insert']>({
      user_id: userIdForSale,
      customer_name: sale.customer_name,
      items: formattedItems,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      total: Number(sale.total),
      payments: formattedPayments,
      cash_register_id: cash_register_id,
      order_id: sale.order_id || null,
      is_direct_sale: sale.is_direct_sale,
      total_discount: totalDiscount, // novo campo
    })
    .select()
    .single();

  if (error) throw error;

  // Atualizar o caixa
  const { error: updateError } = await supabase
    .from('cash_registers')
    .update({
      total_sales: currentCashRegister.total_sales + Number(sale.total),
      total_orders: currentCashRegister.total_orders + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentCashRegister.id);

  if (updateError) throw updateError;

  return data;
};

export const updateSale = async (id: string, updates: Partial<Sale>) => {
  const dbUpdates: any = {};
  if (updates.customer_name !== undefined) dbUpdates.customer_name = updates.customer_name;
  if (updates.items !== undefined) dbUpdates.items = updates.items;
  if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
  if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.payments !== undefined) dbUpdates.payments = updates.payments;
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
