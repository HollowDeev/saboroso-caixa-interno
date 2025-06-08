import { supabase } from '@/integrations/supabase/client';
import { Product, ExternalProduct } from '@/types';
import { Unit, convertToBaseUnit } from '@/utils/unitConversion';

export interface IngredientConsumption {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  ingredientName: string;
}

export interface ExternalProductConsumption {
  productId: string;
  quantity: number;
  productName: string;
}

// Função principal para consumir estoque em uma venda
export const consumeStockForSale = async (
  productId: string,
  quantity: number,
  userId: string
): Promise<{ success: boolean; errors: string[] }> => {
  try {
    // Verificar se é uma comida (tem ingredientes)
    const { data: foodExists, error: foodError } = await supabase
      .from('foods')
      .select('id')
      .eq('id', productId)
      .single();

    if (!foodError && foodExists) {
      // É uma comida - consumir ingredientes
      const ingredients = await getFoodIngredients(productId);
      
      if (ingredients.length === 0) {
        return { success: true, errors: [] };
      }

      return await consumeIngredientsFromStock(
        ingredients,
        quantity,
        'Venda registrada',
        userId
      );
    } else {
      // Verificar se é um produto externo
      const { data: externalProduct, error: externalError } = await supabase
        .from('external_products')
        .select('id, name')
        .eq('id', productId)
        .single();

      if (!externalError && externalProduct) {
        return await consumeExternalProductsFromStock(
          [{
            productId: productId,
            quantity: quantity,
            productName: externalProduct.name
          }],
          'Venda registrada',
          userId
        );
      }
    }

    return { success: true, errors: [] };
  } catch (error) {
    console.error('Erro ao consumir estoque:', error);
    return { 
      success: false, 
      errors: [`Erro ao processar produto ${productId}: ${error}`] 
    };
  }
};

// Função para buscar os ingredientes de uma comida
export const getFoodIngredients = async (foodId: string): Promise<IngredientConsumption[]> => {
  try {
    const { data: foodIngredients, error } = await supabase
      .from('food_ingredients')
      .select(`
        ingredient_id,
        quantity,
        unit,
        ingredients!inner(name, unit)
      `)
      .eq('food_id', foodId);

    if (error) throw error;

    return foodIngredients?.map(fi => ({
      ingredientId: fi.ingredient_id,
      quantity: fi.quantity,
      unit: fi.unit as Unit,
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
    try {
      const { data: currentIngredient, error: getError } = await supabase
        .from('ingredients')
        .select('current_stock, name, unit')
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

      if (currentIngredient.unit === 'kg') {
        const totalQuantityToConsume = ingredient.quantity * quantityMultiplier;

        if (currentIngredient.current_stock < totalQuantityToConsume) {
          errors.push(`Estoque insuficiente para ${ingredient.ingredientName}. Disponível: ${currentIngredient.current_stock}kg, Necessário: ${totalQuantityToConsume}kg`);
          continue;
        }

        const { error: updateError } = await supabase.rpc('remove_stock', {
          p_item_type: 'ingredient',
          p_item_id: ingredient.ingredientId,
          p_quantity: totalQuantityToConsume,
          p_reason: reason,
          p_user_id: userId
        });

        if (updateError) {
          errors.push(`Erro ao atualizar estoque de ${ingredient.ingredientName}: ${updateError.message}`);
          continue;
        }
      } else {
        // Se a unidade é 'g', converte para 'kg' antes de consumir
        let quantityInKg = ingredient.quantity;
        if (ingredient.unit === 'g') {
          quantityInKg = ingredient.quantity / 1000;
        }

        const totalQuantityToConsume = quantityInKg * quantityMultiplier;

        if (currentIngredient.current_stock < totalQuantityToConsume) {
          errors.push(`Estoque insuficiente para ${ingredient.ingredientName}. Disponível: ${currentIngredient.current_stock}kg, Necessário: ${totalQuantityToConsume}kg`);
          continue;
        }

        const { error: updateError } = await supabase.rpc('remove_stock', {
          p_item_type: 'ingredient',
          p_item_id: ingredient.ingredientId,
          p_quantity: totalQuantityToConsume,
          p_reason: reason,
          p_user_id: userId
        });

        if (updateError) {
          errors.push(`Erro ao atualizar estoque de ${ingredient.ingredientName}: ${updateError.message}`);
          continue;
        }
      }
    } catch (error) {
      console.error('Erro ao consumir ingrediente:', error);
      errors.push(`Erro ao processar ${ingredient.ingredientName}: ${error}`);
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
      } else {
        allErrors.push(`Produto ${item.productId} não encontrado em nenhuma tabela`);
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
