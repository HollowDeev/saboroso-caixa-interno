
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, OrderItem, Product } from '@/types';

interface CheckoutModalProps {
  order: Order | null;
  onClose: () => void;
}

export const CheckoutModal = ({ order, onClose }: CheckoutModalProps) => {
  const { products, updateOrder, addSale, updateIngredient, ingredients } = useApp();
  const [additionalItems, setAdditionalItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [customerName, setCustomerName] = useState('');

  React.useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || '');
    }
  }, [order]);

  if (!order) return null;

  const addAdditionalItem = (product: Product) => {
    const existingItem = additionalItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      setAdditionalItems(prev => prev.map(item => 
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
      setAdditionalItems(prev => [...prev, newItem]);
    }
  };

  const removeAdditionalItem = (productId: string) => {
    setAdditionalItems(prev => prev.filter(item => item.productId !== productId));
  };

  const updateAdditionalItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeAdditionalItem(productId);
      return;
    }
    
    setAdditionalItems(prev => prev.map(item => 
      item.productId === productId 
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const calculateFinalTotal = () => {
    const additionalTotal = additionalItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const subtotal = order.subtotal + additionalTotal;
    const tax = subtotal * 0.1;
    return { subtotal, tax, total: subtotal + tax, additionalTotal };
  };

  const finalizeSale = () => {
    const { total } = calculateFinalTotal();
    const allItems = [...order.items, ...additionalItems];

    // Atualizar a comanda
    const updatedOrder = {
      ...order,
      items: allItems,
      total,
      status: 'paid' as const,
      paymentMethod,
      customerName: customerName || order.customerName
    };

    updateOrder(order.id, updatedOrder);

    // Criar venda
    const newSale = {
      orderId: order.id,
      total,
      paymentMethod,
      userId: order.userId
    };

    addSale(newSale);

    // Atualizar estoque
    allItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.ingredients.forEach(productIngredient => {
          const currentIngredient = ingredients.find(ing => ing.id === productIngredient.ingredientId);
          if (currentIngredient) {
            updateIngredient(productIngredient.ingredientId, {
              currentStock: Math.max(0, 
                currentIngredient.currentStock - (productIngredient.quantity * item.quantity)
              )
            });
          }
        });
      }
    });

    onClose();
    setAdditionalItems([]);
    setCustomerName('');
    setPaymentMethod('cash');
  };

  const { subtotal, tax, total, additionalTotal } = calculateFinalTotal();

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
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

            <div>
              <h3 className="font-semibold mb-3">Adicionar Produtos</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {products.filter(p => p.available).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-600">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addAdditionalItem(product)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Itens da Comanda</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>R$ {item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {additionalItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Itens Adicionais</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {additionalItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAdditionalItemQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAdditionalItemQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeAdditionalItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal original:</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              {additionalTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Itens adicionais:</span>
                  <span>R$ {additionalTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxa (10%):</span>
                <span>R$ {tax.toFixed(2)}</span>
              </div>
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
      </DialogContent>
    </Dialog>
  );
};
