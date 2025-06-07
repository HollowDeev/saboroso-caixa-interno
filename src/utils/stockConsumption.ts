
import { supabase } from '@/integrations/supabase/client';
import { Product, Ingredient } from '@/types';

export interface IngredientConsumption {
  ingredientId: string;
  quantity: number;
  ingredientName: string;
}

// Função para buscar os ingredientes de uma comida
export const getFoodIngredients = async (foodId: string): Promise<IngredientConsumption[]> => {
  try {
    const { data: foodIngredients, error } = await supabase
      .from('food_ingredients')
      .select(`
        ingredient_id,
        quantity,
        ingredients!inner(name)
      `)
      .eq('food_id', foodId);

    if (error) throw error;

    return foodIngredients?.map(fi => ({
      ingredientId: fi.ingredient_id,
      quantity: fi.quantity,
      ingredientName: fi.ingredients.name
    })) || [];
  } catch (error) {
    console.error('Erro ao buscar ingredientes da comida:', error);
    return [];
  }
};

// Função para consumir ingredientes do estoque
export const consumeIngredientsFromStock = async (
  ingredients: IngredientConsumption[],
  quantityMultiplier: number,
  reason: string,
  userId: string
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  for (const ingredient of ingredients) {
    const totalQuantityToConsume = ingredient.quantity * quantityMultiplier;
    
    try {
      // Buscar o estoque atual do ingrediente
      const { data: currentIngredient, error: getError } = await supabase
        .from('ingredients')
        .select('current_stock, name')
        .eq('id', ingredient.ingredientId)
        .single();

      if (getError) {
        errors.push(`Erro ao buscar ingrediente ${ingredient.ingredientName}: ${getError.message}`);
        continue;
      }

      if (!currentIngredient) {
        errors.push(`Ingrediente ${ingredient.ingredientName} não encontrado`);
        continue;
      }

      // Verificar se há estoque suficiente
      if (currentIngredient.current_stock < totalQuantityToConsume) {
        errors.push(`Estoque insuficiente para ${ingredient.ingredientName}. Disponível: ${currentIngredient.current_stock}, Necessário: ${totalQuantityToConsume}`);
        continue;
      }

      // Consumir do estoque usando FIFO (First In, First Out)
      let remainingToConsume = totalQuantityToConsume;

      // Buscar entradas de estoque disponíveis ordenadas por data (FIFO)
      const { data: stockEntries, error: entriesError } = await supabase
        .from('stock_entries')
        .select('id, remaining_quantity')
        .eq('ingredient_id', ingredient.ingredientId)
        .gt('remaining_quantity', 0)
        .order('created_at');

      if (entriesError) {
        errors.push(`Erro ao buscar entradas de estoque para ${ingredient.ingredientName}: ${entriesError.message}`);
        continue;
      }

      // Consumir das entradas seguindo FIFO
      for (const entry of stockEntries || []) {
        if (remainingToConsume <= 0) break;

        const toConsume = Math.min(entry.remaining_quantity, remainingToConsume);
        
        const { error: updateError } = await supabase
          .from('stock_entries')
          .update({
            remaining_quantity: entry.remaining_quantity - toConsume
          })
          .eq('id', entry.id);

        if (updateError) {
          errors.push(`Erro ao atualizar entrada de estoque para ${ingredient.ingredientName}: ${updateError.message}`);
          continue;
        }

        remainingToConsume -= toConsume;
      }

      // Atualizar o estoque total do ingrediente
      const newStock = currentIngredient.current_stock - totalQuantityToConsume;
      const { error: updateIngredientError } = await supabase
        .from('ingredients')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredient.ingredientId);

      if (updateIngredientError) {
        errors.push(`Erro ao atualizar estoque do ingrediente ${ingredient.ingredientName}: ${updateIngredientError.message}`);
        continue;
      }

      // Registrar o movimento de estoque
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          item_id: ingredient.ingredientId,
          item_type: 'ingredient',
          quantity: totalQuantityToConsume,
          movement_type: 'remove',
          reason: reason,
          user_id: userId,
          previous_stock: currentIngredient.current_stock,
          new_stock: newStock
        });

      if (movementError) {
        console.error(`Erro ao registrar movimento para ${ingredient.ingredientName}:`, movementError);
        // Não adiciona ao array de erros pois o movimento é apenas para auditoria
      }

    } catch (error) {
      console.error(`Erro ao processar ingrediente ${ingredient.ingredientName}:`, error);
      errors.push(`Erro inesperado ao processar ${ingredient.ingredientName}`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
};

// Função para processar consumo de ingredientes de uma venda
export const processOrderItemsStockConsumption = async (
  orderItems: Array<{ productId: string; quantity: number; product?: Product }>,
  userId: string,
  reason: string = 'Venda registrada'
): Promise<{ success: boolean; errors: string[] }> => {
  const allErrors: string[] = [];

  for (const item of orderItems) {
    // Verificar se o produto é uma comida (tem ingredientes)
    const { data: foodExists, error: foodError } = await supabase
      .from('foods')
      .select('id')
      .eq('id', item.productId)
      .single();

    if (foodError || !foodExists) {
      // Se não é uma comida, pular (pode ser um produto externo)
      continue;
    }

    // Buscar ingredientes da comida
    const ingredients = await getFoodIngredients(item.productId);
    
    if (ingredients.length === 0) {
      continue; // Comida sem ingredientes cadastrados
    }

    // Consumir ingredientes do estoque
    const result = await consumeIngredientsFromStock(
      ingredients,
      item.quantity,
      `${reason} - ${item.product?.name || 'Produto'} (${item.quantity}x)`,
      userId
    );

    if (!result.success) {
      allErrors.push(...result.errors);
    }
  }

  return {
    success: allErrors.length === 0,
    errors: allErrors
  };
};
