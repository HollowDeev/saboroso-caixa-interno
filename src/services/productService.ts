import { supabase } from '@/integrations/supabase/client';
import { Product, ExternalProduct, Ingredient, User, ProductIngredient } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

export const addProduct = async (foodData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // Primeiro, insere o produto
    const { data: product, error: productError } = await supabase
      .from('foods')
      .insert({
        name: foodData.name,
        description: foodData.description,
        price: foodData.price,
        cost: foodData.cost,
        available: foodData.available,
        category: foodData.category || 'comida',
        preparation_time: foodData.preparation_time || 0,
        owner_id: foodData.owner_id
      })
      .select()
      .single();

    if (productError) throw productError;

    // Depois, insere os ingredientes
    if (foodData.ingredients.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('food_ingredients')
        .insert(
          foodData.ingredients.map(ing => ({
            food_id: product.id,
            ingredient_id: ing.ingredient_id,
            quantity: ing.quantity,
            unit: ing.unit
          }))
        );

      if (ingredientsError) throw ingredientsError;
    }

    return product;
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  try {
    // Primeiro, atualiza o produto
    const { error: productError } = await supabase
      .from('foods')
      .update({
        name: updates.name,
        description: updates.description,
        price: updates.price,
        cost: updates.cost,
        available: updates.available,
        category: updates.category,
        preparation_time: updates.preparation_time
      })
      .eq('id', id);

    if (productError) throw productError;

    // Se houver ingredientes para atualizar
    if (updates.ingredients) {
      // Remove os ingredientes existentes
      const { error: deleteError } = await supabase
        .from('food_ingredients')
        .delete()
        .eq('food_id', id);

      if (deleteError) throw deleteError;

      // Insere os novos ingredientes
      if (updates.ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('food_ingredients')
          .insert(
            updates.ingredients.map(ing => ({
              food_id: id,
              ingredient_id: ing.ingredient_id,
              quantity: ing.quantity,
              unit: ing.unit
            }))
          );

        if (ingredientsError) throw ingredientsError;
      }
    }

    return { id, ...updates };
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase
    .from('foods')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const addExternalProduct = async (
  product: Omit<ExternalProduct, 'id' | 'created_at' | 'updated_at'>,
  currentUser: User
) => {
  const ownerId = currentUser?.role === 'employee'
    ? (currentUser as any).owner_id || currentUser.id
    : currentUser?.id;

  const { data, error } = await supabase
    .from('external_products')
    .insert([{ ...product, owner_id: ownerId }])
    .select()
    .single();

  if (error) throw error;
};

export const updateExternalProduct = async (id: string, updates: Partial<ExternalProduct>) => {
  const { error } = await supabase
    .from('external_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const deleteExternalProduct = async (id: string) => {
  const { error } = await supabase
    .from('external_products')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const addIngredient = async (
  ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>,
  currentUser: User
) => {
  const ownerId = currentUser?.role === 'employee'
    ? (currentUser as any).owner_id || currentUser.id
    : currentUser?.id;

  const { data, error } = await supabase
    .from('ingredients')
    .insert([{ ...ingredient, owner_id: ownerId }])
    .select()
    .single();

  if (error) throw error;
};

export const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
  const { error } = await supabase
    .from('ingredients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const deleteIngredient = async (id: string) => {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

interface FoodIngredientWithName extends Omit<ProductIngredient, 'ingredient_name'> {
  ingredients?: {
    name: string;
  };
}

interface FoodWithIngredients extends Omit<Product, 'ingredients'> {
  ingredients: FoodIngredientWithName[];
}

export const getProducts = async (supabase: SupabaseClient): Promise<Product[]> => {
  const { data: products, error } = await supabase
    .from('foods')
    .select(`
      *,
      ingredients:food_ingredients (
        id,
        food_id,
        ingredient_id,
        quantity,
        unit,
        created_at,
        updated_at,
        ingredients:ingredients!ingredient_id (
          name
        )
      )
    `)
    .order('name');

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }

  console.log('Dados recebidos do banco:', JSON.stringify(products, null, 2));

  // Transformar os dados para o formato esperado
  const transformedProducts = (products as FoodWithIngredients[]).map(product => ({
    ...product,
    ingredients: product.ingredients.map((ing: FoodIngredientWithName) => {
      console.log('Ingrediente antes da transformação:', ing);
      return {
        id: ing.id,
        food_id: ing.food_id,
        ingredient_id: ing.ingredient_id,
        ingredient_name: ing.ingredients?.name || 'Sem nome',
        quantity: ing.quantity,
        unit: ing.unit,
        created_at: ing.created_at,
        updated_at: ing.updated_at
      };
    })
  }));

  console.log('Produtos transformados:', JSON.stringify(transformedProducts, null, 2));
  return transformedProducts;
};
