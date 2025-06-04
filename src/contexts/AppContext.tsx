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
      lastUpdated: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '2',
      name: 'Queijo Mussarela',
      unit: 'kg',
      currentStock: 8,
      minStock: 3,
      cost: 25.00,
      supplier: 'Laticínios Vale',
      lastUpdated: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '3',
      name: 'Massa de Pizza',
      unit: 'unidade',
      currentStock: 20,
      minStock: 10,
      cost: 2.50,
      lastUpdated: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Pizza Margherita',
      category: 'Pizza',
      price: 35.90,
      cost: 15.00,
      description: 'Pizza clássica com tomate, mussarela e manjericão',
      ingredients: [
        { ingredientId: '1', quantity: 0.2 },
        { ingredientId: '2', quantity: 0.15 },
        { ingredientId: '3', quantity: 1 }
      ],
      available: true,
      preparationTime: 15,
      created_at: new Date(),
      updated_at: new Date()
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
        console.log('=== INICIANDO CARREGAMENTO DO USUÁRIO ===');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Sessão atual:', session);

        if (session?.user) {
          console.log('Dados do usuário na sessão:', {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
            aud: session.user.aud,
          });

          // Buscar dados do perfil
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          console.log('Dados do perfil:', profile);
          console.log('Erro ao buscar perfil:', profileError);

          if (profileError) throw profileError;

          if (profile) {
            const role = profile.role?.toLowerCase();
            const validRole = role === 'admin' || role === 'manager' || role === 'cashier' ? role : 'cashier';

            const userData: User = {
              id: session.user.id,
              name: profile.name || 'Admin',
              email: session.user.email || '',
              role: validRole,
              created_at: new Date(profile.created_at),
              updated_at: new Date(profile.updated_at || profile.created_at)
            };

            console.log('Dados finais do usuário:', userData);
            setCurrentUser(userData);
          }
        } else {
          console.log('Nenhuma sessão encontrada');
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
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Buscar todos os itens das comandas da tabela cash_register_sales
      const { data: itemsData, error: itemsError } = await supabase
        .from('cash_register_sales')
        .select('*')
        .in('order_id', ordersData.map(order => order.id));

      if (itemsError) throw itemsError;

      // Agrupar itens por comanda
      const itemsByOrder = itemsData.reduce((acc: { [key: string]: any[] }, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      // Converter para o formato esperado pela aplicação
      const formattedOrders = ordersData?.map(order => ({
        id: order.id,
        customerName: order.customer_name || '',
        tableNumber: order.table_number || 0,
        items: (itemsByOrder[order.id] || []).map(item => ({
          id: item.id,
          cash_register_id: item.cash_register_id,
          order_id: item.order_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_cost: item.product_cost,
          profit: item.profit,
          sale_date: new Date(item.sale_date),
          created_at: new Date(item.created_at)
        })),
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        total: order.total || 0,
        status: order.status as 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled',
        paymentMethod: order.payment_method as 'cash' | 'card' | 'pix',
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
    console.log('=== VERIFICANDO ACESSO AO CAIXA ===');
    console.log('Dados do usuário atual:', currentUser);
    console.log('Role do usuário:', currentUser?.role);
    const hasAccess = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'manager';
    console.log('Tem acesso ao caixa:', hasAccess);
    return hasAccess;
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

  const isValidOrderStatus = (status: string): status is OrderStatus => {
    return ['pending', 'preparing', 'ready', 'delivered', 'paid', 'cancelled'].includes(status);
  };

  const isValidPaymentMethod = (method: string): method is PaymentMethod => {
    return ['cash', 'card', 'pix'].includes(method);
  };

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> => {
    if (!currentUser?.id || !currentCashRegister) {
      throw new Error('Usuário ou caixa não encontrado');
    }

    try {
      // Validar status e método de pagamento
      const orderStatus = order.status;
      if (!isValidOrderStatus(orderStatus)) {
        throw new Error('Status de comanda inválido');
      }

      const paymentMethod = order.paymentMethod || 'cash';
      if (!isValidPaymentMethod(paymentMethod)) {
        throw new Error('Método de pagamento inválido');
      }

      // 1. Criar a comanda primeiro
      const orderData = {
        customer_name: order.customerName,
        table_number: order.tableNumber,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: orderStatus,
        payment_method: paymentMethod,
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Erro ao criar comanda:', orderError);
        throw orderError;
      }

      if (!orderResult) {
        throw new Error('Erro ao criar comanda: nenhum resultado retornado');
      }

      // 2. Preparar os itens para inserção
      const orderItems = order.items.map(item => {
        // Garantir que temos o nome do produto
        if (!item.product?.name) {
          throw new Error(`Item sem nome do produto: ${JSON.stringify(item)}`);
        }

        return {
          cash_register_id: currentCashRegister.id,
          order_id: orderResult.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.quantity * item.product.price,
          product_cost: item.product.cost || 0,
          profit: (item.quantity * item.product.price) - (item.product.cost || 0) * item.quantity,
          sale_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
      });

      // 3. Inserir os itens
      const { error: itemsError } = await supabase
        .from('cash_register_sales')
        .insert(orderItems);

      if (itemsError) {
        console.error('Erro ao inserir itens:', itemsError);
        // Se falhar ao inserir os itens, deletar a comanda criada
        await supabase.from('orders').delete().eq('id', orderResult.id);
        throw itemsError;
      }

      // 4. Buscar os itens salvos para confirmar
      const { data: savedItems, error: fetchItemsError } = await supabase
        .from('cash_register_sales')
        .select('*')
        .eq('order_id', orderResult.id);

      if (fetchItemsError) {
        console.error('Erro ao buscar itens salvos:', fetchItemsError);
        throw fetchItemsError;
      }

      // 5. Criar o objeto final da comanda com todos os dados
      const newOrder: Order = {
        id: orderResult.id,
        customerName: orderResult.customer_name || '',
        tableNumber: orderResult.table_number || 0,
        items: savedItems.map(item => ({
          id: item.id,
          cash_register_id: item.cash_register_id,
          order_id: item.order_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_cost: item.product_cost,
          profit: item.profit,
          sale_date: new Date(item.sale_date),
          created_at: new Date(item.created_at)
        })),
        subtotal: orderResult.subtotal,
        tax: orderResult.tax,
        total: orderResult.total,
        status: orderStatus,
        paymentMethod: paymentMethod,
        createdAt: new Date(orderResult.created_at),
        updatedAt: new Date(orderResult.updated_at),
        userId: orderResult.user_id
      };

      // 6. Atualizar o estado local
      setOrders(prev => [...prev, newOrder]);

      return newOrder;
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
        return {
          cash_register_id: currentCashRegister.id,
          order_id: order.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_cost: item.product_cost,
          profit: item.profit,
          sale_date: new Date().toISOString(),
          created_at: new Date().toISOString()
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

  const updateOrder = async (id: string, orderUpdate: Partial<Order>) => {
    if (!currentUser?.id || !currentCashRegister) return;

    try {
      const currentOrder = orders.find(o => o.id === id);
      if (!currentOrder) throw new Error('Comanda não encontrada');

      // Validar status e método de pagamento
      const orderStatus = orderUpdate.status || currentOrder.status;
      if (!isValidOrderStatus(orderStatus)) {
        throw new Error('Status de comanda inválido');
      }

      const paymentMethod = orderUpdate.paymentMethod || currentOrder.paymentMethod || 'cash';
      if (!isValidPaymentMethod(paymentMethod)) {
        throw new Error('Método de pagamento inválido');
      }

      // Preparar dados para atualização
      const orderData = {
        customer_name: orderUpdate.customerName,
        table_number: orderUpdate.tableNumber,
        subtotal: orderUpdate.subtotal,
        tax: orderUpdate.tax,
        total: orderUpdate.total,
        status: orderStatus,
        payment_method: paymentMethod,
        updated_at: new Date().toISOString()
      };

      // Remover campos undefined
      Object.keys(orderData).forEach(key => {
        if (orderData[key] === undefined) {
          delete orderData[key];
        }
      });

      // Atualizar a comanda
      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', id)
        .select()
        .single();

      if (orderError) throw orderError;

      // Se houver novos itens, atualizar a tabela cash_register_sales
      if (orderUpdate.items && orderUpdate.items.length > 0) {
        // Primeiro, remover os itens antigos
        const { error: deleteError } = await supabase
          .from('cash_register_sales')
          .delete()
          .eq('order_id', id);

        if (deleteError) throw deleteError;

        // Depois, inserir os novos itens
        const { error: insertError } = await supabase
          .from('cash_register_sales')
          .insert(orderUpdate.items.map(item => ({
            cash_register_id: currentCashRegister.id,
            order_id: id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            product_cost: item.product_cost,
            profit: item.profit,
            sale_date: new Date().toISOString(),
            created_at: new Date().toISOString()
          })));

        if (insertError) throw insertError;
      }

      // Buscar os itens atualizados
      const { data: savedItems, error: fetchItemsError } = await supabase
        .from('cash_register_sales')
        .select('*')
        .eq('order_id', id);

      if (fetchItemsError) throw fetchItemsError;

      // Criar objeto da ordem atualizada
      const updatedOrder: Order = {
        ...currentOrder,
        customerName: orderResult.customer_name || currentOrder.customerName,
        tableNumber: orderResult.table_number || currentOrder.tableNumber,
        subtotal: orderResult.subtotal || currentOrder.subtotal,
        tax: orderResult.tax || currentOrder.tax,
        total: orderResult.total || currentOrder.total,
        status: orderStatus,
        paymentMethod: paymentMethod,
        items: savedItems.map(item => ({
          id: item.id,
          cash_register_id: item.cash_register_id,
          order_id: item.order_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_cost: item.product_cost,
          profit: item.profit,
          sale_date: new Date(item.sale_date),
          created_at: new Date(item.created_at)
        })),
        updatedAt: new Date(orderResult.updated_at)
      };

      // Se a comanda foi marcada como "paid", criar uma venda e atualizar o caixa
      if (orderUpdate.status === 'paid' && currentOrder.status !== 'paid') {
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

          // Atualizar totais do caixa
          await supabase
            .from('cash_registers')
            .update({
              total_sales: currentCashRegister.total_sales + updatedOrder.total,
              total_orders: currentCashRegister.total_orders + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentCashRegister.id);
        }
      }

      // Atualizar o estado local imediatamente
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
