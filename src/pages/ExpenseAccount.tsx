import React, { useState } from 'react';
import ExpenseAccountItemsList from '../components/expense-account/ExpenseAccountItemsList';
import AddExpenseItemModal from '../components/expense-account/AddExpenseItemModal';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';

const ExpenseAccount: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Futuramente: carregar conta aberta e itens via hook

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conta de Despesas</h1>
        <Button
          className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4" /> Adicionar Item
        </Button>
      </div>
      {/* Lista de itens agrupados por data (placeholder) */}
      <ExpenseAccountItemsList />
      {/* Modal para adicionar item */}
      <AddExpenseItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default ExpenseAccount; 