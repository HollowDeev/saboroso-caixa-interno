
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, Product, Sale, OrderItem, NewOrderItem, ServiceTax, ExternalProduct, User, CashRegister, Ingredient, AppContextType } from '@/types';
import { consumeStockForSale } from '@/utils/stockConsumption';
import { toast } from '@/components/ui/use-toast';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  
  // Data state
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [serviceTaxes, setServiceTaxes] = useState<ServiceTax[]>([]);
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegister | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Determine current user from localStorage or auth
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
      
      // Load all data in parallel
      const [
        ingredientsData,
        foodsData,
        externalProductsData,
        ordersData,
        salesData,
        serviceTaxesData,
        cashRegisterData
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

      // Set ingredients
      if (ingredientsData.data) {
        setIngredients(ingredientsData.data);
      }

      // Set products (foods)
      if (foodsData.data) {
        setProducts(foodsData.data.map(food => ({
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
        })));
      }

      // Set external products
      if (externalProductsData.data) {
        setExternalProducts(externalProductsData.data);
      }

      // Set orders
      if (ordersData.data) {
        const formattedOrders = ordersData.data.map(order => ({
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
      }

      // Set sales
      if (salesData.data) {
        const formattedSales = salesData.data.map(sale => ({
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
      }

      // Set service taxes
      if (serviceTaxesData.data) {
        setServiceTaxes(serviceTaxesData.data);
      }

      // Set cash register
      if (cashRegisterData.data) {
        const { data: cashRegister } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('id', cashRegisterData.data)
          .single();
        
        if (cashRegister) {
          setCurrentCashRegister(cashRegister);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    if (currentUser) {
      const ownerId = isEmployee ? 
        JSON.parse(localStorage.getItem('employee_data') || '{}').owner_id : 
        currentUser.id;
      await loadData(ownerId);
    }
  };

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentCashRegister) {
        throw new Error('Nenhum caixa aberto encontrado');
      }

      const ownerId = isEmployee ? 
        JSON.parse(localStorage.getItem('employee_data') || '{}').owner_id : 
        currentUser!.id;

      // Insert order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: order.customerName,
          table_number: order.tableNumber,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: order.status,
          user_id: ownerId,
          cash_register_id: currentCashRegister.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = order.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId,
        product_name: item.product?.name || item.product_name,
        product_type: 'current_stock' in (item.product || {}) ? 'external_product' : 'food',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        cash_register_id: currentCashRegister.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await refreshData();
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      // If closing order, process stock consumption and create sale
      if (updates.status === 'closed') {
        const order = orders.find(o => o.id === id);
        if (!order) throw new Error('Order not found');

        // Process stock consumption for each item
        for (const item of order.items) {
          const result = await consumeStockForSale(
            item.productId,
            item.quantity,
            currentUser!.id
          );
          
          if (!result.success && result.errors.length > 0) {
            console.warn('Stock consumption warnings:', result.errors);
            // Show warnings but don't prevent order closure
            toast({
              title: "Avisos de Estoque",
              description: result.errors.join(', '),
              variant: "destructive"
            });
          }
        }

        // Create sale record
        const { error: saleError } = await supabase
          .from('sales')
          .insert({
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total,
            payment_method: updates.paymentMethod || 'cash',
            customer_name: order.customerName,
            user_id: currentUser!.id,
            cash_register_id: order.cash_register_id || currentCashRegister!.id,
            order_id: order.id,
            is_direct_sale: false
          });

        if (saleError) throw saleError;
      }

      // Update order
      const { error } = await supabase
        .from('orders')
        .update({
          status: updates.status,
          payment_method: updates.paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await refreshData();
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  // Add stub methods for missing functions
  const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    // Implementation would go here
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    // Implementation would go here
  };

  const deleteIngredient = async (id: string) => {
    // Implementation would go here
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    // Implementation would go here
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    // Implementation would go here
  };

  const deleteProduct = async (id: string) => {
    // Implementation would go here
  };

  const addExternalProduct = async (product: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at'>) => {
    // Implementation would go here
  };

  const updateExternalProduct = async (id: string, updates: Partial<ExternalProduct>) => {
    // Implementation would go here
  };

  const deleteExternalProduct = async (id: string) => {
    // Implementation would go here
  };

  const addSale = async (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      if (!currentCashRegister) {
        throw new Error('Nenhum caixa aberto encontrado');
      }

      const ownerId = isEmployee ? 
        JSON.parse(localStorage.getItem('employee_data') || '{}').owner_id : 
        currentUser!.id;

      // Process stock consumption for each item
      for (const item of sale.items) {
        const result = await consumeStockForSale(
          item.productId,
          item.quantity,
          ownerId
        );
        
        if (!result.success && result.errors.length > 0) {
          console.warn('Stock consumption warnings:', result.errors);
        }
      }

      const { error } = await supabase
        .from('sales')
        .insert({
          ...sale,
          user_id: ownerId,
          cash_register_id: currentCashRegister.id
        });

      if (error) throw error;

      await refreshData();
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    // Implementation would go here
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refreshData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  };

  const openCashRegister = async (amount: number) => {
    try {
      const ownerId = isEmployee ? 
        JSON.parse(localStorage.getItem('employee_data') || '{}').owner_id : 
        currentUser!.id;

      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          owner_id: ownerId,
          opening_amount: amount,
          total_sales: 0,
          total_cost: 0,
          total_orders: 0,
          is_open: true
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCashRegister(data);
    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    }
  };

  const closeCashRegister = async (amount: number) => {
    try {
      if (!currentCashRegister) return;

      const { error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: amount,
          is_open: false,
          closed_at: new Date().toISOString()
        })
        .eq('id', currentCashRegister.id);

      if (error) throw error;

      setCurrentCashRegister(null);
    } catch (error) {
      console.error('Error closing cash register:', error);
      throw error;
    }
  };

  const checkCashRegisterAccess = () => {
    return !isEmployee; // Only admin can open/close cash register
  };

  const value: AppContextType = {
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
