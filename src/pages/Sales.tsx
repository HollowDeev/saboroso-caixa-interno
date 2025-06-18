import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, CreditCard, DollarSign, BarChart3, Plus, Trash2, Edit, ChevronDown, CheckCircle, Printer, TrendingDown, FileDown, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
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
import { Sale, OrderItem, PaymentMethod, Expense, ExpenseType, AppContextType } from "@/types/index";
import { ReceiptPrint } from "@/components/ReceiptPrint";
import { ExpenseModal } from '@/components/ExpenseModal';
import { DatePicker } from '@/components/DatePicker';
import { Dialog } from '@/components/ui/dialog';
import { Database } from '@/integrations/supabase/types';

type SaleItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_type: string;
};

type SaleFromDB = Database['public']['Tables']['sales']['Row'] & {
  items: SaleItem[] | null;
  payments: Array<{ method: PaymentMethod; amount: number }> | null;
};

interface ApiError {
  message: string;
}

export const Sales = () => {
  const context = useAppContext();
  const {
    currentUser,
    sales,
    expenses,
    currentCashRegister,
    checkCashRegisterAccess,
    isLoading,
    openCashRegister,
    closeCashRegister,
    deleteSale,
    deleteExpense
  } = context;

  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isOpenCashRegisterModalOpen, setIsOpenCashRegisterModalOpen] = useState(false);
  const [isCloseCashRegisterModalOpen, setIsCloseCashRegisterModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const isOwner = checkCashRegisterAccess();

  // Filtra vendas e despesas do caixa atual
  const currentSales = useMemo(() =>
    sales.filter(sale => sale.cash_register_id === currentCashRegister?.id),
    [sales, currentCashRegister]
  );

  const currentExpenses = useMemo(() =>
    expenses.filter(expense => expense.cash_register_id === currentCashRegister?.id),
    [expenses, currentCashRegister]
  );

  // Calcula totais
  const totalSales = useMemo(() =>
    currentSales.reduce((sum, sale) => sum + sale.total, 0),
    [currentSales]
  );

  const totalCashSales = useMemo(() =>
    currentSales.reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'cash')?.amount || 0), 0),
    [currentSales]
  );

  const totalCardSales = useMemo(() =>
    currentSales.reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'card')?.amount || 0), 0),
    [currentSales]
  );

  const totalPixSales = useMemo(() =>
    currentSales.reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'pix')?.amount || 0), 0),
    [currentSales]
  );

  const totalExpenses = useMemo(() =>
    currentExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [currentExpenses]
  );

  const totalProfit = useMemo(() =>
    totalSales - totalExpenses,
    [totalSales, totalExpenses]
  );

  useEffect(() => {
    if (saleToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setSaleToPrint(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [saleToPrint]);

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
      ...currentSales.map(sale => [
        format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        sale.customer_name || 'Cliente não informado',
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
    link.setAttribute('download', `vendas_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyDataToClipboard = () => {
    if (!currentCashRegister) return;

    const salesText = currentSales.map(sale => {
      const items = sale.items.map(item => `${item.quantity}x ${item.product_name}`).join(', ');
      return `> ${sale.customer_name || 'Cliente não informado'} - ${items} - R$ ${sale.total.toFixed(2)}`;
    }).join('\n');

    const text = `*CAIXA*\n` +
      ` - *Lucro Total:* R$ ${totalProfit.toFixed(2)}\n` +
      ` - Despesa Total: R$ ${totalExpenses.toFixed(2)}\n\n` +
      `*PAGAMENTOS*\n` +
      ` - Dinheiro: R$ ${totalCashSales.toFixed(2)}\n` +
      ` - Cartão: R$ ${totalCardSales.toFixed(2)}\n` +
      ` - Pix: R$ ${totalPixSales.toFixed(2)}\n\n` +
      `*VENDAS*\n\n${salesText}`;

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Sucesso",
        description: "Dados copiados para a área de transferência!",
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar os dados.",
        variant: "destructive"
      });
    });
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
      toast({
        title: "Venda excluída",
        description: "Venda excluída com sucesso!"
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast({
        title: "Erro ao excluir venda",
        description: apiError.message || "Não foi possível excluir a venda.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    try {
      await deleteExpense(expense.id);
      toast({
        title: "Despesa excluída",
        description: "Despesa excluída com sucesso!"
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast({
        title: "Erro ao excluir despesa",
        description: apiError.message || "Não foi possível excluir a despesa.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Financeiro</h1>
          {currentCashRegister && (
            <p className="text-sm text-muted-foreground">
              Caixa aberto em {format(new Date(currentCashRegister.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
          {isOwner && !currentCashRegister && (
            <Button onClick={() => setIsOpenCashRegisterModalOpen(true)}>
              Abrir Caixa
            </Button>
          )}
          {isOwner && currentCashRegister && (
            <Button onClick={() => setIsCloseCashRegisterModalOpen(true)} variant="destructive">
              Fechar Caixa
            </Button>
          )}
          <Button
            onClick={() => setIsDirectSaleOpen(true)}
            className="bg-green-500 hover:bg-green-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Venda
          </Button>
          <Button
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportSales}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyDataToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Dados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Primeira linha: Total de vendas, Despesas e Lucro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Vendas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {currentSales.length} {currentSales.length === 1 ? 'venda' : 'vendas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">R$ {totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {currentExpenses.length} {currentExpenses.length === 1 ? 'despesa' : 'despesas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro</CardTitle>
            <TrendingDown className={cn("h-4 w-4", totalProfit >= 0 ? "text-green-500" : "text-red-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalProfit >= 0 ? "text-green-500" : "text-red-500")}>
              R$ {totalProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentExpenses.length} {currentExpenses.length === 1 ? 'despesa' : 'despesas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha: Métodos de pagamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dinheiro</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">R$ {totalCashSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {currentSales.filter(s => s.payments.some(p => p.method === 'cash')).length} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cartão</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">R$ {totalCardSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {currentSales.filter(s => s.payments.some(p => p.method === 'card')).length} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PIX</CardTitle>
            <svg className="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.5 4V7M14.5 4V7M4 11.5H7M4 16.5H7M11.5 20H7C5.34315 20 4 18.6569 4 17V7C4 5.34315 5.34315 4 7 4H17C18.6569 4 20 5.34315 20 7V11.5M20 20L15 15M15 20L20 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">R$ {totalPixSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {currentSales.filter(s => s.payments.some(p => p.method === 'pix')).length} pagamentos
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <h2 className="text-xl font-bold">Histórico de Vendas</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {currentSales.map((sale) => (
              <AccordionItem key={sale.id} value={sale.id} className="border rounded-lg px-4">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <span className="font-bold">R$ {sale.total.toFixed(2)}</span>
                      <span>{sale.customer_name || 'Cliente não informado'}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSaleToPrint(sale);
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSale(sale);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSaleToDelete(sale);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {sale.payments.map((payment, index) => (
                        <Badge key={index} variant="secondary" className={cn("text-white", getPaymentMethodColor(payment.method))}>
                          {getPaymentMethodLabel(payment.method)} (R$ {payment.amount.toFixed(2)})
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {sale.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span>{item.quantity}x</span>
                            <span>{item.product_name}</span>
                          </div>
                          <span>R$ {Number(item.total_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>R$ {Number(sale.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Serviço:</span>
                        <span>R$ {Number(sale.tax).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>R$ {Number(sale.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
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
                {currentExpenses.map((expense) => (
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
        </TabsContent>
      </Tabs>

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
        <div id="print-content">
          <ReceiptPrint sale={saleToPrint} />
        </div>
      )}
    </div>
  );
};
