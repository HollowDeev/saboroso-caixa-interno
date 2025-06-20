-- Primeiro, adicionar uma nova coluna para armazenar os itens
ALTER TABLE expenses ADD COLUMN items JSONB;

-- Migrar os dados existentes para o novo formato
UPDATE expenses 
SET items = jsonb_build_array(
  jsonb_build_object(
    'product_id', product_id,
    'quantity', quantity,
    'amount', amount
  )
)
WHERE product_id IS NOT NULL;

-- Para registros que não têm product_id (outras despesas), criar um array vazio
UPDATE expenses 
SET items = '[]'::jsonb
WHERE product_id IS NULL;

-- Remover as colunas antigas que não serão mais necessárias
ALTER TABLE expenses 
  DROP COLUMN product_id,
  DROP COLUMN quantity;

-- Adicionar uma coluna total_amount para armazenar o valor total da despesa
ALTER TABLE expenses RENAME COLUMN amount TO total_amount;

-- Adicionar políticas de segurança para a nova coluna
CREATE POLICY "Usuários autenticados podem ver despesas" ON public.expenses
    FOR SELECT
    TO authenticated
    USING (true);

-- Atualizar a trigger de validação se existir
DROP TRIGGER IF EXISTS validate_expense_trigger ON expenses;

CREATE OR REPLACE FUNCTION validate_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar se há pelo menos um item quando o tipo é product_loss ou ingredient_loss
  IF (NEW.type IN ('product_loss', 'ingredient_loss') AND 
      (NEW.items IS NULL OR jsonb_array_length(NEW.items) = 0)) THEN
    RAISE EXCEPTION 'Despesas do tipo % devem ter pelo menos um item', NEW.type;
  END IF;

  -- Validar se o total_amount é maior que zero
  IF NEW.total_amount <= 0 THEN
    RAISE EXCEPTION 'O valor total da despesa deve ser maior que zero';
  END IF;

  -- Validar se cada item tem os campos necessários
  IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
    FOR i IN 0..jsonb_array_length(NEW.items)-1 LOOP
      IF NOT (
        NEW.items->i ? 'product_id' AND
        NEW.items->i ? 'quantity' AND
        NEW.items->i ? 'amount'
      ) THEN
        RAISE EXCEPTION 'Cada item deve ter product_id, quantity e amount';
      END IF;

      -- Validar se quantity é maior que zero
      IF (NEW.items->i->>'quantity')::numeric <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero';
      END IF;

      -- Validar se amount é maior que zero
      IF (NEW.items->i->>'amount')::numeric <= 0 THEN
        RAISE EXCEPTION 'O valor do item deve ser maior que zero';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_expense_trigger
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense();

-- Comentários para documentação
COMMENT ON COLUMN expenses.items IS 'Array de itens da despesa, cada item contendo product_id, quantity e amount';
COMMENT ON COLUMN expenses.total_amount IS 'Valor total da despesa (soma dos valores dos itens para despesas de produto/ingrediente)'; 