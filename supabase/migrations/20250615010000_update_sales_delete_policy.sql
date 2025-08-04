-- Atualizar política de exclusão para vendas permitindo funcionários
DROP POLICY IF EXISTS "Usuários podem deletar vendas do caixa" ON public.sales;

CREATE POLICY "Usuários e funcionários podem deletar vendas do caixa" ON public.sales
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cash_registers
      WHERE id = cash_register_id AND (
        owner_id = auth.uid() OR
        owner_id IN (SELECT owner_id FROM public.employees WHERE id = auth.uid())
      )
    )
  ); 