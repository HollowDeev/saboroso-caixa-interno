
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { OrderItem, Product, ExternalProduct } from '@/types';
import { toast } from '@/components/ui/use-toast';

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
        id: `temp-${Date.now()}`,
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

      if (!stockCheck.success && stockCheck.errors.some(error => error.includes('Estoque insuficiente'))) {
        const proceed = window.confirm(
          `Atenção: Alguns itens têm estoque insuficiente:\n\n${stockCheck.errors.join('\n')}\n\nDeseja continuar mesmo assim?`
        );

        if (!proceed) {
          return;
        }
      }

      await addSale({
        total,
        subtotal: total,
        tax: 0,
        paymentMethod,
        userId: currentUser!.id,
        customerName: customerName || undefined,
        is_direct_sale: true,
        cash_register_id: currentCashRegister.id,
        items: selectedItems.map(item => ({
          id: '',
          productId: item.productId,
          product_name: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product_type: item.product_type
        }))
      });

      toast({
        title: "Sucesso",
        description: "Venda direta registrada com sucesso!",
      });

      setSelectedItems([]);
      setCustomerName('');
      setPaymentMethod('cash');
      setSearchTerm('');
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

          {/* Right Column - Selected Items */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Itens Selecionados</h3>
              <div className="space-y-2 h-96 overflow-y-auto border rounded-lg p-3">
                {selectedItems.map((item, index) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product?.name}</p>
                      <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} cada</p>
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

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
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
