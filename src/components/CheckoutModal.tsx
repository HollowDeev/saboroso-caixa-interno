
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Order, OrderItem, Product, ExternalProduct } from '@/types';
import { Badge } from '@/components/ui/badge';

import { toast } from '@/components/ui/use-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const CheckoutModal = ({ isOpen, onClose, order }: CheckoutModalProps) => {
  const { products, externalProducts, updateOrder } = useAppContext();
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Remover directDiscount do estado e do payload
  // O input de desconto direto deve atualizar total_discount (já existente)
  const [manualDiscounts, setManualDiscounts] = useState<number[]>([]);
  const [discountInput, setDiscountInput] = useState('');

  React.useEffect(() => {
    if (isOpen && order) {
      setSelectedProducts(order.items);
      setCustomerName(order.customer_name || '');
      // setDirectDiscount(order.direct_discount || 0); // Removido
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
      const isExternalProduct = 'current_stock' in product;
      const newItem: OrderItem = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        product_name: product.name,
        product: {
          ...product,
          available: isExternalProduct ? product.current_stock > 0 : product.available
        } as Product,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        product_type: isExternalProduct ? 'external_product' : 'food'
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

  const subtotal = useMemo(() => selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0), [selectedProducts]);
  const totalManualDiscount = useMemo(() => manualDiscounts.reduce((acc, d) => acc + d, 0), [manualDiscounts]);
  const totalDiscount = useMemo(() =>
    selectedProducts.reduce((acc, item) => acc + (item.discountValue ? item.discountValue * item.quantity : 0), 0) + totalManualDiscount,
    [selectedProducts, totalManualDiscount]
  );
  const total = useMemo(() => subtotal - totalDiscount, [subtotal, totalDiscount]);
  const change = useMemo(() => amountPaid > total ? amountPaid - total : 0, [amountPaid, total]);
  const remainingAmount = useMemo(() => {
    const diff = total - amountPaid;
    return diff > 0 ? diff : 0;
  }, [total, amountPaid]);

  const addManualDiscount = () => {
    const value = Number(discountInput.replace(',', '.'));
    if (!isNaN(value) && value > 0) {
      setManualDiscounts(prev => [...prev, value]);
      setDiscountInput('');
    }
  };
  const removeManualDiscount = (index: number) => {
    setManualDiscounts(prev => prev.filter((_, i) => i !== index));
  };

  const finalizeSale = async () => {
    if (!order) return;

    if (!customerName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do cliente é obrigatório para finalizar a comanda.',
        variant: 'destructive',
      });
      return;
    }

    // Permitir finalizar mesmo com troco (amountPaid >= totalWithDiscount) - Removido
    if (remainingAmount > 0) {
      toast({
        title: 'Erro',
        description: 'O valor pago é insuficiente para finalizar a comanda.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updatedOrderData = {
        status: 'closed' as const,
        payment_method: paymentMethod,
        customer_name: customerName,
        subtotal,
        tax: 0,
        total,
        total_discount: totalDiscount,
        items: selectedProducts
      };

      await updateOrder(order.id, updatedOrderData);

      onClose();
      setSelectedProducts([]);
      setCustomerName('');
      setPaymentMethod('cash');
      setSearchTerm('');
      // setDirectDiscount(0); // Removido
      setManualDiscounts([]);
      setDiscountInput('');
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
    }
  };

  // Filtrar e ordenar produtos alfabeticamente
  const filteredFoodProducts = products
    .filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredExternalProducts = externalProducts
    .filter(p => p.current_stock > 0 && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="w-full max-w-md h-[90vh] max-h-[800px] mx-auto rounded-xl shadow-lg flex flex-col" style={{margin: '40px auto'}}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Finalizar Comanda</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">

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
              <Label htmlFor="amountPaid">Valor Pago</Label>
              <Input
                id="amountPaid"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={amountPaid === 0 ? '' : amountPaid}
                onChange={e => setAmountPaid(Number(e.target.value.replace(',', '.')))}
                placeholder="Digite o valor pago pelo cliente"
              />
            </div>
            {/* Campo para adicionar desconto manual */}
            <div className="flex items-end gap-2 mt-2 border border-red-500 p-2">
              <div className="flex-1">
                <Label htmlFor="manualDiscount">Adicionar Desconto (R$)</Label>
                <Input
                  id="manualDiscount"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  placeholder="Ex: 10,00"
                  className="mt-1"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualDiscount(); } }}
                />
              </div>
              <Button type="button" onClick={addManualDiscount} className="h-10">Adicionar</Button>
            </div>
            {/* Lista de descontos aplicados */}
            {manualDiscounts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 border border-blue-500 p-2">
                {manualDiscounts.map((d, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    R$ {d.toFixed(2)}
                    <Button size="icon" variant="ghost" onClick={() => removeManualDiscount(i)} className="ml-1 p-0 h-4 w-4">×</Button>
                  </Badge>
                ))}
              </div>
            )}

            <div>
              <Label htmlFor="productSearch">Adicionar Produtos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="productSearch"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar produtos para adicionar..."
                  className="pl-10"
                />
              </div>
            </div>

            {searchTerm && (
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                {filteredFoodProducts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Comidas</h4>
                    {filteredFoodProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-600">R$ {product.price.toFixed(2)}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addProductToOrder(product)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {filteredExternalProducts.length > 0 && (
                  <div className={filteredFoodProducts.length > 0 ? "mt-3" : ""}>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Produtos Externos</h4>
                    {filteredExternalProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-600">R$ {product.price.toFixed(2)}</p>
                          {product.brand && (
                            <p className="text-xs text-gray-500">{product.brand}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addProductToOrder(product)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {filteredFoodProducts.length === 0 && filteredExternalProducts.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Nenhum produto encontrado
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Itens da Comanda</h3>
                <div className="space-y-2 h-[300px] overflow-y-auto border rounded-lg bg-white">
                  {selectedProducts.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name || item.product?.name}</p>
                        <p className="text-xs text-gray-600">R$ {item.unitPrice.toFixed(2)} cada</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateProductQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateProductQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-base text-green-600">
                    <span>Descontos:</span>
                    <span>- R$ {totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span>Valor Pago:</span>
                  <span>R$ {amountPaid.toFixed(2)}</span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-base text-red-600">
                    <span>Resta a pagar:</span>
                    <span>R$ {remainingAmount.toFixed(2)}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Troco:</span>
                    <span>R$ {change.toFixed(2)}</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
