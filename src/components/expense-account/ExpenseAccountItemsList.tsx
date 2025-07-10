import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Item {
  id: string;
  product_id: string;
  product_type: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  contested: boolean;
  contest_message: string | null;
  removed_by_admin: boolean;
}

interface Props {
  items: Item[];
}

const groupByDate = (items: Item[]) => {
  return items.reduce((acc, item) => {
    const date = format(new Date(item.created_at), 'dd/MM/yyyy', { locale: ptBR });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, Item[]>);
};

const ExpenseAccountItemsList: React.FC<Props> = ({ items }) => {
  if (!items || items.length === 0) {
    return <div className="bg-white rounded shadow p-4 text-center text-gray-500">Nenhum item marcado ainda.</div>;
  }
  const grouped = groupByDate(items);
  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, its]) => (
        <div key={date} className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">{date}</h2>
          <ul className="divide-y">
            {its.map(item => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium">{item.quantity}x </span>
                  <span className="font-medium">{item.product_name || (item.product_type === 'food' ? 'Comida' : 'Produto Externo')}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span>{item.quantity}x R$ {item.unit_price.toFixed(2)}</span>
                  {item.quantity > 1 && (
                    <span className="text-xs text-gray-500">Total: R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ExpenseAccountItemsList; 