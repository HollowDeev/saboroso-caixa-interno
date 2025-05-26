import React, { useState } from 'react';
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
import { Order, OrderItem, Product } from '@/types';
import { CheckoutModal } from '@/components/CheckoutModal';

export const Orders = () => {
  const { orders, products, currentUser, addOrder, updateOrder, addSale } = useApp();
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState<number | undefined>();
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);

  const addProductToOrder = (product: Product) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedProducts(prev => prev.map(item =>
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

  const createOrder = () => {
    if (selectedProducts.length === 0) return;

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

    addOrder(newOrder);
    setSelectedProducts([]);
    setCustomerName('');
    setTableNumber(undefined);
    setIsNewOrderOpen(false);
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

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comandas</h1>
          <p className="text-gray-600">Gerencie os pedidos do restaurante</p>
        </div>

        <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Nova Comanda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Comanda</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Nome do Cliente</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Digite o nome"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tableNumber">Número da Mesa</Label>
                    <Input
                      id="tableNumber"
                      type="number"
                      value={tableNumber || ''}
                      onChange={(e) => setTableNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Número da mesa"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Produtos Disponíveis</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
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
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa (10%):</span>
                      <span>R$ {tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>R$ {total.toFixed(2)}</span>
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

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Comandas Ativas</TabsTrigger>
          <TabsTrigger value="completed">Comandas Finalizadas</TabsTrigger>
          <TabsTrigger value="all">Todas as Comandas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders
              .filter(order => ['pending', 'preparing', 'ready'].includes(order.status))
              .map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {order.customerName ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            {order.customerName}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Hash className="h-4 w-4 mr-2" />
                            Mesa {order.tableNumber}
                          </div>
                        )}
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
                          <span>{item.quantity}x {item.product.name}</span>
                          <span>R$ {item.totalPrice.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 font-semibold">
                        Total: R$ {order.total.toFixed(2)}
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <Select
                          value={order.status}
                          onValueChange={(status) => updateOrder(order.id, { status: status as Order['status'] })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="preparing">Preparando</SelectItem>
                            <SelectItem value="ready">Pronto</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        {order.status === 'ready' && (
                          <Button
                            onClick={() => setCheckoutOrder(order)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Finalizar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders
              .filter(order => ['delivered', 'paid'].includes(order.status))
              .map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {order.customerName ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            {order.customerName}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Hash className="h-4 w-4 mr-2" />
                            Mesa {order.tableNumber}
                          </div>
                        )}
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
                          <span>{item.quantity}x {item.product.name}</span>
                          <span>R$ {item.totalPrice.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 font-semibold">
                        Total: R$ {order.total.toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {order.customerName ? (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          {order.customerName}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Hash className="h-4 w-4 mr-2" />
                          Mesa {order.tableNumber}
                        </div>
                      )}
                    </CardTitle>
                    <Badge variant={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()} às {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product.name}</span>
                        <span>R$ {item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 font-semibold">
                      Total: R$ {order.total.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CheckoutModal
        order={checkoutOrder}
        onClose={() => setCheckoutOrder(null)}
      />
    </div>
  );
};
