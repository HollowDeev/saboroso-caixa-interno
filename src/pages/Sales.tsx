import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, CreditCard, DollarSign, BarChart3, Plus, Trash2, Edit, ChevronDown, CheckCircle, Printer, TrendingDown, FileDown } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sale, OrderItem, PaymentMethod, Expense, ExpenseType } from "@/types";
import { ReceiptPrint } from "@/components/ReceiptPrint";
import { ExpenseModal } from '@/components/ExpenseModal';
import { DatePicker } from '@/components/DatePicker';
import { Dialog } from '@/components/ui/dialog';

export const Sales = () => {
  const {
    sales,
    expenses,
    currentCashRegister,
    checkCashRegisterAccess,
    isLoading,
    openCashRegister,
    closeCashRegister,
    deleteSale,
    deleteExpense
  } = useApp();

  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [cashRegisterSales, setCashRegisterSales] = useState<Sale[]>([]);
  const [isOpenCashRegisterModalOpen, setIsOpenCashRegisterModalOpen] = useState(false);
  const [isCloseCashRegisterModalOpen, setIsCloseCashRegisterModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

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
          id: sale.id,
          items: Array.isArray(sale.items) ? (sale.items as unknown as OrderItem[]) : [],
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          payments: Array.isArray(sale.payments) ? (sale.payments as Array<{ method: PaymentMethod; amount: number }>) : [],
          customerName: sale.customer_name,
          userId: sale.user_id,
          cash_register_id: sale.cash_register_id,
          order_id: sale.order_id,
          is_direct_sale: sale.is_direct_sale,
          createdAt: sale.created_at
        }));

        setCashRegisterSales(salesWithMappedData);
      } catch (error) {
        console.error('Erro ao carregar vendas do caixa:', error);
      }
    };

    loadCashRegisterSales();
  }, [currentCashRegister]);

  useEffect(() => {
    if (saleToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setSaleToPrint(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [saleToPrint]);

  const filteredSales = sales.filter(sale => {
    if (!dateFilter) return true;
    const saleDate = new Date(sale.createdAt);
    return saleDate.toDateString() === dateFilter.toDateString();
  });

  const filteredExpenses = expenses.filter(expense => {
    if (!dateFilter) return true;
    const expenseDate = new Date(expense.created_at);
    return expenseDate.toDateString() === dateFilter.toDateString();
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalCashSales = filteredSales
    .reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'cash')?.amount || 0), 0);
  const totalCardSales = filteredSales
    .reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'card')?.amount || 0), 0);
  const totalPixSales = filteredSales
    .reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'pix')?.amount || 0), 0);

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalProfit = totalSales - totalExpenses;

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

  const getExpenseTypeLabel = (type: string) => {
    switch (type) {
      case 'product_loss': return 'Perda de Produto';
      case 'ingredient_loss': return 'Perda de Ingrediente';
      case 'other': return 'Outras Despesas';
      default: return type;
    }
  };

  const exportSales = () => {
    const csvContent = [
      'Data,Cliente,Total,Taxa,Subtotal,Método de Pagamento,Tipo',
      ...filteredSales.map(sale => [
        format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        sale.customerName || 'Cliente não informado',
        sale.total.toFixed(2),
        sale.tax.toFixed(2),
        sale.subtotal.toFixed(2),
        sale.payments.map(p => getPaymentMethodLabel(p.method)).join(' + '),
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

  const handleDeleteSale = async (sale: Sale) => {
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

  const handleDeleteExpense = async (expense: Expense) => {
    try {
      await deleteExpense(expense.id);
      setExpenseToDelete(null);
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a despesa. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Vendas</h1>
          <div className="flex items-center gap-2">
            <DatePicker
              selected={dateFilter}
              onChange={(date) => setDateFilter(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Filtrar por data"
              className="w-40"
            />
            <Button variant="outline" onClick={() => setDateFilter(undefined)}>
              Limpar
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
          <Button onClick={() => setIsDirectSaleOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Venda Direta
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
          <Button onClick={exportSales} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total em Dinheiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalCashSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total em Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalCardSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total em PIX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalPixSales.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">R$ {totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalProfit >= 0 ? "text-green-500" : "text-red-500")}>
              R$ {totalProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Histórico de Vendas</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pagamentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{sale.customerName || 'Cliente não informado'}</TableCell>
                  <TableCell>R$ {sale.total.toFixed(2)}</TableCell>
                  <TableCell>{sale.is_direct_sale ? 'Venda Direta' : 'Comanda'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sale.payments.map((payment, index) => (
                        <Badge key={index} variant="secondary" className={cn("text-white", getPaymentMethodColor(payment.method))}>
                          {getPaymentMethodLabel(payment.method)} (R$ {payment.amount.toFixed(2)})
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSaleToPrint(sale)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSale(sale)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSaleToDelete(sale)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Histórico de Despesas</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {format(new Date(expense.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{getExpenseTypeLabel(expense.type)}</TableCell>
                  <TableCell>R$ {expense.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpenseToDelete(expense)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DirectSaleModal
        isOpen={isDirectSaleOpen}
        onClose={() => setIsDirectSaleOpen(false)}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => saleToDelete && handleDeleteSale(saleToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => expenseToDelete && handleDeleteExpense(expenseToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {saleToPrint && (
        <div className="hidden">
          <ReceiptPrint sale={saleToPrint} />
        </div>
      )}
    </div>
  );
};
