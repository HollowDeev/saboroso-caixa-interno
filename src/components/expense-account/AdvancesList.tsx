import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../ui/button';
import { X, Trash2 } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { listAdvances, deleteAdvance, ExpenseAccountAdvance } from '../../services/expenseAccountService';

interface Advance {
  id: string;
  expense_account_id: string;
  employee_id: string;
  amount: number;
  reason: string;
  created_at: string;
  created_by?: string | null;
}

interface Props {
  accountId: string;
  employeeId?: string;
  onChange?: () => void;
}

const AdvancesList: React.FC<Props> = ({ accountId, employeeId, onChange }) => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const { currentUser } = useAppContext();

  const isAdmin = currentUser?.owner_id || currentUser?.role === 'admin' || false;

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const data = await listAdvances(accountId);
      setAdvances((data as Advance[]) || []);
    } catch (err) {
      console.error('Erro ao buscar vales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accountId) return;
    fetchAdvances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const handleRemove = async (id: string) => {
    if (!isAdmin) return alert('Apenas administradores podem remover vales.');
    setRemoving(id);
    try {
      await deleteAdvance(id, currentUser?.id);
      await fetchAdvances();
      if (typeof onChange === 'function') onChange();
    } catch (err) {
      console.error('Erro ao remover vale:', err);
      alert('Erro ao remover vale.');
    } finally {
      setRemoving(null);
    }
  };

  const totalAdvances = advances.reduce((s, a) => s + (a.amount || 0), 0);

  if (!accountId) return null;

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Vales / Adiantamentos</h4>
        <div className="text-sm text-gray-600">Total: R$ {totalAdvances.toFixed(2)}</div>
      </div>

      {loading && <div className="text-sm text-gray-500">Carregando vales...</div>}

      {!loading && advances.length === 0 && (
        <div className="text-sm text-gray-500">Nenhum vale registrado.</div>
      )}

      {!loading && advances.length > 0 && (
        <ul className="space-y-2">
          {advances.map(a => (
            <li key={a.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
              <div>
                <div className="text-sm font-medium">R$ {a.amount.toFixed(2)}</div>
                <div className="text-xs text-gray-600">{a.reason}</div>
                <div className="text-xs text-gray-500">{format(new Date(a.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" className="text-red-600 h-8 w-8 p-0" onClick={() => handleRemove(a.id)}>
                  {removing === a.id ? <span className="animate-spin w-3 h-3 border border-red-500 border-t-transparent rounded-full inline-block"></span> : <Trash2 className="w-4 h-4" />}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdvancesList;
