-- Adicionar campos de desconto à tabela order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS original_price numeric,
ADD COLUMN IF NOT EXISTS discount_value numeric,
ADD COLUMN IF NOT EXISTS discount_id uuid REFERENCES public.discounts(id);

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN public.order_items.original_price IS 'Preço original do produto antes do desconto';
COMMENT ON COLUMN public.order_items.discount_value IS 'Valor do desconto aplicado';
COMMENT ON COLUMN public.order_items.discount_id IS 'Referência ao desconto aplicado (se houver)'; 