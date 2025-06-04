-- Criar tabela de entradas de estoque
CREATE TABLE stock_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity DECIMAL(10,3) NOT NULL,
  remaining_quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT positive_remaining CHECK (remaining_quantity >= 0),
  CONSTRAINT positive_cost CHECK (unit_cost > 0)
);

-- Adicionar políticas RLS
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stock entries"
  ON stock_entries FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own stock entries"
  ON stock_entries FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own stock entries"
  ON stock_entries FOR UPDATE
  USING (auth.uid() = owner_id);

-- Criar função para calcular custo médio ponderado
CREATE OR REPLACE FUNCTION calculate_weighted_average_cost(p_ingredient_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_quantity DECIMAL(10,3);
  total_value DECIMAL(10,2);
BEGIN
  -- Calcular quantidade total e valor total considerando apenas as quantidades restantes
  SELECT 
    COALESCE(SUM(remaining_quantity), 0),
    COALESCE(SUM(remaining_quantity * unit_cost), 0)
  INTO total_quantity, total_value
  FROM stock_entries
  WHERE ingredient_id = p_ingredient_id
    AND remaining_quantity > 0;

  -- Retornar custo médio ponderado
  IF total_quantity > 0 THEN
    RETURN ROUND((total_value / total_quantity)::numeric, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql; 