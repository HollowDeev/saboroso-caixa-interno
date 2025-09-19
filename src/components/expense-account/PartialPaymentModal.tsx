import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';

interface PartialPayment {
  id: string;
  date: string;
  amount: number;
}

interface PartialPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPayment: (amount: number) => Promise<void>;
  currentTotal: number;
  totalPaid: number;
  remainingAmount: number;
}

export const PartialPaymentModal: React.FC<PartialPaymentModalProps> = ({
  isOpen,
  onClose,
  onAddPayment,
  currentTotal,
  totalPaid,
  remainingAmount
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }

    if (amount > remainingAmount) {
      alert(`O valor do pagamento (R$ ${amount.toFixed(2)}) não pode ser maior que o valor restante (R$ ${remainingAmount.toFixed(2)}).`);
      return;
    }

    setIsProcessing(true);
    try {
      await onAddPayment(amount);
      setPaymentAmount('');
      onClose();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPaymentAmount('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Registrar Pagamento Parcial
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

        <div className="space-y-4">
          {/* Resumo da conta */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total da Conta:</span>
              <span className="font-medium">R$ {currentTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Pago:</span>
              <span className="font-medium text-green-600">R$ {totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">Valor Restante:</span>
              <span className="font-bold text-red-600">R$ {remainingAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Formulário de pagamento */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Valor do Pagamento (R$)</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0,00"
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500">
                Valor máximo: R$ {remainingAmount.toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isProcessing || !paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                {isProcessing ? 'Registrando...' : 'Registrar Pagamento'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
