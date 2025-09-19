-- Migration: Adicionar coluna de pagamentos parciais à tabela expense_accounts
-- Data: 2024-01-XX
-- Descrição: Adiciona coluna para armazenar pagamentos parciais como JSON

-- Adicionar coluna para pagamentos parciais
ALTER TABLE expense_accounts 
ADD COLUMN partial_payments JSONB DEFAULT '[]'::jsonb;

-- Adicionar comentário para documentar a estrutura do JSON
COMMENT ON COLUMN expense_accounts.partial_payments IS 'Array de objetos com pagamentos parciais: [{"date": "2024-01-01T10:00:00Z", "amount": 50.00}, ...]';

-- Criar índice para consultas eficientes nos pagamentos
CREATE INDEX IF NOT EXISTS idx_expense_accounts_partial_payments 
ON expense_accounts USING GIN (partial_payments);

-- Exemplo de estrutura do JSON que será armazenado:
-- [
--   {
--     "date": "2024-01-15T14:30:00Z",
--     "amount": 25.50,
--     "id": "uuid-gerado-automaticamente"
--   },
--   {
--     "date": "2024-01-16T09:15:00Z", 
--     "amount": 15.00,
--     "id": "uuid-gerado-automaticamente"
--   }
-- ]
