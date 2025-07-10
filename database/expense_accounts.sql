-- Tabela de contas de despesas dos funcionários
CREATE TABLE IF NOT EXISTS expense_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_profile_id UUID NOT NULL REFERENCES employee_profile(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_expense_accounts_owner_id ON expense_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_expense_accounts_employee_profile_id ON expense_accounts(employee_profile_id);
CREATE INDEX IF NOT EXISTS idx_expense_accounts_status ON expense_accounts(status); 