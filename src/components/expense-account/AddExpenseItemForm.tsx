import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const AddExpenseItemForm: React.FC = () => {
  // Futuramente: lógica para adicionar item à conta aberta
  return (
    <form className="bg-white rounded shadow p-4 space-y-2 mt-4">
      <h2 className="text-lg font-semibold mb-2">Adicionar Item</h2>
      <Input placeholder="Nome do produto ou comida" disabled />
      <Input placeholder="Quantidade" type="number" min={1} disabled />
      <Button className="w-full" disabled>Adicionar (placeholder)</Button>
    </form>
  );
};

export default AddExpenseItemForm; 