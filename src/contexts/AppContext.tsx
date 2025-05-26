import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Ingredient, Product, Order, Sale } from '@/types';

interface AppContextType {
  currentUser: User | null;
  ingredients: Ingredient[];
  products: Product[];
  orders: Order[];
  sales: Sale[];
  setCurrentUser: (user: User | null) => void;
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'lastUpdated'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: '1',
    name: 'Admin User',
    email: 'admin@restaurant.com',
    role: 'admin',
    createdAt: new Date()
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    {
      id: '1',
      name: 'Tomate',
      unit: 'kg',
      currentStock: 15,
      minStock: 5,
      cost: 8.50,
      supplier: 'Hortifruti Central',
      lastUpdated: new Date()
    },
    {
      id: '2',
      name: 'Queijo Mussarela',
      unit: 'kg',
      currentStock: 8,
      minStock: 3,
      cost: 25.00,
      supplier: 'Laticínios Vale',
      lastUpdated: new Date()
    },
    {
      id: '3',
      name: 'Massa de Pizza',
      unit: 'unidade',
      currentStock: 20,
      minStock: 10,
      cost: 2.50,
      lastUpdated: new Date()
    }
  ]);

  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Pizza Margherita',
      category: 'Pizza',
      price: 35.90,
      description: 'Pizza clássica com tomate, mussarela e manjericão',
      ingredients: [
        { ingredientId: '1', quantity: 0.2 },
        { ingredientId: '2', quantity: 0.15 },
        { ingredientId: '3', quantity: 1 }
      ],
      available: true,
      preparationTime: 15
    }
  ]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const addIngredient = (ingredient: Omit<Ingredient, 'id' | 'lastUpdated'>) => {
    const newIngredient: Ingredient = {
      ...ingredient,
      id: Date.now().toString(),
      lastUpdated: new Date()
    };
    setIngredients(prev => [...prev, newIngredient]);
  };

  const updateIngredient = (id: string, ingredient: Partial<Ingredient>) => {
    setIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, ...ingredient, lastUpdated: new Date() } : ing
    ));
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString()
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (id: string, product: Partial<Product>) => {
    setProducts(prev => prev.map(prod => 
      prod.id === id ? { ...prod, ...product } : prod
    ));
  };

  const addOrder = (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newOrder: Order = {
      ...order,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setOrders(prev => [...prev, newOrder]);
  };

  const updateOrder = (id: string, order: Partial<Order>) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === id) {
        const updatedOrder = { ...ord, ...order, updatedAt: new Date() };
        
        // Se a comanda foi marcada como "paid", criar uma venda automaticamente
        if (order.status === 'paid' && ord.status !== 'paid') {
          const newSale: Sale = {
            id: Date.now().toString(),
            orderId: id,
            total: updatedOrder.total,
            paymentMethod: updatedOrder.paymentMethod || 'cash',
            createdAt: new Date(),
            userId: updatedOrder.userId
          };
          setSales(prev => [...prev, newSale]);
          
          // Atualizar estoque dos ingredientes
          updatedOrder.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              product.ingredients.forEach(productIngredient => {
                updateIngredient(productIngredient.ingredientId, {
                  currentStock: Math.max(0, 
                    ingredients.find(ing => ing.id === productIngredient.ingredientId)?.currentStock || 0 
                    - (productIngredient.quantity * item.quantity)
                  )
                });
              });
            }
          });
        }
        
        return updatedOrder;
      }
      return ord;
    }));
  };

  const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const newSale: Sale = {
      ...sale,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setSales(prev => [...prev, newSale]);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      ingredients,
      products,
      orders,
      sales,
      setCurrentUser,
      addIngredient,
      updateIngredient,
      addProduct,
      updateProduct,
      addOrder,
      updateOrder,
      addSale
    }}>
      {children}
    </AppContext.Provider>
  );
};
