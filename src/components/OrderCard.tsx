import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Hash, CreditCard } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, Product, ExternalProduct, PaymentMethod } from '@/types';
import { toast } from '@/hooks/use-toast';

interface OrderCardProps {
  order: Order;
}

export const OrderCard = ({ order }: OrderCardProps) => {
  const { products, externalProducts, addItemToOrder, closeOrder } = useApp();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isCloseOrderOpen, setIsCloseOrderOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | ExternalProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const allProducts = [...products.filter(p => p.available), ...externalProducts.filter(p => p.current_stock > 0)];

  const getStatusColor = (status: Order['status']) => {
    return status === 'open' ? 'destructive' : 'default';
  };

  const getStatusText = (status: Order['status']) => {
    return status === 'open' ? 'Aberta' : 'Fechada';
  };

  const handleAddItem = async () => {
    if (!selectedProduct) {
      toast({
        title: "Erro",
        description: "Selecione um produto.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newItem = {
        productId: selectedProduct.id,
        product: selectedProduct,
        quantity,
        unitPrice: selectedProduct.price,
        totalPrice: selectedProduct.price * quantity
      };

      await addItemToOrder(order.id, newItem);
      setIsAddItemOpen(false);
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message || "Não foi possível adicionar o item.",
        variant: "destructive"
      });
    }
  };

  const handleCloseOrder = async () => {
    try {
      await closeOrder(order.id, paymentMethod);
      setIsCloseOrderOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao fechar comanda",
        description: error.message || "Não foi possível fechar a comanda.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            <div className="flex items-center">
              {order.customerName && (
                <>
                  <User className="h-4 w-4 mr-2" />
                  {order.customerName}
                </>
              )}
              {order.tableNumber !== undefined && order.tableNumber !== null && (
                <>
                  <Hash className="h-4 w-4 ml-2 mr-2" />
                  Mesa {order.tableNumber}
                </>
              )}
              {!order.customerName && !order.tableNumber && (
                <>
                  <Hash className="h-4 w-4 mr-2" />
                  Mesa S/N
                </>
              )}
            </div>
          </CardTitle>
          <Badge variant={getStatusColor(order.status)}>
            {getStatusText(order.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.product_name || item.product.name}</span>
              <span>R$ {item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 font-semibold">
            Total: R$ {order.total.toFixed(2)}
          </div>

          {order.status === 'open' && (
            <div className="flex space-x-2 mt-4">
              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Plus className="h-4 w-4 mr-1" />
                    Inserir Pedido
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Item à Comanda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="product">Produto</Label>
                      <Select onValueChange={(value) => {
                        const product = allProducts.find(p => p.id === value);
                        setSelectedProduct(product || null);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - R$ {product.price.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantidade</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    {selectedProduct && (
                      <div className="text-sm text-gray-600">
                        Total: R$ {(selectedProduct.price * quantity).toFixed(2)}
                      </div>
                    )}
                    <Button onClick={handleAddItem} className="w-full">
                      Adicionar Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCloseOrderOpen} onOpenChange={setIsCloseOrderOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1 bg-green-500 hover:bg-green-600">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Fechar Comanda
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Fechar Comanda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                      <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
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
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>R$ {order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa (10%):</span>
                        <span>R$ {order.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>R$ {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button onClick={handleCloseOrder} className="w-full bg-green-500 hover:bg-green-600">
                      Finalizar Comanda
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
