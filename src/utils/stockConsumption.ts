import { supabase } from '@/integrations/supabase/client';
import { OrderItem } from '@/types';
import { convertValue, Unit } from '@/utils/unitConversion';

export interface IngredientConsumption {
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredientName: string;
}

export interface ExternalProductConsumption {
  productId: string;
  quantity: number;
  productName: string;
}

interface StockItem {
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    available: boolean;
    current_stock?: number;
    product_type?: string;
  };
}

interface StockConsumptionResult {
  success: boolean;
  errors: string[];
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

// Nova função para processar items de pedido
export const processOrderItemsStockConsumption = async (
  items: StockItem[],
  userId: string,
  description: string = 'Consumo de estoque'
): Promise<StockConsumptionResult> => {
  const errors: string[] = [];
  let success = true;

  try {
    console.log('Iniciando processamento de itens:', items);

    for (const item of items) {
      const isExternalProduct = item.product.product_type === 'external_product';
      console.log('Processando item:', {
        id: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        type: item.product.product_type,
        isExternalProduct
      });

      if (isExternalProduct) {
        // Processar produto externo
        console.log('Processando produto externo:', item.product.name);
        const { data: productData, error: productError } = await supabase
          .from('external_products')
          .select('current_stock, name')
          .eq('id', item.productId)
          .single();

        if (productError) {
          console.error('Erro ao buscar produto externo:', productError);
          errors.push(`Erro ao verificar estoque de ${item.product.name}: ${productError.message}`);
          success = false;
          continue;
        }

        console.log('Dados do produto externo:', productData);

        if (!productData) {
          errors.push(`Produto ${item.product.name} não encontrado`);
          success = false;
          continue;
        }

        const quantity = item.quantity;
        const quantityToUpdate = quantity;

        if (item.quantity > 0 && productData.current_stock < quantity) {
          errors.push(`Estoque insuficiente para ${productData.name}. Disponível: ${productData.current_stock}, Necessário: ${quantity}`);
          success = false;
          continue;
        }

        // Atualizar estoque do produto externo
        const newStock = productData.current_stock - quantityToUpdate;
        console.log('Atualizando estoque do produto externo:', {
          produto: item.product.name,
          estoqueAtual: productData.current_stock,
          quantidade: quantityToUpdate,
          novoEstoque: newStock,
          operacao: item.quantity > 0 ? 'consumo' : 'reversão'
        });

        const { error: updateError } = await supabase
          .from('external_products')
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.productId);

        if (updateError) {
          console.error('Erro ao atualizar estoque do produto externo:', updateError);
          errors.push(`Erro ao atualizar estoque de ${item.product.name}: ${updateError.message}`);
          success = false;
          continue;
        }

        // Registrar movimento
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            item_type: 'external_product',
            item_id: item.productId,
            movement_type: item.quantity > 0 ? 'remove' : 'add',
            quantity: Math.abs(quantity),
            previous_stock: productData.current_stock,
            new_stock: newStock,
            reason: description,
            user_id: userId
          });

        if (movementError) {
          console.error(`Erro ao registrar movimento para ${item.product.name}:`, movementError);
        }
      } else {
        // Processar comida (consumir ingredientes)
        console.log('Processando comida:', item.product.name);
        const { data: foodIngredients, error: ingredientsError } = await supabase
          .from('food_ingredients')
          .select(`
            id,
            ingredient_id,
            quantity,
            unit,
            ingredients (
              id,
              name,
              current_stock,
              unit
            )
          `)
          .eq('food_id', item.productId);

        if (ingredientsError) {
          console.error('Erro ao buscar ingredientes:', ingredientsError);
          errors.push(`Erro ao buscar ingredientes de ${item.product.name}: ${ingredientsError.message}`);
          success = false;
          continue;
        }

        console.log('Ingredientes encontrados:', foodIngredients);

        if (!foodIngredients || foodIngredients.length === 0) {
          console.log(`Comida ${item.product.name} não tem ingredientes cadastrados`);
          continue;
        }

        // Verificar e consumir cada ingrediente
        for (const foodIngredient of foodIngredients) {
          console.log('Processando ingrediente:', foodIngredient);
          
          // Converter quantidade para a unidade base do ingrediente
          const quantityToConsume = convertValue(
            foodIngredient.quantity,
            foodIngredient.unit as Unit,
            foodIngredient.ingredients.unit as Unit
          );

          const totalQuantity = quantityToConsume * Math.abs(item.quantity);
          console.log('Quantidade total a consumir:', {
            base: quantityToConsume,
            multiplicador: item.quantity,
            total: totalQuantity
          });

          if (!foodIngredient.ingredients) {
            console.error('Dados do ingrediente não encontrados:', foodIngredient);
            errors.push(`Dados do ingrediente não encontrados para ${foodIngredient.ingredient_id}`);
            success = false;
            continue;
          }

          if (item.quantity > 0 && foodIngredient.ingredients.current_stock < totalQuantity) {
            errors.push(`Estoque insuficiente para ${foodIngredient.ingredients.name}. Disponível: ${foodIngredient.ingredients.current_stock}${foodIngredient.ingredients.unit}, Necessário: ${totalQuantity}${foodIngredient.ingredients.unit}`);
            success = false;
            continue;
          }

          // Atualizar estoque do ingrediente
          const newStock = foodIngredient.ingredients.current_stock - (item.quantity > 0 ? totalQuantity : -totalQuantity);
          console.log('Atualizando estoque:', {
            ingrediente: foodIngredient.ingredients.name,
            estoqueAtual: foodIngredient.ingredients.current_stock,
            novoEstoque: newStock
          });

          const { error: updateError } = await supabase
            .from('ingredients')
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', foodIngredient.ingredient_id);

          if (updateError) {
            console.error('Erro ao atualizar estoque do ingrediente:', updateError);
            errors.push(`Erro ao atualizar estoque de ${foodIngredient.ingredients.name}: ${updateError.message}`);
            success = false;
            continue;
          }

          // Registrar movimento
          const { error: movementError } = await supabase
            .from('stock_movements')
            .insert({
              item_type: 'ingredient',
              item_id: foodIngredient.ingredient_id,
              movement_type: item.quantity > 0 ? 'remove' : 'add',
              quantity: Math.abs(totalQuantity),
              previous_stock: foodIngredient.ingredients.current_stock,
              new_stock: newStock,
              reason: description,
              user_id: userId
            });

          if (movementError) {
            console.error(`Erro ao registrar movimento para ${foodIngredient.ingredients.name}:`, movementError);
          }
        }
      }
    }

    console.log('Processamento concluído:', { success, errors });
  } catch (error: any) {
    console.error('Erro inesperado:', error);
    errors.push(`Erro inesperado: ${error.message}`);
    success = false;
  }

  return { success, errors };
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
      unit: fi.unit,
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

      // Converter a quantidade para a unidade base do ingrediente
      const quantityInBaseUnit = convertValue(
        ingredient.quantity,
        ingredient.unit as Unit,
        currentIngredient.unit as Unit
      );

      const totalQuantityToConsume = quantityInBaseUnit * quantityMultiplier;

      if (currentIngredient.current_stock < totalQuantityToConsume) {
        errors.push(`Estoque insuficiente para ${ingredient.ingredientName}. Disponível: ${currentIngredient.current_stock}${currentIngredient.unit}, Necessário: ${totalQuantityToConsume}${currentIngredient.unit}`);
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

      if (currentProduct.current_stock < product.quantity) {
        errors.push(`Estoque insuficiente para ${product.productName}. Disponível: ${currentProduct.current_stock}, Necessário: ${product.quantity}`);
        continue;
      }

      let remainingToConsume = product.quantity;

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
