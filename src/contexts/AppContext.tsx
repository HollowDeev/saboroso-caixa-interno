import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Ingredient,
  Product,
  Order,
  Sale,
  ServiceTax,
  OrderItem,
  NewOrderItem,
  OrderStatus,
  PaymentMethod
} from '../types/index';
import { supabase } from '@/integrations/supabase/client';
import { useCashRegister } from '@/hooks/useCashRegister';

interface AppContextType {
  currentUser: User | null;
  products: Product[];
  orders: Order[];
  sales: Sale[];
  ingredients: Ingredient[];
  serviceTaxes: ServiceTax[];
  setCurrentUser: (user: User | null) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<Product>;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
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

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [serviceTaxes, setServiceTaxes] = useState<ServiceTax[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Verificar sessão ao montar o componente
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: session.user.id,
            name: profile.name || 'Admin',
            email: session.user.email || '',
            role: profile.role as User['role'] || 'admin',
            created_at: new Date(profile.created_at),
            updated_at: new Date(profile.updated_at)
          });
        }
      }
    };

    checkSession();

    // Listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: session.user.id,
            name: profile.name || 'Admin',
            email: session.user.email || '',
            role: profile.role as User['role'] || 'admin',
            created_at: new Date(profile.created_at),
            updated_at: new Date(profile.updated_at)
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Carregar produtos ao montar o componente
  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');

      if (error) {
        console.error('Erro ao carregar produtos:', error);
        return;
      }

      setProducts(data || []);
    };

    loadProducts();
  }, []);

  // Carregar ingredientes ao montar o componente
  useEffect(() => {
    const loadIngredients = async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*');

      if (error) {
        console.error('Erro ao carregar ingredientes:', error);
        return;
      }

      setIngredients(data || []);
    };

    loadIngredients();
  }, []);

  // Hooks
  const { currentCashRegister, openCashRegister, closeCashRegister } = useCashRegister();

  // Função para verificar acesso ao caixa
  const checkCashRegisterAccess = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'cashier';
  };

  // Função para adicionar produto
  const addProduct = async (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      id: crypto.randomUUID(),
      ...product,
      created_at: new Date(),
      updated_at: new Date()
    };

    const { data, error } = await supabase
      .from('products')
      .insert([newProduct])
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar produto:', error);
      throw error;
    }

    setProducts(prev => [...prev, data]);
    return data;
  };

  // Função para atualizar produto
  const updateProduct = async (id: string, product: Partial<Product>) => {
    const { data, error } = await supabase
      .from('products')
      .update({ ...product, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }

    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...data } : p))
    );
    return data;
  };

  // Função para adicionar pedido
  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newOrder: Order = {
      id: crypto.randomUUID(),
      ...order,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  };

  // Função para atualizar pedido
  const updateOrder = async (id: string, order: Partial<Order>) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, ...order, updatedAt: new Date() } : o))
    );
  };

  // Função para adicionar venda
  const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const newSale: Sale = {
      id: crypto.randomUUID(),
      ...sale,
      createdAt: new Date()
    };
    setSales(prev => [...prev, newSale]);
  };

  // Função para atualizar venda
  const updateSale = (id: string, sale: Partial<Sale>) => {
    setSales(prev =>
      prev.map(s => (s.id === id ? { ...s, ...sale } : s))
    );
  };

  // Função para adicionar taxa de serviço
  const addServiceTax = (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTax: ServiceTax = {
      id: crypto.randomUUID(),
      ...tax,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setServiceTaxes(prev => [...prev, newTax]);
  };

  // Função para atualizar taxa de serviço
  const updateServiceTax = (id: string, tax: Partial<ServiceTax>) => {
    setServiceTaxes(prev =>
      prev.map(t => (t.id === id ? { ...t, ...tax, updatedAt: new Date() } : t))
    );
  };

  // Função para excluir taxa de serviço
  const deleteServiceTax = (id: string) => {
    setServiceTaxes(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        products,
        orders,
        sales,
        ingredients,
        serviceTaxes,
        setCurrentUser,
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
        checkCashRegisterAccess
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
