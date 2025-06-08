import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, CreditCard, DollarSign, BarChart3, Plus, Trash2, Edit, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { DirectSaleModal } from '@/components/DirectSaleModal';
import { EditSaleModal } from '@/components/EditSaleModal';
import { supabase } from '@/integrations/supabase/client';
import { OpenCashRegisterModal } from '@/components/OpenCashRegisterModal';
import { CloseCashRegisterModal } from '@/components/CloseCashRegisterModal';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Sales = () => {
  const {
    sales,
    currentCashRegister,
    checkCashRegisterAccess,
    isLoading,
    openCashRegister,
    closeCashRegister,
    deleteSale
  } = useApp();

  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [cashRegisterSales, setCashRegisterSales] = useState<any[]>([]);
  const [isOpenCashRegisterModalOpen, setIsOpenCashRegisterModalOpen] = useState(false);
  const [isCloseCashRegisterModalOpen, setIsCloseCashRegisterModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any | null>(null);

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

  const handleOpenCashRegister = async (amount: number) => {
    try {
      await openCashRegister(amount);
      setIsOpenCashRegisterModalOpen(false);
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
    }
  };

  const handleCloseCashRegister = async (amount: number) => {
    try {
      await closeCashRegister(amount);
      setIsCloseCashRegisterModalOpen(false);
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
    }
  };

  const handleDeleteSale = async (sale: any) => {
    try {
      await deleteSale(sale.id);
      setSaleToDelete(null);
      toast({
        title: "Sucesso",
        description: "Venda excluída com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">Gerencie e acompanhe suas vendas</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isOwner && !currentCashRegister && (
            <Button
              onClick={() => setIsOpenCashRegisterModalOpen(true)}
              className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
            >
              Abrir Caixa
            </Button>
          )}
          {isOwner && currentCashRegister && (
            <Button
              onClick={() => setIsCloseCashRegisterModalOpen(true)}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              Fechar Caixa
            </Button>
          )}
          <Button
            onClick={() => setIsDirectSaleOpen(true)}
            className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-xl sm:text-2xl font-bold">R$ {totalSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Dinheiro</p>
                <p className="text-xl sm:text-2xl font-bold">R$ {totalCashSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cartão</p>
                <p className="text-xl sm:text-2xl font-bold">R$ {totalCardSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">PIX</p>
                <p className="text-xl sm:text-2xl font-bold">R$ {totalPixSales.toFixed(2)}</p>
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
            <Accordion type="single" collapsible className="space-y-4">
              {filteredSales.map((sale) => (
                <AccordionItem key={sale.id} value={sale.id} className="border rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline [&[data-state=open]>div>div:last-child>svg]:rotate-180">
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-left text-sm sm:text-base">
                            {sale.customerName || 'Cliente não identificado'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 text-left">
                            {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Badge className={cn(
                          'hidden sm:inline-flex',
                          sale.paymentMethod === 'cash' && 'bg-green-100 text-green-800',
                          sale.paymentMethod === 'card' && 'bg-blue-100 text-blue-800',
                          sale.paymentMethod === 'pix' && 'bg-purple-100 text-purple-800'
                        )}>
                          {sale.paymentMethod === 'cash' ? 'Dinheiro' :
                            sale.paymentMethod === 'card' ? 'Cartão' : 'PIX'}
                        </Badge>
                        <span className="font-bold text-sm sm:text-base whitespace-nowrap">R$ {sale.total.toFixed(2)}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 sm:px-6 pb-4 bg-gray-50">
                    <div className="space-y-4">
                      {/* Sale Items */}
                      <div className="space-y-2">
                        {sale.items?.map((item, index) => (
                          <div key={index} className="flex flex-col p-3 bg-white rounded-lg">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <span className="font-medium text-sm sm:text-base bg-gray-100 px-2 py-1 rounded">
                                  {item.quantity}x
                                </span>
                                <div>
                                  <span className="font-medium text-sm sm:text-base">{item.product_name}</span>
                                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                                    Valor unitário: R$ {item.unitPrice.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <span className="font-medium text-sm sm:text-base">R$ {item.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Sale Summary */}
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span>R$ {sale.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Taxa:</span>
                          <span>R$ {sale.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-sm sm:text-base mt-2 pt-2 border-t">
                          <span>Total:</span>
                          <span>R$ {sale.total.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingSale(sale);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setSaleToDelete(sale);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
          onClose={() => setEditingSale(null)}
        />
      )}

      <OpenCashRegisterModal
        isOpen={isOpenCashRegisterModalOpen}
        onClose={() => setIsOpenCashRegisterModalOpen(false)}
        onConfirm={handleOpenCashRegister}
      />

      <CloseCashRegisterModal
        isOpen={isCloseCashRegisterModalOpen}
        onClose={() => setIsCloseCashRegisterModalOpen(false)}
        onConfirm={handleCloseCashRegister}
        cashRegister={currentCashRegister}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => saleToDelete && handleDeleteSale(saleToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
