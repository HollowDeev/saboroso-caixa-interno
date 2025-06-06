export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  created_at: Date;
  updated_at: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  cost: number;
  supplier?: string;
  lastUpdated: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  category?: string;
  available: boolean;
  ingredients: ProductIngredient[];
  preparationTime?: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductIngredient {
  ingredientId: string;
  quantity: number;
}

export interface OrderItem {
  id?: string;
  cash_register_id?: string;
  order_id?: string;
  product_name?: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_cost?: number;
  profit?: number;
  sale_date?: Date;
  created_at?: Date;
}

// Interface temporária para criação de novos itens
export interface NewOrderItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'pix';

export interface Order {
  id: string;
  customerName?: string;
  tableNumber?: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Sale {
  id: string;
  orderId: string;
  total: number;
  paymentMethod: 'cash' | 'card' | 'pix';
  createdAt: Date;
  userId: string;
}

export interface Analytics {
  period: 'day' | 'week' | 'month';
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  ingredientUsage: {
    ingredientId: string;
    name: string;
    used: number;
    remaining: number;
  }[];
}

export interface ServiceTax {
  id: string;
  name: string;
  description?: string;
  percentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashRegister {
  id: string;
  owner_id: string;
  opened_at: string;
  closed_at?: string;
  opening_amount: number;
  closing_amount?: number;
  total_sales: number;
  total_orders: number;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashRegisterSale {
  id: string;
  cash_register_id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_cost: number;
  profit: number;
  sale_date: string;
  created_at: string;
}
