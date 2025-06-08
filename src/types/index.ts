export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'employee';
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
  category: string;
  price: number;
  cost: number;
  preparationTime?: number;
  available: boolean;
  ingredients?: ProductIngredient[];
  created_at: Date;
  updated_at: Date;
}

export interface ProductIngredient {
  ingredientId: string;
  quantity: number;
  unit?: string;
}

export interface OrderItem {
  id?: string;
  productId: string;
  product: Product | ExternalProduct;
  product_name?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_type?: 'food' | 'external_product';
}

export interface NewOrderItem {
  productId: string;
  product: Product | ExternalProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'open' | 'closed' | 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled';
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
  orderId?: string;
  total: number;
  subtotal: number;
  tax: number;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  userId: string;
  is_direct_sale?: boolean;
  items?: {
    productId: string;
    product_name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  customerName?: string;
}

export interface ServiceTax {
  id: string;
  name: string;
  percentage: number;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashRegister {
  id: string;
  owner_id: string;
  opening_amount: number;
  closing_amount?: number;
  total_sales: number;
  total_orders: number;
  is_open: boolean;
  opened_at: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ExternalProduct {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  current_stock: number;
  min_stock: number;
  cost: number;
  price: number;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CashRegisterSale {
  id: string;
  cash_register_id: string;
  total: number;
  subtotal: number;
  tax: number;
  payment_method: PaymentMethod;
  created_at: Date;
  user_id: string;
  is_direct_sale: boolean;
  items?: any[];
  customer_name?: string;
  order_id?: string;
}
