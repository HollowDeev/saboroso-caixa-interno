import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, OrderItem, Product, ExternalProduct } from '@/types';
import { Switch } from '@/components/ui/switch';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const CheckoutModal = ({ isOpen, onClose, order }: CheckoutModalProps) => {
  const { products, externalProducts, updateOrder } = useApp();
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [customerName, setCustomerName] = useState('');

  React.useEffect(() => {
    if (isOpen && order) {
      setSelectedProducts(order.items);
      setCustomerName(order.customerName || '');
    }
  }, [isOpen, order]);

  const addProductToOrder = (product: Product | ExternalProduct) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedProducts(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        product: {
          ...product,
          available: 'current_stock' in product ? product.current_stock > 0 : product.available
        } as Product,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price
      };
      setSelectedProducts(prev => [...prev, newItem]);
    }
  };

  const removeProductFromOrder = (productId: string) => {
    setSelectedProducts(prev => prev.filter(item => item.productId !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromOrder(productId);
      return;
    }

    setSelectedProducts(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const total = selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0);

  const finalizeSale = async () => {
    if (!order) return;

    try {
      // Preparar dados atualizados da comanda
      const updatedOrderData = {
        status: 'paid' as const,
        paymentMethod,
        customerName: customerName || order.customerName,
        subtotal: total,
        tax: 0,
        total,
        items: selectedProducts
      };

      // Atualizar a comanda (isso já processará o consumo de estoque)
      await updateOrder(order.id, updatedOrderData);

      // Fechar modal e limpar estados
      onClose();
      setSelectedProducts([]);
      setCustomerName('');
      setPaymentMethod('cash');
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      // Aqui você pode adicionar uma notificação de erro para o usuário
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Comanda</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="finalCustomerName">Nome do Cliente</Label>
              <Input
                id="finalCustomerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
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

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Itens da Comanda</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedProducts.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span>{item.quantity}x {item.product_name || item.product.name}</span>
                      <span>R$ {item.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>

                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={finalizeSale}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Finalizar Venda
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
