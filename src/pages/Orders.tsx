import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, User, Hash, CreditCard } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order, OrderItem, Product, NewOrderItem, ExternalProduct } from '@/types';
import { CheckoutModal } from '@/components/CheckoutModal';
import { toast } from '@/components/ui/use-toast';
import { NoCashRegisterModal } from '@/components/NoCashRegisterModal';

export const Orders = () => {
  const {
    orders,
    products,
    externalProducts,
    currentUser,
    addOrder,
    updateOrder,
    addSale,
    currentCashRegister,
    checkCashRegisterAccess,
    isLoading
  } = useApp();

  const [selectedProducts, setSelectedProducts] = useState<NewOrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState<number | undefined>();
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [isNoCashModalOpen, setIsNoCashModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const isOwner = checkCashRegisterAccess();

  const handleNewOrder = () => {
    if (!currentCashRegister) {
      setIsNoCashModalOpen(true);
      return;
    }
    setIsNewOrderOpen(true);
  };

  const addProductToOrder = (product: Product | ExternalProduct) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedProducts(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      const newItem: NewOrderItem = {
        productId: product.id,
        product: {
          ...product,
          available: 'current_stock' in product ? product.current_stock > 0 : product.available
        },
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price
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

  const calculateTotal = () => {
    const subtotal = selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.1; // 10% de taxa
    return { subtotal, tax, total: subtotal + tax };
  };

  const createOrder = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à comanda.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { subtotal, tax, total } = calculateTotal();

      const newOrder: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        customerName: customerName || undefined,
        tableNumber: tableNumber,
        items: selectedProducts,
        subtotal,
        tax,
        total,
        status: 'pending',
        userId: currentUser!.id
      };

      await addOrder(newOrder);

      // Limpar o formulário e fechar o modal
      setSelectedProducts([]);
      setCustomerName('');
      setTableNumber(undefined);
      setIsNewOrderOpen(false);

      // Mostrar mensagem de sucesso
      toast({
        title: "Sucesso",
        description: "Comanda criada com sucesso!",
      });
    } catch (error: any) {
      // Mostrar mensagem de erro
      toast({
        title: "Erro ao criar comanda",
        description: error.message || "Ocorreu um erro ao criar a comanda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'preparing': return 'default';
      case 'ready': return 'secondary';
      case 'delivered': return 'outline';
      case 'paid': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'delivered': return 'Entregue';
      case 'paid': return 'Pago';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  // Filtrar comandas por status
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.status === 'pending' || order.status === 'preparing';
    if (activeTab === 'ready') return order.status === 'ready' || order.status === 'delivered';
    if (activeTab === 'paid') return order.status === 'paid';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comandas</h1>
          <p className="text-gray-600">Gerencie os pedidos do restaurante</p>
        </div>

        <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleNewOrder}
              disabled={isLoading || !currentCashRegister}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Comanda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Comanda</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="customerName">Nome do Cliente (opcional)</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Digite o nome do cliente"
                  />
                </div>

                <div>
                  <Label htmlFor="tableNumber">Número da Mesa (opcional)</Label>
                  <Input
                    id="tableNumber"
                    type="number"
                    value={tableNumber || ''}
                    onChange={(e) => setTableNumber(Number(e.target.value))}
                    placeholder="Digite o número da mesa"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Produtos Disponíveis</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {/* Comidas */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Comidas</h4>
                      {products.filter(p => p.available).map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addProductToOrder(product)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Produtos Externos */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Produtos Externos</h4>
                      {externalProducts.filter(p => p.current_stock > 0).map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                            {product.brand && (
                              <p className="text-xs text-gray-500">{product.brand}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addProductToOrder(product)}
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

              <div className="space-y-4">
                <h3 className="font-semibold">Itens do Pedido</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedProducts.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-600">R$ {item.unitPrice.toFixed(2)} cada</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateProductQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateProductQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeProductFromOrder(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>R$ {calculateTotal().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa (10%):</span>
                      <span>R$ {calculateTotal().tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>R$ {calculateTotal().total.toFixed(2)}</span>
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={createOrder}
                    >
                      Criar Comanda
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Em Andamento</TabsTrigger>
          <TabsTrigger value="ready">Prontas</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p>Carregando comandas...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p>Nenhuma comanda encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrders.map(order => (
                <Card key={order.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-medium">
                          {order.customerName || 'Cliente não identificado'}
                        </CardTitle>
                        {order.tableNumber && (
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <Hash className="h-4 w-4 mr-1" />
                            Mesa {order.tableNumber}
                          </div>
                        )}
                      </div>
                      <Badge variant={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Itens:</h3>
                        <ul className="space-y-2">
                          {order.items.map((item, index) => (
                            <li key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.product_name}</span>
                              <span>R$ {item.totalPrice.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>R$ {order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Taxa de Serviço (10%):</span>
                          <span>R$ {order.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium mt-2">
                          <span>Total:</span>
                          <span>R$ {order.total.toFixed(2)}</span>
                        </div>
                      </div>
                      {order.status !== 'paid' && (
                        <Button
                          className="w-full mt-4"
                          onClick={() => setCheckoutOrder(order)}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Fechar Comanda
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CheckoutModal
        order={checkoutOrder}
        onClose={() => setCheckoutOrder(null)}
      />

      <NoCashRegisterModal
        isOpen={isNoCashModalOpen}
        onClose={() => setIsNoCashModalOpen(false)}
        isOwner={isOwner}
      />
    </div>
  );
};
