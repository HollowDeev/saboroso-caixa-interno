import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { contestExpenseAccountItem } from '../../services/expenseAccountService';
import { Trash2, Undo2 } from 'lucide-react';

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
  reload?: () => void;
}

const groupByDate = (items: Item[]) => {
  return items.reduce((acc, item) => {
    const dateObj = new Date(item.created_at);
    const date = format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
    const weekDay = format(dateObj, 'EEEE', { locale: ptBR });
    const label = `${weekDay.charAt(0).toUpperCase() + weekDay.slice(1)} - ${date}`;
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {} as Record<string, Item[]>);
};

const ExpenseAccountItemsList: React.FC<Props> = ({ items, reload }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (item: Item) => {
    setSelectedItem(item);
    setMessage('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
    setMessage('');
  };

  const handleContest = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      await contestExpenseAccountItem(selectedItem.id, message);
      if (typeof reload === 'function') await reload();
      handleCloseModal();
    } catch (err) {
      alert('Erro ao contestar item.');
    } finally {
      setLoading(false);
    }
  };

  const handleUncontest = async (item: Item) => {
    setLoading(true);
    try {
      await contestExpenseAccountItem(item.id, '');
      if (typeof reload === 'function') await reload();
      handleCloseModal();
    } catch (err) {
      alert('Erro ao remover contestação.');
    } finally {
      setLoading(false);
    }
  };

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
            {its.map(item => {
              const isContested = item.contested;
              return (
                <li
                  key={item.id}
                  className={`flex items-center justify-between py-2 rounded-lg px-2 ${isContested ? 'bg-[#eaf3fb]' : ''}`}
                >
                  <div className="flex-1">
                    <span className={`font-medium ${isContested ? 'text-[#17497a]' : ''}`}>{item.quantity}x </span>
                    <span className={`font-medium ${isContested ? 'text-[#17497a]' : ''}`}>{item.product_name || (item.product_type === 'food' ? 'Comida' : 'Produto Externo')}</span>
                    {isContested && item.contest_message && (
                      <div className="mt-1 text-sm font-normal text-black bg-transparent">
                        {item.contest_message}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className={`${isContested ? 'text-[#17497a]' : ''}`}>{item.quantity}x R$ {item.unit_price.toFixed(2)}</span>
                      {item.quantity > 1 && (
                        <span className={`text-xs ${isContested ? 'text-[#17497a]' : 'text-gray-500'}`}>Total: R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                      )}
                    </div>
                    {!isContested && (
                      <Button size="sm" variant="destructive" onClick={() => handleOpenModal(item)} className="flex items-center gap-1">
                        <Trash2 className="h-4 w-4 mr-1" /> Contestar
                      </Button>
                    )}
                    {isContested && (
                      <Button size="sm" variant="outline" className="text-[#17497a] border-[#17497a] hover:bg-[#eaf3fb] flex items-center gap-1" onClick={() => handleUncontest(item)} disabled={loading}>
                        {loading ? (
                          <span className="animate-spin mr-1 w-4 h-4 border-2 border-[#17497a] border-t-transparent rounded-full inline-block"></span>
                        ) : (
                          <Undo2 className="h-4 w-4 mr-1" />
                        )}
                        Descontestar
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contestar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Explique o motivo da contestação do item <b>{selectedItem?.product_name}</b>:</p>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Digite sua mensagem..." rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCloseModal} disabled={loading}>Cancelar</Button>
              <Button onClick={handleContest} disabled={loading || !message.trim()}>
                {loading ? 'Enviando...' : 'Enviar Contestação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseAccountItemsList; 