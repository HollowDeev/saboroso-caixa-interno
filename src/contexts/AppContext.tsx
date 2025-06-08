import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppContextType, User, Ingredient, Product, ExternalProduct, Order, Sale, ServiceTax, CashRegister, OrderItem, NewOrderItem, PaymentMethod } from '@/types';
import { consumeStockForSale } from '@/utils/stockConsumption';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [serviceTaxes, setServiceTaxes] = useState<ServiceTax[]>([]);
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegister | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getCurrentUserId = () => {
    if (isEmployee && currentUser) {
      return (currentUser as any).owner_id || currentUser.id;
    }
    return currentUser?.id || '';
  };

  const fetchIngredients = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('owner_id', userId);

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('owner_id', userId)
        .is('deleted_at', null);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchExternalProducts = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('external_products')
        .select('*')
        .eq('owner_id', userId);

      if (error) throw error;
      setExternalProducts(data || []);
    } catch (error) {
      console.error('Error fetching external products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            product_type
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders: Order[] = (ordersData || []).map((order: any) => ({
        id: order.id,
        customerName: order.customer_name,
        tableNumber: order.table_number,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          product_type: item.product_type
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: order.status as 'open' | 'closed',
        paymentMethod: order.payment_method as PaymentMethod,
        userId: order.user_id,
        cash_register_id: order.cash_register_id,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSales: Sale[] = (data || []).map((sale: any) => ({
        id: sale.id,
        items: Array.isArray(sale.items) ? sale.items : [],
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        paymentMethod: sale.payment_method as PaymentMethod,
        customerName: sale.customer_name,
        userId: sale.user_id,
        cash_register_id: sale.cash_register_id,
        order_id: sale.order_id,
        is_direct_sale: sale.is_direct_sale,
        createdAt: sale.created_at
      }));

      setSales(formattedSales);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const fetchServiceTaxes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_taxes')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setServiceTaxes(data || []);
    } catch (error) {
      console.error('Error fetching service taxes:', error);
    }
  };

  const fetchCurrentCashRegister = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_open', true)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentCashRegister(data);
    } catch (error) {
      console.error('Error fetching cash register:', error);
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Check for employee data first
        const savedEmployeeData = localStorage.getItem('employee_data');
        if (savedEmployeeData) {
          const employee = JSON.parse(savedEmployeeData);
          setCurrentUser({
            id: employee.id,
            name: employee.name,
            email: '',
            role: 'employee'
          });
          setIsEmployee(true);
          await loadData(employee.owner_id);
          return;
        }

        // Check for admin session
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
              role: profile.role || 'admin'
            });
            setIsEmployee(false);
            await loadData(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const loadData = async (ownerId: string) => {
    try {
      setIsLoading(true);
      
      console.log('Loading data for owner:', ownerId);
      
      // Load all data in parallel
      const [
        ingredientsResult,
        foodsResult,
        externalProductsResult,
        ordersResult,
        salesResult,
        serviceTaxesResult,
        cashRegisterResult
      ] = await Promise.all([
        supabase.from('ingredients').select('*').eq('owner_id', ownerId),
        supabase.from('foods').select('*').eq('owner_id', ownerId).is('deleted_at', null),
        supabase.from('external_products').select('*').eq('owner_id', ownerId),
        supabase.from('orders').select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            product_type,
            quantity,
            unit_price,
            total_price
          )
        `).eq('user_id', ownerId).order('created_at', { ascending: false }),
        supabase.from('sales').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }),
        supabase.from('service_taxes').select('*'),
        supabase.rpc('get_open_cash_register', { p_owner_id: ownerId })
      ]);

      console.log('Data loading results:', {
        ingredients: ingredientsResult.data?.length || 0,
        foods: foodsResult.data?.length || 0,
        externalProducts: externalProductsResult.data?.length || 0,
        orders: ordersResult.data?.length || 0,
        sales: salesResult.data?.length || 0,
        serviceTaxes: serviceTaxesResult.data?.length || 0,
        cashRegister: cashRegisterResult.data
      });

      // Set ingredients
      if (ingredientsResult.data && !ingredientsResult.error) {
        setIngredients(ingredientsResult.data);
      }

      // Set products (foods)
      if (foodsResult.data && !foodsResult.error) {
        const formattedProducts = foodsResult.data.map(food => ({
          id: food.id,
          name: food.name,
          description: food.description,
          price: food.price,
          cost: food.cost,
          available: food.available,
          category: food.category,
          preparation_time: food.preparation_time,
          owner_id: food.owner_id,
          created_at: food.created_at,
          updated_at: food.updated_at
        }));
        setProducts(formattedProducts);
        console.log('Products loaded:', formattedProducts);
      }

      // Set external products
      if (externalProductsResult.data && !externalProductsResult.error) {
        setExternalProducts(externalProductsResult.data);
        console.log('External products loaded:', externalProductsResult.data);
      }

      // Set orders
      if (ordersResult.data && !ordersResult.error) {
        const formattedOrders = ordersResult.data.map(order => ({
          id: order.id,
          customerName: order.customer_name,
          tableNumber: order.table_number,
          items: order.order_items?.map(item => ({
            id: item.id,
            productId: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
            product_type: item.product_type
          })) || [],
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          paymentMethod: order.payment_method,
          userId: order.user_id,
          cash_register_id: order.cash_register_id,
          createdAt: order.created_at,
          updatedAt: order.updated_at
        }));
        setOrders(formattedOrders);
        console.log('Orders loaded:', formattedOrders);
      }

      // Set sales
      if (salesResult.data && !salesResult.error) {
        const formattedSales = salesResult.data.map(sale => ({
          id: sale.id,
          items: sale.items || [],
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          paymentMethod: sale.payment_method,
          customerName: sale.customer_name,
          userId: sale.user_id,
          cash_register_id: sale.cash_register_id,
          order_id: sale.order_id,
          is_direct_sale: sale.is_direct_sale,
          createdAt: sale.created_at
        }));
        setSales(formattedSales);
        console.log('Sales loaded:', formattedSales);
      }

      // Set service taxes
      if (serviceTaxesResult.data && !serviceTaxesResult.error) {
        setServiceTaxes(serviceTaxesResult.data);
      }

      // Set cash register
      if (cashRegisterResult.data && !cashRegisterResult.error) {
        const { data: cashRegister } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('id', cashRegisterResult.data)
          .single();
        
        if (cashRegister) {
          setCurrentCashRegister(cashRegister);
          console.log('Cash register loaded:', cashRegister);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchIngredients(),
      fetchProducts(),
      fetchExternalProducts(),
      fetchOrders(),
      fetchSales(),
      fetchServiceTaxes(),
      fetchCurrentCashRegister()
    ]);
    setIsLoading(false);
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name: orderData.customerName,
          table_number: orderData.tableNumber,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          total: orderData.total,
          status: orderData.status,
          payment_method: orderData.paymentMethod,
          user_id: orderData.userId,
          cash_register_id: orderData.cash_register_id
        })
        .select()
        .single();

      if (error) throw error;

      // Insert order items
      if (orderData.items.length > 0) {
        const orderItems = orderData.items.map(item => ({
          order_id: data.id,
          product_id: item.productId,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          product_type: item.product_type || 'food',
          cash_register_id: orderData.cash_register_id
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      await fetchOrders();
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: updates.customerName,
          table_number: updates.tableNumber,
          subtotal: updates.subtotal,
          tax: updates.tax,
          total: updates.total,
          status: updates.status,
          payment_method: updates.paymentMethod
        })
        .eq('id', id);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const addItemToOrder = async (orderId: string, item: NewOrderItem) => {
    try {
      const orderItem: OrderItem = {
        id: '', // Will be generated by DB
        productId: item.productId,
        product: item.product,
        product_name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        product_type: 'id' in item.product && 'category' in item.product ? 'food' : 'external_product'
      };

      const { error } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          product_id: orderItem.productId,
          product_name: orderItem.product_name,
          quantity: orderItem.quantity,
          unit_price: orderItem.unitPrice,
          total_price: orderItem.totalPrice,
          product_type: orderItem.product_type,
          cash_register_id: currentCashRegister?.id
        });

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Error adding item to order:', error);
      throw error;
    }
  };

  const closeOrder = async (orderId: string, paymentMethod: PaymentMethod, customerName?: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      // Process stock consumption for each item
      for (const item of order.items) {
        await consumeStockForSale(item.productId, item.quantity, getCurrentUserId());
      }

      // Update order status
      await updateOrder(orderId, {
        status: 'closed',
        paymentMethod,
        customerName
      });

      // Create sale record
      await addSale({
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        paymentMethod,
        customerName,
        userId: getCurrentUserId(),
        cash_register_id: currentCashRegister?.id || '',
        order_id: orderId,
        is_direct_sale: false
      });

    } catch (error) {
      console.error('Error closing order:', error);
      throw error;
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase
        .from('sales')
        .insert({
          user_id: saleData.userId,
          cash_register_id: saleData.cash_register_id,
          customer_name: saleData.customerName,
          items: JSON.stringify(saleData.items),
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          total: saleData.total,
          payment_method: saleData.paymentMethod,
          order_id: saleData.order_id,
          is_direct_sale: saleData.is_direct_sale
        });

      if (error) throw error;
      await fetchSales();
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  };

  const addIngredient = async (ingredientData: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .insert(ingredientData);

      if (error) throw error;
      await fetchIngredients();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      throw error;
    }
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchIngredients();
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  };

  const deleteIngredient = async (id: string) => {
    try {
      const { error } = await supabase.rpc('delete_ingredient_cascade', {
        p_ingredient_id: id
      });

      if (error) throw error;
      await fetchIngredients();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('foods')
        .insert(productData);

      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('foods')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('foods')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const addExternalProduct = async (productData: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('external_products')
        .insert(productData);

      if (error) throw error;
      await fetchExternalProducts();
    } catch (error) {
      console.error('Error adding external product:', error);
      throw error;
    }
  };

  const updateExternalProduct = async (id: string, updates: Partial<ExternalProduct>) => {
    try {
      const { error } = await supabase
        .from('external_products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchExternalProducts();
    } catch (error) {
      console.error('Error updating external product:', error);
      throw error;
    }
  };

  const deleteExternalProduct = async (id: string) => {
    try {
      const { error } = await supabase.rpc('delete_external_product_cascade', {
        p_product_id: id
      });

      if (error) throw error;
      await fetchExternalProducts();
    } catch (error) {
      console.error('Error deleting external product:', error);
      throw error;
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          customer_name: updates.customerName,
          payment_method: updates.paymentMethod,
          items: updates.items ? JSON.stringify(updates.items) : undefined,
          subtotal: updates.subtotal,
          tax: updates.tax,
          total: updates.total
        })
        .eq('id', id);

      if (error) throw error;
      await fetchSales();
    } catch (error) {
      console.error('Error updating sale:', error);
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
      await fetchSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  };

  const openCashRegister = async (amount: number) => {
    try {
      const { error } = await supabase
        .from('cash_registers')
        .insert({
          owner_id: getCurrentUserId(),
          opening_amount: amount,
          total_sales: 0,
          total_cost: 0,
          total_orders: 0,
          is_open: true
        });

      if (error) throw error;
      await fetchCurrentCashRegister();
    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    }
  };

  const closeCashRegister = async (amount: number) => {
    try {
      if (!currentCashRegister) throw new Error('No open cash register');

      const { error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: amount,
          is_open: false,
          closed_at: new Date().toISOString()
        })
        .eq('id', currentCashRegister.id);

      if (error) throw error;
      await fetchCurrentCashRegister();
    } catch (error) {
      console.error('Error closing cash register:', error);
      throw error;
    }
  };

  const checkCashRegisterAccess = () => {
    return !!currentCashRegister?.is_open;
  };

  const contextValue: AppContextType = {
    currentUser,
    isEmployee,
    ingredients,
    products,
    externalProducts,
    orders,
    sales,
    serviceTaxes,
    currentCashRegister,
    isLoading,
    addOrder,
    updateOrder,
    addItemToOrder,
    closeOrder,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addProduct,
    updateProduct,
    deleteProduct,
    addExternalProduct,
    updateExternalProduct,
    deleteExternalProduct,
    addSale,
    updateSale,
    deleteSale,
    openCashRegister,
    closeCashRegister,
    checkCashRegisterAccess,
    refreshData
  };

  return (
    <AppContext.Provider value={contextValue}>
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
