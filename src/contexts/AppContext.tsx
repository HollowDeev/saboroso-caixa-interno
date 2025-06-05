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
  deleteProduct: (id: string) => Promise<void>;
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
      try {
        // Primeiro carrega as comidas
        const { data: foods, error: foodsError } = await supabase
          .from('foods')
          .select('*')
          .is('deleted_at', null);

        if (foodsError) throw foodsError;

        // Depois carrega os ingredientes de cada comida
        const { data: foodIngredients, error: ingredientsError } = await supabase
          .from('food_ingredients')
          .select('*')
          .in('food_id', foods.map(f => f.id));

        if (ingredientsError) throw ingredientsError;

        // Mapeia os ingredientes para cada comida
        const productsWithIngredients = foods.map(food => ({
          ...food,
          ingredients: foodIngredients
            .filter(fi => fi.food_id === food.id)
            .map(fi => ({
              ingredientId: fi.ingredient_id,
              quantity: fi.quantity,
              unit: fi.unit
            })),
          created_at: new Date(food.created_at),
          updated_at: new Date(food.updated_at)
        }));

        setProducts(productsWithIngredients);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
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
    try {
      // Primeiro, insere a comida na tabela foods
      const { data: foodData, error: foodError } = await supabase
        .from('foods')
        .insert([{
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          cost: product.cost,
          preparation_time: product.preparationTime || 0,
          available: product.available,
          owner_id: currentUser?.id
        }])
        .select()
        .single();

      if (foodError) throw foodError;

      // Depois, insere os ingredientes na tabela food_ingredients
      if (product.ingredients?.length > 0) {
        const foodIngredients = product.ingredients.map(ing => ({
          food_id: foodData.id,
          ingredient_id: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit
        }));

        const { error: ingredientsError } = await supabase
          .from('food_ingredients')
          .insert(foodIngredients);

        if (ingredientsError) throw ingredientsError;
      }

      // Retorna o produto completo
      const newProduct = {
        ...foodData,
        ingredients: product.ingredients || [],
        created_at: new Date(foodData.created_at),
        updated_at: new Date(foodData.updated_at)
      };

      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      throw error;
    }
  };

  // Função para atualizar produto
  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
      // Primeiro, atualiza a comida na tabela foods
      const { data: foodData, error: foodError } = await supabase
        .from('foods')
        .update({
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          cost: product.cost,
          preparation_time: product.preparationTime,
          available: product.available,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (foodError) throw foodError;

      // Se houver ingredientes para atualizar
      if (product.ingredients) {
        // Remove todos os ingredientes antigos
        const { error: deleteError } = await supabase
          .from('food_ingredients')
          .delete()
          .eq('food_id', id);

        if (deleteError) throw deleteError;

        // Insere os novos ingredientes
        if (product.ingredients.length > 0) {
          const foodIngredients = product.ingredients.map(ing => ({
            food_id: id,
            ingredient_id: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit
          }));

          const { error: ingredientsError } = await supabase
            .from('food_ingredients')
            .insert(foodIngredients);

          if (ingredientsError) throw ingredientsError;
        }
      }

      // Retorna o produto atualizado
      const updatedProduct = {
        ...foodData,
        ingredients: product.ingredients || [],
        created_at: new Date(foodData.created_at),
        updated_at: new Date(foodData.updated_at)
      };

      setProducts(prev =>
        prev.map(p => (p.id === id ? updatedProduct : p))
      );
      return updatedProduct;
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  };

  // Função para excluir produto
  const deleteProduct = async (id: string) => {
    try {
      // Primeiro remove os ingredientes da comida
      const { error: deleteIngredientsError } = await supabase
        .from('food_ingredients')
        .delete()
        .eq('food_id', id);

      if (deleteIngredientsError) throw deleteIngredientsError;

      // Depois remove a comida
      const { error: deleteFoodError } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);

      if (deleteFoodError) throw deleteFoodError;

      // Atualiza o estado local
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      throw error;
    }
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
        deleteProduct,
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
