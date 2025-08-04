import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/components/ui/use-toast';
import { Unit, convertToBaseUnit } from '@/utils/unitConversion';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type ExternalProduct = Database['public']['Tables']['external_products']['Row'];
type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
type StockEntry = Database['public']['Tables']['stock_entries']['Row'];
type ExternalProductEntry = Database['public']['Tables']['external_product_entries']['Row'];

export const useStock = (ownerId: string) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [externalProductEntries, setExternalProductEntries] = useState<ExternalProductEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isMounted = useRef(false);
  const channelsRef = useRef<{
    ingredients?: ReturnType<typeof supabase.channel>;
    products?: ReturnType<typeof supabase.channel>;
    stockEntries?: ReturnType<typeof supabase.channel>;
    externalProductEntries?: ReturnType<typeof supabase.channel>;
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

      // Carrega entradas de estoque de ingredientes
      const { data: entriesData, error: entriesError } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;
      if (isMounted.current) {
        setStockEntries(entriesData || []);
      }

      // Carrega entradas de estoque de produtos externos
      const { data: productEntriesData, error: productEntriesError } = await supabase
        .from('external_product_entries')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (productEntriesError) throw productEntriesError;
      if (isMounted.current) {
        setExternalProductEntries(productEntriesData || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados do estoque:', error);
      toast({
        title: 'Erro ao carregar estoque',
        description: 'Não foi possível carregar os dados do estoque.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // Configura as subscriptions do Supabase
  useEffect(() => {
    if (!ownerId) return;

    isMounted.current = true;
    loadStockData();

    const setupSubscriptions = async () => {
      const ingredientsChannel = supabase.channel('ingredients-changes');
      const productsChannel = supabase.channel('products-changes');
      const stockEntriesChannel = supabase.channel('stock-entries-changes');
      const externalProductEntriesChannel = supabase.channel('external-product-entries-changes');

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

      await externalProductEntriesChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'external_product_entries',
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
        stockEntries: stockEntriesChannel,
        externalProductEntries: externalProductEntriesChannel
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
        if (channelsRef.current.externalProductEntries) {
          await channelsRef.current.externalProductEntries.unsubscribe();
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

  // Função para atualizar um produto externo
  const updateExternalProduct = async (id: string, product: Partial<ExternalProduct>) => {
    try {
      const { data, error } = await supabase
        .from('external_products')
        .update({
          name: product.name,
          brand: product.brand || null,
          description: product.description || null,
          current_stock: product.current_stock,
          min_stock: product.min_stock,
          cost: product.cost,
          price: product.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualiza o estado local
      setExternalProducts(prev => prev.map(p => p.id === id ? data : p));

      toast({
        title: 'Produto atualizado',
        description: 'O produto foi atualizado com sucesso.',
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: 'Erro ao atualizar produto',
        description: 'Não foi possível atualizar o produto.',
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

      // Registra o movimento
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          item_id: ingredientId,
          item_type: 'ingredient',
          quantity: quantity,
          movement_type: 'add',
          reason: 'Entrada manual de estoque',
          user_id: ownerId,
          previous_stock: currentIngredient.current_stock,
          new_stock: currentIngredient.current_stock + quantity
        }]);

      if (movementError) throw movementError;

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

  // Função para adicionar uma nova entrada de produto externo
  const addExternalProductEntry = async (
    productId: string,
    quantity: number,
    unitCost: number,
    supplier?: string,
    invoiceNumber?: string,
    notes?: string
  ) => {
    try {
      const totalCost = quantity * unitCost;

      // Primeiro busca o produto e suas entradas atuais
      const { data: currentProduct, error: getError } = await supabase
        .from('external_products')
        .select('current_stock, cost')
        .eq('id', productId)
        .single();

      if (getError) throw getError;

      // Calcula o novo custo médio ponderado
      const currentStock = currentProduct?.current_stock || 0;
      const currentCost = currentProduct?.cost || 0;
      const newStock = currentStock + quantity;
      const newCost = (currentStock * currentCost + quantity * unitCost) / newStock;

      // Insere a nova entrada de estoque
      const { data: entry, error: entryError } = await supabase
        .from('external_product_entries')
        .insert([{
          product_id: productId,
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

      // Atualiza o produto com o novo estoque e custo médio
      const { error: updateError } = await supabase
        .from('external_products')
        .update({
          current_stock: newStock,
          cost: newCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Registra o movimento
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          item_id: productId,
          item_type: 'external_product',
          quantity: quantity,
          movement_type: 'add',
          reason: 'Entrada manual de estoque',
          user_id: ownerId,
          previous_stock: currentStock,
          new_stock: newStock
        }]);

      if (movementError) throw movementError;

      toast({
        title: 'Entrada registrada',
        description: 'A entrada do produto foi registrada com sucesso.',
      });

      return entry;
    } catch (error) {
      console.error('Erro ao registrar entrada do produto:', error);
      toast({
        title: 'Erro ao registrar entrada',
        description: 'Não foi possível registrar a entrada do produto.',
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
      // First get the current ingredient
      const { data: currentIngredient, error: getError } = await supabase
        .from('ingredients')
        .select('current_stock')
        .eq('id', ingredientId)
        .single();

      if (getError) throw getError;

      let remainingToConsume = quantity;
      const entriesToUpdate: { id: string; consumed: number }[] = [];

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

      for (const entry of availableEntries) {
        if (remainingToConsume <= 0) break;

        const toConsume = Math.min(entry.remaining_quantity, remainingToConsume);
        entriesToUpdate.push({ id: entry.id, consumed: toConsume });
        remainingToConsume -= toConsume;
      }

      if (remainingToConsume > 0) {
        throw new Error('Não há estoque suficiente disponível');
      }

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

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          item_id: ingredientId,
          item_type: 'ingredient',
          quantity: quantity,
          movement_type: 'remove',
          reason: reason,
          user_id: ownerId,
          previous_stock: currentIngredient.current_stock,
          new_stock: currentIngredient.current_stock - quantity
        }]);

      if (movementError) throw movementError;

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

  // Função para consumir estoque de produto externo (FIFO)
  const consumeExternalProductStock = async (
    productId: string,
    quantity: number,
    reason: string
  ) => {
    try {
      // Primeiro verifica se há estoque total suficiente
      const { data: currentProduct, error: getError } = await supabase
        .from('external_products')
        .select('current_stock')
        .eq('id', productId)
        .single();

      if (getError) throw getError;

      if (!currentProduct || currentProduct.current_stock < quantity) {
        throw new Error('Não há estoque suficiente disponível');
      }

      let remainingToConsume = quantity;
      const entriesToUpdate: { id: string; consumed: number }[] = [];

      // Busca as entradas disponíveis ordenadas por data (FIFO)
      const { data: availableEntries, error: entriesError } = await supabase
        .from('external_product_entries')
        .select('*')
        .eq('product_id', productId)
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
          .from('external_product_entries')
          .select('remaining_quantity')
          .eq('id', update.id)
          .single();

        if (getError) throw getError;

        const { error: updateError } = await supabase
          .from('external_product_entries')
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
          item_id: productId,
          item_type: 'external_product',
          quantity: quantity,
          movement_type: 'remove',
          reason: reason,
          user_id: ownerId,
          previous_stock: currentProduct.current_stock,
          new_stock: currentProduct.current_stock - quantity
        }]);

      if (movementError) throw movementError;

      // Atualiza o estoque total do produto
      const { error: updateError } = await supabase
        .from('external_products')
        .update({
          current_stock: currentProduct.current_stock - quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

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

  // Função para buscar entradas de estoque de um produto externo
  const fetchExternalProductEntries = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('external_product_entries')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar entradas do produto:', error);
      toast({
        title: 'Erro ao buscar entradas',
        description: 'Não foi possível carregar as entradas do produto.',
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
  const calculateProductionCost = (productIngredients: { ingredientId: string; quantity: number; unit: string }[]) => {
    return productIngredients.reduce((total, ing) => {
      const ingredient = ingredients.find(i => i.id === ing.ingredientId);
      if (!ingredient) return total;

      // Converte a quantidade para a unidade base do ingrediente
      const quantityInBaseUnit = convertToBaseUnit(ing.quantity, ing.unit as Unit, ingredient.unit as Unit);
      const cost = quantityInBaseUnit * ingredient.cost;

      return total + cost;
    }, 0);
  };

  // Função para deletar um ingrediente e todos seus dados relacionados
  const deleteIngredient = async (id: string) => {
    try {
      // 1. Primeiro verifica se o ingrediente está sendo usado em alguma comida
      const { data: foodIngredients, error: foodIngredientsError } = await supabase
        .from('food_ingredients')
        .select('id')
        .eq('ingredient_id', id);

      if (foodIngredientsError) throw foodIngredientsError;

      if (foodIngredients && foodIngredients.length > 0) {
        throw new Error('Não é possível excluir o ingrediente pois ele está sendo usado em uma ou mais comidas.');
      }

      // 2. Deleta os movimentos de estoque relacionados ao ingrediente
      const { error: movementsError } = await supabase
        .from('stock_movements')
        .delete()
        .eq('item_id', id)
        .eq('item_type', 'ingredient');

      if (movementsError) throw movementsError;

      // 3. Deleta as entradas de estoque
      const { error: entriesDeleteError } = await supabase
        .from('stock_entries')
        .delete()
        .eq('ingredient_id', id);

      if (entriesDeleteError) throw entriesDeleteError;

      // 4. Por fim, deleta o ingrediente
      const { error: ingredientError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);

      if (ingredientError) throw ingredientError;

      // Atualiza o estado local
      setIngredients((prev) => prev.filter((ingredient) => ingredient.id !== id));
      setStockEntries(prev => prev.filter(e => e.ingredient_id !== id));
      
      toast({
        title: 'Sucesso',
        description: 'Ingrediente excluído com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao excluir ingrediente:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o ingrediente. Tente novamente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    ingredients,
    externalProducts,
    stockEntries,
    externalProductEntries,
    loading,
    addIngredient,
    addExternalProduct,
    updateExternalProduct,
    addStockEntry,
    addExternalProductEntry,
    consumeStock,
    consumeExternalProductStock,
    fetchStockEntries,
    fetchExternalProductEntries,
    refreshStock: loadStockData,
    updateIngredient,
    deleteIngredient
  };
};
