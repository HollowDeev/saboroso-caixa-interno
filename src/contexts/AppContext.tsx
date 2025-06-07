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
  PaymentMethod,
  CashRegister,
  ExternalProduct
} from '../types/index';
import { supabase } from '@/integrations/supabase/client';
import { useCashRegister } from '@/hooks/useCashRegister';
import { useStock } from '@/hooks/useStock';
import { toast } from '@/hooks/use-toast';

type AppContextType = {
  currentUser: User | null;
  products: Product[];
  externalProducts: ExternalProduct[];
  orders: Order[];
  sales: Sale[];
  serviceTaxes: ServiceTax[];
  ingredients: Ingredient[];
  currentCashRegister: CashRegister | null;
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addItemToOrder: (orderId: string, item: NewOrderItem) => Promise<void>;
  closeOrder: (orderId: string, paymentMethod: PaymentMethod) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => Promise<Sale>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addServiceTax: (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateServiceTax: (id: string, tax: Partial<ServiceTax>) => void;
  deleteServiceTax: (id: string) => void;
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;
  openCashRegister: (amount: number) => Promise<CashRegister>;
  closeCashRegister: (amount: number) => Promise<CashRegister>;
  checkCashRegisterAccess: () => boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [serviceTaxes, setServiceTaxes] = useState<ServiceTax[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const { currentCashRegister, openCashRegister, closeCashRegister, loading: cashRegisterLoading } = useCashRegister();
  const { externalProducts } = useStock(currentUser?.id || '');

  const checkCashRegisterAccess = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'cashier';
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
          .select(`
            *,
            ingredients!inner(unit)
          `)
          .in('food_id', foods.map(f => f.id));

        if (ingredientsError) throw ingredientsError;

        const productsWithIngredients = foods.map(food => ({
          ...food,
          ingredients: foodIngredients
            .filter(fi => fi.food_id === food.id)
            .map(fi => {
              // Se a unidade é 'unidade', mantém como está
              if (fi.unit === 'unidade') {
                return {
                  ingredientId: fi.ingredient_id,
                  quantity: fi.quantity,
                  unit: fi.unit
                };
              }

              // Se a unidade é 'kg', converte para 'g' para exibição
              return {
                ingredientId: fi.ingredient_id,
                quantity: fi.quantity * 1000, // Converte kg para g
                unit: 'g'
              };
            }),
          created_at: new Date(food.created_at),
          updated_at: new Date(food.updated_at)
        }));

        setProducts(productsWithIngredients);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
    };

    loadProducts();
    loadOrders();
    loadSales();
    loadServiceTaxes();
    loadIngredients();
  }, [isLoading]);

  const loadOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*');

      if (itemsError) throw itemsError;

      const ordersWithItems = ordersData.map(order => ({
        ...order,
        userId: order.user_id,
        items: orderItemsData
          .filter(item => item.order_id === order.id)
          .map(item => ({
            id: item.id,
            productId: item.product_id,
            product: { name: item.product_name } as any,
            product_name: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price
          })),
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
      }));

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Erro ao carregar comandas:', error);
    }
  };

  const loadSales = async () => {
    try {
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const salesWithDates = salesData.map(sale => ({
        ...sale,
        createdAt: new Date(sale.created_at),
        orderId: sale.order_id,
        userId: sale.user_id,
        paymentMethod: sale.payment_method as PaymentMethod,
        customerName: sale.customer_name,
        items: Array.isArray(sale.items) ? sale.items : []
      }));

      setSales(salesWithDates);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  };

  const loadServiceTaxes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_taxes')
        .select('*')
        .order('name');

      if (error) throw error;

      const taxesWithDates = data.map(tax => ({
        ...tax,
        isActive: tax.is_active,
        createdAt: new Date(tax.created_at),
        updatedAt: new Date(tax.updated_at)
      }));

      setServiceTaxes(taxesWithDates);
    } catch (error) {
      console.error('Erro ao carregar taxas:', error);
    }
  };

  const loadIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      if (error) throw error;

      const ingredientsWithDates = data.map(ingredient => ({
        ...ingredient,
        currentStock: ingredient.current_stock,
        minStock: ingredient.min_stock,
        lastUpdated: new Date(ingredient.updated_at),
        created_at: new Date(ingredient.created_at),
        updated_at: new Date(ingredient.updated_at)
      }));

      setIngredients(ingredientsWithDates);
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
    }
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      if (!currentCashRegister) {
        throw new Error('Não há caixa aberto para criar comandas');
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_name: orderData.customerName,
          table_number: orderData.tableNumber,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          total: orderData.total,
          status: orderData.status,
          user_id: currentUser.id,
          cash_register_id: currentCashRegister.id
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
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

      if (itemsError) throw itemsError;

      await loadOrders();

      toast({
        title: 'Comanda criada',
        description: 'A comanda foi criada com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao criar comanda:', error);
      toast({
        title: 'Erro ao criar comanda',
        description: error.message || 'Não foi possível criar a comanda.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addItemToOrder = async (orderId: string, item: NewOrderItem) => {
    try {
      if (!currentCashRegister) {
        throw new Error('Não há caixa aberto');
      }

      const { error } = await supabase
        .from('order_items')
        .insert([{
          order_id: orderId,
          product_id: item.productId,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          cash_register_id: currentCashRegister.id
        }]);

      if (error) throw error;

      const currentOrder = orders.find(o => o.id === orderId);
      if (currentOrder) {
        const newSubtotal = currentOrder.subtotal + item.totalPrice;
        const newTax = newSubtotal * 0.1;
        const newTotal = newSubtotal + newTax;

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            subtotal: newSubtotal,
            tax: newTax,
            total: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) throw updateError;
      }

      await loadOrders();
    } catch (error: any) {
      console.error('Erro ao adicionar item:', error);
      throw error;
    }
  };

  const closeOrder = async (orderId: string, paymentMethod: PaymentMethod) => {
    try {
      if (!currentUser || !currentCashRegister) {
        throw new Error('Usuário não autenticado ou caixa não aberto');
      }

      const currentOrder = orders.find(o => o.id === orderId);
      if (!currentOrder) {
        throw new Error('Comanda não encontrada');
      }

      // Processar consumo de estoque para todos os itens
      const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');

      const stockResult = await processOrderItemsStockConsumption(
        currentOrder.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          product: item.product
        })),
        currentUser.id,
        `Fechamento de comanda #${orderId}`
      );

      if (!stockResult.success) {
        console.warn('Avisos de estoque:', stockResult.errors);
      }

      // Fechar a comanda
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'closed',
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Criar venda
      const { error: saleError } = await supabase
        .from('sales')
        .insert([{
          order_id: orderId,
          total: currentOrder.total,
          subtotal: currentOrder.subtotal,
          tax: currentOrder.tax,
          payment_method: paymentMethod,
          user_id: currentUser.id,
          cash_register_id: currentCashRegister.id,
          customer_name: currentOrder.customerName,
          is_direct_sale: false
        }]);

      if (saleError) throw saleError;

      await loadOrders();
      await loadSales();

      toast({
        title: 'Comanda fechada',
        description: 'A comanda foi fechada e registrada como venda.',
      });
    } catch (error: any) {
      console.error('Erro ao fechar comanda:', error);
      toast({
        title: 'Erro ao fechar comanda',
        description: error.message || 'Não foi possível fechar a comanda.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      if (!currentCashRegister) {
        throw new Error('Não há caixa aberto para registrar a venda');
      }

      // Processar consumo de estoque se há itens na venda
      if (saleData.items && saleData.items.length > 0) {
        const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');

        const stockResult = await processOrderItemsStockConsumption(
          saleData.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            product: { name: item.product_name } as any
          })),
          currentUser.id,
          'Venda direta'
        );

        if (!stockResult.success) {
          console.warn('Avisos de estoque:', stockResult.errors);
        }
      }

      const { data, error } = await supabase
        .from('sales')
        .insert([{
          total: saleData.total,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          payment_method: saleData.paymentMethod,
          user_id: currentUser.id,
          cash_register_id: currentCashRegister.id,
          customer_name: saleData.customerName,
          is_direct_sale: saleData.is_direct_sale || false,
          items: saleData.items || [],
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      const newSale = {
        ...data,
        createdAt: new Date(data.created_at),
        userId: data.user_id,
        paymentMethod: data.payment_method as PaymentMethod,
        customerName: data.customer_name,
        orderId: data.order_id,
        items: Array.isArray(data.items) ? data.items : []
      };

      setSales(prev => [newSale, ...prev]);
      toast({
        title: 'Venda registrada',
        description: 'A venda foi registrada com sucesso.',
      });

      return newSale;
    } catch (error: any) {
      console.error('Erro ao adicionar venda:', error);
      toast({
        title: 'Erro ao registrar venda',
        description: error.message || 'Não foi possível registrar a venda.',
        variant: 'destructive',
      });
      throw error;
    }
  };

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
        const foodIngredients = product.ingredients.map(ing => {
          // Se o ingrediente é 'unidade', mantém como está
          if (ing.unit === 'unidade') {
            return {
              food_id: foodData.id,
              ingredient_id: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit
            };
          }

          // Se a unidade é 'g', converte para 'kg'
          let quantityInKg = ing.quantity;
          if (ing.unit === 'g') {
            quantityInKg = ing.quantity / 1000;
          }

          return {
            food_id: foodData.id,
            ingredient_id: ing.ingredientId,
            quantity: quantityInKg,
            unit: 'kg'  // Sempre salva em kg
          };
        });

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
          const foodIngredients = product.ingredients.map(ing => {
            // Se o ingrediente é 'unidade', mantém como está
            if (ing.unit === 'unidade') {
              return {
                food_id: id,
                ingredient_id: ing.ingredientId,
                quantity: ing.quantity,
                unit: ing.unit
              };
            }

            // Se a unidade é 'g', converte para 'kg'
            let quantityInKg = ing.quantity;
            if (ing.unit === 'g') {
              quantityInKg = ing.quantity / 1000;
            }

            return {
              food_id: id,
              ingredient_id: ing.ingredientId,
              quantity: quantityInKg,
              unit: 'kg'  // Sempre salva em kg
            };
          });

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

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    } catch (error) {
      console.error('Erro ao atualizar comanda:', error);
      throw error;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (deleteOrderError) throw deleteOrderError;

      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error('Erro ao excluir comanda:', error);
      throw error;
    }
  };

  const updateSale = async (id: string, sale: Partial<Sale>) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update(sale)
        .eq('id', id);

      if (error) throw error;

      setSales(prev =>
        prev.map(s => (s.id === id ? { ...s, ...sale } : s))
      );
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSales(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      throw error;
    }
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

  const addIngredient = (ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newIngredient: Ingredient = {
      id: crypto.randomUUID(),
      ...ingredient,
      created_at: new Date(),
      updated_at: new Date()
    };
    setIngredients(prev => [...prev, newIngredient]);
  };

  const updateIngredient = (id: string, ingredient: Partial<Ingredient>) => {
    setIngredients(prev =>
      prev.map(i => (i.id === id ? { ...i, ...ingredient, updated_at: new Date() } : i))
    );
  };

  const deleteIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const value: AppContextType = {
    currentUser,
    products,
    externalProducts,
    orders,
    sales,
    serviceTaxes,
    ingredients,
    currentCashRegister,
    isLoading: isLoading || cashRegisterLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    addOrder,
    addItemToOrder,
    closeOrder,
    updateOrder,
    deleteOrder,
    addSale,
    updateSale,
    deleteSale,
    addServiceTax,
    updateServiceTax,
    deleteServiceTax,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    openCashRegister,
    closeCashRegister,
    checkCashRegisterAccess
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro do AppProvider');
  }
  return context;
};
