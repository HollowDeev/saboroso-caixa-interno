
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, CreditCard, DollarSign, BarChart3, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Sale, CashRegister, CashRegisterSale } from '@/types';
import { DirectSaleModal } from '@/components/DirectSaleModal';
import { EditSaleModal } from '@/components/EditSaleModal';
import { supabase } from '@/integrations/supabase/client';

export const Sales = () => {
  const { 
    sales, 
    currentCashRegister, 
    checkCashRegisterAccess, 
    isLoading 
  } = useApp();
  
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [cashRegisterSales, setCashRegisterSales] = useState<CashRegisterSale[]>([]);

  const isOwner = checkCashRegisterAccess();

  useEffect(() => {
    const loadCashRegisterSales = async () => {
      if (!currentCashRegister) return;

      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .eq('cash_register_id', currentCashRegister.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const salesWithMappedData = data.map(sale => ({
          ...sale,
          cash_register_id: sale.cash_register_id,
          payment_method: sale.payment_method,
          created_at: sale.created_at,
          user_id: sale.user_id,
          is_direct_sale: sale.is_direct_sale,
          customer_name: sale.customer_name,
          order_id: sale.order_id
        }));

        setCashRegisterSales(salesWithMappedData);
      } catch (error) {
        console.error('Erro ao carregar vendas do caixa:', error);
      }
    };

    loadCashRegisterSales();
  }, [currentCashRegister]);

  const filteredSales = sales.filter(sale => {
    if (!dateFilter) return true;
    const saleDate = new Date(sale.createdAt);
    return saleDate.toDateString() === dateFilter.toDateString();
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalCashSales = filteredSales
    .filter(sale => sale.paymentMethod === 'cash')
    .reduce((sum, sale) => sum + sale.total, 0);
  const totalCardSales = filteredSales
    .filter(sale => sale.paymentMethod === 'card')
    .reduce((sum, sale) => sum + sale.total, 0);
  const totalPixSales = filteredSales
    .filter(sale => sale.paymentMethod === 'pix')
    .reduce((sum, sale) => sum + sale.total, 0);

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-500';
      case 'card': return 'bg-blue-500';
      case 'pix': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const exportSales = () => {
    const csvContent = [
      'Data,Cliente,Total,Taxa,Subtotal,Método de Pagamento,Tipo',
      ...filteredSales.map(sale => [
        format(sale.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        sale.customerName || 'Cliente não informado',
        sale.total.toFixed(2),
        sale.tax.toFixed(2),
        sale.subtotal.toFixed(2),
        getPaymentMethodLabel(sale.paymentMethod),
        sale.is_direct_sale ? 'Venda Direta' : 'Comanda'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_${format(dateFilter || new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">Gerencie e acompanhe suas vendas</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsDirectSaleOpen(true)}
            className="bg-green-500 hover:bg-green-600"
            disabled={!currentCashRegister}
          >
            <Plus className="h-4 w-4 mr-2" />
            Venda Direta
          </Button>
        </div>
      </div>

      {/* Cash Register Status */}
      {currentCashRegister && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="date-filter">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Button onClick={exportSales} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">R$ {totalSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Dinheiro</p>
                <p className="text-2xl font-bold">R$ {totalCashSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cartão</p>
                <p className="text-2xl font-bold">R$ {totalCardSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">PIX</p>
                <p className="text-2xl font-bold">R$ {totalPixSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Carregando vendas...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <p>Nenhuma venda encontrada para esta data.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {sale.customerName || 'Cliente não informado'}
                      </span>
                      <Badge variant={sale.is_direct_sale ? 'default' : 'secondary'}>
                        {sale.is_direct_sale ? 'Venda Direta' : 'Comanda'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(sale.createdAt, 'HH:mm', { locale: ptBR })} - 
                      R$ {sale.total.toFixed(2)} via {getPaymentMethodLabel(sale.paymentMethod)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getPaymentMethodColor(sale.paymentMethod)}`}></div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSale(sale)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DirectSaleModal
        isOpen={isDirectSaleOpen}
        onClose={() => setIsDirectSaleOpen(false)}
      />

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
        />
      )}
    </div>
  );
};
