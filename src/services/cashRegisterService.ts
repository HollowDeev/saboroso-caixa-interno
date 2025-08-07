
import { supabase } from '@/integrations/supabase/client';
import { ServiceTax, User } from '@/types';

export const addServiceTax = async (serviceTax: Omit<ServiceTax, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('service_taxes')
    .insert([serviceTax])
    .select()
    .single();

  if (error) throw error;
};

export const updateServiceTax = async (id: string, updates: Partial<ServiceTax>) => {
  const { error } = await supabase
    .from('service_taxes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const deleteServiceTax = async (id: string) => {
  const { error } = await supabase
    .from('service_taxes')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const openCashRegister = async (amount: number, currentUser: User) => {
  const ownerId = currentUser?.role === 'employee'
    ? (currentUser as any).owner_id || currentUser.id
    : currentUser?.id;

  const { data, error } = await supabase
    .from('cash_registers')
    .insert([{
      owner_id: ownerId,
      opening_amount: amount,
      total_sales: 0,
      total_cost: 0,
      total_orders: 0,
      is_open: true,
      opened_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
};

export const closeCashRegister = async (amount: number, currentCashRegisterId: string) => {
  const { error } = await supabase
    .from('cash_registers')
    .update({
      closing_amount: amount,
      is_open: false,
      closed_at: new Date().toISOString()
    })
    .eq('id', currentCashRegisterId);

  if (error) throw error;
};

export const updateStock = async (
  itemType: 'ingredient' | 'external_product',
  itemId: string,
  quantity: number,
  reason: string,
  currentUser: User
) => {
  const { data, error } = await supabase.rpc(
    quantity > 0 ? 'add_stock' : 'remove_stock',
    {
      p_item_type: itemType,
      p_item_id: itemId,
      p_quantity: Math.abs(quantity),
      p_reason: reason,
      p_user_id: currentUser?.id
    }
  );

  if (error) throw error;
};

export const checkCashRegisterAccess = (currentUser: User | null) => {
  if (!currentUser) return false;
  return ['admin', 'manager', 'cashier'].includes(currentUser.role);
};
