import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { OrderItem, Product, ExternalProduct, PaymentMethod } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useActiveDiscounts } from '@/hooks/useActiveDiscounts';

interface DirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Payment {
  method: PaymentMethod;
  amount: number;
}

export const DirectSaleModal: React.FC<DirectSaleModalProps> = ({ isOpen, onClose }) => {
  const { products, externalProducts, currentUser, addSale, currentCashRegister } = useApp();
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([{ method: 'cash', amount: 0 }]);
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const { discounts: activeDiscounts } = useActiveDiscounts();

  const total = useMemo(() => selectedItems.reduce((sum, item) => sum + item.totalPrice, 0), [selectedItems]);
  const totalPaid = useMemo(() => payments.reduce((sum, payment) => sum + payment.amount, 0), [payments]);
  const remainingAmount = useMemo(() => {
    const diff = total - totalPaid;
    return diff > 0 ? diff : 0;
  }, [total, totalPaid]);
  const change = useMemo(() => totalPaid > total ? totalPaid - total : 0, [total, totalPaid]);
  const totalDiscount = selectedItems.reduce((acc, item) => acc + (item.discountValue ? item.discountValue * item.quantity : 0), 0);

  const addPayment = () => {
    setPayments([...payments, { method: 'cash', amount: 0 }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: keyof Payment, value: any) => {
    const updatedPayments = [...payments];
    updatedPayments[index] = { ...updatedPayments[index], [field]: value };
    setPayments(updatedPayments);
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'bg-green-500';
      case 'card': return 'bg-blue-500';
      case 'pix': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const addItem = (product: Product | ExternalProduct) => {
    const isExternalProduct = 'current_stock' in product;
    const discount = activeDiscounts.find(
      d => d.productId === product.id && d.active && d.productType === (isExternalProduct ? 'external_product' : 'food')
    );
    const priceToUse = discount ? discount.newPrice : product.price;
    const existingItem = selectedItems.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedItems(prev => prev.map(item =>
        item.productId === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              totalPrice: (item.quantity + 1) * priceToUse,
              unitPrice: priceToUse,
              originalPrice: product.price,
              discountValue: discount ? product.price - discount.newPrice : 0,
              discountId: discount?.id
            }
          : item
      ));
    } else {
      const newItem: OrderItem = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        product_name: product.name,
        product: product,
        quantity: 1,
        unitPrice: priceToUse,
        totalPrice: priceToUse,
        product_type: isExternalProduct ? 'external_product' : 'food',
        originalPrice: product.price,
        discountValue: discount ? product.price - discount.newPrice : 0,
        discountId: discount?.id
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

  const createDirectSale = async () => {
    if (!currentUser || !currentCashRegister) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado ou caixa não está aberto",
        variant: "destructive"
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do cliente é obrigatório para registrar a venda direta.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingSale(true);

      // Formatar os itens para o formato esperado pelo serviço
      const formattedItems = selectedItems.map(item => ({
        id: '',
        product_id: item.productId,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        product_type: item.product_type,
        original_price: item.originalPrice ?? null,
        discount_value: item.discountValue ?? null,
        discount_id: item.discountId ?? null
      }));

      await addSale({
        total,
        subtotal: total,
        tax: 0,
        payments,
        user_id: currentUser.id,
        customer_name: customerName,
        is_direct_sale: true,
        cash_register_id: currentCashRegister.id,
        items: formattedItems,
        order_id: null
      });

      toast({
        title: "Sucesso",
        description: "Venda direta registrada com sucesso!",
      });

      setSelectedItems([]);
      setCustomerName('');
      setPayments([{ method: 'cash', amount: 0 }]);
      setSearchTerm('');
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar venda direta:', error);
      toast({
        title: "Erro ao criar venda",
        description: error.message || "Ocorreu um erro ao registrar a venda. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingSale(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    removeItem(selectedItems[index].productId);
  };

  // Filtrar e ordenar produtos alfabeticamente
  const filteredFoodProducts = products
    .filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredExternalProducts = externalProducts
    .filter(p => p.current_stock > 0 && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].totalPrice = quantity * updatedItems[index].unitPrice;
    setSelectedItems(updatedItems);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Venda Direta</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Product Selection */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nome do Cliente <span className="text-red-500">*</span></Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="productSearch">Pesquisar Produtos</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="productSearch"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome do produto..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Produtos Disponíveis</h3>
              <div className="grid grid-cols-1 gap-2 h-96 overflow-y-auto border rounded-lg p-3">
                {filteredFoodProducts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Comidas ({filteredFoodProducts.length})</h4>
                    {filteredFoodProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                          {product.description && (
                            <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addItem(product)}
                          className="bg-green-500 hover:bg-green-600 ml-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {filteredExternalProducts.length > 0 && (
                  <div className={filteredFoodProducts.length > 0 ? "mt-4" : ""}>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Produtos Externos ({filteredExternalProducts.length})</h4>
                    {filteredExternalProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            {product.brand && <span>{product.brand}</span>}
                            <span>Estoque: {product.current_stock}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addItem(product)}
                          className="bg-green-500 hover:bg-green-600 ml-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {filteredFoodProducts.length === 0 && filteredExternalProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'Nenhum produto encontrado para a pesquisa.' : 'Nenhum produto disponível.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Items and Payment */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Itens Selecionados</h3>
              <div className="space-y-2 h-96 overflow-y-auto border rounded-lg p-3">
                {selectedItems.map((item, index) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product?.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} cada</p>
                        {item.discountValue && item.discountValue > 0 && item.originalPrice && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-300 font-semibold ml-1">
                            Preço original: R$ {item.originalPrice.toFixed(2)} | Desconto: R$ {item.discountValue.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Total: R$ {item.totalPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(index, item.quantity + 1)}
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {selectedItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Nenhum item selecionado
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pagamentos</h3>
                <Button onClick={addPayment} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pagamento
                </Button>
              </div>

              <div className="space-y-4">
                {payments.map((payment, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Select
                      value={payment.method}
                      onValueChange={(value: PaymentMethod) => updatePayment(index, 'method', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="card">Cartão</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={payment.amount === 0 ? '' : payment.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        updatePayment(index, 'amount', val === '' ? 0 : Number(val));
                      }}
                      placeholder="Valor"
                      className="w-[150px]"
                    />
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePayment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {payments.map((payment, index) => (
                  payment.amount > 0 && (
                    <Badge key={index} variant="secondary" className={cn("text-white", getPaymentMethodColor(payment.method))}>
                      {getPaymentMethodLabel(payment.method)} (R$ {payment.amount.toFixed(2)})
                    </Badge>
                  )
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Total da Venda:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total de Descontos:</span>
                  <span className="text-green-700">- R$ {totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Pago:</span>
                  <span>R$ {totalPaid.toFixed(2)}</span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Valor Restante:</span>
                    <span className={cn("text-red-500")}>R$ {remainingAmount.toFixed(2)}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Troco:</span>
                    <span>R$ {change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={createDirectSale} disabled={remainingAmount !== 0 || isCreatingSale}>
                {isCreatingSale ? (
                  <>
                    <span className="animate-spin mr-2">◌</span>
                    Finalizando...
                  </>
                ) : (
                  'Finalizar Venda'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
