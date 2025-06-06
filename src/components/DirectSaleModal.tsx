import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { OrderItem, Product, ServiceTax } from '@/types';
import { Switch } from '@/components/ui/switch';

interface DirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectSaleModal = ({ isOpen, onClose }: DirectSaleModalProps) => {
  const { products, currentUser, addSale, updateIngredient, ingredients, serviceTaxes, addOrder } = useApp();
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [selectedTaxes, setSelectedTaxes] = useState<string[]>(
    serviceTaxes.filter(tax => tax.isActive).map(tax => tax.id)
  );

  React.useEffect(() => {
    if (isOpen) {
      // Reseta as taxas selecionadas quando o modal é aberto
      setSelectedTaxes(serviceTaxes.filter(tax => tax.isActive).map(tax => tax.id));
    }
  }, [isOpen, serviceTaxes]);

  const addItem = (product: Product) => {
    const existingItem = selectedItems.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedItems(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price
      };
      setSelectedItems(prev => [...prev, newItem]);
    }
  };

  const removeItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.productId !== productId));
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setSelectedItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const calculateTotal = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxes = serviceTaxes
      .filter(tax => selectedTaxes.includes(tax.id))
      .map(tax => ({
        id: tax.id,
        name: tax.name,
        value: subtotal * (tax.percentage / 100)
      }));
    const taxesTotal = taxes.reduce((sum, tax) => sum + tax.value, 0);
    return { subtotal, taxes, taxesTotal, total: subtotal + taxesTotal };
  };

  const toggleTax = (taxId: string) => {
    setSelectedTaxes(prev =>
      prev.includes(taxId)
        ? prev.filter(id => id !== taxId)
        : [...prev, taxId]
    );
  };

  const createDirectSale = async () => {
    if (selectedItems.length === 0) return;

    try {
      const { subtotal, taxesTotal, total } = calculateTotal();

      // Criar uma comanda já paga
      const newOrder = {
        items: selectedItems.map(item => ({
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subtotal,
        tax: taxesTotal,
        total,
        status: 'paid' as const,
        paymentMethod,
        customerName: customerName || undefined,
        userId: currentUser!.id
      };

      await addOrder(newOrder);

      // Limpar e fechar
      setSelectedItems([]);
      setCustomerName('');
      setPaymentMethod('cash');
      onClose();
    } catch (error) {
      console.error('Erro ao criar venda direta:', error);
      // Aqui você pode adicionar uma notificação de erro para o usuário
    }
  };

  const { subtotal, taxes, taxesTotal, total } = calculateTotal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Venda Direta</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="directCustomerName">Nome do Cliente (Opcional)</Label>
              <Input
                id="directCustomerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <div>
              <Label htmlFor="directPaymentMethod">Forma de Pagamento</Label>
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

            <div>
              <h3 className="font-semibold mb-3">Taxas Aplicadas</h3>
              <div className="space-y-2">
                {serviceTaxes.map((tax) => (
                  <div key={tax.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{tax.name}</p>
                      <p className="text-xs text-gray-600">{tax.percentage}%</p>
                    </div>
                    <Switch
                      checked={selectedTaxes.includes(tax.id)}
                      onCheckedChange={() => toggleTax(tax.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Produtos Disponíveis</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {products.filter(p => p.available).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addItem(product)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Itens Selecionados</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedItems.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} cada</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {selectedItems.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {taxes.map((tax) => (
                  <div key={tax.id} className="flex justify-between">
                    <span>{tax.name}:</span>
                    <span>R$ {tax.value.toFixed(2)}</span>
                  </div>
                ))}
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
                    onClick={createDirectSale}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Finalizar Venda
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
