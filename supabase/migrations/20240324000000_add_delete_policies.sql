-- Adicionar políticas de exclusão para comandas
CREATE POLICY "Usuários podem deletar comandas do caixa" ON public.orders
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  ));

-- Adicionar políticas de exclusão para itens da comanda
CREATE POLICY "Usuários podem deletar itens das comandas do caixa" ON public.order_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  )); 