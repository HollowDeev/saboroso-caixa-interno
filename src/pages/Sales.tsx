
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Sales = () => {
  const { sales, orders } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const getFilteredSales = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      switch (selectedPeriod) {
        case 'today':
          return saleDate >= today;
        case 'week':
          return saleDate >= weekStart;
        case 'month':
          return saleDate >= monthStart;
        default:
          return true;
      }
    });
  };

  const filteredSales = getFilteredSales();
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const getPaymentMethodStats = () => {
    const stats = { cash: 0, card: 0, pix: 0 };
    filteredSales.forEach(sale => {
      stats[sale.paymentMethod]++;
    });
    return stats;
  };

  const paymentStats = getPaymentMethodStats();

  const getDailySales = () => {
    const dailyStats: { [key: string]: { revenue: number, count: number } } = {};
    
    filteredSales.forEach(sale => {
      const date = new Date(sale.createdAt).toLocaleDateString();
      if (!dailyStats[date]) {
        dailyStats[date] = { revenue: 0, count: 0 };
      }
      dailyStats[date].revenue += sale.total;
      dailyStats[date].count++;
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const dailySales = getDailySales();

  const getOrderForSale = (orderId: string) => {
    return orders.find(order => order.id === orderId);
  };

  const stats = [
    {
      title: 'Receita Total',
      value: `R$ ${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Total de Vendas',
      value: totalSales.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${averageTicket.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">Análise e histórico de vendas</p>
        </div>
        
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Últimos 7 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Dinheiro</span>
                <Badge variant="outline">{paymentStats.cash} vendas</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Cartão</span>
                <Badge variant="outline">{paymentStats.card} vendas</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>PIX</span>
                <Badge variant="outline">{paymentStats.pix} vendas</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dailySales.map((day, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{day.date}</span>
                  <div className="text-right">
                    <p className="font-semibold">R$ {day.revenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">{day.count} vendas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Lista de Vendas</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Comanda</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Vendedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => {
                    const order = getOrderForSale(sale.orderId);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleDateString()} às{' '}
                          {new Date(sale.createdAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          {order?.customerName || `Mesa ${order?.tableNumber}` || 'N/A'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          R$ {sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sale.paymentMethod === 'cash' ? 'Dinheiro' : 
                             sale.paymentMethod === 'card' ? 'Cartão' : 'PIX'}
                          </Badge>
                        </TableCell>
                        <TableCell>Usuário #{sale.userId}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {filteredSales.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma venda encontrada no período selecionado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Resumo do Período</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Período:</span>
                      <span className="font-medium">
                        {selectedPeriod === 'today' ? 'Hoje' :
                         selectedPeriod === 'week' ? 'Últimos 7 dias' :
                         selectedPeriod === 'month' ? 'Este mês' : 'Todas'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de vendas:</span>
                      <span className="font-medium">{totalSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receita total:</span>
                      <span className="font-medium">R$ {totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ticket médio:</span>
                      <span className="font-medium">R$ {averageTicket.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">Métodos de Pagamento</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Dinheiro:</span>
                      <span className="font-medium">
                        {paymentStats.cash} vendas ({totalSales > 0 ? ((paymentStats.cash / totalSales) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cartão:</span>
                      <span className="font-medium">
                        {paymentStats.card} vendas ({totalSales > 0 ? ((paymentStats.card / totalSales) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>PIX:</span>
                      <span className="font-medium">
                        {paymentStats.pix} vendas ({totalSales > 0 ? ((paymentStats.pix / totalSales) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
