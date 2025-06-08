import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { OrderItem, Product, ServiceTax, ExternalProduct } from '@/types';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface DirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectSaleModal = ({ isOpen, onClose }: DirectSaleModalProps) => {
  const { products, externalProducts, currentUser, addSale, serviceTaxes, currentCashRegister } = useApp();
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [selectedTaxes, setSelectedTaxes] = useState<string[]>(
    serviceTaxes.filter(tax => tax.isActive).map(tax => tax.id)
  );
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      // Reseta as taxas selecionadas quando o modal é aberto
      setSelectedTaxes(serviceTaxes.filter(tax => tax.isActive).map(tax => tax.id));
    }
  }, [isOpen, serviceTaxes]);

  const addItem = (product: Product | ExternalProduct) => {
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
        product: {
          ...product,
          available: 'current_stock' in product ? product.current_stock > 0 : product.available
        },
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
    if (selectedItems.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda.",
        variant: "destructive"
      });
      return;
    }

    if (!currentCashRegister) {
      toast({
        title: "Erro",
        description: "Não há caixa aberto para registrar a venda.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { subtotal, taxesTotal, total } = calculateTotal();

      // Verificar estoque antes de criar a venda
      const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');

      const stockCheck = await processOrderItemsStockConsumption(
        selectedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          product: item.product
        })),
        'temp-user-id', // Será substituído no addSale
        'Verificação de estoque'
      );

      // Se há erros críticos de estoque, mostrar aviso mas permitir continuar
      if (!stockCheck.success && stockCheck.errors.some(error => error.includes('Estoque insuficiente'))) {
        const proceed = window.confirm(
          `Atenção: Alguns itens têm estoque insuficiente:\n\n${stockCheck.errors.join('\n')}\n\nDeseja continuar mesmo assim?`
        );

        if (!proceed) {
          return;
        }
      }

      // Criar a venda direta (isso já processará o consumo de estoque)
      await addSale({
        total,
        subtotal,
        tax: taxesTotal,
        paymentMethod,
        userId: currentUser!.id,
        customerName: customerName || undefined,
        is_direct_sale: true,
        items: selectedItems.map(item => ({
          productId: item.productId,
          product_name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }))
      });

      // Mostrar mensagem de sucesso
      toast({
        title: "Sucesso",
        description: "Venda direta registrada com sucesso!",
      });

      // Limpar e fechar
      setSelectedItems([]);
      setCustomerName('');
      setPaymentMethod('cash');
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar venda direta:', error);
      toast({
        title: "Erro ao criar venda",
        description: error.message || "Ocorreu um erro ao registrar a venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const { subtotal, taxes, taxesTotal, total } = calculateTotal();

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleProductSelect = (product: Product) => {
    addItem(product);
    setSearchTerm('');
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].totalPrice = quantity * updatedItems[index].unitPrice;
    setSelectedItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    removeItem(selectedItems[index].productId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Venda Direta</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Product Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Nome do Cliente</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Produtos</Label>
              <div className="mt-1 relative">
                <Input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium text-sm sm:text-base">{product.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500">R$ {product.price.toFixed(2)}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
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
          </div>

          {/* Right Column - Selected Items */}
          <div className="space-y-4">
            <div>
              <Label>Itens Selecionados</Label>
              <div className="mt-2 space-y-2">
                {selectedItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm sm:text-base">{item.product.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        R$ {item.unitPrice.toFixed(2)} cada
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(index, -1)}
                        disabled={item.quantity <= 1}
                        className="px-2"
                      >
                        -
                      </Button>
                      <span className="text-sm sm:text-base font-medium min-w-[40px] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(index, 1)}
                        className="px-2"
                      >
                        +
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="px-2"
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

            <div className="border-t pt-4 space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {taxes.map((tax) => (
                <div key={tax.id} className="flex justify-between text-sm">
                  <span>{tax.name}:</span>
                  <span>R$ {tax.value.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base sm:text-lg pt-2 border-t">
                <span>Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full sm:flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={createDirectSale}
                  className="w-full sm:flex-1 bg-green-500 hover:bg-green-600"
                  disabled={selectedItems.length === 0}
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
