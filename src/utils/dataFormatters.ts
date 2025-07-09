import { Order, Sale, PaymentMethod, OrderItem } from '@/types';

interface RawSaleItem {
  id?: string;
  product_id?: string;
  productId?: string;
  product_name?: string;
  name?: string;
  quantity?: number | string;
  unit_price?: number | string;
  unitPrice?: number | string;
  total_price?: number | string;
  totalPrice?: number | string;
  product_type?: string;
}

interface RawSale {
  id: string;
  items?: RawSaleItem[];
  subtotal?: number | string;
  tax?: number | string;
  total?: number | string;
  payments?: Array<{ method: PaymentMethod; amount: number | string }>;
  customer_name?: string;
  user_id: string;
  cash_register_id: string;
  order_id?: string;
  is_direct_sale: boolean;
  created_at: string;
}

interface RawOrder {
  id: string;
  customer_name?: string;
  table_number?: string | number;
  order_items?: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_type: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'open' | 'closed';
  payment_method: PaymentMethod;
  user_id: string;
  cash_register_id: string;
  created_at: string;
  updated_at: string;
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatOrders = (ordersData: RawOrder[]): Order[] => {
  return ordersData.map(order => ({
    id: order.id,
    customer_name: order.customer_name,
    table_number: Number(order.table_number) || undefined,
    items: (order.order_items || []).map(item => ({
      id: item.id,
      productId: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      product_type: item.product_type as 'food' | 'external_product'
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    status: order.status,
    user_id: order.user_id,
    cash_register_id: order.cash_register_id,
    created_at: order.created_at,
    updated_at: order.updated_at
  }));
};

export const formatSales = (salesData: RawSale[]): Sale[] => {
  return salesData.map(sale => ({
    id: sale.id,
    items: Array.isArray(sale.items) ? sale.items.map((item: RawSaleItem) => ({
      id: item.id || '',
      product_id: item.productId || item.product_id || '',
      product_name: item.product_name || item.name || '',
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unitPrice || item.unit_price) || 0,
      total_price: Number(item.totalPrice || item.total_price) || 0,
      product_type: item.product_type || 'food'
    })) : [],
    subtotal: Number(sale.subtotal) || 0,
    tax: Number(sale.tax) || 0,
    total: Number(sale.total) || 0,
    payments: Array.isArray(sale.payments) ? sale.payments.map(p => ({
      method: p.method,
      amount: Number(p.amount) || 0
    })) : [],
    customer_name: sale.customer_name, // Corrigido para snake_case
    user_id: sale.user_id,
    cash_register_id: sale.cash_register_id,
    order_id: sale.order_id || '',
    is_direct_sale: sale.is_direct_sale,
    createdAt: sale.created_at
  }));
};
