
-- Criar tabela de despesas
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('product_loss', 'ingredient_loss', 'other')),
  product_id uuid,
  ingredient_ids jsonb,
  description text NOT NULL,
  amount numeric NOT NULL,
  quantity numeric,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_cash_register_id_fkey FOREIGN KEY (cash_register_id) REFERENCES public.cash_registers(id),
  CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Habilitar RLS na tabela expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Política para ver despesas do próprio caixa
CREATE POLICY "Usuários podem ver despesas do próprio caixa" ON public.expenses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

-- Política para criar despesas no próprio caixa
CREATE POLICY "Usuários podem criar despesas no próprio caixa" ON public.expenses
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

-- Política para atualizar despesas do próprio caixa
CREATE POLICY "Usuários podem atualizar despesas do próprio caixa" ON public.expenses
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

-- Política para deletar despesas do próprio caixa
CREATE POLICY "Usuários podem deletar despesas do próprio caixa" ON public.expenses
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

-- Adicionar coluna total_expenses no cash_registers
ALTER TABLE public.cash_registers ADD COLUMN total_expenses numeric NOT NULL DEFAULT 0;

-- Função para atualizar total de despesas no caixa
CREATE OR REPLACE FUNCTION public.update_cash_register_on_expense()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Atualizar o total de despesas do caixa
  UPDATE public.cash_registers
  SET 
    total_expenses = total_expenses + NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.cash_register_id;
  
  RETURN NEW;
END;
$function$;

-- Trigger para executar a função quando uma despesa for inserida
CREATE TRIGGER update_cash_register_on_expense_trigger
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cash_register_on_expense();
