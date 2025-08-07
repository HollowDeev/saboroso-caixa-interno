-- Itens marcados em cada conta de despesa
CREATE TABLE IF NOT EXISTS expense_account_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_account_id UUID NOT NULL REFERENCES expense_accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('external', 'food')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  contested BOOLEAN DEFAULT FALSE,
  contest_message TEXT,
  removed_by_admin BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_expense_account_items_account_id ON expense_account_items(expense_account_id);
CREATE INDEX IF NOT EXISTS idx_expense_account_items_product_id ON expense_account_items(product_id); 