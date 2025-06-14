
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { OrderItem, Product, ExternalProduct } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface DirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectSaleModal = ({ isOpen, onClose }: DirectSaleModalProps) => {
  const { products, externalProducts, currentUser, addSale, currentCashRegister } = useApp();
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const addItem = (product: Product | ExternalProduct) => {
    const existingItem = selectedItems.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedItems(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      const isExternalProduct = 'current_stock' in product;
      const newItem: OrderItem = {
        id: `temp-${Date.now()}`, // ID temporário
        productId: product.id,
        product_name: product.name,
        product: product,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        product_type: isExternalProduct ? 'external_product' : 'food'
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
      const total = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      // Verificar estoque antes de criar a venda
      const { processOrderItemsStockConsumption } = await import('@/utils/stockConsumption');

      const stockCheck = await processOrderItemsStockConsumption(
        selectedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          product: {
            id: item.product!.id,
            name: item.product!.name,
            price: item.product!.price,
            available: 'available' in item.product! ? item.product!.available : true,
            current_stock: 'current_stock' in item.product! ? item.product!.current_stock : undefined,
            product_type: item.product_type
          }
        })),
        currentUser!.id,
        'Venda Direta'
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
        subtotal: total, // Garantindo que o subtotal seja igual ao total
        tax: 0,
        paymentMethod,
        userId: currentUser!.id,
        customerName: customerName || undefined,
        is_direct_sale: true,
        cash_register_id: currentCashRegister.id,
        items: selectedItems.map(item => ({
          id: '', // ID será gerado pelo banco
          productId: item.productId,
          product_name: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product_type: item.product_type
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

  const handleRemoveItem = (index: number) => {
    removeItem(selectedItems[index].productId);
  };

  const total = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);

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
              <Label htmlFor="customerName">Nome do Cliente (opcional)</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
                className="mt-1"
              />
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

            <div>
              <h3 className="font-semibold mb-3">Produtos Disponíveis</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Comidas</h4>
                  {products.filter(p => p.available).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
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

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Produtos Externos</h4>
                  {externalProducts.filter(p => p.current_stock > 0).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                        {product.brand && (
                          <p className="text-xs text-gray-500">{product.brand}</p>
                        )}
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
          </div>

          {/* Right Column - Selected Items */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Itens Selecionados</h3>
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {selectedItems.map((item, index) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.product?.name}</p>
                      <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} cada</p>
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
                      <span className="w-8 text-center">{item.quantity}</span>
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

            <div className="border-t pt-4 space-y-2 mt-4">
              <div className="flex justify-between font-bold text-base sm:text-lg">
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
