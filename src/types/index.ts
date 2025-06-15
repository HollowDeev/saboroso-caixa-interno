export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'employee';
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
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

export interface FoodIngredient {
  id: string;
  food_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalProduct {
  id: string;
  name: string;
  description: string;
  cost: number;
  price: number;
  current_stock: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_type: 'food' | 'external_product';
}

export interface NewOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product_type: 'food' | 'external_product';
}

export interface Order {
  id: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  userId: string;
  cash_register_id: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'card' | 'pix';

export interface Sale {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  userId: string;
  cash_register_id: string;
  order_id?: string;
  is_direct_sale: boolean;
  createdAt: string;
}

export interface ServiceTax {
  id: string;
  name: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CashRegister {
  id: string;
  owner_id: string;
  opening_amount: number;
  closing_amount: number;
  is_open: boolean;
  opened_at: string;
  closed_at: string;
  total_sales: number;
  total_orders: number;
  created_at: string;
  updated_at: string;
  total_expenses: number;
}

export interface AppContextType {
  currentUser: User | null;
  isEmployee: boolean;
  ingredients: Ingredient[];
  products: Product[];
  externalProducts: ExternalProduct[];
  orders: Order[];
  sales: Sale[];
  serviceTaxes: ServiceTax[];
  currentCashRegister: CashRegister | null;
  isLoading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  addItemToOrder: (orderId: string, item: NewOrderItem) => Promise<void>;
  closeOrder: (orderId: string, paymentMethod: PaymentMethod) => Promise<void>;
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
  addServiceTax: (serviceTax: Omit<ServiceTax, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateServiceTax: (id: string, updates: Partial<ServiceTax>) => Promise<void>;
  deleteServiceTax: (id: string) => Promise<void>;
  openCashRegister: (amount: number) => Promise<void>;
  closeCashRegister: (amount: number) => Promise<void>;
  checkCashRegisterAccess: () => boolean;
  updateStock: (itemType: 'ingredient' | 'external_product', itemId: string, quantity: number, reason: string) => Promise<void>;
  refreshData: () => void;
  expenses: Expense[];
  addExpense: (expense: NewExpense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

// Import expense types from expense.ts
export { Expense, NewExpense, ExpenseType } from './expense';
