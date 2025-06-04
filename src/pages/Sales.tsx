import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, ShoppingCart, Calendar, Edit, Trash2, Plus, CreditCard } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DirectSaleModal } from '@/components/DirectSaleModal';
import { EditSaleModal } from '@/components/EditSaleModal';
import { OpenCashRegisterModal } from '@/components/OpenCashRegisterModal';
import { CloseCashRegisterModal } from '@/components/CloseCashRegisterModal';
import { NoCashRegisterModal } from '@/components/NoCashRegisterModal';
import { Sale, CashRegister, CashRegisterSale } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export const Sales = () => {
  const { 
    sales, 
    orders, 
    setSales, 
    currentCashRegister, 
    openCashRegister, 
    closeCashRegister, 
    checkCashRegisterAccess 
  } = useApp();
  
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [isNoCashModalOpen, setIsNoCashModalOpen] = useState(false);
  const [cashHistory, setCashHistory] = useState<CashRegister[]>([]);
  const [cashRegisterSales, setCashRegisterSales] = useState<CashRegisterSale[]>([]);

  const isOwner = checkCashRegisterAccess();

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

  const handleDirectSale = () => {
    if (!currentCashRegister) {
      setIsNoCashModalOpen(true);
      return;
    }
    setIsDirectSaleOpen(true);
  };

  const loadCashHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .order('opened_at', { ascending: false });

      if (error) throw error;
      setCashHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de caixas:', error);
    }
  };

  const loadCashRegisterSales = async (cashRegisterId: string) => {
    try {
      const { data, error } = await supabase
        .from('cash_register_sales')
        .select('*')
        .eq('cash_register_id', cashRegisterId)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setCashRegisterSales(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendas do caixa:', error);
    }
  };

  useEffect(() => {
    loadCashHistory();
  }, [currentCashRegister]);

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
  const paymentStats = getPaymentMethodStats();

  const getOrderForSale = (orderId: string) => {
    return orders.find(order => order.id === orderId);
  };

  const deleteSale = (saleId: string) => {
    setSales(prev => prev.filter(sale => sale.id !== saleId));
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
          <p className="text-gray-600">Análise, histórico de vendas e gerenciamento de caixa</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={handleDirectSale}
            className="bg-green-500 hover:bg-green-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Venda Direta
          </Button>
          
          {isOwner && (
            <>
              {!currentCashRegister ? (
                <Button 
                  onClick={() => setIsOpenCashModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Abrir Caixa
                </Button>
              ) : (
                <Button 
                  onClick={() => setIsCloseCashModalOpen(true)}
                  variant="destructive"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Fechar Caixa
                </Button>
              )}
            </>
          )}
          
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
      </div>

      {/* Status do Caixa */}
      {currentCashRegister && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-600">Caixa Aberto</h3>
                <p className="text-sm text-gray-600">
                  Aberto em: {new Date(currentCashRegister.opened_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  Valor inicial: R$ {currentCashRegister.opening_amount.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">R$ {currentCashRegister.total_sales.toFixed(2)}</p>
                <p className="text-sm text-gray-600">{currentCashRegister.total_orders} vendas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Vendas Atuais</TabsTrigger>
          <TabsTrigger value="history">Histórico de Caixas</TabsTrigger>
          <TabsTrigger value="analysis">Análise Detalhada</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Cliente/Mesa</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ações</TableHead>
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
                          {order?.customerName || `Mesa ${order?.tableNumber}` || 'Venda Direta'}
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
                        <TableCell>
                          <Badge variant={order ? "default" : "secondary"}>
                            {order ? 'Comanda' : 'Direta'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingSale(sale)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSale(sale.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
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

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Caixas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cashHistory.map((cashRegister) => (
                  <div key={cashRegister.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={cashRegister.is_open ? "default" : "secondary"}>
                            {cashRegister.is_open ? 'Aberto' : 'Fechado'}
                          </Badge>
                          <span className="font-medium">
                            {new Date(cashRegister.opened_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(cashRegister.opened_at).toLocaleTimeString()} - {' '}
                          {cashRegister.closed_at ? new Date(cashRegister.closed_at).toLocaleTimeString() : 'Em andamento'}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => loadCashRegisterSales(cashRegister.id)}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Valor Inicial</p>
                        <p className="font-semibold">R$ {cashRegister.opening_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Vendas</p>
                        <p className="font-semibold">R$ {cashRegister.total_sales.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Nº Pedidos</p>
                        <p className="font-semibold">{cashRegister.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Valor Final</p>
                        <p className="font-semibold">
                          {cashRegister.closing_amount ? 
                            `R$ ${cashRegister.closing_amount.toFixed(2)}` : 
                            '--'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
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

      {/* Modals */}
      <DirectSaleModal 
        isOpen={isDirectSaleOpen}
        onClose={() => setIsDirectSaleOpen(false)}
      />

      <EditSaleModal 
        sale={editingSale}
        onClose={() => setEditingSale(null)}
      />

      <OpenCashRegisterModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        onConfirm={openCashRegister}
      />

      <CloseCashRegisterModal
        isOpen={isCloseCashModalOpen}
        onClose={() => setIsCloseCashModalOpen(false)}
        onConfirm={closeCashRegister}
        cashRegister={currentCashRegister}
      />

      <NoCashRegisterModal
        isOpen={isNoCashModalOpen}
        onClose={() => setIsNoCashModalOpen(false)}
        isOwner={isOwner}
        onOpenCashRegister={() => {
          setIsNoCashModalOpen(false);
          setIsOpenCashModalOpen(true);
        }}
      />
    </div>
  );
};
