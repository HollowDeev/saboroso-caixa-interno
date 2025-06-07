
import { supabase } from '@/integrations/supabase/client';
import { Product, ExternalProduct } from '@/types';

export interface IngredientConsumption {
  ingredientId: string;
  quantity: number;
  ingredientName: string;
}

export interface ExternalProductConsumption {
  productId: string;
  quantity: number;
  productName: string;
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

      if (currentIngredient.current_stock < totalQuantityToConsume) {
        errors.push(`Estoque insuficiente para ${ingredient.ingredientName}. Disponível: ${currentIngredient.current_stock}, Necessário: ${totalQuantityToConsume}`);
        continue;
      }

      let remainingToConsume = totalQuantityToConsume;

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

// Função para consumir produtos externos do estoque
export const consumeExternalProductsFromStock = async (
  products: ExternalProductConsumption[],
  reason: string,
  userId: string
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  for (const product of products) {
    try {
      // Get current external product stock
      const { data: currentProduct, error: getError } = await supabase
        .from('external_products')
        .select('current_stock, name')
        .eq('id', product.productId)
        .single();

      if (getError) {
        errors.push(`Erro ao buscar produto ${product.productName}: ${getError.message}`);
        continue;
      }

      if (!currentProduct) {
        errors.push(`Produto ${product.productName} não encontrado`);
        continue;
      }

      // Check if there's enough stock
      if (currentProduct.current_stock < product.quantity) {
        errors.push(`Estoque insuficiente para ${product.productName}. Disponível: ${currentProduct.current_stock}, Necessário: ${product.quantity}`);
        continue;
      }

      // Consume from stock using FIFO
      let remainingToConsume = product.quantity;

      // Get available stock entries ordered by date (FIFO)
      const { data: productEntries, error: entriesError } = await supabase
        .from('external_product_entries')
        .select('id, remaining_quantity')
        .eq('product_id', product.productId)
        .gt('remaining_quantity', 0)
        .order('created_at');

      if (entriesError) {
        errors.push(`Erro ao buscar entradas de estoque para ${product.productName}: ${entriesError.message}`);
        continue;
      }

      // Consume from entries following FIFO
      for (const entry of productEntries || []) {
        if (remainingToConsume <= 0) break;

        const toConsume = Math.min(entry.remaining_quantity, remainingToConsume);
        
        const { error: updateError } = await supabase
          .from('external_product_entries')
          .update({
            remaining_quantity: entry.remaining_quantity - toConsume
          })
          .eq('id', entry.id);

        if (updateError) {
          errors.push(`Erro ao atualizar entrada de estoque para ${product.productName}: ${updateError.message}`);
          continue;
        }

        remainingToConsume -= toConsume;
      }

      // Update the total stock of the product
      const newStock = currentProduct.current_stock - product.quantity;
      const { error: updateProductError } = await supabase
        .from('external_products')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.productId);

      if (updateProductError) {
        errors.push(`Erro ao atualizar estoque do produto ${product.productName}: ${updateProductError.message}`);
        continue;
      }

      // Register stock movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          item_id: product.productId,
          item_type: 'external_product',
          quantity: product.quantity,
          movement_type: 'remove',
          reason: reason,
          user_id: userId,
          previous_stock: currentProduct.current_stock,
          new_stock: newStock
        });

      if (movementError) {
        console.error(`Erro ao registrar movimento para ${product.productName}:`, movementError);
      }

    } catch (error) {
      console.error(`Erro ao processar produto ${product.productName}:`, error);
      errors.push(`Erro inesperado ao processar ${product.productName}`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
};

// Função para processar consumo de ingredientes e produtos externos de uma venda
export const processOrderItemsStockConsumption = async (
  orderItems: Array<{ productId: string; quantity: number; product?: Product | ExternalProduct }>,
  userId: string,
  reason: string = 'Venda registrada'
): Promise<{ success: boolean; errors: string[] }> => {
  const allErrors: string[] = [];

  // Separar comidas de produtos externos
  const foodItems: Array<{ productId: string; quantity: number; product?: Product | ExternalProduct }> = [];
  const externalProductItems: ExternalProductConsumption[] = [];

  for (const item of orderItems) {
    // Verificar se o produto é uma comida (tem ingredientes)
    const { data: foodExists, error: foodError } = await supabase
      .from('foods')
      .select('id')
      .eq('id', item.productId)
      .single();

    if (foodError || !foodExists) {
      // Se não é uma comida, verificar se é um produto externo
      const { data: externalProduct, error: externalError } = await supabase
        .from('external_products')
        .select('id, name')
        .eq('id', item.productId)
        .single();

      if (!externalError && externalProduct) {
        externalProductItems.push({
          productId: item.productId,
          quantity: item.quantity,
          productName: externalProduct.name
        });
      }
      continue;
    }

    foodItems.push(item);
  }

  // Processar consumo de ingredientes para comidas
  for (const item of foodItems) {
    const ingredients = await getFoodIngredients(item.productId);
    
    if (ingredients.length === 0) {
      continue;
    }

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

  // Processar consumo de produtos externos
  if (externalProductItems.length > 0) {
    const result = await consumeExternalProductsFromStock(
      externalProductItems,
      reason,
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
