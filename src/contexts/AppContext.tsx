
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, Product, Sale, OrderItem, NewOrderItem, ServiceTax, ExternalProduct, User, CashRegister, Ingredient } from '@/types';
import { consumeStockForSale } from '@/utils/stockConsumption';
import { toast } from '@/components/ui/use-toast';

interface AppContextType {
  orders: Order[];
  products: Product[];
  sales: Sale[];
  externalProducts: ExternalProduct[];
  serviceTaxes: ServiceTax[];
  currentUser: User | null;
  currentCashRegister: CashRegister | null;
  ingredients: Ingredient[];
  loading: boolean;
  error: string | null;
  isLoading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => Promise<void>;
  refreshData: () => void;
  checkCashRegisterAccess: () => Promise<boolean>;
  openCashRegister: (amount: number) => Promise<void>;
  closeCashRegister: (amount: number) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  addItemToOrder: (orderId: string, item: NewOrderItem) => Promise<void>;
  closeOrder: (orderId: string, paymentMethod: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addServiceTax: (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateServiceTax: (id: string, updates: Partial<ServiceTax>) => Promise<void>;
  deleteServiceTax: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [serviceTaxes, setServiceTaxes] = useState<ServiceTax[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegister | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Função para buscar dados do proprietário com base no usuário logado ou funcionário
  const getOwnerData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Se é um admin logado, usar o próprio ID
        return session.user.id;
      } else {
        // Se não há sessão, pode ser um funcionário
        // Verificar se há dados de funcionário no localStorage ou state management
        const employeeData = JSON.parse(localStorage.getItem('employee_data') || 'null');
        if (employeeData?.owner_id) {
          return employeeData.owner_id;
        }
      }
      
      return null;
    } catch (err) {
      console.error('Erro ao obter dados do proprietário:', err);
      return null;
    }
  };

