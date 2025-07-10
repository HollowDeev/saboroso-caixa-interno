import React, { useState } from 'react';
import ExpenseAccountItemsList from '../components/expense-account/ExpenseAccountItemsList';
import AddExpenseItemModal from '../components/expense-account/AddExpenseItemModal';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { useExpenseAccount } from '../hooks/useExpenseAccount';

const ExpenseAccount: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { account, items, loading, error, openAccount, addItems, reload } = useExpenseAccount();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conta de Despesas</h1>
        {account && (
          <Button
            className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Adicionar Item
          </Button>
        )}
      </div>
      {loading && <div className="text-center text-gray-500 py-8">Carregando...</div>}
      {error && <div className="text-center text-red-500 py-8">{error}</div>}
      {!loading && !account && (
        <div className="flex flex-col items-center py-12">
          <div className="text-lg mb-4">Nenhuma conta de despesas aberta.</div>
          <Button className="bg-green-600 hover:bg-green-700" onClick={openAccount}>
            Abrir Nova Conta de Despesa
          </Button>
        </div>
      )}
      {account && (
        <ExpenseAccountItemsList items={items} reload={reload} />
      )}
      {/* Modal para adicionar item */}
      <AddExpenseItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItems={addItems}
      />
    </div>
  );
};

export default ExpenseAccount; 