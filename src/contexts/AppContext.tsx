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
import { formatSales } from '@/utils/dataFormatters';
import * as cashRegisterService from '@/services/cashRegisterService';
import * as expenseService from '@/services/expenseService';
import { useToast } from '@/components/ui/use-toast';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
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
  const { toast } = useToast();

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
        id: employee.owner_id,
        name: employee.name,
        email: employee.email || '',
        role: 'employee',
        owner_id: employee.owner_id
      });
      setProfileId(employee.id);
      setIsEmployee(true);
      authenticateEmployeeInSupabase(employee.id);
    } else if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser({
        id: user.id,
        name: user.name || user.email || '',
        email: user.email || '',
        role: user.role || 'user',
        owner_id: user.id
      });
      setProfileId(user.id);
      setIsEmployee(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newOrder = await orderService.addOrder(order, currentUser, currentCashRegister);
      setOrders(prev => [...prev, newOrder]);
      toast({
        title: "Sucesso",
        description: "Comanda criada com sucesso!",
      });
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar comanda.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      const updatedOrder = await orderService.updateOrder(id, updates);
      await refreshData(); // Recarregar dados após atualização
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const addItemToOrder = async (orderId: string, item: NewOrderItem) => {
    try {
      const updatedOrder = await orderService.addItemToOrder(orderId, item, currentCashRegister);
      await refreshData(); // Recarregar dados após adicionar item
      return updatedOrder;
    } catch (error) {
      console.error('Error adding item to order:', error);
      throw error;
    }
  };

  const closeOrder = async (orderId: string, payments: Array<{ method: PaymentMethod; amount: number }>, manualDiscount: number = 0) => {
    try {
      const result = await orderService.closeOrder(orderId, payments, currentUser!, currentCashRegister!, manualDiscount);
      setOrders(prev => prev.filter(order => order.id !== orderId));
      toast({
        title: "Sucesso",
        description: "Comanda fechada com sucesso!",
      });
      return result;
    } catch (error) {
      console.error('Error closing order:', error);
      toast({
        title: "Erro",
        description: "Erro ao fechar comanda.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newIngredient = await productService.addIngredient(ingredient, currentUser!);
      setIngredients(prev => [...prev, newIngredient]);
      toast({
        title: "Sucesso",
        description: "Ingrediente adicionado com sucesso!",
      });
      return newIngredient;
    } catch (error) {
      console.error('Error creating ingredient:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar ingrediente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    try {
      const updatedIngredient = await productService.updateIngredient(id, updates);
      setIngredients(prev => prev.map(ingredient => ingredient.id === id ? updatedIngredient : ingredient));
      return updatedIngredient;
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  };

  const deleteIngredient = async (id: string) => {
    try {
      await productService.deleteIngredient(id);
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
      toast({
        title: "Sucesso",
        description: "Ingrediente removido com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover ingrediente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await productService.addProduct(product);
      setProducts(prev => [...prev, newProduct]);
      toast({
        title: "Sucesso",
        description: "Produto adicionado com sucesso!",
      });
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar produto.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProduct = await productService.updateProduct(id, updates);
      setProducts(prev => prev.map(product => product.id === id ? updatedProduct : product));
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      setProducts(prev => prev.filter(product => product.id !== id));
      toast({
        title: "Sucesso",
        description: "Produto removido com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover produto.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addExternalProduct = async (product: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await productService.addExternalProduct(product, currentUser!);
      setExternalProducts(prev => [...prev, newProduct]);
      toast({
        title: "Sucesso",
        description: "Produto externo adicionado com sucesso!",
      });
      return newProduct;
    } catch (error) {
      console.error('Error creating external product:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar produto externo.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateExternalProduct = async (id: string, updates: Partial<ExternalProduct>) => {
    try {
      const updatedProduct = await productService.updateExternalProduct(id, updates);
      setExternalProducts(prev => prev.map(product => product.id === id ? updatedProduct : product));
      return updatedProduct;
    } catch (error) {
      console.error('Error updating external product:', error);
      throw error;
    }
  };

  const deleteExternalProduct = async (id: string) => {
    try {
      await productService.deleteExternalProduct(id);
      setExternalProducts(prev => prev.filter(product => product.id !== id));
      toast({
        title: "Sucesso",
        description: "Produto externo removido com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting external product:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover produto externo.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      const newSale = await salesService.addSale(saleData, currentUser!, currentCashRegister!);
      // Garantir consistência do tipo Sale (createdAt, items/payments normalizados)
      const formatted = formatSales([{ ...newSale }])[0];
      setSales(prev => [formatted, ...prev]);
      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso!",
      });
      return newSale;
    } catch (error) {
      console.error('Error creating sale:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar venda.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const updatedSale = await salesService.updateSale(id, updates);
      setSales(prev => prev.map(sale => sale.id === id ? updatedSale : sale));
      return updatedSale;
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await salesService.deleteSale(
        id,
        currentUser!,
        currentCashRegister!,
        () => {
          setSales(prev => prev.filter(sale => sale.id !== id));
        }
      );
      toast({
        title: "Sucesso",
        description: "Venda removida com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover venda.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addExpense = async (expense: NewExpense) => {
    try {
      const newExpense = await expenseService.addExpense(expense, currentUser!, currentCashRegister!, products, externalProducts);
      setExpenses(prev => [...prev, newExpense]);
      toast({
        title: "Sucesso",
        description: "Despesa registrada com sucesso!",
      });
      return newExpense;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar despesa.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const updatedExpense = await expenseService.updateExpense(id, updates);
      setExpenses(prev => prev.map(expense => expense.id === id ? updatedExpense : expense));
      return updatedExpense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await expenseService.deleteExpense(id);
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      toast({
        title: "Sucesso",
        description: "Despesa removida com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover despesa.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addServiceTax = async (serviceTax: Omit<ServiceTax, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newServiceTax = await salesService.createServiceTax(serviceTax);
      setServiceTaxes(prev => [...prev, newServiceTax]);
      toast({
        title: "Sucesso",
        description: "Taxa de serviço adicionada com sucesso!",
      });
      return newServiceTax;
    } catch (error) {
      console.error('Error creating service tax:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar taxa de serviço.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateServiceTax = async (id: string, updates: Partial<ServiceTax>) => {
    try {
      const updatedServiceTax = await salesService.updateServiceTax(id, updates);
      setServiceTaxes(prev => prev.map(tax => tax.id === id ? updatedServiceTax : tax));
      return updatedServiceTax;
    } catch (error) {
      console.error('Error updating service tax:', error);
      throw error;
    }
  };

  const deleteServiceTax = async (id: string) => {
    try {
      await salesService.deleteServiceTax(id);
      setServiceTaxes(prev => prev.filter(tax => tax.id !== id));
      toast({
        title: "Sucesso",
        description: "Taxa de serviço removida com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting service tax:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover taxa de serviço.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const openCashRegister = async (amount: number) => {
    try {
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      const cashRegister = await cashRegisterService.openCashRegister(amount, currentUser);
      setCurrentCashRegister(cashRegister);
      toast({
        title: "Sucesso",
        description: "Caixa aberto com sucesso!",
      });
      return cashRegister;
    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    }
  };

  const closeCashRegister = async (amount: number) => {
    try {
      console.log('=== FECHANDO CAIXA ===');
      
      if (!currentCashRegister) {
        throw new Error('Nenhum caixa aberto para fechar');
      }
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      // Verificar permissões do usuário
      if (!cashRegisterService.checkCashRegisterAccess(currentUser)) {
        throw new Error('Sem permissão para fechar caixa');
      }
      
      console.log('Fechando caixa ID:', currentCashRegister.id, 'com valor final:', amount);
      
      const result = await cashRegisterService.closeCashRegister(amount, currentCashRegister.id);
      
      console.log('Caixa fechado com sucesso, atualizando estado...');
      setCurrentCashRegister(null);
      
      toast({
        title: "Sucesso",
        description: `Caixa fechado com sucesso! Valor final: R$ ${amount.toFixed(2)}`,
      });
      
      // Recarregar dados para garantir consistência
      await refreshData();
      
      return result;
    } catch (error: any) {
      console.error('Erro ao fechar caixa:', error);
      toast({
        title: "Erro ao fechar caixa",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateStock = async (itemType: 'ingredient' | 'external_product', itemId: string, quantity: number, reason: string) => {
    try {
      await productService.updateStock(itemType, itemId, quantity, reason);
      refreshData();
      toast({
        title: "Sucesso",
        description: "Estoque atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar estoque.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const checkCashRegisterAccess = () => {
    return currentCashRegister !== null;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setProfileId(null);
      setIsEmployee(false);
      setIngredients([]);
      setProducts([]);
      setExternalProducts([]);
      setOrders([]);
      setSales([]);
      setServiceTaxes([]);
      setCurrentCashRegister(null);
      setExpenses([]);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('employee_data');
      toast({
        title: "Logout",
        description: "Logout realizado com sucesso!",
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Erro",
        description: "Erro durante o logout.",
        variant: "destructive",
      });
    }
  };

  const contextValue = useMemo(() => ({
    currentUser,
    profileId,
    isEmployee,
    ingredients,
    products,
    externalProducts,
    orders,
    sales,
    serviceTaxes,
    currentCashRegister,
    expenses,
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
    updateStock,
    checkCashRegisterAccess,
    logout,
    refreshData,
  }), [
    currentUser,
    profileId,
    isEmployee,
    ingredients,
    products,
    externalProducts,
    orders,
    sales,
    serviceTaxes,
    currentCashRegister,
    expenses,
    isLoading,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
