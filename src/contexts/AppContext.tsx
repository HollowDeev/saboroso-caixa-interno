
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { User, Ingredient, Product, ExternalProduct, Order, Sale, ServiceTax, CashRegister, AppContextType, NewOrderItem, PaymentMethod } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useDataLoader } from '@/hooks/useDataLoader';
import * as orderService from '@/services/orderService';
import * as productService from '@/services/productService';
import * as salesService from '@/services/salesService';
import * as cashRegisterService from '@/services/cashRegisterService';

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
  
  const { loadData, isLoading } = useDataLoader();

  const refreshData = () => loadData(
    currentUser,
    setIngredients,
    setProducts,
    setExternalProducts,
    setOrders,
    setSales,
    setServiceTaxes,
    setCurrentCashRegister
  );

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

  const closeOrder = async (orderId: string, paymentMethod: PaymentMethod) => {
    try {
      await orderService.closeOrder(orderId, paymentMethod, currentUser!, currentCashRegister!);
      await refreshData();
    } catch (error) {
      console.error('Error closing order:', error);
      throw error;
    }
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

  const addSale = async (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      await salesService.addSale(sale, currentUser!, currentCashRegister!);
      await refreshData();
    } catch (error) {
      console.error('Error adding sale:', error);
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
      await salesService.deleteSale(id, currentUser!, currentCashRegister!, setSales);
      await refreshData();
    } catch (error) {
      console.error('Error deleting sale:', error);
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
    refreshData,
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
