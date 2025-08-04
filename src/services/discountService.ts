import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Discount {
  id: string;
  productType: 'external_product' | 'food';
  productId: string;
  name: string;
  newPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function createDiscount(discount: Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('discounts')
    .insert([{ ...discount }])
    .select()
    .single();
  if (error) throw error;
  return data as Discount;
}

export async function getDiscounts(params?: { productType?: string; productId?: string; active?: boolean }) {
  let query = supabase.from('discounts').select('*');
  if (params?.productType) query = query.eq('product_type', params.productType);
  if (params?.productId) query = query.eq('product_id', params.productId);
  if (params?.active !== undefined) query = query.eq('active', params.active);
  const { data, error } = await query;
  if (error) throw error;
  return data as Discount[];
}

export async function getDiscountById(id: string) {
  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Discount;
}

export async function updateDiscount(id: string, updates: Partial<Omit<Discount, 'id'>>) {
  const { data, error } = await supabase
    .from('discounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Discount;
}

export async function deleteDiscount(id: string) {
  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
