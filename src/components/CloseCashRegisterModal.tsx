
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CashRegister } from '@/types';

interface CloseCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (closingAmount: number) => Promise<void>;
  cashRegister: CashRegister | null;
}

export const CloseCashRegisterModal = ({ isOpen, onClose, onConfirm, cashRegister }: CloseCashRegisterModalProps) => {
  const [closingAmount, setClosingAmount] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(parseFloat(closingAmount) || 0);
      setClosingAmount('0');
      onClose();
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!cashRegister) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Resumo do Caixa</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Abertura:</span>
                <span>{new Date(cashRegister.opened_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Valor inicial:</span>
                <span>R$ {cashRegister.opening_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total de vendas:</span>
                <span>R$ {cashRegister.total_sales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total de pedidos:</span>
                <span>{cashRegister.total_orders}</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="closingAmount">Valor final do caixa</Label>
            <Input
              id="closingAmount"
              type="number"
              step="0.01"
              min="0"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Ao fechar este caixa, todas as vendas futuras serão vinculadas ao próximo caixa que for aberto.
            </p>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading} variant="destructive">
              {loading ? 'Fechando...' : 'Fechar Caixa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
