import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/components/ui/use-toast';
import { Unit, convertToBaseUnit } from '@/utils/unitConversion';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type ExternalProduct = Database['public']['Tables']['external_products']['Row'];
type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
type StockEntry = Database['public']['Tables']['stock_entries']['Row'];

export const useStock = (ownerId: string) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Refs para controle de montagem e canais
  const isMounted = useRef(false);
  const channelsRef = useRef<{
    ingredients?: ReturnType<typeof supabase.channel>;
    products?: ReturnType<typeof supabase.channel>;
    stockEntries?: ReturnType<typeof supabase.channel>;
  }>({});

  // Função para carregar os dados do estoque
  const loadStockData = async () => {
    if (!ownerId || !isMounted.current) return;

    try {
      setLoading(true);
      
      // Carrega ingredientes
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name');

      if (ingredientsError) throw ingredientsError;
      if (isMounted.current) {
        setIngredients(ingredientsData || []);
      }

      // Carrega produtos externos
      const { data: productsData, error: productsError } = await supabase
        .from('external_products')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name');

      if (productsError) throw productsError;
      if (isMounted.current) {
        setExternalProducts(productsData || []);
      }

      // Carrega entradas de estoque
      const { data: entriesData, error: entriesError } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;
      if (isMounted.current) {
        setStockEntries(entriesData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do estoque:', error);
      toast({
        title: 'Erro ao carregar estoque',
        description: 'Não foi possível carregar os dados do estoque.',
        variant: 'destructive',
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Configura as subscriptions do Supabase
  useEffect(() => {
    isMounted.current = true;

    const setupSubscriptions = async () => {
      if (!ownerId) return;

      // Limpa as inscrições existentes
      if (channelsRef.current.ingredients) {
        await channelsRef.current.ingredients.unsubscribe();
      }
      if (channelsRef.current.products) {
        await channelsRef.current.products.unsubscribe();
      }
      if (channelsRef.current.stockEntries) {
        await channelsRef.current.stockEntries.unsubscribe();
      }

      // Carrega os dados iniciais
      await loadStockData();

      // Cria novos canais com nomes únicos
      const ingredientsChannel = supabase.channel(`ingredients-${ownerId}-${Date.now()}`);
      const productsChannel = supabase.channel(`products-${ownerId}-${Date.now()}`);
      const stockEntriesChannel = supabase.channel(`stock-entries-${ownerId}-${Date.now()}`);

      // Configura as inscrições
      await ingredientsChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ingredients',
            filter: `owner_id=eq.${ownerId}`
          },
          () => {
            if (isMounted.current) {
              loadStockData();
            }
          }
        )
        .subscribe();

      await productsChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'external_products',
            filter: `owner_id=eq.${ownerId}`
          },
          () => {
            if (isMounted.current) {
              loadStockData();
            }
          }
        )
        .subscribe();

      await stockEntriesChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stock_entries',
            filter: `owner_id=eq.${ownerId}`
          },
          () => {
            if (isMounted.current) {
              loadStockData();
            }
          }
        )
        .subscribe();

      // Armazena as referências dos canais
      channelsRef.current = {
        ingredients: ingredientsChannel,
        products: productsChannel,
        stockEntries: stockEntriesChannel
      };
    };

    setupSubscriptions();

    // Cleanup
    return () => {
      isMounted.current = false;
      
      const cleanup = async () => {
        if (channelsRef.current.ingredients) {
          await channelsRef.current.ingredients.unsubscribe();
        }
        if (channelsRef.current.products) {
          await channelsRef.current.products.unsubscribe();
        }
        if (channelsRef.current.stockEntries) {
          await channelsRef.current.stockEntries.unsubscribe();
        }
        channelsRef.current = {};
      };
      
      cleanup();
    };
  }, [ownerId]);

  // Função para adicionar um novo ingrediente
  const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at' | 'owner_id'>) => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .insert([{ ...ingredient, owner_id: ownerId }])
        .select()
        .single();

      if (error) throw error;
      setIngredients(prev => [...prev, data]);
      toast({
        title: 'Ingrediente adicionado',
        description: 'O ingrediente foi adicionado com sucesso.',
      });
      return data;
    } catch (error) {
      console.error('Erro ao adicionar ingrediente:', error);
      toast({
        title: 'Erro ao adicionar ingrediente',
        description: 'Não foi possível adicionar o ingrediente.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Função para adicionar um novo produto externo
  const addExternalProduct = async (product: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at' | 'owner_id'>) => {
    try {
      const { data, error } = await supabase
        .from('external_products')
        .insert([{ ...product, owner_id: ownerId }])
        .select()
        .single();

      if (error) throw error;
      setExternalProducts(prev => [...prev, data]);
      toast({
        title: 'Produto adicionado',
        description: 'O produto foi adicionado com sucesso.',
      });
      return data;
    } catch (error) {
      console.error('Erro ao adicionar produto externo:', error);
      toast({
        title: 'Erro ao adicionar produto',
        description: 'Não foi possível adicionar o produto.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Função para adicionar uma nova entrada de estoque
  const addStockEntry = async (
    ingredientId: string,
    quantity: number,
    unitCost: number,
    supplier?: string,
    invoiceNumber?: string,
    notes?: string
  ) => {
    try {
      const totalCost = quantity * unitCost;

      // Insere a nova entrada de estoque
      const { data: entry, error: entryError } = await supabase
        .from('stock_entries')
        .insert([{
          ingredient_id: ingredientId,
          quantity,
          remaining_quantity: quantity,
          unit_cost: unitCost,
          total_cost: totalCost,
          supplier,
          invoice_number: invoiceNumber,
          notes,
          owner_id: ownerId
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // Atualiza o estoque total e o custo médio do ingrediente
      const { data: avgCost, error: avgCostError } = await supabase
        .rpc('calculate_weighted_average_cost', {
          p_ingredient_id: ingredientId
        });

      if (avgCostError) throw avgCostError;

      // Primeiro busca o estoque atual
      const { data: currentIngredient, error: getError } = await supabase
        .from('ingredients')
        .select('current_stock')
        .eq('id', ingredientId)
        .single();

      if (getError) throw getError;

      // Atualiza o ingrediente com o novo estoque e custo médio
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          current_stock: (currentIngredient?.current_stock || 0) + quantity,
          cost: avgCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredientId);

      if (updateError) throw updateError;

      toast({
        title: 'Entrada registrada',
        description: 'A entrada de estoque foi registrada com sucesso.',
      });

      return entry;
    } catch (error) {
      console.error('Erro ao registrar entrada de estoque:', error);
      toast({
        title: 'Erro ao registrar entrada',
        description: 'Não foi possível registrar a entrada de estoque.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Função para consumir estoque (FIFO - First In, First Out)
  const consumeStock = async (
    ingredientId: string,
    quantity: number,
    reason: string
  ) => {
    try {
      let remainingToConsume = quantity;
      const entriesToUpdate: { id: string; consumed: number }[] = [];

      // Busca as entradas disponíveis ordenadas por data (FIFO)
      const { data: availableEntries, error: entriesError } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .gt('remaining_quantity', 0)
        .order('created_at');

      if (entriesError) throw entriesError;

      if (!availableEntries || availableEntries.length === 0) {
        throw new Error('Não há estoque suficiente disponível');
      }

      // Calcula quanto consumir de cada entrada
      for (const entry of availableEntries) {
        if (remainingToConsume <= 0) break;

        const toConsume = Math.min(entry.remaining_quantity, remainingToConsume);
        entriesToUpdate.push({ id: entry.id, consumed: toConsume });
        remainingToConsume -= toConsume;
      }

      if (remainingToConsume > 0) {
        throw new Error('Não há estoque suficiente disponível');
      }

      // Atualiza as entradas
      for (const update of entriesToUpdate) {
        const { data: entry, error: getError } = await supabase
          .from('stock_entries')
          .select('remaining_quantity')
          .eq('id', update.id)
          .single();

        if (getError) throw getError;

        const { error: updateError } = await supabase
          .from('stock_entries')
          .update({
            remaining_quantity: (entry?.remaining_quantity || 0) - update.consumed
          })
          .eq('id', update.id);

        if (updateError) throw updateError;
      }

      // Registra o movimento
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          item_id: ingredientId,
          item_type: 'ingredient',
          quantity: quantity,
          operation: 'remove',
          reason: reason,
          user_id: ownerId
        }]);

      if (movementError) throw movementError;

      // Busca o estoque atual
      const { data: currentIngredient, error: getError } = await supabase
        .from('ingredients')
        .select('current_stock')
        .eq('id', ingredientId)
        .single();

      if (getError) throw getError;

      // Atualiza o estoque total do ingrediente
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          current_stock: (currentIngredient?.current_stock || 0) - quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredientId);

      if (updateError) throw updateError;

      toast({
        title: 'Estoque atualizado',
        description: 'O consumo de estoque foi registrado com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao consumir estoque:', error);
      toast({
        title: 'Erro ao consumir estoque',
        description: error instanceof Error ? error.message : 'Não foi possível consumir o estoque.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Função para buscar entradas de estoque de um ingrediente
  const fetchStockEntries = async (ingredientId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar entradas de estoque:', error);
      toast({
        title: 'Erro ao buscar entradas',
        description: 'Não foi possível carregar as entradas de estoque.',
        variant: 'destructive',
      });
      return [];
    }
  };

  // Função para atualizar um ingrediente
  const updateIngredient = async (
    id: string,
    updates: Partial<Omit<Ingredient, 'id' | 'created_at' | 'updated_at' | 'owner_id'>>
  ) => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Ingrediente atualizado',
        description: 'O ingrediente foi atualizado com sucesso.',
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      toast({
        title: 'Erro ao atualizar ingrediente',
        description: 'Não foi possível atualizar o ingrediente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Atualizar a função calculateProductionCost para usar as unidades corretas
  const calculateProductionCost = (productIngredients: { ingredientId: string; quantity: number; unit: Unit }[]) => {
    return productIngredients.reduce((total, ing) => {
      const ingredient = ingredients.find(i => i.id === ing.ingredientId);
      if (!ingredient) return total;

      // Converte a quantidade para a unidade base do ingrediente
      const quantityInBaseUnit = convertToBaseUnit(ing.quantity, ing.unit, ingredient.unit);
      const cost = quantityInBaseUnit * ingredient.cost;

      return total + cost;
    }, 0);
  };

  // Função para deletar um ingrediente e todos seus dados relacionados
  const deleteIngredient = async (id: string) => {
    try {
      // Primeiro deleta todas as entradas de estoque relacionadas
      const { error: entriesError } = await supabase
        .from('stock_entries')
        .delete()
        .eq('ingredient_id', id);

      if (entriesError) throw entriesError;

      // Depois deleta o ingrediente
      const { error: ingredientError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);

      if (ingredientError) throw ingredientError;

      toast({
        title: 'Ingrediente excluído',
        description: 'O ingrediente e seus dados foram excluídos com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao excluir ingrediente:', error);
      toast({
        title: 'Erro ao excluir ingrediente',
        description: 'Não foi possível excluir o ingrediente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    ingredients,
    externalProducts,
    stockEntries,
    loading,
    addIngredient,
    addExternalProduct,
    addStockEntry,
    consumeStock,
    fetchStockEntries,
    refreshStock: loadStockData,
    updateIngredient,
    deleteIngredient
  };
}; 