
-- Verificar e corrigir políticas RLS para a tabela foods
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view their own foods" ON public.foods;
DROP POLICY IF EXISTS "Users can create their own foods" ON public.foods;
DROP POLICY IF EXISTS "Users can update their own foods" ON public.foods;
DROP POLICY IF EXISTS "Users can delete their own foods" ON public.foods;

-- Habilitar RLS na tabela foods
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Criar política que permite acesso baseado em owner_id
CREATE POLICY "Users can view foods by owner_id" 
  ON public.foods 
  FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create foods by owner_id" 
  ON public.foods 
  FOR INSERT 
  WITH CHECK (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update foods by owner_id" 
  ON public.foods 
  FOR UPDATE 
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete foods by owner_id" 
  ON public.foods 
  FOR DELETE 
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- Verificar e corrigir políticas RLS para a tabela orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders by user_id" 
  ON public.orders 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.employees WHERE owner_id = user_id
    )
  );

CREATE POLICY "Users can create orders by user_id" 
  ON public.orders 
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.employees WHERE owner_id = user_id
    )
  );

CREATE POLICY "Users can update orders by user_id" 
  ON public.orders 
  FOR UPDATE 
  USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.employees WHERE owner_id = user_id
    )
  );

-- Verificar e corrigir políticas RLS para a tabela sales
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales by user_id" 
  ON public.sales 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.employees WHERE owner_id = user_id
    )
  );

CREATE POLICY "Users can create sales by user_id" 
  ON public.sales 
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.employees WHERE owner_id = user_id
    )
  );

CREATE POLICY "Users can update sales by user_id" 
  ON public.sales 
  FOR UPDATE 
  USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.employees WHERE owner_id = user_id
    )
  );

CREATE POLICY "Users can delete sales by user_id" 
  ON public.sales 
  FOR DELETE 
  USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT owner_id FROM public.employees WHERE id = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.employees WHERE owner_id = user_id
    )
  );

-- Verificar políticas para order_items
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can update their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete their order items" ON public.order_items;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order_items by cash_register" 
  ON public.order_items 
  FOR SELECT 
  USING (
    cash_register_id IN (
      SELECT id FROM public.cash_registers 
      WHERE owner_id = auth.uid() OR 
      owner_id IN (
        SELECT owner_id FROM public.employees WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create order_items by cash_register" 
  ON public.order_items 
  FOR INSERT 
  WITH CHECK (
    cash_register_id IN (
      SELECT id FROM public.cash_registers 
      WHERE owner_id = auth.uid() OR 
      owner_id IN (
        SELECT owner_id FROM public.employees WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update order_items by cash_register" 
  ON public.order_items 
  FOR UPDATE 
  USING (
    cash_register_id IN (
      SELECT id FROM public.cash_registers 
      WHERE owner_id = auth.uid() OR 
      owner_id IN (
        SELECT owner_id FROM public.employees WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete order_items by cash_register" 
  ON public.order_items 
  FOR DELETE 
  USING (
    cash_register_id IN (
      SELECT id FROM public.cash_registers 
      WHERE owner_id = auth.uid() OR 
      owner_id IN (
        SELECT owner_id FROM public.employees WHERE id = auth.uid()
      )
    )
  );
