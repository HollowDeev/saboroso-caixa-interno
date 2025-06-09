import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { User, Ingredient, Product, ExternalProduct, Order, Sale, ServiceTax, CashRegister, AppContextType, OrderItem, NewOrderItem, PaymentMethod } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast"

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEmployee, setIsEmployee] = useState<boolean>(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [serviceTaxes, setServiceTaxes] = useState<ServiceTax[]>([]);
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegister | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const loadData = async () => {
    if (!currentUser?.id) return;

    try {
      setIsLoading(true);
      console.log('Loading data for user:', currentUser.id, 'role:', currentUser.role);

      // Para funcionários, usar o owner_id; para admin, usar o próprio id
      const ownerId = currentUser.role === 'employee'
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser.id;

      console.log('Using owner ID:', ownerId);

      // Load ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name');

      if (ingredientsError) throw ingredientsError;
      console.log('Ingredients loaded:', ingredientsData);
      setIngredients(ingredientsData || []);

      // Load foods (products) with ingredients
      const { data: foodsData, error: foodsError } = await supabase
        .from('foods')
        .select(`
          *,
          food_ingredients (
            id,
            ingredient_id,
            quantity,
            unit,
            created_at,
            updated_at
          )
        `)
        .eq('owner_id', ownerId)
        .is('deleted_at', null)
        .order('name');

      if (foodsError) throw foodsError;
      console.log('Products loaded:', foodsData);
      setProducts((foodsData || []).map(food => ({
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
        updated_at: food.updated_at,
        ingredients: (food.food_ingredients || []).map((fi: any) => ({
          id: fi.id,
          food_id: food.id,
          ingredient_id: fi.ingredient_id,
          quantity: fi.quantity,
          unit: fi.unit,
          created_at: fi.created_at,
          updated_at: fi.updated_at
        }))
      })));

      // Load external products
      const { data: externalProductsData, error: externalProductsError } = await supabase
        .from('external_products')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name');

      if (externalProductsError) throw externalProductsError;
      console.log('External products loaded:', externalProductsData);
      setExternalProducts(externalProductsData || []);

      // Load orders with items - usar ownerId tanto para user_id quanto para filtrar por dono
      const { data: ordersData, error: ordersError } = await supabase
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
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      console.log('Orders loaded:', ordersData);

      const formattedOrders: Order[] = (ordersData || []).map(order => ({
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

      // Load sales - usar ownerId
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;
      console.log('Sales loaded:', salesData);
      setSales((salesData || []).map(sale => ({
        id: sale.id,
        items: Array.isArray(sale.items) ? (sale.items as any[]).map((item: any) => ({
          id: item.id || '',
          productId: item.productId || item.product_id || '',
          product_name: item.product_name || item.name || '',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || item.unit_price || 0,
          totalPrice: item.totalPrice || item.total_price || 0,
          product_type: item.product_type || 'food'
        })) : [],
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
      })));

      // Load service taxes
      const { data: serviceTaxesData, error: serviceTaxesError } = await supabase
        .from('service_taxes')
        .select('*')
        .order('name');

      if (serviceTaxesError) throw serviceTaxesError;
      setServiceTaxes(serviceTaxesData || []);

      // Load current cash register - usar ownerId
      const { data: cashRegisterData, error: cashRegisterError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_open', true)
        .single();

      if (cashRegisterError && cashRegisterError.code !== 'PGRST116') {
        throw cashRegisterError;
      }

      setCurrentCashRegister(cashRegisterData || null);

      console.log('Data loading completed successfully');

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do sistema.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    const storedEmployee = localStorage.getItem('employee_data');

    if (storedEmployee) {
      const employee = JSON.parse(storedEmployee);
      setCurrentUser({
        id: employee.id,
        name: employee.name,
        email: employee.email || '',
        role: 'employee',
        owner_id: employee.owner_id
      });
      setIsEmployee(true);
    } else if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser({
        id: user.id,
        name: user.name || user.email || '',
        email: user.email,
        role: user.role || 'cashier'
      });
      setIsEmployee(user.role === 'employee');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !storedEmployee) {
        console.log('Got session:', session);
        const userData = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email || '',
          email: session.user.email || '',
          role: session.user.user_metadata?.role || 'cashier'
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        setIsEmployee(userData.role === 'employee');
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !storedEmployee) {
        console.log('Got session:', session);
        const userData = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email || '',
          email: session.user.email || '',
          role: session.user.user_metadata?.role || 'cashier'
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        setIsEmployee(userData.role === 'employee');
      } else if (!session && !storedEmployee) {
        console.log('No session:', session);
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
        setIsEmployee(false);
      }
    });
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadData();
    }
  }, [currentUser]);

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const ownerId = currentUser?.role === 'employee'
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser?.id;

      // Primeiro, criar a comanda
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: ownerId,
          cash_register_id: currentCashRegister?.id || '',
          customer_name: order.customerName,
          table_number: order.tableNumber,
          subtotal: order.subtotal,
          tax: 0, // Removida a taxa automática
          total: order.subtotal, // Total agora é igual ao subtotal
          status: order.status,
          payment_method: order.paymentMethod
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Depois, criar os itens da comanda
      if (order.items && order.items.length > 0) {
        const orderItems = order.items.map(item => ({
          order_id: orderData.id,
          product_id: item.productId,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          product_type: 'current_stock' in item.product ? 'external_product' : 'food',
          cash_register_id: currentCashRegister?.id || ''
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      await loadData();
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      const dbUpdates: any = {};
      if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
      if (updates.tableNumber !== undefined) dbUpdates.table_number = updates.tableNumber;
      if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
      if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
      if (updates.total !== undefined) dbUpdates.total = updates.total;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.cash_register_id !== undefined) dbUpdates.cash_register_id = updates.cash_register_id;

      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const addItemToOrder = async (orderId: string, item: NewOrderItem) => {
    try {
      // Determinar o tipo de produto
      const isExternalProduct = 'current_stock' in item.product;

      // Primeiro, adicionar o item
      const { data, error } = await supabase
        .from('order_items')
        .insert([{
          order_id: orderId,
          product_id: item.productId,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          product_type: isExternalProduct ? 'external_product' : 'food',
          cash_register_id: currentCashRegister?.id || ''
        }])
        .select()
        .single();

      if (error) throw error;

      // Buscar todos os itens da comanda para recalcular os totais
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Calcular novos totais
      const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
      const total = subtotal; // Removida a taxa automática

      // Atualizar os totais da comanda
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          subtotal,
          tax: 0,
          total,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      await loadData();
    } catch (error) {
      console.error('Error adding item to order:', error);
      throw error;
    }
  };

  const closeOrder = async (orderId: string, paymentMethod: PaymentMethod) => {
    try {
      // Buscar a comanda e seus itens
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Processar o consumo de estoque
      const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
      const stockResult = await processOrderItemsStockConsumption(
        order.order_items.map((item: any) => ({
          productId: item.product_id,
          quantity: item.quantity,
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            available: true,
            product_type: item.product_type
          }
        })),
        currentUser!.id,
        'Fechamento de Comanda'
      );

      // Se há erros críticos de estoque, mostrar aviso mas permitir continuar
      if (!stockResult.success && stockResult.errors.some(error => error.includes('Estoque insuficiente'))) {
        const proceed = window.confirm(
          `Atenção: Alguns itens têm estoque insuficiente:\n\n${stockResult.errors.join('\n')}\n\nDeseja continuar mesmo assim?`
        );

        if (!proceed) {
          throw new Error('Operação cancelada pelo usuário');
        }
      }

      // Criar a venda
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          order_id: orderId,
          total: order.total,
          subtotal: order.total,
          tax: 0,
          payment_method: paymentMethod,
          user_id: currentUser!.id,
          cash_register_id: currentCashRegister!.id,
          is_direct_sale: false,
          customer_name: order.customer_name,
          items: order.order_items.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            product_type: item.product_type || 'food'
          }))
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Atualizar o status da comanda
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'closed',
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      await loadData();
    } catch (error) {
      console.error('Error closing order:', error);
      throw error;
    }
  };

  const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const ownerId = currentUser?.role === 'employee'
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser?.id;

      const { data, error } = await supabase
        .from('ingredients')
        .insert([{ ...ingredient, owner_id: ownerId }])
        .select()
        .single();

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      throw error;
    }
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  };

  const deleteIngredient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const ownerId = currentUser?.role === 'employee'
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser?.id;

      const { data, error } = await supabase
        .from('foods')
        .insert([{ ...product, owner_id: ownerId }])
        .select()
        .single();

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('foods')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const addExternalProduct = async (product: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const ownerId = currentUser?.role === 'employee'
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser?.id;

      const { data, error } = await supabase
        .from('external_products')
        .insert([{ ...product, owner_id: ownerId }])
        .select()
        .single();

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error adding external product:', error);
      throw error;
    }
  };

  const updateExternalProduct = async (id: string, updates: Partial<ExternalProduct>) => {
    try {
      const { error } = await supabase
        .from('external_products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating external product:', error);
      throw error;
    }
  };

  const deleteExternalProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('external_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting external product:', error);
      throw error;
    }
  };

  const addSale = async (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      if (!currentUser) throw new Error('Usuário não autenticado');
      if (!currentCashRegister) throw new Error('Não há caixa aberto');

      const ownerId = currentUser.role === 'employee'
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser.id;

      // Converter os itens para o formato esperado pelo Supabase
      const formattedItems = sale.items.map(item => ({
        product_id: item.productId,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        product_type: item.product_type
      }));

      const { data, error } = await supabase
        .from('sales')
        .insert({
          user_id: sale.userId,
          customer_name: sale.customerName,
          items: formattedItems,
          subtotal: sale.total, // Usando o total como subtotal
          tax: 0, // Taxa sempre será 0
          total: sale.total,
          payment_method: sale.paymentMethod,
          cash_register_id: sale.cash_register_id,
          order_id: sale.order_id,
          is_direct_sale: sale.is_direct_sale
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar o caixa
      const { error: updateError } = await supabase
        .from('cash_registers')
        .update({
          total_sales: currentCashRegister.total_sales + sale.total,
          total_orders: currentCashRegister.total_orders + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCashRegister.id);

      if (updateError) throw updateError;

      await loadData();
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const dbUpdates: any = {};
      if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
      if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
      if (updates.total !== undefined) dbUpdates.total = updates.total;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.cash_register_id !== undefined) dbUpdates.cash_register_id = updates.cash_register_id;
      if (updates.order_id !== undefined) dbUpdates.order_id = updates.order_id;
      if (updates.is_direct_sale !== undefined) dbUpdates.is_direct_sale = updates.is_direct_sale;

      const { error } = await supabase
        .from('sales')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      if (!currentUser || !currentCashRegister) {
        throw new Error('Usuário não autenticado ou caixa não está aberto');
      }

      // Primeiro, buscar os dados da venda antes de excluir
      const { data: sale, error: fetchError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar o caixa (subtrair o valor da venda)
      const { error: updateCashError } = await supabase
        .from('cash_registers')
        .update({
          total_sales: currentCashRegister.total_sales - sale.total,
          total_orders: currentCashRegister.total_orders - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sale.cash_register_id);

      if (updateCashError) throw updateCashError;

      // Reverter o consumo de estoque
      const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');
      const items = Array.isArray(sale.items) ? sale.items : [];

      console.log('Revertendo estoque para os itens:', items);

      // Reverter o estoque (quantidade negativa para adicionar de volta)
      if (items.length > 0) {
        await processOrderItemsStockConsumption(
          items.map((item: any) => {
            console.log('Processando item para reversão:', item);
            return {
              productId: item.product_id,
              quantity: -(item.quantity), // Quantidade negativa para reverter
              product: {
                id: item.product_id,
                name: item.product_name,
                price: item.unit_price,
                available: true,
                product_type: item.product_type
              }
            };
          }),
          currentUser.id,
          'Exclusão de Venda'
        );
      }

      // Finalmente, excluir a venda
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
        .eq('cash_register_id', currentCashRegister.id);

      if (deleteError) throw deleteError;

      // Atualizar o estado local
      setSales(prevSales => prevSales.filter(s => s.id !== id));

      // Recarregar os dados para garantir sincronização
      await loadData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  };

  const addServiceTax = async (serviceTax: Omit<ServiceTax, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('service_taxes')
        .insert([serviceTax])
        .select()
        .single();

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error adding service tax:', error);
      throw error;
    }
  };

  const updateServiceTax = async (id: string, updates: Partial<ServiceTax>) => {
    try {
      const { error } = await supabase
        .from('service_taxes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating service tax:', error);
      throw error;
    }
  };

  const deleteServiceTax = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_taxes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting service tax:', error);
      throw error;
    }
  };

  const openCashRegister = async (amount: number) => {
    try {
      const ownerId = currentUser?.role === 'employee'
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser?.id;

      const { data, error } = await supabase
        .from('cash_registers')
        .insert([{
          owner_id: ownerId,
          opening_amount: amount,
          total_sales: 0,
          total_cost: 0,
          total_orders: 0,
          is_open: true,
          opened_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    }
  };

  const closeCashRegister = async (amount: number) => {
    try {
      const { error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: amount,
          is_open: false,
          closed_at: new Date().toISOString()
        })
        .eq('id', currentCashRegister?.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error closing cash register:', error);
      throw error;
    }
  };

  const updateStock = async (itemType: 'ingredient' | 'external_product', itemId: string, quantity: number, reason: string) => {
    try {
      const { data, error } = await supabase.rpc(
        quantity > 0 ? 'add_stock' : 'remove_stock',
        {
          p_item_type: itemType,
          p_item_id: itemId,
          p_quantity: Math.abs(quantity),
          p_reason: reason,
          p_user_id: currentUser?.id
        }
      );

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  };

  const checkCashRegisterAccess = () => {
    if (!currentUser) return false;
    return ['admin', 'manager', 'cashier'].includes(currentUser.role);
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
    addServiceTax,
    updateServiceTax,
    deleteServiceTax,
    openCashRegister,
    closeCashRegister,
    checkCashRegisterAccess,
    updateStock,
    refreshData: loadData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const useApp = useAppContext;
