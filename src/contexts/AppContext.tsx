import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Ingredient,
  Product,
  Order,
  Sale,
  ServiceTax,
  OrderStatus,
  PaymentMethod,
  CashRegister,
  ExternalProduct
} from '../types/index';
import { supabase } from '@/integrations/supabase/client';
import { useCashRegister } from '@/hooks/useCashRegister';
import { useStock } from '@/hooks/useStock';
import { useToast } from '@/hooks/use-toast';

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
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addServiceTax: (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateServiceTax: (id: string, tax: Partial<ServiceTax>) => void;
  deleteServiceTax: (id: string) => void;
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;
  openCashRegister: (amount: number) => Promise<void>;
  closeCashRegister: (amount: number) => Promise<void>;
  checkCashRegisterAccess: () => boolean;
  addItemToOrder: (orderId: string, item: any) => Promise<void>;
  closeOrder: (orderId: string, paymentMethod: PaymentMethod) => Promise<void>;
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
  const { toast } = useToast();

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
              quantity: fi.quantity
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
        
        const formattedIngredients: Ingredient[] = (data || []).map(ingredient => ({
          id: ingredient.id,
          name: ingredient.name,
          currentStock: ingredient.current_stock,
          minStock: ingredient.min_stock,
          unit: ingredient.unit,
          cost: ingredient.cost,
          supplier: ingredient.supplier,
          lastUpdated: new Date(ingredient.updated_at),
          created_at: new Date(ingredient.created_at),
          updated_at: new Date(ingredient.updated_at)
        }));
        
        setIngredients(formattedIngredients);
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
              totalPrice: item.total_price,
              product: { name: item.product_name } as Product
            })),
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status as OrderStatus,
          paymentMethod: order.payment_method as PaymentMethod,
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

  const loadSales = async () => {
    try {
      setIsLoading(true);

      if (!currentCashRegister) {
        setSales([]);
        return;
      }

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('cash_register_id', currentCashRegister.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSales: Sale[] = data.map(sale => ({
        id: sale.id,
        orderId: sale.order_id,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        paymentMethod: sale.payment_method as PaymentMethod,
        createdAt: new Date(sale.created_at),
        userId: sale.user_id,
        is_direct_sale: sale.is_direct_sale,
        items: sale.items ? JSON.parse(sale.items as string) : undefined,
        customerName: sale.customer_name
      }));

      setSales(formattedSales);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentCashRegister) {
      loadSales();
    } else {
      setSales([]);
    }
  }, [currentCashRegister]);

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
          unit: 'g'
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
            unit: 'g'
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
          status: 'open',
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
        status: 'open',
        createdAt: new Date(newOrder.created_at),
        updatedAt: new Date(newOrder.updated_at),
        userId: order.userId
      };

      setOrders(prev => [...prev, fullOrder]);
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      throw error;
    }
  };

  const addItemToOrder = async (orderId: string, item: any) => {
    try {
      if (!currentCashRegister) {
        throw new Error('Nenhum caixa aberto');
      }

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          product_id: item.productId,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          cash_register_id: currentCashRegister.id
        });

      if (itemError) throw itemError;

      // Atualizar totais da comanda
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

        // Atualizar estado local
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? {
                ...order,
                items: [...order.items, item],
                subtotal: newSubtotal,
                tax: newTax,
                total: newTotal,
                updatedAt: new Date()
              }
            : order
        ));
      }

      toast({
        title: 'Item adicionado',
        description: 'Item foi adicionado à comanda com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao adicionar item à comanda:', error);
      toast({
        title: 'Erro ao adicionar item',
        description: error.message || 'Não foi possível adicionar o item à comanda.',
        variant: 'destructive',
      });
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

      // Processar consumo de estoque
      const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
      
      const stockResult = await processOrderItemsStockConsumption(
        currentOrder.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          product: item.product
        })),
        currentUser.id,
        'Fechamento de comanda'
      );

      if (!stockResult.success) {
        console.warn('Avisos de estoque:', stockResult.errors);
      }

      // Atualizar status da comanda
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'closed',
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Criar venda correspondente
      const saleData = {
        order_id: orderId,
        total: currentOrder.total,
        subtotal: currentOrder.subtotal,
        tax: currentOrder.tax,
        payment_method: paymentMethod,
        user_id: currentUser.id,
        customer_name: currentOrder.customerName,
        is_direct_sale: false,
        items: JSON.stringify(currentOrder.items.map(item => ({
          productId: item.productId,
          product_name: item.product_name || item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })))
      };

      const { error: saleError } = await supabase
        .from('sales')
        .insert([{
          ...saleData,
          cash_register_id: currentCashRegister.id,
          created_at: new Date().toISOString()
        }]);

      if (saleError) {
        console.error('Erro ao criar venda da comanda:', saleError);
      } else {
        loadSales();
      }

      // Atualizar estado local
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'closed', paymentMethod, updatedAt: new Date() }
          : order
      ));

      toast({
        title: 'Comanda fechada',
        description: 'A comanda foi fechada e a venda foi registrada com sucesso.',
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

  const updateOrder = async (id: string, order: Partial<Order>) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          customer_name: order.customerName,
          table_number: order.tableNumber,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          payment_method: order.paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...order, updatedAt: new Date() } : o));
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

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      if (!currentCashRegister) {
        throw new Error('Não há caixa aberto para registrar a venda');
      }

      // Processar consumo de ingredientes e produtos externos se há itens na venda
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

      // Preparar dados para inserção no banco
      const insertData = {
        user_id: currentUser.id,
        cash_register_id: currentCashRegister.id,
        created_at: new Date().toISOString(),
        customer_name: saleData.customerName || null,
        items: saleData.items ? JSON.stringify(saleData.items) : null,
        total: saleData.total,
        subtotal: saleData.subtotal,
        tax: saleData.tax,
        payment_method: saleData.paymentMethod,
        is_direct_sale: saleData.is_direct_sale || false,
        order_id: saleData.orderId || null
      };

      const { data, error } = await supabase
        .from('sales')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      const formattedSale: Sale = {
        id: data.id,
        orderId: data.order_id,
        total: data.total,
        subtotal: data.subtotal,
        tax: data.tax,
        paymentMethod: data.payment_method as PaymentMethod,
        createdAt: new Date(data.created_at),
        userId: data.user_id,
        is_direct_sale: data.is_direct_sale,
        items: data.items ? JSON.parse(data.items as string) : undefined,
        customerName: data.customer_name
      };

      setSales(prev => [formattedSale, ...prev]);
      toast({
        title: 'Venda registrada',
        description: 'A venda foi registrada com sucesso.',
      });

      return formattedSale;
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

  const updateSale = async (id: string, sale: Partial<Sale>) => {
    try {
      const updateData = {
        payment_method: sale.paymentMethod,
        customer_name: sale.customerName
      };

      const { error } = await supabase
        .from('sales')
        .update(updateData)
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        products,
        externalProducts,
        orders,
        sales,
        ingredients,
        serviceTaxes,
        addProduct,
        updateProduct,
        deleteProduct,
        addOrder,
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
        currentCashRegister,
        openCashRegister,
        closeCashRegister,
        checkCashRegisterAccess,
        isLoading,
        addItemToOrder,
        closeOrder
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