  const fetchOrders = async () => {
    try {
      const ownerId = await getOwnerData();
      if (!ownerId) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
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
        `)
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders: Order[] = data.map(order => ({
        id: order.id,
        customerName: order.customer_name,
        tableNumber: order.table_number,
        items: order.order_items.map((item: any) => ({
          productId: item.product_id,
          product_name: item.product_name,
          product: { name: item.product_name },
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: order.status as Order['status'],
        paymentMethod: order.payment_method as Order['paymentMethod'],
        userId: order.user_id,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));

      setOrders(formattedOrders);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      setError('Erro ao carregar pedidos');
    }
  };

  const fetchProducts = async () => {
    try {
      const ownerId = await getOwnerData();
      if (!ownerId) return;

      // Buscar produtos (foods e external_products)
      const [foodsResponse, externalProductsResponse] = await Promise.all([
        supabase.from('foods').select('*').eq('owner_id', ownerId).is('deleted_at', null),
        supabase.from('external_products').select('*').eq('owner_id', ownerId)
      ]);

      if (foodsResponse.error) throw foodsResponse.error;
      if (externalProductsResponse.error) throw externalProductsResponse.error;

      const foods: Product[] = (foodsResponse.data || []).map(food => ({
        id: food.id,
        name: food.name,
        price: food.price,
        cost: food.cost,
        category: food.category,
        available: food.available,
        type: 'food' as const,
        description: food.description,
        preparationTime: food.preparation_time
      }));

      const external: ExternalProduct[] = (externalProductsResponse.data || []).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        current_stock: product.current_stock,
        min_stock: product.min_stock,
        brand: product.brand,
        owner_id: product.owner_id,
        category: 'Produtos Externos',
        available: product.current_stock > 0,
        type: 'external_product' as const,
        description: product.description
      }));

      const externalProducts: Product[] = external.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        category: 'Produtos Externos',
        available: product.current_stock > 0,
        type: 'external_product' as const,
        description: product.description
      }));

      setProducts([...foods, ...externalProducts]);
      setExternalProducts(external);
    } catch (err: any) {
      console.error('Erro ao buscar produtos:', err);
      setError('Erro ao carregar produtos');
    }
  };

  const fetchSales = async () => {
    try {
      const ownerId = await getOwnerData();
      if (!ownerId) return;

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSales: Sale[] = (data || []).map(sale => ({
        id: sale.id,
        customerName: sale.customer_name,
        items: sale.items || [],
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        paymentMethod: sale.payment_method as Sale['paymentMethod'],
        userId: sale.user_id,
        cashRegisterId: sale.cash_register_id,
        isDirectSale: sale.is_direct_sale,
        orderId: sale.order_id,
        createdAt: sale.created_at
      }));

      setSales(formattedSales);
    } catch (err: any) {
      console.error('Erro ao buscar vendas:', err);
      setError('Erro ao carregar vendas');
    }
  };

  const fetchServiceTaxes = async () => {
    try {
      const ownerId = await getOwnerData();
      if (!ownerId) return;

      const { data, error } = await supabase
        .from('service_taxes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTaxes: ServiceTax[] = (data || []).map(tax => ({
        id: tax.id,
        name: tax.name,
        percentage: tax.percentage,
        isActive: tax.is_active,
        description: tax.description,
        createdAt: new Date(tax.created_at),
        updatedAt: new Date(tax.updated_at)
      }));

      setServiceTaxes(formattedTaxes);
    } catch (err: any) {
      console.error('Erro ao buscar taxas:', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.name || session.user.email || '',
            email: profile.email || session.user.email || '',
            role: profile.role || 'cashier',
            created_at: new Date(profile.created_at),
            updated_at: new Date(profile.updated_at)
          });
        }
      } else {
        // Check for employee data
        const employeeData = JSON.parse(localStorage.getItem('employee_data') || 'null');
        if (employeeData) {
          setCurrentUser({
            id: employeeData.employee_id,
            name: employeeData.employee_name,
            email: '',
            role: 'employee',
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar usuário:', err);
    }
  };

  const checkCashRegisterAccess = async (): Promise<boolean> => {
    try {
      const ownerId = await getOwnerData();
      if (!ownerId) return false;

      const { data } = await supabase.rpc('get_open_cash_register', {
        p_owner_id: ownerId
      });

      if (data) {
        const { data: cashRegister } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('id', data)
          .single();

        if (cashRegister) {
          setCurrentCashRegister(cashRegister);
          return true;
        }
      }
      
      setCurrentCashRegister(null);
      return false;
    } catch (err) {
      console.error('Erro ao verificar caixa:', err);
      return false;
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchOrders(),
        fetchProducts(),
        fetchSales(),
        fetchServiceTaxes(),
        fetchCurrentUser(),
        checkCashRegisterAccess()
      ]);
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Placeholder implementations for missing functions
  const openCashRegister = async (amount: number) => {
    console.log('openCashRegister called with amount:', amount);
  };

  const closeCashRegister = async (amount: number) => {
    console.log('closeCashRegister called with amount:', amount);
  };

  const deleteSale = async (id: string) => {
    console.log('deleteSale called with id:', id);
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    console.log('updateSale called with id:', id, 'updates:', updates);
  };

  const addItemToOrder = async (orderId: string, item: NewOrderItem) => {
    console.log('addItemToOrder called with orderId:', orderId, 'item:', item);
  };

  const closeOrder = async (orderId: string, paymentMethod: string) => {
    console.log('closeOrder called with orderId:', orderId, 'paymentMethod:', paymentMethod);
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('addProduct called with product:', product);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    console.log('updateProduct called with id:', id, 'updates:', updates);
  };

  const deleteProduct = async (id: string) => {
    console.log('deleteProduct called with id:', id);
  };

  const addServiceTax = async (tax: Omit<ServiceTax, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('addServiceTax called with tax:', tax);
  };

  const updateServiceTax = async (id: string, updates: Partial<ServiceTax>) => {
    console.log('updateServiceTax called with id:', id, 'updates:', updates);
  };

  const deleteServiceTax = async (id: string) => {
    console.log('deleteServiceTax called with id:', id);
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const ownerId = await getOwnerData();
      if (!ownerId) throw new Error('Usuário não identificado');

      // Buscar caixa aberto
      const { data: cashRegister } = await supabase.rpc('get_open_cash_register', {
        p_owner_id: ownerId
      });

      if (!cashRegister) {
        throw new Error('Não há caixa aberto. Abra o caixa primeiro.');
      }

      // Criar ordem
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: orderData.customerName,
          table_number: orderData.tableNumber,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          total: orderData.total,
          status: 'open',
          user_id: ownerId,
          cash_register_id: cashRegister
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar itens da ordem
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.product.name,
        product_type: item.product.type || 'food',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        cash_register_id: cashRegister
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await refreshData();
      
      toast({
        title: "Sucesso",
        description: "Comanda criada com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar comanda",
        variant: "destructive"
      });
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
          status: updates.status,
          payment_method: updates.paymentMethod
        })
        .eq('id', id);

      if (error) throw error;

      // Se a ordem foi fechada, criar venda e consumir estoque
      if (updates.status === 'closed') {
        const order = orders.find(o => o.id === id);
        if (order) {
          const ownerId = await getOwnerData();
          if (!ownerId) throw new Error('Usuário não identificado');

          // Buscar caixa aberto
          const { data: cashRegister } = await supabase.rpc('get_open_cash_register', {
            p_owner_id: ownerId
          });

          if (!cashRegister) {
            throw new Error('Não há caixa aberto.');
          }

          // Criar venda
          const { error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_name: order.customerName,
              subtotal: order.subtotal,
              tax: order.tax,
              total: order.total,
              payment_method: order.paymentMethod || 'cash',
              user_id: ownerId,
              cash_register_id: cashRegister,
              order_id: order.id,
              is_direct_sale: false,
              items: order.items.map(item => ({
                productId: item.productId,
                product_name: item.product_name || item.product.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
              }))
            });

          if (saleError) throw saleError;

          // Consumir estoque
          for (const item of order.items) {
            await consumeStockForSale(item.productId, item.quantity, ownerId);
          }
        }
      }

      await refreshData();
      
      toast({
        title: "Sucesso",
        description: "Comanda atualizada com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar pedido:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar comanda",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      const ownerId = await getOwnerData();
      if (!ownerId) throw new Error('Usuário não identificado');

      // Buscar caixa aberto
      const { data: cashRegister } = await supabase.rpc('get_open_cash_register', {
        p_owner_id: ownerId
      });

      if (!cashRegister) {
        throw new Error('Não há caixa aberto. Abra o caixa primeiro.');
      }

      const { error } = await supabase
        .from('sales')
        .insert({
          customer_name: saleData.customerName,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          total: saleData.total,
          payment_method: saleData.paymentMethod,
          user_id: ownerId,
          cash_register_id: cashRegister,
          is_direct_sale: saleData.isDirectSale || saleData.is_direct_sale,
          items: saleData.items
        });

      if (error) throw error;

      // Consumir estoque para cada item da venda
      if (saleData.items && Array.isArray(saleData.items)) {
        for (const item of saleData.items) {
          await consumeStockForSale(item.productId, item.quantity, ownerId);
        }
      }

      await refreshData();
      
      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao registrar venda:', error);
      toast({
        title: "Erro", 
        description: error.message || "Erro ao registrar venda",
        variant: "destructive"
      });
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      orders,
      products,
      sales,
      externalProducts,
      serviceTaxes,
      currentUser,
      currentCashRegister,
      ingredients,
      loading,
      error,
      isLoading,
      addOrder,
      updateOrder,
      addSale,
      refreshData,
      checkCashRegisterAccess,
      openCashRegister,
      closeCashRegister,
      deleteSale,
      updateSale,
      addItemToOrder,
      closeOrder,
      addProduct,
      updateProduct,
      deleteProduct,
      addServiceTax,
      updateServiceTax,
      deleteServiceTax
    }}>
      {children}
    </AppContext.Provider>
  );
};
