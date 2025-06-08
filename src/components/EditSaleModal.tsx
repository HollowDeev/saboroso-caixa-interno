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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="editCustomerName">Nome do Cliente</Label>
            <Input
              id="editCustomerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Digite o nome do cliente"
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

          {sale.items && (
            <div>
              <Label>Itens da Venda</Label>
              <div className="space-y-2 mt-2">
                {sale.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>{item.quantity}x {item.product_name}</span>
                    <span>R$ {item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>R$ {sale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxa:</span>
                    <span>R$ {sale.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>R$ {sale.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
