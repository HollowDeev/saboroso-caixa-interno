import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // Carregar dados quando o usuário estiver logado
  useEffect(() => {
    if (currentUser?.id) {
      loadOrders();
      loadSales();
    }
  }, [currentUser]);

  // Carregar usuário atual e seus dados
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Buscar dados do perfil
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) throw profileError;

          if (profile) {
            setCurrentUser({
              id: session.user.id,
              name: profile.name || 'Admin',
              email: session.user.email || '',
              role: profile.role || 'admin',
              createdAt: new Date(profile.created_at)
            });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };

    loadCurrentUser();
  }, []);

  const loadOrders = async () => {
    if (!currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Converter para o formato esperado pela aplicação
      const formattedOrders = data?.map(order => ({
        id: order.id,
        customerName: order.customer_name || '',
        tableNumber: order.table_number || 0,
        items: Array.isArray(order.items) ? order.items : [],
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        total: order.total || 0,
        status: (order.status as 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled') || 'pending',
        paymentMethod: (order.payment_method as 'cash' | 'card' | 'pix') || 'cash',
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at),
        userId: order.user_id
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Erro ao carregar comandas:', error);
    }
  };

  const loadSales = async () => {
    if (!currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSales = data?.map(sale => ({
        id: sale.id,
        orderId: sale.order_id,
        total: sale.total || 0,
        paymentMethod: (sale.payment_method as 'cash' | 'card' | 'pix') || 'cash',
        createdAt: new Date(sale.created_at),
        userId: sale.user_id
      })) || [];

      setSales(formattedSales);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  };

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

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser?.id) return;

    try {
      const orderData = {
        customer_name: order.customerName,
        table_number: order.tableNumber,
        items: JSON.stringify(order.items),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: order.status,
        payment_method: order.paymentMethod,
        user_id: currentUser.id
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      const newOrder: Order = {
        id: data.id,
        customerName: data.customer_name || '',
        tableNumber: data.table_number || 0,
        items: typeof data.items === 'string' ? JSON.parse(data.items) : [],
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        status: data.status as 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled',
        paymentMethod: data.payment_method as 'cash' | 'card' | 'pix',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        userId: data.user_id
      };

      setOrders(prev => [...prev, newOrder]);
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      throw error;
    }
  };

  const calculateOrderTotal = (subtotal: number) => {
    const activeTaxes = serviceTaxes.filter(tax => tax.isActive);
    const taxesTotal = activeTaxes.reduce((sum, tax) => sum + (subtotal * (tax.percentage / 100)), 0);
    return { subtotal, taxesTotal, total: subtotal + taxesTotal };
  };

  const saveSaleToCashRegister = async (order: Order) => {
    if (!currentCashRegister || !currentUser?.id) return;

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

  const updateOrder = async (id: string, order: Partial<Order>) => {
    if (!currentUser?.id) return;

    try {
      const currentOrder = orders.find(o => o.id === id);
      if (!currentOrder) return;

      const subtotal = order.items ?
        order.items.reduce((sum, item) => sum + item.totalPrice, 0) :
        currentOrder.subtotal;

      const { taxesTotal, total } = calculateOrderTotal(subtotal);

      const updatedOrderData = {
        customer_name: order.customerName ?? currentOrder.customerName,
        table_number: order.tableNumber ?? currentOrder.tableNumber,
        items: JSON.stringify(order.items ?? currentOrder.items),
        subtotal,
        tax: taxesTotal,
        total,
        status: order.status ?? currentOrder.status,
        payment_method: order.paymentMethod ?? currentOrder.paymentMethod,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .update(updatedOrderData)
        .eq('id', id);

      if (error) throw error;

      const updatedOrder = {
        ...currentOrder,
        ...order,
        subtotal,
        tax: taxesTotal,
        total,
        updatedAt: new Date()
      };

      // Se a comanda foi marcada como "paid", criar uma venda automaticamente
      if (order.status === 'paid' && currentOrder.status !== 'paid') {
        const saleData = {
          order_id: id,
          total: updatedOrder.total,
          payment_method: updatedOrder.paymentMethod || 'cash',
          user_id: currentUser.id
        };

        const { data: saleResult, error: saleError } = await supabase
          .from('sales')
          .insert(saleData)
          .select()
          .single();

        if (!saleError) {
          const newSale: Sale = {
            id: saleResult.id,
            orderId: id,
            total: updatedOrder.total,
            paymentMethod: updatedOrder.paymentMethod || 'cash',
            createdAt: new Date(saleResult.created_at),
            userId: currentUser.id
          };
          setSales(prev => [...prev, newSale]);
        }

        // Salvar no caixa
        await saveSaleToCashRegister(updatedOrder);

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

      setOrders(prev => prev.map(ord => ord.id === id ? updatedOrder : ord));
    } catch (error) {
      console.error('Erro ao atualizar comanda:', error);
      throw error;
    }
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
