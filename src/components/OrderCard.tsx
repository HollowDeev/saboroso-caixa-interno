import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Hash, CreditCard, X, Printer, AlertTriangle, Search, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, Product, ExternalProduct, PaymentMethod } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useToast } from '@/components/ui/use-toast';

import { OrderReceiptPrint } from './OrderReceiptPrint';
import { useActiveDiscounts } from '@/hooks/useActiveDiscounts';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';

interface OrderCardProps {
  order: Order;
}

export const OrderCard = ({ order }: OrderCardProps) => {
  const { products, externalProducts, addItemToOrder, closeOrder } = useApp();
  const { toast } = useToast();
  const { discounts: activeDiscounts } = useActiveDiscounts();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isCloseOrderOpen, setIsCloseOrderOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | ExternalProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [payments, setPayments] = useState<Array<{ method: PaymentMethod; amount: string }>>([
    { method: 'cash', amount: order.total.toFixed(2) }
  ]);
  const [isClosingOrder, setIsClosingOrder] = useState(false);
  const [showPrintAlert, setShowPrintAlert] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

  // Estados para novo modal de adição de itens
  const [addItemsSearch, setAddItemsSearch] = useState('');
  const [addItemsSelected, setAddItemsSelected] = useState<Array<{
    id: string;
    productId: string;
    product_name: string;
    product: Product | ExternalProduct;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product_type: 'food' | 'external_product';
    originalPrice?: number;
    discountValue?: number;
    discountId?: string;
  }>>([]);

  const allProducts = [...products.filter(p => p.available), ...externalProducts.filter(p => p.current_stock > 0)];

  // Controlar impressão
  useEffect(() => {
    if (orderToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setOrderToPrint(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [orderToPrint]);

  const handlePaymentAmountChange = (index: number, amount: string) => {
    // Trocar vírgula por ponto e remover caracteres não numéricos exceto ponto
    let cleanValue = amount.replace(/,/g, '.').replace(/[^\d.]/g, '');
    // Garantir que só há um ponto decimal
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limitar a 2 casas decimais
    if (parts[1] && parts[1].length > 2) {
      cleanValue = parts[0] + '.' + parts[1].slice(0, 2);
    }
    const newPayments = [...payments];
    newPayments[index].amount = cleanValue;
    setPayments(newPayments);
  };

  // Formatar valor ao sair do campo (onBlur)
  const handlePaymentAmountBlur = (index: number) => {
    const newPayments = [...payments];
    const value = newPayments[index].amount.replace(/,/g, '.');
    let num = parseFloat(value);
    if (!isNaN(num)) {
      num = Math.round(num * 100) / 100;
      newPayments[index].amount = num.toFixed(2);
    } else {
      newPayments[index].amount = '';
    }
    setPayments(newPayments);
  };

  const round2 = (num: number) => Math.round(num * 100) / 100;

  const totalPaid = payments.reduce((sum, payment) => sum + (round2(parseFloat(payment.amount)) || 0), 0);
  const remainingAmount = round2(order.total) - round2(totalPaid);

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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'partial':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'partial':
        return 'Parcial';
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
      // Buscar desconto ativo para o produto
      const discount = activeDiscounts.find(
        d => d.productId === selectedProduct.id && d.active && d.productType === ('current_stock' in selectedProduct ? 'external_product' : 'food')
      );
      const priceToUse = discount ? discount.newPrice : selectedProduct.price;
      
      const isExternalProduct = 'current_stock' in selectedProduct;
      const newItem = {
        productId: selectedProduct.id,
        product: selectedProduct,
        quantity,
        unitPrice: priceToUse,
        totalPrice: priceToUse * quantity,
        product_name: selectedProduct.name,
        product_type: isExternalProduct ? 'external_product' as const : 'food' as const,
        // Dados de desconto
        originalPrice: discount ? selectedProduct.price : undefined,
        discountValue: discount ? selectedProduct.price - discount.newPrice : undefined,
        discountId: discount?.id
      };

      await addItemToOrder(order.id, newItem);
      setIsAddItemOpen(false);
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível adicionar o item.";
      toast({
        title: "Erro ao adicionar item",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handlePaymentMethodChange = (index: number, method: PaymentMethod) => {
    const newPayments = [...payments];
    newPayments[index].method = method;
    setPayments(newPayments);
  };

  const validatePayments = () => {
    // Verificar se há valores inválidos
    const hasInvalidValues = payments.some(payment => {
      const amount = parseFloat(payment.amount.replace(/,/g, '.'));
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

    // Tolerância aumentada para 0.05
    if (Math.abs(remainingAmount) > 0.05) {
      toast({
        title: "Erro de validação",
        description: `O total dos pagamentos deve ser igual ao valor da comanda. Falta pagar: R$ ${Math.abs(remainingAmount).toFixed(2)}`,
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

      setIsClosingOrder(true);

      // Converter os valores de string para número
      const processedPayments = payments.map(payment => ({
        method: payment.method,
        amount: parseFloat(payment.amount.replace(/,/g, '.'))
      }));

      await closeOrder(order.id, processedPayments);

      setIsCloseOrderOpen(false);
      toast({
        title: "Comanda fechada",
        description: "Comanda fechada com sucesso!"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível fechar a comanda.";
      toast({
        title: "Erro ao fechar comanda",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsClosingOrder(false);
    }
  };

  // Funções para adicionar/remover/alterar itens
  const addProductToSelection = (product: Product | ExternalProduct) => {
    // Buscar desconto ativo para o produto
    const discount = activeDiscounts.find(
      d => d.productId === product.id && d.active && d.productType === ('current_stock' in product ? 'external_product' : 'food')
    );
    const priceToUse = discount ? discount.newPrice : product.price;
    
    const exists = addItemsSelected.find(item => item.productId === product.id);
    if (exists) {
      setAddItemsSelected(prev => prev.map(item =>
        item.productId === product.id
          ? { 
              ...item, 
              quantity: item.quantity + 1, 
              totalPrice: (item.quantity + 1) * priceToUse,
              unitPrice: priceToUse
              // Dados de desconto já estão preservados pelo spread operator (...item)
            }
          : item
      ));
    } else {
      const isExternalProduct = 'current_stock' in product;
      setAddItemsSelected(prev => [...prev, {
        id: `temp-${Date.now()}-${product.id}`,
        productId: product.id,
        product_name: product.name,
        product,
        quantity: 1,
        unitPrice: priceToUse,
        totalPrice: priceToUse,
        product_type: isExternalProduct ? 'external_product' : 'food',
        // Dados de desconto
        originalPrice: discount ? product.price : undefined,
        discountValue: discount ? product.price - discount.newPrice : undefined,
        discountId: discount?.id
      }]);
    }
  };
  const removeProductFromSelection = (productId: string) => {
    setAddItemsSelected(prev => prev.filter(item => item.productId !== productId));
  };
  const updateProductQuantityInSelection = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromSelection(productId);
      return;
    }
    setAddItemsSelected(prev => prev.map(item =>
      item.productId === productId
        ? { 
            ...item, 
            quantity, 
            totalPrice: quantity * item.unitPrice
            // Dados de desconto já estão preservados pelo spread operator (...item)
          }
        : item
    ));
  };
  // Produtos filtrados
  const filteredFoodProducts = products
    .filter(p => p.available && p.name.toLowerCase().includes(addItemsSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredExternalProducts = externalProducts
    .filter(p => p.current_stock > 0 && p.name.toLowerCase().includes(addItemsSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Função para confirmar adição dos itens
  const handleAddItemsToOrder = async () => {
    for (const item of addItemsSelected) {
      await addItemToOrder(order.id, {
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        product_name: item.product_name,
        product_type: item.product_type,
        // Usar dados de desconto já calculados
        originalPrice: item.originalPrice,
        discountValue: item.discountValue,
        discountId: item.discountId
      });
    }
    setAddItemsSelected([]);
    setIsAddItemOpen(false);
    setAddItemsSearch('');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 w-full">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 w-full">
              {order.customer_name && (
                <>
                  <User className="h-4 w-4 mr-1 shrink-0" />
                  <span className="font-semibold break-all whitespace-normal">{order.customer_name}</span>
                </>
              )}
              {order.table_number !== undefined && order.table_number !== null && (
                <>
                  <span className="mx-2 text-gray-400">|</span>
                  <Hash className="h-4 w-4 mr-1 shrink-0" />
                  <span className="font-semibold">Mesa {order.table_number}</span>
                </>
              )}
              {!order.customer_name && !order.table_number && (
                <>
                  <Hash className="h-4 w-4 mr-1 shrink-0" />
                  <span className="font-semibold">Mesa S/N</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 min-w-fit">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={e => { 
                  e.stopPropagation(); 
                  setOrderToPrint(order);
                }}
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Badge variant={getStatusColor(order.status)}>
                {getStatusText(order.status)}
              </Badge>
              <span className="text-xs text-gray-600">
                {order.status === 'closed' ? 'Fechada' : 'Aberta'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-4">
          {/* Lista de Itens */}
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm w-full">
                <span className="break-all whitespace-normal">{item.quantity}x {item.product_name}</span>
                <span className="whitespace-nowrap">R$ {item.totalPrice.toFixed(2)}</span>
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
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Adicionar Itens à Comanda</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="addItemSearch">Pesquisar Produtos</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="addItemSearch"
                            value={addItemsSearch}
                            onChange={e => setAddItemsSearch(e.target.value)}
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
                              {filteredFoodProducts.map(product => {
                                const discount = activeDiscounts.find(
                                  d => d.productId === product.id && d.active && d.productType === 'food'
                                );
                                return (
                                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                                    <div className="flex-1 flex items-center gap-2">
                                      <p className="font-medium text-sm">{product.name}</p>
                                      {discount && (
                                        <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold border border-green-300">Promoção</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                                    {product.description && (
                                      <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => addProductToSelection(product)}
                                      className="bg-green-500 hover:bg-green-600 ml-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {filteredExternalProducts.length > 0 && (
                            <div className={filteredFoodProducts.length > 0 ? 'mt-4' : ''}>
                              <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Produtos Externos ({filteredExternalProducts.length})</h4>
                              {filteredExternalProducts.map(product => {
                                const discount = activeDiscounts.find(
                                  d => d.productId === product.id && d.active && d.productType === 'external_product'
                                );
                                return (
                                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                                    <div className="flex-1 flex items-center gap-2">
                                      <p className="font-medium text-sm">{product.name}</p>
                                      {discount && (
                                        <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold border border-green-300">Promoção</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                                    {product.description && (
                                      <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => addProductToSelection(product)}
                                      className="bg-green-500 hover:bg-green-600 ml-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {filteredFoodProducts.length === 0 && filteredExternalProducts.length === 0 && (
                            <div className="text-gray-500 text-center py-8">Nenhum item encontrado.</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="font-semibold mb-3">Itens Selecionados</h3>
                      <div className="h-96 overflow-y-auto border rounded-lg p-3 bg-white">
                        {addItemsSelected.length === 0 ? (
                          <div className="text-gray-500 text-center py-8">Nenhum item selecionado.</div>
                        ) : (
                          addItemsSelected.map(item => (
                            <div key={item.productId} className="flex items-center justify-between border-b py-2">
                              <div>
                                <p className="font-medium text-sm">{item.product_name}</p>
                                <p className="text-xs text-gray-500">{item.product_type === 'food' ? 'Comida' : 'Produto Externo'}</p>
                                <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} x {item.quantity}</p>
                                {item.discountValue && item.discountValue > 0 && (
                                  <>
                                    <p className="text-xs text-orange-700">Preço original: R$ {item.originalPrice?.toFixed(2)}</p>
                                    <p className="text-xs text-green-700">Desconto: R$ {item.discountValue.toFixed(2)}</p>
                                  </>
                                )}
                                <p className="text-xs font-semibold mt-1">Total: R$ {item.totalPrice.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={e => updateProductQuantityInSelection(item.productId, Number(e.target.value))}
                                  className="w-16"
                                />
                                <Button type="button" size="icon" variant="ghost" onClick={() => removeProductFromSelection(item.productId)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <Button onClick={handleAddItemsToOrder} className="w-full bg-green-600 hover:bg-green-700" disabled={addItemsSelected.length === 0}>
                        Adicionar {addItemsSelected.length > 1 ? 'Itens' : 'Item'} à Comanda
                      </Button>
                    </div>
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
                              onBlur={() => handlePaymentAmountBlur(index)}
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

                    {/* Botões alinhados: Cancelar | Fechar | Imprimir */}
                    <div className="flex flex-row gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCloseOrderOpen(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => setShowPrintAlert(true)}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        disabled={remainingAmount > 0 || isClosingOrder}
                      >
                        {isClosingOrder ? (
                          <>
                            <span className="animate-spin mr-2">◌</span>
                            Finalizando...
                          </>
                        ) : (
                          'Fechar Comanda'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setOrderToPrint(order)}
                        className="flex-1"
                      >
                        Imprimir
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
      {/* Alerta de confirmação de impressão */}
      <AlertDialog open={showPrintAlert} onOpenChange={setShowPrintAlert}>
        <AlertDialogContent className="border-red-600">
          <div className="flex flex-col items-center justify-center">
            <AlertTriangle className="text-red-600 mb-2" size={48} />
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold text-red-700 text-center">
                Atenção!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-lg text-red-600 font-semibold text-center mt-2">
                É necessário imprimir a comanda para conferência do cliente antes do pagamento.<br />
                <span className="block mt-2">Você já realizou a impressão?</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPrintAlert(false)} className="font-bold">
              Não, voltar para imprimir
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowPrintAlert(false);
                await handleCloseOrder();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Sim, já imprimi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {orderToPrint && (
        <div id="print-content-order">
          <OrderReceiptPrint order={orderToPrint} />
        </div>
      )}
    </Card>
  );
};
