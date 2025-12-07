-- Script para verificar e corrigir políticas RLS para orders, order_items e sales
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'sales', 'products', 'external_products')
ORDER BY tablename, policyname;

-- 2. ORDERS - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

-- Política para INSERT em orders
CREATE POLICY "Enable insert for authenticated users based on user_id"
ON orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
  SELECT owner_id FROM employees WHERE id = user_id
));

-- Política para SELECT em orders
CREATE POLICY "Enable read access for own orders"
ON orders FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = user_id)
  OR user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
);

-- Política para UPDATE em orders
CREATE POLICY "Enable update for own orders"
ON orders FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = user_id)
  OR user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = user_id)
  OR user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
);

-- Política para DELETE em orders
CREATE POLICY "Enable delete for own orders"
ON orders FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = user_id)
  OR user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
);

-- 3. ORDER_ITEMS - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "Users can insert their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can update their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can delete their own order items" ON order_items;

-- Política para INSERT em order_items (baseado no order)
CREATE POLICY "Enable insert for order items based on order ownership"
ON order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.user_id = auth.uid()
      OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = orders.user_id)
      OR orders.user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
    )
  )
);

-- Política para SELECT em order_items
CREATE POLICY "Enable read access for order items based on order ownership"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.user_id = auth.uid()
      OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = orders.user_id)
      OR orders.user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
    )
  )
);

-- Política para UPDATE em order_items
CREATE POLICY "Enable update for order items based on order ownership"
ON order_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.user_id = auth.uid()
      OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = orders.user_id)
      OR orders.user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.user_id = auth.uid()
      OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = orders.user_id)
      OR orders.user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
    )
  )
);

-- Política para DELETE em order_items
CREATE POLICY "Enable delete for order items based on order ownership"
ON order_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.user_id = auth.uid()
      OR auth.uid() IN (SELECT owner_id FROM employee_profiles WHERE id = orders.user_id)
      OR orders.user_id IN (SELECT id FROM employee_profiles WHERE owner_id = auth.uid())
    )
  )
);

-- 4. SALES - Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "Users can insert their own sales" ON sales;
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON sales;

-- Política para INSERT em sales
CREATE POLICY "Enable insert for authenticated users based on user_id"
ON sales FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employees WHERE id = user_id)
);

-- Política para SELECT em sales
CREATE POLICY "Enable read access for own sales"
ON sales FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employees WHERE id = user_id)
  OR user_id IN (SELECT id FROM employees WHERE owner_id = auth.uid())
);

-- Política para UPDATE em sales
CREATE POLICY "Enable update for own sales"
ON sales FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employees WHERE id = user_id)
  OR user_id IN (SELECT id FROM employees WHERE owner_id = auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employees WHERE id = user_id)
  OR user_id IN (SELECT id FROM employees WHERE owner_id = auth.uid())
);

-- Política para DELETE em sales
CREATE POLICY "Enable delete for own sales"
ON sales FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT owner_id FROM employees WHERE id = user_id)
  OR user_id IN (SELECT id FROM employees WHERE owner_id = auth.uid())
);

-- 5. Verificar se RLS está habilitado nas tabelas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'order_items', 'sales');

-- Se alguma tabela aparecer com rowsecurity = false, execute:
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 6. Verificar as novas políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'sales')
ORDER BY tablename, cmd, policyname;
