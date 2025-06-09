import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { Sale } from '@/types';
import { toast } from '@/components/ui/use-toast';

interface EditSaleModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const EditSaleModal = ({ sale, onClose }: EditSaleModalProps) => {
  const { updateSale } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (sale) {
      setPaymentMethod(sale.paymentMethod);
      setCustomerName(sale.customerName || '');
    }
  }, [sale]);

  const handleSave = async () => {
    if (!sale) return;

    try {
      await updateSale(sale.id, {
        paymentMethod,
        customerName: customerName || undefined
      });

      toast({
        title: "Sucesso",
        description: "Venda atualizada com sucesso!",
      });

      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar venda:', error);
      toast({
        title: "Erro ao atualizar venda",
        description: error.message || "Ocorreu um erro ao atualizar a venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={!!sale} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Editar Venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="editCustomerName">Nome do Cliente</Label>
            <Input
              id="editCustomerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Digite o nome do cliente"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="editPaymentMethod">Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={(value: 'cash' | 'card' | 'pix') => setPaymentMethod(value)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Itens da Venda</Label>
            <div className="space-y-2 mt-2">
              {sale.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm sm:text-base">{item.product_name}</div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      {item.quantity}x R$ {(item.totalPrice / item.quantity).toFixed(2)}
                    </div>
                  </div>
                  <span className="font-medium text-sm sm:text-base">
                    R$ {item.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-medium text-sm sm:text-base">
                  <span>Total:</span>
                  <span>R$ {sale.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="w-full sm:flex-1 bg-green-500 hover:bg-green-600"
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
