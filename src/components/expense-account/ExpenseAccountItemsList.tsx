import React from 'react';

const ExpenseAccountItemsList: React.FC = () => {
  // Futuramente: receberá props ou hook para exibir os itens da conta aberta
  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Itens Marcados</h2>
      <div className="text-gray-500">Nenhum item marcado ainda.</div>
    </div>
  );
};

export default ExpenseAccountItemsList; 