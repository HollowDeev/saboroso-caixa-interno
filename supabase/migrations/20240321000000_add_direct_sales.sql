-- Primeiro, remover a constraint que obriga a venda ter uma comanda
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_order_id_fkey;

-- Alterar a coluna order_id para ser opcional
ALTER TABLE public.sales ALTER COLUMN order_id DROP NOT NULL;

-- Adicionar nova constraint que permite order_id ser nulo
ALTER TABLE public.sales
ADD CONSTRAINT sales_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Adicionar coluna para identificar se é uma venda direta
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_direct_sale BOOLEAN NOT NULL DEFAULT false;

-- Adicionar coluna para armazenar os itens da venda direta
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB;

-- Adicionar coluna para nome do cliente em vendas diretas
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Adicionar coluna para subtotal e taxa
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax NUMERIC NOT NULL DEFAULT 0;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_sales_is_direct ON public.sales(is_direct_sale);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_cash_register_id ON public.sales(cash_register_id);

-- Atualizar a trigger de atualização do caixa
CREATE OR REPLACE FUNCTION public.update_cash_register_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar o total de vendas do caixa
  UPDATE public.cash_registers
  SET 
    total_sales = total_sales + NEW.total,
    total_orders = total_orders + 1,
    updated_at = NOW()
  WHERE id = NEW.cash_register_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover o trigger existente se houver
DROP TRIGGER IF EXISTS update_cash_register_on_sale ON public.sales;

-- Criar o novo trigger
CREATE TRIGGER update_cash_register_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cash_register_on_sale(); 