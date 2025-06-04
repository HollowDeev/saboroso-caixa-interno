-- Criar extensão pgcrypto se não existir
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_key TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_employees_owner_id ON employees(owner_id);
CREATE INDEX IF NOT EXISTS idx_employees_access_key ON employees(access_key);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Permissões
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees are viewable by owner"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Employees are insertable by owner"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Employees are updatable by owner"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Employees are deletable by owner"
  ON employees FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id); 