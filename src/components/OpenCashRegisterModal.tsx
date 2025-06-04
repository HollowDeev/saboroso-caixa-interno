import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface OpenCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (openingAmount: number) => Promise<void>;
}

export const OpenCashRegisterModal = ({ isOpen, onClose, onConfirm }: OpenCashRegisterModalProps) => {
  const [openingAmount, setOpeningAmount] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);

    try {
      const amount = parseFloat(openingAmount);
      if (isNaN(amount) || amount < 0) {
        throw new Error('Por favor, insira um valor válido');
      }

      await onConfirm(amount);
      setOpeningAmount('0');
      toast({
        title: "Caixa aberto com sucesso",
        description: `Valor inicial: R$ ${amount.toFixed(2)}`,
      });
      onClose();
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      setError(error.message || 'Erro ao abrir caixa. Tente novamente.');
      toast({
        title: "Erro ao abrir caixa",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    // Remover caracteres não numéricos, exceto ponto
    const cleanValue = value.replace(/[^\d.]/g, '');
    // Garantir que só há um ponto decimal
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limitar a 2 casas decimais
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    setOpeningAmount(cleanValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="openingAmount">Valor inicial do caixa</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">R$</span>
              <Input
                id="openingAmount"
                type="text"
                value={openingAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading} className="flex-1">
              {loading ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
