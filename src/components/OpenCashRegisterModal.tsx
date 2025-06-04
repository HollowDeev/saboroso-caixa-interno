
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OpenCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (openingAmount: number) => Promise<void>;
}

export const OpenCashRegisterModal = ({ isOpen, onClose, onConfirm }: OpenCashRegisterModalProps) => {
  const [openingAmount, setOpeningAmount] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(parseFloat(openingAmount) || 0);
      setOpeningAmount('0');
      onClose();
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
    } finally {
      setLoading(false);
    }
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
            <Input
              id="openingAmount"
              type="number"
              step="0.01"
              min="0"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
