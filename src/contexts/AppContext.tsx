import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, Product, Sale, OrderItem, NewOrderItem } from '@/types';
import { consumeStockForSale } from '@/utils/stockConsumption';
import { toast } from '@/components/ui/use-toast';

interface AppContextType {
  orders: Order[];
  products: Product[];
  sales: Sale[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => Promise<void>;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const externalProducts: Product[] = (externalProductsResponse.data || []).map(product => ({
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

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchOrders(),
        fetchProducts(),
        fetchSales()
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
      addOrder,
      updateOrder,
      addSale,
      loading,
      error,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};
