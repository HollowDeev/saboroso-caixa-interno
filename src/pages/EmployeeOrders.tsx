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
import { Order, OrderItem, Product, NewOrderItem } from '@/types';
import { CheckoutModal } from '@/components/CheckoutModal';
import { toast } from '@/components/ui/use-toast';

export const EmployeeOrders = () => {
  const { orders, products, addOrder, updateOrder } = useApp();
  const [selectedProducts, setSelectedProducts] = useState<NewOrderItem[]>([]);
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
      const newItem: NewOrderItem = {
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
    const tax = subtotal * 0.1;
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
        tableNumber: tableNumber !== undefined && tableNumber !== null ? Number(tableNumber) : undefined,
        items: selectedProducts,
        subtotal,
        tax,
        total,
        status: 'pending',
        userId: 'employee-temp-id'
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
      case 'open': return 'destructive';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'open': return 'Aberta';
      case 'closed': return 'Fechada';
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
          <TabsTrigger value="active">Comandas Abertas</TabsTrigger>
          <TabsTrigger value="completed">Comandas Fechadas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders
              .filter(order => order.status === 'open')
              .map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
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
                      <div className="flex space-x-2 mt-4">
                        <Button
                          onClick={() => updateOrder(order.id, { status: 'closed' })}
                          className="flex-1 bg-green-500 hover:bg-green-600"
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Fechar Comanda
                        </Button>
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
              .filter(order => order.status === 'closed')
              .map((order) => (
                <Card key={order.id} className="opacity-75">
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
