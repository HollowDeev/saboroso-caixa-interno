import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { contestExpenseAccountItem, calculateTotalPaid, calculateRemainingAmount, removePartialPayment } from '../../services/expenseAccountService';
import { Trash2, Undo2, CreditCard, X, AlertTriangle } from 'lucide-react';
import { PartialPaymentModal } from './PartialPaymentModal';

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
  accountId?: string;
  partialPayments?: any[];
  advances?: any[];
  onAddPayment?: (amount: number) => Promise<void>;
  onRemovePayment?: (paymentId: string) => Promise<void>;
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

const ExpenseAccountItemsList: React.FC<Props> = ({ items, reload, accountId, partialPayments = [], advances = [], onAddPayment, onRemovePayment }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [removingPayment, setRemovingPayment] = useState<string | null>(null);
  const [confirmRemovePayment, setConfirmRemovePayment] = useState<string | null>(null);

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

  const handleConfirmRemovePayment = (paymentId: string) => {
    setConfirmRemovePayment(paymentId);
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!onRemovePayment) return;
    setRemovingPayment(paymentId);
    setConfirmRemovePayment(null);
    try {
      await onRemovePayment(paymentId);
    } catch (err) {
      console.error('Erro ao remover pagamento:', err);
    } finally {
      setRemovingPayment(null);
    }
  };

  // Calcular totais (inclui vales como parte da dívida)
  const totalItems = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const totalAdvances = (advances && Array.isArray(advances)) ? advances.reduce((s, a) => s + (a.amount || 0), 0) : 0;
  const totalPaid = calculateTotalPaid(partialPayments);
  // Novo cálculo do restante: itens + vales - pagamentos
  const remainingAmount = Math.max(0, (totalItems + totalAdvances) - totalPaid);

  if (!items || items.length === 0) {
    return <div className="bg-white rounded shadow p-4 text-center text-gray-500">Nenhum item marcado ainda.</div>;
  }
  const grouped = groupByDate(items);
  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="bg-white rounded shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo da Conta</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total dos Itens</div>
            <div className="text-xl font-bold">R$ {totalItems.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 mb-1">Total Pago</div>
            <div className="text-xl font-bold text-green-600">R$ {totalPaid.toFixed(2)}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 mb-1">Valor Restante</div>
            <div className="text-xl font-bold text-red-600">R$ {remainingAmount.toFixed(2)}</div>
          </div>
        </div>
        
        {/* Lista de Pagamentos Parciais */}
        {partialPayments && partialPayments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pagamentos Realizados:</h4>
            <div className="space-y-1">
              {partialPayments.map((payment, index) => (
                <div key={payment.id || index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span>{format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    <span className="font-medium">R$ {payment.amount.toFixed(2)}</span>
                  </div>
                  {onRemovePayment && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleConfirmRemovePayment(payment.id)}
                      disabled={removingPayment === payment.id}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {removingPayment === payment.id ? (
                        <span className="animate-spin w-3 h-3 border border-red-500 border-t-transparent rounded-full inline-block"></span>
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão de Pagamento Parcial */}
        {accountId && onAddPayment && remainingAmount > 0 && (
          <Button
            onClick={() => setPaymentModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Registrar Pagamento Parcial
          </Button>
        )}
      </div>
      {Object.entries(grouped).map(([date, its]) => (
        <div key={date} className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">{date}</h2>
          <ul className="divide-y">
            {its.map(item => {
              const isContested = item.contested;
              return (
                <li key={item.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 rounded-lg px-2 ${item.contested ? 'bg-[#e3f0fd] border border-blue-800' : 'border border-gray-200'}`}>
                  <div className="flex-1 flex flex-col gap-1 w-full">
                    <div className="flex flex-row items-center gap-2 w-full">
                      <span className={`font-medium ${item.contested ? 'text-[#17497a]' : ''}`}>{item.quantity}x </span>
                      <span className={`font-medium ${item.contested ? 'text-[#17497a]' : ''}`}>{item.product_name || (item.product_type === 'food' ? 'Comida' : 'Produto Externo')}</span>
                    </div>
                    {item.contested && (
                      <>
                        <div className="w-full">
                          <span className="inline-block bg-blue-800 text-white text-xs font-semibold rounded px-2 py-0.5 mb-1">Contestado</span>
                        </div>
                        <div className="w-full">
                          <span className="block text-sm font-normal text-black bg-transparent w-full"><b>Mensagem:</b> {item.contest_message}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Linha 2: Valores e botão */}
                  <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0 sm:ml-6">
                    <span className={`${item.contested ? 'text-[#17497a]' : ''}`}>{item.quantity}x R$ {item.unit_price.toFixed(2)}</span>
                    {item.quantity > 1 && (
                      <span className={`text-xs ${item.contested ? 'text-[#17497a]' : 'text-gray-500'}`}>Total: R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                    )}
                    {!item.contested && (
                      <Button size="sm" variant="destructive" onClick={() => handleOpenModal(item)} className="flex items-center gap-1">
                        <Trash2 className="h-4 w-4 mr-1" /> Contestar
                      </Button>
                    )}
                    {item.contested && (
                      <Button size="sm" variant="outline" className="text-[#17497a] border-[#17497a] hover:bg-[#eaf3fb] flex items-center gap-1" onClick={() => handleUncontest(item)} disabled={loading}>
                        <Undo2 className="h-4 w-4 mr-1" /> Descontestar
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

      {/* Modal de Pagamento Parcial */}
      {accountId && onAddPayment && (
        <PartialPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onAddPayment={onAddPayment}
          currentTotal={totalItems + totalAdvances}
          totalPaid={totalPaid}
          remainingAmount={remainingAmount}
        />
      )}
      
      {/* Modal de Confirmação para Remover Pagamento */}
      <Dialog open={!!confirmRemovePayment} onOpenChange={() => setConfirmRemovePayment(null)}>
        <DialogContent className="max-w-md flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-lg font-semibold mb-2">Remover Pagamento?</div>
          <div className="mb-4 text-gray-700">
            Tem certeza que deseja remover este pagamento? Esta ação não pode ser desfeita.
          </div>
          <div className="flex gap-4 justify-center mt-2">
            <Button variant="outline" onClick={() => setConfirmRemovePayment(null)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => confirmRemovePayment && handleRemovePayment(confirmRemovePayment)}
            >
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseAccountItemsList; 