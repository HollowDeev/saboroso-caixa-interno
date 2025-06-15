
import { supabase } from '@/integrations/supabase/client';
import { Product, ExternalProduct, Ingredient, User } from '@/types';

export const addProduct = async (
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
  currentUser: User
) => {
  const ownerId = currentUser?.role === 'employee'
    ? (currentUser as any).owner_id || currentUser.id
    : currentUser?.id;

  // Separar os ingredientes do produto
  const { ingredients: productIngredients, ...foodData } = product;

  // Primeiro criar o produto
  const { data: newFood, error: foodError } = await supabase
    .from('foods')
    .insert([{
      ...foodData,
      owner_id: ownerId,
      deleted_at: null
    }])
    .select()
    .single();

  if (foodError) {
    console.error('Erro ao criar comida:', foodError);
    throw foodError;
  }

  // Se houver ingredientes, criar os relacionamentos
  if (productIngredients && productIngredients.length > 0) {
    const foodIngredients = productIngredients.map(ing => ({
      food_id: newFood.id,
      ingredient_id: ing.ingredient_id,
      quantity: ing.quantity,
      unit: ing.unit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: ingredientsError } = await supabase
      .from('food_ingredients')
      .insert(foodIngredients);

    if (ingredientsError) {
      // Se falhar ao criar os ingredientes, deletar a comida criada
      await supabase.from('foods').delete().eq('id', newFood.id);
      console.error('Erro ao criar ingredientes:', ingredientsError);
      throw ingredientsError;
    }
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const { error } = await supabase
    .from('foods')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
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
