
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Employee {
  id: string;
  name: string;
  owner_id: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  cost: number;
  current_stock: number;
  min_stock: number;
  supplier?: string;
  owner_id: string;
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
  category?: string;
  preparation_time?: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalProduct {
  id: string;
  name: string;
  description?: string;
  brand?: string;
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
  product_name?: string;
  product?: Product | ExternalProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  order_id?: string;
  cash_register_id?: string;
  product_type?: string;
  created_at?: string;
}

export interface NewOrderItem {
  productId: string;
  product: Product | ExternalProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerName?: string;
  tableNumber?: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'open' | 'closed';
  paymentMethod?: PaymentMethod;
  userId: string;
  cash_register_id?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface CashRegister {
  id: string;
  owner_id: string;
  opening_amount: number;
  closing_amount?: number;
  total_sales: number;
  total_cost: number;
  total_orders: number;
  is_open: boolean;
  opened_at: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
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

export type PaymentMethod = 'cash' | 'card' | 'pix';
export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'units';

export interface AppContextType {
  // User data
  currentUser: User | Employee | null;
  isEmployee: boolean;
  
  // Data
  ingredients: Ingredient[];
  products: Product[];
  externalProducts: ExternalProduct[];
  orders: Order[];
  sales: Sale[];
  serviceTaxes: ServiceTax[];
  currentCashRegister: CashRegister | null;
  
  // Loading states
  isLoading: boolean;
  
  // Methods
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
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
  openCashRegister: (amount: number) => Promise<void>;
  closeCashRegister: (amount: number) => Promise<void>;
  checkCashRegisterAccess: () => boolean;
  refreshData: () => Promise<void>;
}
