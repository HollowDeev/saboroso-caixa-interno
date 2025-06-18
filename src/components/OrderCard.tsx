import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Hash, CreditCard, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, Product, ExternalProduct, PaymentMethod } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useToast } from '@/components/ui/use-toast';

interface OrderCardProps {
  order: Order;
}

export const OrderCard = ({ order }: OrderCardProps) => {
  const { products, externalProducts, addItemToOrder, closeOrder } = useApp();
  const { toast } = useToast();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isCloseOrderOpen, setIsCloseOrderOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | ExternalProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [payments, setPayments] = useState<Array<{ method: PaymentMethod; amount: string }>>([
    { method: 'cash', amount: order.total.toFixed(2) }
  ]);

  const allProducts = [...products.filter(p => p.available), ...externalProducts.filter(p => p.current_stock > 0)];

  const totalPaid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const remainingAmount = order.total - totalPaid;

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'open':
        return 'Aberta';
      case 'closed':
        return 'Fechada';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: Order['payment_status']) => {
    switch (status) {
      case 'pending':
        return 'text-orange-500';
      case 'partial':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPaymentStatusText = (status: Order['payment_status']) => {
    switch (status) {
      case 'pending':
        return 'Pagamento Pendente';
      case 'partial':
        return 'Pagamento Parcial';
      case 'completed':
        return 'Pagamento Completo';
      default:
        return status;
    }
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

  const handlePaymentMethodChange = (index: number, method: PaymentMethod) => {
    const newPayments = [...payments];
    newPayments[index].method = method;
    setPayments(newPayments);
  };

  const handlePaymentAmountChange = (index: number, amount: string) => {
    // Remover caracteres não numéricos, exceto ponto
    const cleanValue = amount.replace(/[^\d.]/g, '');
    // Garantir que só há um ponto decimal
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limitar a 2 casas decimais
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    const newPayments = [...payments];
    newPayments[index].amount = cleanValue;
    setPayments(newPayments);
  };

  const validatePayments = () => {
    // Verificar se há valores inválidos
    const hasInvalidValues = payments.some(payment => {
      const amount = parseFloat(payment.amount);
      return isNaN(amount) || amount <= 0;
    });

    if (hasInvalidValues) {
      toast({
        title: "Erro de validação",
        description: "Todos os valores de pagamento devem ser maiores que zero.",
        variant: "destructive"
      });
      return false;
    }

    // Verificar se o total dos pagamentos é igual ao valor da comanda
    if (Math.abs(remainingAmount) > 0.01) {
      toast({
        title: "Erro de validação",
        description: "O total dos pagamentos deve ser igual ao valor da comanda.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const addPayment = () => {
    setPayments([...payments, { method: 'cash', amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : '0' }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCloseOrder = async () => {
    try {
      if (!validatePayments()) {
        return;
      }

      // Converter os valores de string para número
      const processedPayments = payments.map(payment => ({
        method: payment.method,
        amount: parseFloat(payment.amount)
      }));

      await closeOrder(order.id, processedPayments);

      setIsCloseOrderOpen(false);
      toast({
        title: "Comanda fechada",
        description: "Comanda fechada com sucesso!"
      });
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
              {order.customer_name && (
                <>
                  <User className="h-4 w-4 mr-2" />
                  {order.customer_name}
                </>
              )}
              {order.table_number !== undefined && order.table_number !== null && (
                <>
                  <Hash className="h-4 w-4 ml-2 mr-2" />
                  Mesa {order.table_number}
                </>
              )}
              {!order.customer_name && !order.table_number && (
                <>
                  <Hash className="h-4 w-4 mr-2" />
                  Mesa S/N
                </>
              )}
            </div>
          </CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(order.status)}>
              {getStatusText(order.status)}
            </Badge>
            <span className={`text-xs ${getPaymentStatusColor(order.payment_status)}`}>
              {getPaymentStatusText(order.payment_status)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-4">
          {/* Lista de Itens */}
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.product_name}
                </span>
                <span>R$ {item.totalPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-2">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
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

              <Dialog open={isCloseOrderOpen} onOpenChange={(open) => {
                console.log('onOpenChange:', open);
                setIsCloseOrderOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="flex-1 bg-green-500 hover:bg-green-600 relative z-10">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Fechar Comanda
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Fechar Comanda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Detalhes do Pedido */}
                    <div className="space-y-2 border-b pb-4">
                      <h3 className="font-medium text-sm text-gray-600">Detalhes do Pedido</h3>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <div className="flex-1">
                              <span className="font-medium">{item.product_name}</span>
                              <span className="text-gray-500 ml-2">({item.quantity}x)</span>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-500">R$ {item.unitPrice.toFixed(2)} cada</div>
                              <div>R$ {item.totalPrice.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagamentos */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-gray-600">Pagamentos</h3>
                      <div className="space-y-2">
                        {payments.map((payment, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Select
                              value={payment.method}
                              onValueChange={(value: PaymentMethod) => handlePaymentMethodChange(index, value)}
                            >
                              <SelectTrigger className="flex-1">
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
                              value={payment.amount}
                              onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                              className="w-32"
                            />
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePayment(index)}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addPayment}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Pagamento
                      </Button>
                    </div>

                    {/* Totais */}
                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Total da Venda:</span>
                        <span>R$ {order.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Pago:</span>
                        <span>R$ {totalPaid.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${remainingAmount > 0 ? 'text-orange-500' : remainingAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        <span>Falta Pagar:</span>
                        <span>R$ {Math.abs(remainingAmount).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCloseOrderOpen(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCloseOrder}
                        className="flex-1"
                        disabled={remainingAmount > 0}
                      >
                        Finalizar
                      </Button>
                    </div>
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
