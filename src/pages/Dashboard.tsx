import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export const Dashboard = () => {
  const { orders = [], sales = [], ingredients = [], products = [] } = useApp();

  const todaySales = sales?.filter(sale => {
    const today = new Date();
    const saleDate = new Date(sale.createdAt);
    return saleDate.toDateString() === today.toDateString();
  }) || [];

  const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const activeOrders = orders?.filter(order => ['pending', 'preparing'].includes(order.status)) || [];
  const lowStockIngredients = ingredients?.filter(ing => ing.currentStock <= ing.minStock) || [];

  const stats = [
    {
      title: 'Receita Hoje',
      value: `R$ ${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Pedidos Ativos',
      value: activeOrders.length.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Vendas Hoje',
      value: todaySales.length.toString(),
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    },
    {
      title: 'Produtos Ativos',
      value: (products?.filter(p => p.available) || []).length.toString(),
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral do seu restaurante</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Pedidos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {order.customerName || `Mesa ${order.tableNumber}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.items?.length || 0} itens - R$ {order.total.toFixed(2)}
                    </p>
                  </div>
                  <Badge
                    variant={order.status === 'pending' ? 'destructive' : 'default'}
                  >
                    {order.status === 'pending' ? 'Pendente' : 'Preparando'}
                  </Badge>
                </div>
              ))}
              {activeOrders.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhum pedido ativo</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockIngredients.slice(0, 5).map((ingredient) => (
                <div key={ingredient.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium">{ingredient.name}</p>
                    <p className="text-sm text-gray-600">
                      Estoque: {ingredient.currentStock} {ingredient.unit}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    Crítico
                  </Badge>
                </div>
              ))}
              {lowStockIngredients.length === 0 && (
                <p className="text-gray-500 text-center py-4">Estoque em níveis normais</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
