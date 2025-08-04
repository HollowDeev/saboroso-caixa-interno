import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveDiscount {
  id: string;
  productType: 'food' | 'external_product';
  productId: string;
  name: string;
  newPrice: number;
  active: boolean;
}

export function useActiveDiscounts() {
  const [discounts, setDiscounts] = useState<ActiveDiscount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscounts() {
      setLoading(true);
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('active', true);
      if (!error && data) {
        setDiscounts(
          data.map((d: any) => ({
            id: d.id,
            productType: d.product_type,
            productId: d.product_id,
            name: d.name,
            newPrice: Number(d.new_price),
            active: d.active,
          }))
        );
      }
      setLoading(false);
    }
    fetchDiscounts();
  }, []);

  return { discounts, loading };
}
