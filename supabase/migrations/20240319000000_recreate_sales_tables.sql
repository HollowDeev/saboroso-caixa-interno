-- Primeiro, remover as tabelas existentes na ordem correta (por causa das dependências)
DROP TABLE IF EXISTS public.cash_register_sales;
DROP TABLE IF EXISTS public.sales;
DROP TABLE IF EXISTS public.orders;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver seus próprios caixas" ON public.cash_registers;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios caixas" ON public.cash_registers;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios caixas" ON public.cash_registers;

-- Criar as novas tabelas
-- Tabela de caixas (atualizar a existente)
ALTER TABLE public.cash_registers 
ADD COLUMN IF NOT EXISTS total_sales numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_orders integer NOT NULL DEFAULT 0;

-- Tabela de comandas
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_name text,
  table_number integer,
  subtotal numeric NOT NULL,
  tax numeric NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL,
  payment_method text,
  user_id uuid NOT NULL,
  cash_register_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT orders_cash_register_id_fkey FOREIGN KEY (cash_register_id) REFERENCES public.cash_registers(id)
);

-- Tabela de itens da comanda
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  cash_register_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_items_cash_register_id_fkey FOREIGN KEY (cash_register_id) REFERENCES public.cash_registers(id)
);

-- Tabela de vendas
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  total numeric NOT NULL,
  payment_method text NOT NULL,
  user_id uuid NOT NULL,
  cash_register_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT sales_cash_register_id_fkey FOREIGN KEY (cash_register_id) REFERENCES public.cash_registers(id)
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
-- Políticas para caixas
CREATE POLICY "Usuários podem ver seus próprios caixas" ON public.cash_registers
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Usuários podem criar seus próprios caixas" ON public.cash_registers
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Usuários podem atualizar seus próprios caixas" ON public.cash_registers
  FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para comandas
CREATE POLICY "Usuários podem ver todas as comandas do caixa" ON public.orders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Usuários podem criar comandas no caixa" ON public.orders
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar comandas do caixa" ON public.orders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

-- Políticas para itens da comanda
CREATE POLICY "Usuários podem ver todos os itens das comandas do caixa" ON public.order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Usuários podem criar itens nas comandas do caixa" ON public.order_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

-- Políticas para vendas
CREATE POLICY "Usuários podem ver todas as vendas do caixa" ON public.sales
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Usuários podem criar vendas no caixa" ON public.sales
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  )); 