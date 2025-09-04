import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Order, OrderItem, Product, NewOrderItem, ExternalProduct } from '@/types';
import { useActiveDiscounts } from '@/hooks/useActiveDiscounts';
import { OrderCard } from '@/components/OrderCard';
import { NoCashRegisterModal } from '@/components/NoCashRegisterModal';
import { toast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';

export const Orders = () => {
  const {
    orders,
    products,
    externalProducts,
    currentUser,
    addOrder,
    currentCashRegister,
    checkCashRegisterAccess,
    isLoading,
    refreshData
  } = useAppContext();

  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState<number | undefined>();
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNoCashModalOpen, setIsNoCashModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isOwner = checkCashRegisterAccess();

  // Hook para descontos ativos
  const { discounts: activeDiscounts } = useActiveDiscounts();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      setIsNewOrderOpen(true);
    }
  }, [location.search]);

  const handleNewOrder = () => {
    if (!currentCashRegister) {
      setIsNoCashModalOpen(true);
      return;
    }
    setIsNewOrderOpen(true);
  };

  const addProductToOrder = (product: Product | ExternalProduct) => {
    // Verifica desconto ativo
    const discount = activeDiscounts.find(
      d => d.productId === product.id && d.active && d.productType === ('current_stock' in product ? 'external_product' : 'food')
    );
    const priceToUse = discount ? discount.newPrice : product.price;
    const existingItem = selectedProducts.find(item => item.productId === product.id);

    if (existingItem) {
      setSelectedProducts(prev => prev.map(item =>
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
      const isExternalProduct = 'current_stock' in product;
      const newItem: OrderItem & { originalPrice?: number; discountValue?: number; discountId?: string } = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        product_name: product.name,
        product: {
          ...product,
          available: isExternalProduct ? product.current_stock > 0 : product.available
        },
        quantity: 1,
        unitPrice: priceToUse,
        totalPrice: priceToUse,
        product_type: isExternalProduct ? 'external_product' : 'food',
        originalPrice: product.price,
        discountValue: discount ? product.price - discount.newPrice : 0,
        discountId: discount?.id
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
        ? { 
            ...item, 
            quantity, 
            totalPrice: quantity * item.unitPrice,
            // Preservar dados de desconto
            originalPrice: item.originalPrice,
            discountValue: item.discountValue,
            discountId: item.discountId
          }
        : item
    ));
  };

  const calculateTotal = () => {
    const subtotal = selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0);
    return { subtotal, tax: 0, total: subtotal };
  };

  const createOrder = async () => {

    if (!customerName.trim()) {
      toast({
        title: "Erro",
        description: "O nome do cliente é obrigatório para criar a comanda.",
        variant: "destructive"
      });
      return;
    }

    if (selectedProducts.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à comanda.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingOrder(true);
      const { subtotal, tax, total } = calculateTotal();

      // Debug: verificar dados dos produtos selecionados
      console.log('Orders - produtos selecionados:', selectedProducts);
      console.log('Orders - dados de desconto nos produtos:', selectedProducts.map(item => ({
        productName: item.product_name,
        originalPrice: item.originalPrice,
        discountValue: item.discountValue,
        discountId: item.discountId
      })));

      // Ajuste para aceitar tanto created_at quanto createdAt

      // Não permitir criar comanda sem nome do cliente
      if (!customerName.trim()) {
        toast({
          title: "Erro",
          description: "O nome do cliente é obrigatório para criar a comanda.",
          variant: "destructive"
        });
        setIsCreatingOrder(false);
        return;
      }

      const newOrder: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
        customer_name: customerName,
        table_number: tableNumber !== undefined && tableNumber !== null ? Number(tableNumber) : undefined,
        items: selectedProducts,
        subtotal,
        tax,
        total,
        status: 'open',
        user_id: currentUser!.id,
        cash_register_id: currentCashRegister!.id
      };

      console.log('Orders - nova comanda a ser criada:', newOrder);

      await addOrder(newOrder);
      // Recarregar a página inteira após a alteração
      window.location.reload();

      toast({
        title: "Sucesso",
        description: "Comanda criada com sucesso!",
      });
    } catch (error) {
      console.error('Orders - erro ao criar comanda:', error);
      toast({
        title: "Erro ao criar comanda",
        description: error.message || "Ocorreu um erro ao criar a comanda. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  console.log('Orders Debug:', {
    currentUser: currentUser?.id,
    currentCashRegister: currentCashRegister?.id,
    ordersCount: orders?.length || 0,
    productsCount: products?.length || 0,
    externalProductsCount: externalProducts?.length || 0
  });

  const filteredOrders = (orders || []).filter(order => {
    if (!order || !order.cash_register_id) return false;
    if (!currentCashRegister || order.cash_register_id !== currentCashRegister.id) return false;

    if (activeTab === 'open') return order.status === 'open';
    if (activeTab === 'closed') return order.status === 'closed';
    return true;
  });

  // Filtrar e ordenar produtos alfabeticamente
  const filteredFoodProducts = products
    .filter(p => p.available && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredExternalProducts = externalProducts
    .filter(p => p.current_stock > 0 && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

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
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">Nova Comanda</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    <Label htmlFor="tableNumber">Número da Mesa (opcional)</Label>
                    <Input
                      id="tableNumber"
                      type="number"
                      value={tableNumber || ''}
                      onChange={(e) => setTableNumber(Number(e.target.value))}
                      placeholder="Digite o número da mesa"
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
                        {filteredFoodProducts.map((product) => {
                          const discount = activeDiscounts.find(
                            d => d.productId === product.id && d.active && d.productType === 'food'
                          );
                          return (
                            <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{product.name}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                                  {discount && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-300 font-semibold ml-1">
                                      Preço com desconto: R$ {discount.newPrice.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                {product.description && (
                                  <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addProductToOrder(product)}
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
                      <div className={filteredFoodProducts.length > 0 ? "mt-4" : ""}>
                        <h4 className="text-sm font-medium text-gray-500 mb-2 sticky top-0 bg-white py-1">Produtos Externos ({filteredExternalProducts.length})</h4>
                        {filteredExternalProducts.map((product) => {
                          const discount = activeDiscounts.find(
                            d => d.productId === product.id && d.active && d.productType === 'external_product'
                          );
                          return (
                            <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg mb-2 bg-white">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{product.name}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-600">R$ {product.price.toFixed(2)}</p>
                                  {discount && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-300 font-semibold ml-1">
                                      Preço com desconto: R$ {discount.newPrice.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  {product.brand && <span>{product.brand}</span>}
                                  <span>Estoque: {product.current_stock}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addProductToOrder(product)}
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
                      <div className="text-center py-8 text-gray-500">
                        {searchTerm ? 'Nenhum produto encontrado para a pesquisa.' : 'Nenhum produto disponível.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold">Itens do Pedido</h3>
                <div className="space-y-2 h-80 overflow-y-auto border rounded-lg p-3">
                  {selectedProducts.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name}</p>
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
                          onClick={() => updateProductQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
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
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}

                  {selectedProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Nenhum item adicionado
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>R$ {calculateTotal().subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>R$ {calculateTotal().total.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={createOrder}
                      disabled={isCreatingOrder}
                    >
                      {isCreatingOrder ? (
                        <>
                          <span className="animate-spin mr-2">◌</span>
                          Criando...
                        </>
                      ) : (
                        'Criar Comanda'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="open" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="open">Comandas Abertas</TabsTrigger>
          <TabsTrigger value="closed">Comandas Fechadas</TabsTrigger>
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
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NoCashRegisterModal
        isOpen={isNoCashModalOpen}
        onClose={() => setIsNoCashModalOpen(false)}
        isOwner={isOwner}
      />
    </div>
  );
};
