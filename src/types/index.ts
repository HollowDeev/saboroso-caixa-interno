
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  createdAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  cost: number;
  supplier?: string;
  lastUpdated: Date;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  ingredients: {
    ingredientId: string;
    quantity: number;
  }[];
  image?: string;
  available: boolean;
  preparationTime: number; // em minutos
}

export interface OrderItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  customerName?: string;
  tableNumber?: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'pix';
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
