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
  const [isLoading, setIsLoading] = useState(true);

  const { currentCashRegister, openCashRegister, closeCashRegister, loading: cashRegisterLoading } = useCashRegister();

  const checkCashRegisterAccess = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'cashier';
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
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
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      if (isLoading) return;

      try {
        const { data: foods, error: foodsError } = await supabase
          .from('foods')
          .select('*')
          .is('deleted_at', null);

        if (foodsError) throw foodsError;

        const { data: foodIngredients, error: ingredientsError } = await supabase
          .from('food_ingredients')
          .select('*')
          .in('food_id', foods.map(f => f.id));

        if (ingredientsError) throw ingredientsError;

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
  }, [isLoading]);

  useEffect(() => {
    const loadIngredients = async () => {
      if (isLoading) return;

      try {
        const { data, error } = await supabase
          .from('ingredients')
          .select('*');

        if (error) throw error;
        setIngredients(data || []);
      } catch (error) {
        console.error('Erro ao carregar ingredientes:', error);
      }
    };

    loadIngredients();
  }, [isLoading]);

  useEffect(() => {
    const loadOrders = async () => {
      if (isLoading || cashRegisterLoading) return;

      try {
        if (!currentCashRegister) {
          setOrders([]);
          return;
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('cash_register_id', currentCashRegister.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        if (!ordersData || ordersData.length === 0) {
          setOrders([]);
          return;
        }

        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', ordersData.map(o => o.id));

        if (itemsError) throw itemsError;

        const ordersWithItems = ordersData.map(order => ({
          id: order.id,
          customerName: order.customer_name,
          tableNumber: order.table_number,
          items: (orderItems || [])
            .filter(item => item.order_id === order.id)
            .map(item => ({
              id: item.id,
              productId: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              totalPrice: item.total_price
            })),
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          paymentMethod: order.payment_method,
          createdAt: new Date(order.created_at),
          updatedAt: new Date(order.updated_at),
          userId: order.user_id
        }));

        setOrders(ordersWithItems);
      } catch (error) {
        console.error('Erro ao carregar comandas:', error);
      }
    };

    loadOrders();
  }, [currentCashRegister, isLoading, cashRegisterLoading]);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
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

  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
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

      if (product.ingredients) {
        const { error: deleteError } = await supabase
          .from('food_ingredients')
          .delete()
          .eq('food_id', id);

        if (deleteError) throw deleteError;

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

  const deleteProduct = async (id: string) => {
    try {
      const { error: deleteIngredientsError } = await supabase
        .from('food_ingredients')
        .delete()
        .eq('food_id', id);

      if (deleteIngredientsError) throw deleteIngredientsError;

      const { error: deleteFoodError } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);

      if (deleteFoodError) throw deleteFoodError;

      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      throw error;
    }
  };

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentCashRegister) {
        throw new Error('Nenhum caixa aberto');
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: order.customerName,
          table_number: order.tableNumber,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          user_id: order.userId,
          cash_register_id: currentCashRegister.id
        })
        .select()
        .single();

      if (orderError) {
        console.error('Erro ao criar comanda:', orderError);
        throw orderError;
      }

      const orderItems = order.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        cash_register_id: currentCashRegister.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Erro ao criar itens da comanda:', itemsError);
        await supabase.from('orders').delete().eq('id', newOrder.id);
        throw itemsError;
      }

      const { error: updateError } = await supabase
        .from('cash_registers')
        .update({
          total_orders: currentCashRegister.total_orders + 1
        })
        .eq('id', currentCashRegister.id);

      if (updateError) {
        console.error('Erro ao atualizar caixa:', updateError);
        throw updateError;
      }

      const fullOrder: Order = {
        id: newOrder.id,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: order.status,
        createdAt: new Date(newOrder.created_at),
        updatedAt: new Date(newOrder.updated_at),
        userId: order.userId
      };

      setOrders(prev => [...prev, fullOrder]);
      return fullOrder;
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      throw error;
    }
  };

  const updateOrder = async (id: string, orderUpdate: Partial<Order>) => {
    try {
      if (!currentCashRegister) {
        throw new Error('Nenhum caixa aberto');
      }

      if (orderUpdate.status === 'paid') {
        const order = orders.find(o => o.id === id);
        if (!order) throw new Error('Comanda não encontrada');

        await addSale({
          orderId: id,
          total: orderUpdate.total || order.total,
          paymentMethod: orderUpdate.paymentMethod || 'cash',
          userId: order.userId
        });
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          customer_name: orderUpdate.customerName,
          table_number: orderUpdate.tableNumber,
          subtotal: orderUpdate.subtotal,
          tax: orderUpdate.tax,
          total: orderUpdate.total,
          status: orderUpdate.status,
          payment_method: orderUpdate.paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      if (orderUpdate.items) {
        const newItems = orderUpdate.items.filter(item => !item.id).map(item => ({
          order_id: id,
          product_id: item.productId,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          cash_register_id: currentCashRegister.id
        }));

        if (newItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(newItems);

          if (itemsError) throw itemsError;
        }
      }

      setOrders(prev =>
        prev.map(o => (o.id === id ? { ...o, ...orderUpdate, updatedAt: new Date() } : o))
      );
    } catch (error) {
      console.error('Erro ao atualizar comanda:', error);
      throw error;
    }
  };

  const addSale = async (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      if (!currentCashRegister) {
        throw new Error('Nenhum caixa aberto');
      }

      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert({
          order_id: sale.orderId,
          total: sale.total,
          payment_method: sale.paymentMethod,
          user_id: sale.userId,
          cash_register_id: currentCashRegister.id
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const { error: updateError } = await supabase
        .from('cash_registers')
        .update({
          total_sales: currentCashRegister.total_sales + sale.total
        })
        .eq('id', currentCashRegister.id);

      if (updateError) throw updateError;

      const fullSale: Sale = {
        id: newSale.id,
        orderId: sale.orderId,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        createdAt: new Date(newSale.created_at),
        userId: sale.userId
      };

      setSales(prev => [...prev, fullSale]);
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      throw error;
    }
  };

  const updateSale = (id: string, sale: Partial<Sale>) => {
    setSales(prev =>
      prev.map(s => (s.id === id ? { ...s, ...sale } : s))
    );
  };

  const addServiceTax = (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTax: ServiceTax = {
      id: crypto.randomUUID(),
      ...tax,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setServiceTaxes(prev => [...prev, newTax]);
  };

  const updateServiceTax = (id: string, tax: Partial<ServiceTax>) => {
    setServiceTaxes(prev =>
      prev.map(t => (t.id === id ? { ...t, ...tax, updatedAt: new Date() } : t))
    );
  };

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
