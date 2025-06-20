// Core interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'employee';
  owner_id?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost: number;
  supplier?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface FoodIngredient {
  id: string;
  food_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  available: boolean;
  category: string;
  preparation_time: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
  ingredients?: FoodIngredient[];
}

export interface ExternalProduct {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  cost: number;
  current_stock: number;
  min_stock: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: string;
  productId: string;
  product_name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_type: 'food' | 'external_product';
  product?: Product | ExternalProduct;
}

export interface NewOrderItem {
  productId: string;
  product_name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_type: 'food' | 'external_product';
  product: Product | ExternalProduct;
}

export interface Order {
  id: string;
  customer_name?: string;
  table_number?: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'open' | 'closed';
  payment_method?: PaymentMethod;
  user_id: string;
  cash_register_id: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  order_id: string | null;
  total: number;
  subtotal: number;
  tax: number;
  payments: Array<{
    method: PaymentMethod;
    amount: number;
  }>;
  user_id: string;
  cash_register_id: string;
  is_direct_sale: boolean;
  customer_name?: string;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_type: string;
  }>;
  createdAt: string;
}

export interface ServiceTax {
  id: string;
  name: string;
  description?: string;
  percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashRegister {
  id: string;
  owner_id: string;
  opened_at: string;
  closed_at?: string;
  opening_amount: number;
  closing_amount?: number;
  total_sales: number;
  total_expenses: number;
  total_orders: number;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

// Expense interfaces
export interface Expense {
  id: string;
  description: string;
  amount: number;
  type: ExpenseType;
  quantity?: number;
  created_at: string;
  updated_at: string;
  cash_register_id: string;
  user_id: string;
}

export type ExpenseType = 'product_loss' | 'ingredient_loss' | 'other';

export interface NewExpense {
  description: string;
  amount: number;
  type: ExpenseType;
  quantity?: number;
  product_id?: string;
  ingredient_ids?: string[];
  reason?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'pix';

export interface AppContextType {
  currentUser: User | null;
  isEmployee: boolean;
  ingredients: Ingredient[];
  products: Product[];
  externalProducts: ExternalProduct[];
  orders: Order[];
  sales: Sale[];
  expenses: Expense[];
  serviceTaxes: ServiceTax[];
  currentCashRegister: CashRegister | null;
  isLoading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  addItemToOrder: (orderId: string, item: NewOrderItem) => Promise<void>;
  closeOrder: (orderId: string, payments: Array<{ method: PaymentMethod; amount: number }>) => Promise<void>;
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addExternalProduct: (product: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateExternalProduct: (id: string, updates: Partial<ExternalProduct>) => Promise<void>;
  deleteExternalProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => Promise<void>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addExpense: (expense: NewExpense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addServiceTax: (serviceTax: Omit<ServiceTax, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateServiceTax: (id: string, updates: Partial<ServiceTax>) => Promise<void>;
  deleteServiceTax: (id: string) => Promise<void>;
  openCashRegister: (amount: number) => Promise<void>;
  closeCashRegister: (amount: number) => Promise<void>;
  checkCashRegisterAccess: () => boolean;
  updateStock: (itemType: 'ingredient' | 'external_product', itemId: string, quantity: number, reason: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

// Unit conversion types - aligned with unitConversion.ts
export type UnitType = 'weight' | 'volume' | 'length' | 'quantity';

export interface UnitConversion {
  from: string;
  to: string;
  factor: number;
}

export interface UnitCategory {
  type: UnitType;
  units: string[];
  conversions: UnitConversion[];
}

export interface ProductIngredient {
  ingredient_id: string;
  quantity: number;
  unit: string;
}

export interface ProductFormData {
  name: string;
  description: string | null;
  price: number;
  cost: number;
  available: boolean;
  category: string;
  preparation_time: number;
  ingredients: ProductIngredient[];
}
