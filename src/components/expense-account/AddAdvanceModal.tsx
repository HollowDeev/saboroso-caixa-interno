import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { createAdvance } from '../../services/expenseAccountService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  employeeId?: string;
  onSaved?: () => void;
}

const AddAdvanceModal: React.FC<Props> = ({ isOpen, onClose, accountId, employeeId, onSaved }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { currentUser } = useAppContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = String(amount).replace(/,/g, '.');
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) return alert('Informe um valor válido maior que zero.');
    if (!accountId) return alert('Conta de despesa inválida.');
    setIsSaving(true);
    try {
      await createAdvance({ expenseAccountId: accountId, employeeId: employeeId || null, amount: n, reason: reason || null, createdBy: currentUser?.id || null });
      setAmount('');
      setReason('');
      onClose();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      console.error('Erro ao salvar vale:', err);
      alert('Erro ao salvar vale.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
            Adicionar Vale / Adiantamento
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="advanceAmount">Valor (R$)</Label>
            <Input
              id="advanceAmount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                const v = String(amount).replace(/,/g, '.');
                const n = parseFloat(v);
                if (!isNaN(n)) setAmount(n.toFixed(2));
              }}
              placeholder="0,00"
              required
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="advanceReason">Motivo</Label>
            <Input id="advanceReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo do vale" disabled={isSaving} />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={isSaving || !amount}> 
              {isSaving ? 'Salvando...' : 'Adicionar Vale'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAdvanceModal;
