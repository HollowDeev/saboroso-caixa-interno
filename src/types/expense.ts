
export interface Expense {
  id: string;
  cash_register_id: string;
  user_id: string;
  type: 'product_loss' | 'ingredient_loss' | 'other';
  product_id?: string;
  ingredient_ids?: string[];
  description: string;
  amount: number;
  quantity?: number;
  reason?: string;
  created_at: string;
}

export interface NewExpense {
  type: 'product_loss' | 'ingredient_loss' | 'other';
  product_id?: string;
  ingredient_ids?: string[];
  description: string;
  amount: number;
  quantity?: number;
  reason?: string;
}

export type ExpenseType = 'product_loss' | 'ingredient_loss' | 'other';
