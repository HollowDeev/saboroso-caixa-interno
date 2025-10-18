import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CashRegister } from '@/types';
import { DollarSign, AlertTriangle, Loader2 } from 'lucide-react';

interface CloseCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (closingAmount: number) => Promise<void>;
  cashRegister: CashRegister | null;
  totalSales?: number;
}

export const CloseCashRegisterModal = ({ isOpen, onClose, onConfirm, cashRegister, totalSales }: CloseCashRegisterModalProps) => {
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

  const displayedTotalSales = typeof totalSales === 'number' ? totalSales : (cashRegister.total_sales || 0);
  const displayedOpening = cashRegister.opening_amount || 0;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[90vh] max-h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-red-500" />
            <span>Fechar Caixa</span>
          </DialogTitle>
          <DialogDescription>
            Confira o resumo do caixa e informe o valor final em dinheiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Resumo do Caixa</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Abertura</p>
                <p className="font-medium">{new Date(cashRegister.opened_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Inicial</p>
                <p className="font-medium">R$ {cashRegister.opening_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total em Vendas</p>
                <p className="font-medium">R$ {Number(displayedTotalSales || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total em Caixa</p>
                <p className="font-medium">R$ {(Number(displayedOpening || 0) + Number(displayedTotalSales || 0)).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closingAmount">Valor final em dinheiro</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <Input
                id="closingAmount"
                type="number"
                step="0.01"
                min="0"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
            <p className="text-sm text-gray-500">
              Informe o valor total em dinheiro disponível no caixa.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              Ao fechar o caixa, todas as vendas futuras serão vinculadas ao próximo caixa.
            </p>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fechando...
                </>
              ) : (
                'Fechar Caixa'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
