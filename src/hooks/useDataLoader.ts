import { useState } from 'react';
import { User, Ingredient, Product, ExternalProduct, Order, Sale, ServiceTax, CashRegister, Expense, PaymentMethod } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { formatOrders, formatSales } from '@/utils/dataFormatters';

export const useDataLoader = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const loadData = async (
    currentUser: User | null,
    setIngredients: (ingredients: Ingredient[]) => void,
    setProducts: (products: Product[]) => void,
    setExternalProducts: (products: ExternalProduct[]) => void,
    setOrders: (orders: Order[]) => void,
    setSales: (sales: Sale[]) => void,
    setServiceTaxes: (taxes: ServiceTax[]) => void,
    setCurrentCashRegister: (register: CashRegister | null) => void,
    setExpenses: (expenses: Expense[]) => void
  ) => {
    if (!currentUser?.id) {
      console.log('❌ No current user found');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Loading data for user:', currentUser.id, 'role:', currentUser.role);

      // Para funcionários, usar o owner_id; para admin, usar o próprio id
      const ownerId = currentUser.role === 'employee'
        ? (currentUser as { owner_id?: string }).owner_id || currentUser.id
        : currentUser.id;

      console.log('👤 Using owner ID:', ownerId);

      // Para funcionários, vamos usar consultas diretas com filtros manuais
      // já que o auth.uid() não funciona para eles
      const isEmployee = currentUser.role === 'employee';
      
      // Load cash register
      console.log('💰 Loading cash register...');
      const { data: cashRegisterData, error: cashRegisterError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_open', true)
        .maybeSingle();

      if (cashRegisterError && cashRegisterError.code !== 'PGRST116') {
        console.error('❌ Error loading cash register:', cashRegisterError);
        throw cashRegisterError;
      }
      if (cashRegisterError && cashRegisterError.code === 'PGRST116') {
        console.warn('ℹ️ No open cash register found (Supabase PGRST116)');
      }
      console.log('✅ Cash register loaded:', cashRegisterData?.id || 'No open cash register');
      setCurrentCashRegister(cashRegisterData || null);

      // Load ingredients
      console.log('🥕 Loading ingredients...');
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name');

      if (ingredientsError) {
        console.error('❌ Error loading ingredients:', ingredientsError);
        throw ingredientsError;
      }
      console.log('✅ Ingredients loaded:', ingredientsData?.length || 0, 'items');
      setIngredients(ingredientsData || []);

      // Load foods (products) with ingredients
      console.log('🍕 Loading foods...');
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

      if (foodsError) {
        console.error('❌ Error loading foods:', foodsError);
        throw foodsError;
      }
      console.log('✅ Foods loaded:', foodsData?.length || 0, 'items');
      
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
        ingredients: (Array.isArray(food.food_ingredients) ? food.food_ingredients : []).map((fi: {
          id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          created_at: string;
          updated_at: string;
        }) => ({
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
      console.log('📦 Loading external products...');
      const { data: externalProductsData, error: externalProductsError } = await supabase
        .from('external_products')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name');

      if (externalProductsError) {
        console.error('❌ Error loading external products:', externalProductsError);
        throw externalProductsError;
      }
      console.log('✅ External products loaded:', externalProductsData?.length || 0, 'items');
      setExternalProducts(externalProductsData || []);

      // Se não houver caixa aberto, limpar orders e sales e pular buscas
      if (!cashRegisterData) {
        console.log('ℹ️ No open cash register - clearing orders and sales');
        setOrders([]);
        setSales([]);
      } else {
        // Load orders
        console.log('📝 Loading orders...');
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
          .eq('cash_register_id', cashRegisterData?.id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('❌ Error loading orders:', ordersError);
          throw ordersError;
        }
        console.log('✅ Orders loaded:', ordersData?.length || 0, 'items');
        setOrders(formatOrders((ordersData || []).map(order => ({
          ...order,
          status: (order.status === 'open' || order.status === 'closed') ? order.status as 'open' | 'closed' : 'open',
          payment_method: order.payment_method as PaymentMethod || undefined,
        }))));

        // Load sales
        console.log('💵 Loading sales...');
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .eq('cash_register_id', cashRegisterData?.id)
          .order('created_at', { ascending: false });

        if (salesError) {
          console.error('❌ Error loading sales:', salesError);
          throw salesError;
        }
        console.log('✅ Sales loaded:', salesData?.length || 0, 'items');
        setSales(formatSales((salesData || []).map(sale => ({
          ...sale,
          items: Array.isArray(sale.items)
            ? sale.items
            : (typeof sale.items === 'string' ? JSON.parse(sale.items) : []),
          payments: Array.isArray(sale.payments)
            ? sale.payments
            : (typeof sale.payments === 'string' ? JSON.parse(sale.payments) : []),
        }))));
      }

      // Load service taxes
      console.log('🏷️ Loading service taxes...');
      const { data: serviceTaxesData, error: serviceTaxesError } = await supabase
        .from('service_taxes')
        .select('*')
        .order('name');

      if (serviceTaxesError) {
        console.error('❌ Error loading service taxes:', serviceTaxesError);
        throw serviceTaxesError;
      }
      console.log('✅ Service taxes loaded:', serviceTaxesData?.length || 0, 'items');
      setServiceTaxes(serviceTaxesData || []);

      // Load expenses for current cash register
      if (cashRegisterData) {
        console.log('💸 Loading expenses for cash register:', cashRegisterData.id);
        
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('cash_register_id', cashRegisterData.id)
          .order('created_at', { ascending: false });

        if (expensesError) {
          console.error('❌ Error loading expenses:', expensesError);
          throw expensesError;
        }
        console.log('✅ Expenses loaded:', expensesData?.length || 0, 'items');
        
        // Map the data to match our Expense interface
        const mappedExpenses: Expense[] = (expensesData || []).map(expense => ({
          id: expense.id,
          cash_register_id: expense.cash_register_id,
          user_id: expense.user_id,
          type: expense.type as 'product_loss' | 'ingredient_loss' | 'other',
          product_id: expense.product_id,
          ingredient_ids: expense.ingredient_ids ? JSON.parse(JSON.stringify(expense.ingredient_ids)) : undefined,
          description: expense.description,
          amount: expense.amount,
          quantity: expense.quantity,
          reason: expense.reason,
          created_at: expense.created_at,
          updated_at: typeof expense['updated_at'] === 'string' ? expense['updated_at'] : '',
        }));
        
        setExpenses(mappedExpenses);
      } else {
        console.log('ℹ️ No open cash register found - clearing expenses');
        setExpenses([]);
      }

      console.log('🎉 Data loading completed successfully');

    } catch (error) {
      console.error('💥 Error loading data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do sistema.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { loadData, isLoading };
};
