import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Ingredient, Product, Order, Sale, ServiceTax } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useCashRegister } from '@/hooks/useCashRegister';

interface AppContextType {
  currentUser: User | null;
  ingredients: Ingredient[];
  products: Product[];
  orders: Order[];
  sales: Sale[];
  serviceTaxes: ServiceTax[];
  setCurrentUser: (user: User | null) => void;
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'lastUpdated'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  updateSale: (id: string, sale: Partial<Sale>) => void;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  addServiceTax: (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateServiceTax: (id: string, tax: Partial<ServiceTax>) => void;
  deleteServiceTax: (id: string) => void;
  // Cash register methods
  currentCashRegister: any;
  openCashRegister: (amount: number) => Promise<any>;
  closeCashRegister: (amount: number) => Promise<void>;
  checkCashRegisterAccess: () => boolean;
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

  const { currentCashRegister, openCashRegister, closeCashRegister } = useCashRegister();

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
  const [serviceTaxes, setServiceTaxes] = useState<ServiceTax[]>([]);

  const checkCashRegisterAccess = () => {
    return currentUser?.role === 'admin';
  };

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

  const calculateOrderTotal = (subtotal: number) => {
    const activeTaxes = serviceTaxes.filter(tax => tax.isActive);
    const taxesTotal = activeTaxes.reduce((sum, tax) => sum + (subtotal * (tax.percentage / 100)), 0);
    return { subtotal, taxesTotal, total: subtotal + taxesTotal };
  };

  const saveSaleToCashRegister = async (order: Order) => {
    if (!currentCashRegister) return;

    try {
      // Calcular custo total dos produtos
      const salesData = order.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const productCost = product ? product.ingredients.reduce((cost, ingredient) => {
          const ing = ingredients.find(i => i.id === ingredient.ingredientId);
          return cost + (ing ? ing.cost * ingredient.quantity : 0);
        }, 0) : 0;

        return {
          cash_register_id: currentCashRegister.id,
          order_id: order.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          product_cost: productCost * item.quantity,
          profit: item.totalPrice - (productCost * item.quantity)
        };
      });

      await supabase.from('cash_register_sales').insert(salesData);

      // Atualizar totais do caixa
      await supabase
        .from('cash_registers')
        .update({
          total_sales: currentCashRegister.total_sales + order.total,
          total_orders: currentCashRegister.total_orders + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCashRegister.id);

    } catch (error) {
      console.error('Erro ao salvar venda no caixa:', error);
    }
  };

  const updateOrder = (id: string, order: Partial<Order>) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === id) {
        const subtotal = order.items ?
          order.items.reduce((sum, item) => sum + item.totalPrice, 0) :
          ord.subtotal;

        const { taxesTotal, total } = calculateOrderTotal(subtotal);

        const updatedOrder = {
          ...ord,
          ...order,
          subtotal,
          tax: taxesTotal,
          total,
          updatedAt: new Date()
        };

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

          // Salvar no caixa
          saveSaleToCashRegister(updatedOrder);

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

  const updateSale = (id: string, sale: Partial<Sale>) => {
    setSales(prev => prev.map(s =>
      s.id === id ? { ...s, ...sale } : s
    ));
  };

  const addServiceTax = (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTax: ServiceTax = {
      ...tax,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setServiceTaxes(prev => [...prev, newTax]);
  };

  const updateServiceTax = (id: string, tax: Partial<ServiceTax>) => {
    setServiceTaxes(prev => prev.map(t =>
      t.id === id ? { ...t, ...tax, updatedAt: new Date() } : t
    ));
  };

  const deleteServiceTax = (id: string) => {
    setServiceTaxes(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      ingredients,
      products,
      orders,
      sales,
      serviceTaxes,
      setCurrentUser,
      addIngredient,
      updateIngredient,
      addProduct,
      updateProduct,
      addOrder,
      updateOrder,
      addSale,
      updateSale,
      setSales,
      addServiceTax,
      updateServiceTax,
      deleteServiceTax,
      currentCashRegister,
      openCashRegister,
      closeCashRegister,
      checkCashRegisterAccess,
    }}>
      {children}
    </AppContext.Provider>
  );
};
