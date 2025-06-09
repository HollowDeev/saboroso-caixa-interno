-- Adicionar política de exclusão para vendas
CREATE POLICY "Usuários podem deletar vendas do caixa" ON public.sales
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.cash_registers
    WHERE id = cash_register_id AND owner_id = auth.uid()
  )); 