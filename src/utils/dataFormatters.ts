
import { Order, Sale, PaymentMethod } from '@/types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatOrders = (ordersData: any[]): Order[] => {
  return ordersData.map(order => ({
    id: order.id,
    customerName: order.customer_name,
    tableNumber: order.table_number,
    items: (order.order_items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      product_type: item.product_type
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    status: order.status as 'open' | 'closed',
    paymentMethod: order.payment_method as PaymentMethod,
    userId: order.user_id,
    cash_register_id: order.cash_register_id,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  }));
};

export const formatSales = (salesData: any[]): Sale[] => {
  return salesData.map(sale => ({
    id: sale.id,
    items: Array.isArray(sale.items) ? (sale.items as any[]).map((item: any) => ({
      id: item.id || '',
      productId: item.productId || item.product_id || '',
      product_name: item.product_name || item.name || '',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || item.unit_price || 0,
      totalPrice: item.totalPrice || item.total_price || 0,
      product_type: item.product_type || 'food'
    })) : [],
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    paymentMethod: sale.payment_method as PaymentMethod,
    customerName: sale.customer_name,
    userId: sale.user_id,
    cash_register_id: sale.cash_register_id,
    order_id: sale.order_id,
    is_direct_sale: sale.is_direct_sale,
    createdAt: sale.created_at
  }));
};
