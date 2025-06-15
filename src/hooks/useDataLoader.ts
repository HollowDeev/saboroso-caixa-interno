
import { useState } from 'react';
import { User, Ingredient, Product, ExternalProduct, Order, Sale, ServiceTax, CashRegister } from '@/types';
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
    setCurrentCashRegister: (register: CashRegister | null) => void
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
        ? (currentUser as any).owner_id || currentUser.id
        : currentUser.id;

      console.log('👤 Using owner ID:', ownerId);

      // Load ingredients
      console.log('📦 Loading ingredients...');
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

      // Load foods (products) with ingredients - Agora usando auth.uid() nas políticas RLS
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
        .is('deleted_at', null)
        .order('name');

      if (foodsError) {
        console.error('❌ Error loading foods:', foodsError);
        console.error('Foods error details:', foodsError.message, foodsError.code);
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
      console.log('📱 Loading external products...');
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

      // Load current cash register primeiro para obter o ID
      console.log('💰 Loading current cash register...');
      const { data: cashRegisterData, error: currentCashRegisterError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_open', true)
        .single();

      if (currentCashRegisterError && currentCashRegisterError.code !== 'PGRST116') {
        console.error('❌ Error loading cash register:', currentCashRegisterError);
        throw currentCashRegisterError;
      }

      console.log('✅ Current cash register:', cashRegisterData?.id || 'none');
      setCurrentCashRegister(cashRegisterData || null);

      // Se há caixa aberto, carregar orders e sales usando as novas políticas RLS
      if (cashRegisterData) {
        console.log('📋 Loading orders for cash register:', cashRegisterData.id);
        // Load orders with items - Agora usando auth.uid() nas políticas RLS
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
          .eq('cash_register_id', cashRegisterData.id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('❌ Error loading orders:', ordersError);
          console.error('Orders error details:', ordersError.message, ordersError.code);
          throw ordersError;
        }
        console.log('✅ Orders loaded:', ordersData?.length || 0, 'items');
        setOrders(formatOrders(ordersData || []));

        console.log('💳 Loading sales for cash register:', cashRegisterData.id);
        // Load sales - Agora usando auth.uid() nas políticas RLS
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .eq('cash_register_id', cashRegisterData.id)
          .order('created_at', { ascending: false });

        if (salesError) {
          console.error('❌ Error loading sales:', salesError);
          console.error('Sales error details:', salesError.message, salesError.code);
          throw salesError;
        }
        console.log('✅ Sales loaded:', salesData?.length || 0, 'items');
        setSales(formatSales(salesData || []));
      } else {
        console.log('ℹ️ No open cash register found - clearing orders and sales');
        setOrders([]);
        setSales([]);
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
