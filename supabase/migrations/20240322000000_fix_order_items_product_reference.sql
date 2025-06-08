-- Primeiro, remover a constraint existente
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- Adicionar uma coluna para identificar o tipo do produto
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'food' CHECK (product_type IN ('food', 'external_product'));

-- Criar uma função para validar o product_id
CREATE OR REPLACE FUNCTION validate_product_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_type = 'food' THEN
    IF NOT EXISTS (SELECT 1 FROM public.foods WHERE id = NEW.product_id) THEN
      RAISE EXCEPTION 'O ID do produto não existe na tabela foods';
    END IF;
  ELSIF NEW.product_type = 'external_product' THEN
    IF NOT EXISTS (SELECT 1 FROM public.external_products WHERE id = NEW.product_id) THEN
      RAISE EXCEPTION 'O ID do produto não existe na tabela external_products';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para validar o product_id
DROP TRIGGER IF EXISTS validate_product_id_trigger ON public.order_items;
CREATE TRIGGER validate_product_id_trigger
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_id(); 