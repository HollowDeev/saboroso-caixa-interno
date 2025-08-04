-- Primeiro, remover a constraint existente
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- Adicionar a nova constraint referenciando a tabela foods
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.foods(id); 