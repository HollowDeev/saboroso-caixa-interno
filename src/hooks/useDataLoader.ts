
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

      // Load current cash register primeiro para obter o ID
      const { data: cashRegisterData, error: currentCashRegisterError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_open', true)
        .single();

      if (currentCashRegisterError && currentCashRegisterError.code !== 'PGRST116') {
        throw currentCashRegisterError;
      }

      console.log('Current cash register:', cashRegisterData);
      setCurrentCashRegister(cashRegisterData || null);

      // Se há caixa aberto, carregar orders e sales
      if (cashRegisterData) {
        // Load orders with items
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

        if (ordersError) throw ordersError;
        console.log('Orders loaded:', ordersData);
        setOrders(formatOrders(ordersData || []));

        // Load sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .eq('cash_register_id', cashRegisterData.id)
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;
        console.log('Sales loaded:', salesData);
        setSales(formatSales(salesData || []));
      } else {
        console.log('No open cash register found');
        setOrders([]);
        setSales([]);
      }

      // Load service taxes
      const { data: serviceTaxesData, error: serviceTaxesError } = await supabase
        .from('service_taxes')
        .select('*')
        .order('name');

      if (serviceTaxesError) throw serviceTaxesError;
      setServiceTaxes(serviceTaxesData || []);

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

  return { loadData, isLoading };
};
