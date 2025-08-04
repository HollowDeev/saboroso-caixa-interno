-- Script para aplicar campos de desconto à tabela order_items
-- Execute este script no seu banco de dados Supabase

-- Adicionar campos de desconto à tabela order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS original_price numeric,
ADD COLUMN IF NOT EXISTS discount_value numeric,
ADD COLUMN IF NOT EXISTS discount_id uuid REFERENCES public.discounts(id);

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN public.order_items.original_price IS 'Preço original do produto antes do desconto';
COMMENT ON COLUMN public.order_items.discount_value IS 'Valor do desconto aplicado';
COMMENT ON COLUMN public.order_items.discount_id IS 'Referência ao desconto aplicado (se houver)';

-- Verificar se os campos foram adicionados corretamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('original_price', 'discount_value', 'discount_id'); 

-- Adicionar campo total_discount na tabela sales
ALTER TABLE public.sales
ADD COLUMN total_discount numeric DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public.sales.total_discount IS 'Total de descontos aplicados na venda'; 