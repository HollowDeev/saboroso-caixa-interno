
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { Sale } from '@/types';

interface EditSaleModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const EditSaleModal = ({ sale, onClose }: EditSaleModalProps) => {
  const { updateSale } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (sale) {
      setPaymentMethod(sale.paymentMethod);
      setTotal(sale.total);
    }
  }, [sale]);

  if (!sale) return null;

  const handleSave = () => {
    if (!updateSale) return;
    
    updateSale(sale.id, {
      paymentMethod,
      total
    });
    
    onClose();
  };

  return (
    <Dialog open={!!sale} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Venda</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="editTotal">Total da Venda</Label>
            <Input
              id="editTotal"
              type="number"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="editPaymentMethod">Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={(value: 'cash' | 'card' | 'pix') => setPaymentMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-2 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
