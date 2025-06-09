import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, AlertTriangle, Loader2 } from 'lucide-react';

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span>Abrir Caixa</span>
          </DialogTitle>
          <DialogDescription>
            Informe o valor inicial disponível no caixa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="openingAmount">Valor inicial do caixa</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <Input
                id="openingAmount"
                type="text"
                value={openingAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
            <p className="text-sm text-gray-500">
              Este valor será usado como base para o fechamento do caixa.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              Certifique-se de contar o dinheiro corretamente antes de abrir o caixa.
            </p>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Abrindo...
                </>
              ) : (
                'Abrir Caixa'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
