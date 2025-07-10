import React from 'react';
import { Button } from '../ui/button';

const OpenExpenseAccountButton: React.FC = () => {
  // Futuramente: lógica para abrir nova conta
  return (
    <div className="mb-4">
      <Button className="bg-green-600 hover:bg-green-700 w-full">Abrir Nova Conta de Despesa</Button>
    </div>
  );
};

export default OpenExpenseAccountButton; 