
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Hash
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export const Dashboard = () => {
  const { orders, sales, ingredients, products, externalProducts, currentCashRegister } = useApp();

  // Calculate metrics
  const todaysSales = sales.filter(sale => {
    const today = new Date();
    const saleDate = new Date(sale.createdAt);
    return saleDate.toDateString() === today.toDateString();
  });

  const totalSalesToday = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalOrdersToday = todaysSales.length;

  const openOrders = orders.filter(order => order.status === 'open');
  const closedOrders = orders.filter(order => order.status === 'closed');

  const lowStockIngredients = ingredients.filter(ingredient =>
    ingredient.current_stock <= ingredient.min_stock
  );

  const lowStockExternalProducts = externalProducts.filter(product =>
    product.current_stock <= product.min_stock
  );

  const availableProducts = products.filter(product => product.available).length;
  const totalProducts = products.length;

  const averageOrderValue = totalOrdersToday > 0 ? totalSalesToday / totalOrdersToday : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral do seu negócio</p>
      </div>

      {/* Cash Register Status */}
      {currentCashRegister && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="h-5 w-5 mr-2" />
              Caixa Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-600">Valor de Abertura</p>
                <p className="text-lg font-semibold text-green-800">
                  R$ {currentCashRegister.opening_amount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-600">Total de Vendas</p>
                <p className="text-lg font-semibold text-green-800">
                  R$ {currentCashRegister.total_sales.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-600">Número de Pedidos</p>
                <p className="text-lg font-semibold text-green-800">
                  {currentCashRegister.total_orders}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalSalesToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalOrdersToday} pedidos realizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comandas Abertas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {closedOrders.length} comandas fechadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableProducts}</div>
            <p className="text-xs text-muted-foreground">
              de {totalProducts} produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              por pedido hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {(lowStockIngredients.length > 0 || lowStockExternalProducts.length > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockIngredients.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Ingredientes com Estoque Baixo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {lowStockIngredients.map((ingredient) => (
                      <div key={ingredient.id} className="bg-white p-2 rounded border">
                        <p className="font-medium text-sm">{ingredient.name}</p>
                        <p className="text-xs text-gray-600">
                          Atual: {ingredient.current_stock} {ingredient.unit} |
                          Mínimo: {ingredient.min_stock} {ingredient.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lowStockExternalProducts.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Produtos Externos com Estoque Baixo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {lowStockExternalProducts.map((product) => (
                      <div key={product.id} className="bg-white p-2 rounded border">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-600">
                          Atual: {product.current_stock} | Mínimo: {product.min_stock}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Comandas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium flex items-center">
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
                  </p>
                  <p className="text-sm text-gray-600">
                    {order.items.length} itens - R$ {order.total.toFixed(2)}
                  </p>
                </div>
                <Badge variant={order.status === 'open' ? 'destructive' : 'default'}>
                  {order.status === 'open' ? 'Aberta' : 'Fechada'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
