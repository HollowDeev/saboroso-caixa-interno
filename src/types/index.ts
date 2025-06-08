
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
  type?: 'food' | 'external_product';
  created_at?: Date;
  updated_at?: Date;
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
  cashRegisterId?: string;
}

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface SaleItem {
  productId: string;
  product_name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_type?: 'food' | 'external_product';
}

export interface DatabaseSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_type: 'food' | 'external_product';
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
  isDirectSale?: boolean;
  is_direct_sale?: boolean;
  items: SaleItem[];
  customerName?: string;
  cashRegisterId?: string;
}

export interface SupabaseSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_type: 'food' | 'external_product';
}

export interface SupabaseSale {
  id: string;
  order_id?: string;
  total: number;
  subtotal: number;
  tax: number;
  payment_method: PaymentMethod;
  created_at: string;
  user_id: string;
  is_direct_sale: boolean;
  items: SupabaseSaleItem[];
  customer_name?: string;
  cash_register_id: string;
}

export interface DatabaseSale {
  id: string;
  order_id?: string;
  total: number;
  subtotal: number;
  tax: number;
  payment_method: PaymentMethod;
  created_at: string;
  user_id: string;
  is_direct_sale: boolean;
  items: DatabaseSaleItem[];
  customer_name?: string;
  cash_register_id: string;
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
  opened_at: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  current_stock: number;
  min_stock: number;
  brand?: string;
  owner_id: string;
  type?: 'external_product';
  category?: string;
  available?: boolean;
  created_at?: string;
  updated_at?: string;
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

export interface Database {
  public: {
    Tables: {
      sales: {
        Row: {
          id: string;
          order_id?: string;
          total: number;
          subtotal: number;
          tax: number;
          payment_method: PaymentMethod;
          created_at: string;
          user_id: string;
          is_direct_sale: boolean;
          items: Json;
          customer_name?: string;
          cash_register_id: string;
        };
        Insert: {
          id?: string;
          order_id?: string;
          total: number;
          subtotal: number;
          tax: number;
          payment_method: PaymentMethod;
          created_at?: string;
          user_id: string;
          is_direct_sale: boolean;
          items: Json;
          customer_name?: string;
          cash_register_id: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          total?: number;
          subtotal?: number;
          tax?: number;
          payment_method?: PaymentMethod;
          created_at?: string;
          user_id?: string;
          is_direct_sale?: boolean;
          items?: Json;
          customer_name?: string;
          cash_register_id?: string;
        };
      };
    };
  };
}
