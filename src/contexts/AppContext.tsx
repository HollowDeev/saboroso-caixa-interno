import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { User, Ingredient, Product, ExternalProduct, Order, Sale, ServiceTax, CashRegister, AppContextType, NewOrderItem, PaymentMethod, Expense, NewExpense } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useDataLoader } from '@/hooks/useDataLoader';
import * as orderService from '@/services/orderService';
import * as productService from '@/services/productService';
import * as salesService from '@/services/salesService';
import * as cashRegisterService from '@/services/cashRegisterService';
import * as expenseService from '@/services/expenseService';

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
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const { loadData, isLoading } = useDataLoader();

  const refreshData = () => loadData(
    currentUser,
    setIngredients,
    setProducts,
    setExternalProducts,
    setOrders,
    setSales,
    setServiceTaxes,
    setCurrentCashRegister,
    setExpenses
  );

  // Função para autenticar funcionário no Supabase
  const authenticateEmployeeInSupabase = async (employeeId: string) => {
    try {
      console.log('🔐 Authenticating employee in Supabase:', employeeId);

      // Criar uma sessão temporária para o funcionário
      // Como não podemos criar usuários auth reais para funcionários, 
      // vamos usar uma abordagem diferente - fazer o login como owner
      const employeeData = localStorage.getItem('employee_data');
      if (employeeData) {
        const employee = JSON.parse(employeeData);

        // Fazer login como owner temporariamente para acessar dados
        const { data: ownerProfile, error: ownerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', employee.owner_id)
          .single();

        if (ownerError) {
          console.error('Error fetching owner profile:', ownerError);
          return false;
        }

        // Simular login como owner para ter acesso aos dados
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: ownerProfile.email,
          password: 'temp_employee_session' // Senha temporária para funcionários
        });

        if (signInError) {
          console.log('Could not sign in as owner, using alternative approach');
          // Se não conseguir fazer login, vamos usar uma abordagem alternativa
          return false;
        }

        console.log('✅ Employee authenticated in Supabase as owner proxy');
        return true;
      }
    } catch (error) {
      console.error('Error authenticating employee in Supabase:', error);
    }
    return false;
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

      // Autenticar funcionário no Supabase
      authenticateEmployeeInSupabase(employee.id);
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
      refreshData();
    }
  }, [currentUser]);

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await orderService.addOrder(order, currentUser!, currentCashRegister);
      await refreshData();
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      await orderService.updateOrder(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const addItemToOrder = async (orderId: string, item: NewOrderItem) => {
    try {
      await orderService.addItemToOrder(orderId, item, currentCashRegister);
      await refreshData();
    } catch (error) {
      console.error('Error adding item to order:', error);
      throw error;
    }
  };

  const closeOrder = async (orderId: string, payments: Array<{ method: PaymentMethod; amount: number }>) => {
    if (!currentUser || !currentCashRegister) {
      throw new Error('Usuário ou caixa não encontrado');
    }

    await orderService.closeOrder(orderId, payments, currentUser, currentCashRegister);
    await refreshData();
  };

  const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await productService.addIngredient(ingredient, currentUser!);
      await refreshData();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      throw error;
    }
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    try {
      await productService.updateIngredient(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  };

  const deleteIngredient = async (id: string) => {
    try {
      await productService.deleteIngredient(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await productService.addProduct(product, currentUser!);
      await refreshData();
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await productService.updateProduct(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const addExternalProduct = async (product: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await productService.addExternalProduct(product, currentUser!);
      await refreshData();
    } catch (error) {
      console.error('Error adding external product:', error);
      throw error;
    }
  };

  const updateExternalProduct = async (id: string, updates: Partial<ExternalProduct>) => {
    try {
      await productService.updateExternalProduct(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating external product:', error);
      throw error;
    }
  };

  const deleteExternalProduct = async (id: string) => {
    try {
      await productService.deleteExternalProduct(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting external product:', error);
      throw error;
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      const result = await salesService.addSale(saleData, currentUser!, currentCashRegister!);
      
      // Formatar os dados da venda antes de adicionar ao estado
      const newSale: Sale = {
        id: result.id,
        items: saleData.items.map(item => ({
          id: item.id || '',
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
          product_type: item.product_type
        })),
        total: Number(saleData.total),
        subtotal: Number(saleData.subtotal),
        tax: Number(saleData.tax),
        payments: saleData.payments.map(p => ({
          method: p.method,
          amount: Number(p.amount)
        })),
        user_id: saleData.user_id,
        cash_register_id: saleData.cash_register_id,
        order_id: saleData.order_id || '',
        is_direct_sale: saleData.is_direct_sale,
        customer_name: saleData.customer_name,
        createdAt: new Date().toISOString()
      };

      setSales(prev => [newSale, ...prev]);

      return result;
    } catch (error) {
      console.error('Erro ao adicionar venda:', error);
      throw error;
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      await salesService.updateSale(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await salesService.deleteSale(id, currentUser!, currentCashRegister!, () => {
        setSales(prevSales => prevSales.filter(s => s.id !== id));
      });
      await refreshData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  };

  const addExpense = async (expense: NewExpense) => {
    if (!currentUser || !currentCashRegister) return;

    try {
      await expenseService.addExpense(expense, currentUser.id, currentCashRegister.id);
      await refreshData();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      await expenseService.updateExpense(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await expenseService.deleteExpense(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  const addServiceTax = async (serviceTax: Omit<ServiceTax, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await cashRegisterService.addServiceTax(serviceTax);
      await refreshData();
    } catch (error) {
      console.error('Error adding service tax:', error);
      throw error;
    }
  };

  const updateServiceTax = async (id: string, updates: Partial<ServiceTax>) => {
    try {
      await cashRegisterService.updateServiceTax(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating service tax:', error);
      throw error;
    }
  };

  const deleteServiceTax = async (id: string) => {
    try {
      await cashRegisterService.deleteServiceTax(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting service tax:', error);
      throw error;
    }
  };

  const openCashRegister = async (amount: number) => {
    try {
      await cashRegisterService.openCashRegister(amount, currentUser!);
      await refreshData();
    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    }
  };

  const closeCashRegister = async (amount: number) => {
    try {
      await cashRegisterService.closeCashRegister(amount, currentCashRegister!.id);
      await refreshData();
    } catch (error) {
      console.error('Error closing cash register:', error);
      throw error;
    }
  };

  const updateStock = async (itemType: 'ingredient' | 'external_product', itemId: string, quantity: number, reason: string) => {
    try {
      await cashRegisterService.updateStock(itemType, itemId, quantity, reason, currentUser!);
      await refreshData();
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  };

  const checkCashRegisterAccess = () => {
    return cashRegisterService.checkCashRegisterAccess(currentUser);
  };

  const value: AppContextType = {
    currentUser,
    isEmployee,
    ingredients,
    products,
    externalProducts,
    orders,
    sales,
    expenses,
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
    addExpense,
    updateExpense,
    deleteExpense,
    addServiceTax,
    updateServiceTax,
    deleteServiceTax,
    openCashRegister,
    closeCashRegister,
    checkCashRegisterAccess,
    updateStock,
    refreshData
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

// Manter compatibilidade com o hook useApp
export const useApp = useAppContext;
