import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { DirectSaleModal } from '@/components/DirectSaleModal';

export const EmployeeSales = () => {
  const { sales, orders } = useAppContext();
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);

  const closedOrders = orders.filter(order => order.status === 'closed');
  const totalSales = closedOrders.reduce((sum, order) => sum + order.total, 0);
  const todaysSales = closedOrders.filter(
    order => new Date(order.created_at).toDateString() === new Date().toDateString()
  );
  const todaysTotal = todaysSales.reduce((sum, order) => sum + order.total, 0);

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'pix': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-2 text-xs">
          Debug Employee Sales: Orders: {orders?.length}, Sales: {sales?.length}, Closed Orders: {closedOrders?.length}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">Visualize e gerencie as vendas realizadas</p>
        </div>

        <Button
          onClick={() => setIsDirectSaleOpen(true)}
          className="bg-green-500 hover:bg-green-600"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Venda Direta
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendas Hoje</p>
                <p className="text-2xl font-bold text-gray-900">R$ {todaysTotal.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{todaysSales.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Geral</p>
                <p className="text-2xl font-bold text-gray-900">R$ {totalSales.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList>
          <TabsTrigger value="today">Vendas de Hoje</TabsTrigger>
          <TabsTrigger value="all">Todas as Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendas de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysSales.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma venda realizada hoje</p>
                ) : (
                  todaysSales.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <ShoppingCart className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {order.customer_name || `Mesa ${order.table_number || 'S/N'}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {order.payment_method && (
                          <Badge className={getPaymentMethodColor(order.payment_method)}>
                            {getPaymentMethodText(order.payment_method)}
                          </Badge>
                        )}
                        <span className="font-bold text-lg">R$ {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {closedOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma venda realizada</p>
                ) : (
                  closedOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <Calendar className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {order.customer_name || `Mesa ${order.table_number || 'S/N'}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {order.payment_method && (
                          <Badge className={getPaymentMethodColor(order.payment_method)}>
                            {getPaymentMethodText(order.payment_method)}
                          </Badge>
                        )}
                        <span className="font-bold text-lg">R$ {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DirectSaleModal
        isOpen={isDirectSaleOpen}
        onClose={() => setIsDirectSaleOpen(false)}
      />
    </div>
  );
};
