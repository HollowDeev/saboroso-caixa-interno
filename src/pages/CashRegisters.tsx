import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { CashRegister, Sale, Expense } from '@/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/dataFormatters';
import { Loader2, FileDown, Copy, ChevronDown, ShoppingCart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SaleCard = ({ sale, isOpen, onToggle }: { sale: Sale, isOpen: boolean, onToggle: () => void }) => {
  return (
    <div className="bg-gray-50 rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-left p-4" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {sale.createdAt && isValid(new Date(sale.createdAt))
              ? format(new Date(sale.createdAt), "HH:mm")
              : "Horário não disponível"} -
            {sale.customer_name || 'Venda Direta'}
          </span>
        </div>
        <span className="font-semibold">{formatCurrency(sale.total)}</span>
      </div>

      {isOpen && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {sale.items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.product_name}</span>
                <span>{formatCurrency(item.total_price)}</span>
              </div>
            ))}
            <div className="pt-2 border-t mt-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxa de Serviço:</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CashRegisters = () => {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [salesByRegister, setSalesByRegister] = useState<Record<string, Sale[]>>({});
  const [expensesByRegister, setExpensesByRegister] = useState<Record<string, Expense[]>>({});
  const [openSales, setOpenSales] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCashRegisters = async () => {
      try {
        const { data: registers, error } = await supabase
          .from('cash_registers')
          .select('*')
          .order('opened_at', { ascending: false });

        if (error) throw error;
        setCashRegisters(registers);

        // Carregar vendas e despesas para cada caixa
        const salesData: Record<string, Sale[]> = {};
        const expensesData: Record<string, Expense[]> = {};

        for (const register of registers) {
          // Carregar vendas
          const { data: sales } = await supabase
            .from('sales')
            .select('*')
            .eq('cash_register_id', register.id)
            .order('created_at', { ascending: false });

          salesData[register.id] = sales || [];

          // Carregar despesas
          const { data: expenses } = await supabase
            .from('expenses')
            .select('*')
            .eq('cash_register_id', register.id)
            .order('created_at', { ascending: false });

          expensesData[register.id] = expenses || [];
        }

        setSalesByRegister(salesData);
        setExpensesByRegister(expensesData);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    loadCashRegisters();
  }, []);

  const toggleSale = (saleId: string) => {
    setOpenSales(openSales.includes(saleId)
      ? openSales.filter(id => id !== saleId)
      : [...openSales, saleId]
    );
  };

  const filteredSales = (sales: Sale[] | undefined) => {
    if (!sales) return [];
    return selectedPaymentMethod === "all"
      ? sales
      : sales.filter(sale => sale.payment_method === selectedPaymentMethod);
  };

  // Função para exportar dados dos caixas em CSV
  const exportCashRegisters = () => {
    const csvContent = [
      'Data de Abertura,Data de Fechamento,Status,Valor de Abertura,Valor de Fechamento,Total de Vendas,Total de Despesas',
      ...cashRegisters.map(register => [
        register.opened_at ? format(new Date(register.opened_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
        register.closed_at ? format(new Date(register.closed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
        register.is_open ? 'Aberto' : 'Fechado',
        register.opening_amount?.toFixed(2) ?? '',
        register.closing_amount?.toFixed(2) ?? '',
        (salesByRegister[register.id]?.reduce((acc, sale) => acc + sale.total, 0) || 0).toFixed(2),
        (expensesByRegister[register.id]?.reduce((acc, exp) => acc + exp.amount, 0) || 0).toFixed(2),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `caixas_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para copiar resumo dos caixas
  const copyCashRegistersToClipboard = () => {
    const text = cashRegisters.map(register => {
      const vendas = salesByRegister[register.id]?.reduce((acc, sale) => acc + sale.total, 0) || 0;
      const despesas = expensesByRegister[register.id]?.reduce((acc, exp) => acc + exp.amount, 0) || 0;
      // Lista detalhada de despesas
      const expensesList = expensesByRegister[register.id]?.length
        ? '\n*DESPESAS*\nData | Descrição | Tipo | Valor | Motivo\n' +
          expensesByRegister[register.id].map(expense => [
            format(new Date(expense.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
            expense.description,
            expense.type,
            `R$ ${expense.amount.toFixed(2)}`,
            (typeof expense === 'object' && expense !== null && 'reason' in expense ? (expense as unknown as { reason?: string }).reason || '-' : '-')
          ].join(' | ')).join('\n')
        : '\nNenhuma despesa registrada.';
      return [
        `Caixa (${register.is_open ? 'Aberto' : 'Fechado'})`,
        `Abertura: ${register.opened_at ? format(new Date(register.opened_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}`,
        `Fechamento: ${register.closed_at ? format(new Date(register.closed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}`,
        `Valor de Abertura: R$ ${register.opening_amount?.toFixed(2) ?? '-'}`,
        `Valor de Fechamento: R$ ${register.closing_amount?.toFixed(2) ?? '-'}`,
        `Total de Vendas: R$ ${vendas.toFixed(2)}`,
        `Total de Despesas: R$ ${despesas.toFixed(2)}`,
        expensesList,
        ''
      ].join('\n');
    }).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('Dados copiados para a área de transferência!');
    }).catch(() => {
      alert('Não foi possível copiar os dados.');
    });
  };

  // Funções auxiliares para exportação/cópia individual
  const exportSingleCashRegister = (register) => {
    const vendas = salesByRegister[register.id] || [];
    const despesas = expensesByRegister[register.id]?.reduce((acc, exp) => acc + exp.amount, 0) || 0;
    const csvHeader = 'Data de Abertura,Data de Fechamento,Status,Valor de Abertura,Valor de Fechamento,Total de Vendas,Total de Despesas';
    const caixaLine = [
      register.opened_at ? format(new Date(register.opened_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
      register.closed_at ? format(new Date(register.closed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
      register.is_open ? 'Aberto' : 'Fechado',
      register.opening_amount?.toFixed(2) ?? '',
      register.closing_amount?.toFixed(2) ?? '',
      vendas.reduce((acc, sale) => acc + sale.total, 0).toFixed(2),
      despesas.toFixed(2),
    ].join(',');
    const vendasHeader = '\n\nData,Cliente,Total,Taxa,Subtotal,Método de Pagamento,Tipo,Itens';
    const vendasLines = vendas.map(sale => [
      sale.createdAt ? format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
      sale.customer_name || 'Cliente não informado',
      sale.total?.toFixed(2) ?? '',
      sale.tax?.toFixed(2) ?? '',
      sale.subtotal?.toFixed(2) ?? '',
      sale.payments ? sale.payments.map(p => p.method).join(' + ') : '',
      sale.is_direct_sale ? 'Venda Direta' : 'Comanda',
      sale.items ? sale.items.map(item => `${item.quantity}x ${item.product_name}`).join(' | ') : ''
    ].join(',')).join('\n');
    const csvContent = [csvHeader, caixaLine, vendasHeader, vendasLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `caixa_${format(new Date(register.opened_at), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySingleCashRegisterToClipboard = (register) => {
    const vendas = salesByRegister[register.id] || [];
    const despesas = expensesByRegister[register.id]?.reduce((acc, exp) => acc + exp.amount, 0) || 0;
    const vendasText = vendas.map(sale => {
      const items = sale.items ? sale.items.map(item => `${item.quantity}x ${item.product_name}`).join(', ') : '';
      return `> ${sale.customer_name || 'Cliente não informado'} - ${items} - R$ ${sale.total?.toFixed(2) ?? ''}`;
    }).join('\n');
    // Lista detalhada de despesas
    const expensesList = expensesByRegister[register.id]?.length
      ? '\n*DESPESAS*\nData | Descrição | Tipo | Valor | Motivo\n' +
        expensesByRegister[register.id].map(expense => [
          format(new Date(expense.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          expense.description,
          expense.type,
          `R$ ${expense.amount.toFixed(2)}`,
          (typeof expense === 'object' && expense !== null && 'reason' in expense ? (expense as unknown as { reason?: string }).reason || '-' : '-')
        ].join(' | ')).join('\n')
      : '\nNenhuma despesa registrada.';
    const text = [
      `Caixa (${register.is_open ? 'Aberto' : 'Fechado'})`,
      `Abertura: ${register.opened_at ? format(new Date(register.opened_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}`,
      `Fechamento: ${register.closed_at ? format(new Date(register.closed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}`,
      `Valor de Abertura: R$ ${register.opening_amount?.toFixed(2) ?? '-'}`,
      `Valor de Fechamento: R$ ${register.closing_amount?.toFixed(2) ?? '-'}`,
      `Total de Vendas: R$ ${vendas.reduce((acc, sale) => acc + sale.total, 0).toFixed(2)}`,
      `Total de Despesas: R$ ${despesas.toFixed(2)}`,
      '',
      '*VENDAS*',
      vendasText,
      expensesList
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('Dados copiados para a área de transferência!');
    }).catch(() => {
      alert('Não foi possível copiar os dados.');
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-0 md:p-4 lg:p-6 space-y-4 md:space-y-6">
      <div className="flex justify-between items-center px-4 md:px-0">
        <h1 className="text-2xl font-bold">Caixas</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium bg-white hover:bg-gray-50">
              <FileDown className="h-4 w-4" />
              Exportar
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportCashRegisters}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyCashRegistersToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Dados
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4">
        <Accordion type="single" collapsible className="w-full">
          {cashRegisters.map((register) => (
            <AccordionItem key={register.id} value={register.id} className="bg-white border-x-0 md:border-x md:rounded-lg mb-4 first:border-t-0 md:first:border-t last:border-b-0 md:last:border-b">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-left w-full">
                  <div className="text-sm md:text-base font-medium">
                    {format(new Date(register.opened_at), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <Badge variant={register.is_open ? "default" : "secondary"} className="w-fit">
                    {register.is_open ? "Aberto" : "Fechado"}
                  </Badge>
                  {/* Botão de exportação individual do caixa */}
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-2 px-2 py-1 border rounded-md text-xs font-medium bg-white hover:bg-gray-50">
                          <FileDown className="h-4 w-4" />
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); exportSingleCashRegister(register); }}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Exportar CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); copySingleCashRegisterToClipboard(register); }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Dados
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {/* Cards com dados do caixa */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Valor de Abertura</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(register.opening_amount)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Valor de Fechamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {register.closing_amount ? formatCurrency(register.closing_amount) : '-'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(salesByRegister[register.id]?.reduce((acc, sale) => acc + sale.total, 0) || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Lucro</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(
                          (salesByRegister[register.id]?.reduce((acc, sale) => acc + sale.total, 0) || 0) -
                          (expensesByRegister[register.id]?.reduce((acc, expense) => acc + expense.amount, 0) || 0)
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cards de métodos de pagamento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Dinheiro */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Dinheiro</CardTitle>
                      <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v2M5 9h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2zm7 4v2m-4 4h8" /></svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-500">
                        {formatCurrency(
                          (salesByRegister[register.id]?.reduce((acc, sale) => acc + (sale.payments?.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0) || 0), 0)) || 0
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(salesByRegister[register.id]?.reduce((acc, sale) => acc + (sale.payments?.filter(p => p.method === 'cash').length || 0), 0)) || 0} pagamentos
                      </p>
                    </CardContent>
                  </Card>

                  {/* Cartão */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cartão</CardTitle>
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-500">
                        {formatCurrency(
                          (salesByRegister[register.id]?.reduce((acc, sale) => acc + (sale.payments?.filter(p => p.method === 'card').reduce((s, p) => s + p.amount, 0) || 0), 0)) || 0
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(salesByRegister[register.id]?.reduce((acc, sale) => acc + (sale.payments?.filter(p => p.method === 'card').length || 0), 0)) || 0} pagamentos
                      </p>
                    </CardContent>
                  </Card>

                  {/* Pix */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">PIX</CardTitle>
                      <svg className="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.5 4V7M14.5 4V7M4 11.5H7M4 16.5H7M11.5 20H7C5.34315 20 4 18.6569 4 17V7C4 5.34315 5.34315 4 7 4H17C18.6569 4 20 5.34315 20 7V11.5M20 20L15 15M15 20L20 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-500">
                        {formatCurrency(
                          (salesByRegister[register.id]?.reduce((acc, sale) => acc + (sale.payments?.filter(p => p.method === 'pix').reduce((s, p) => s + p.amount, 0) || 0), 0)) || 0
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(salesByRegister[register.id]?.reduce((acc, sale) => acc + (sale.payments?.filter(p => p.method === 'pix').length || 0), 0)) || 0} pagamentos
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs de vendas e despesas */}
                <div className="mt-6">
                  <Tabs defaultValue="sales" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 px-4 md:px-0">
                      <TabsTrigger value="sales">Vendas</TabsTrigger>
                      <TabsTrigger value="expenses">Despesas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sales" className="px-4 md:px-0">
                      <div className="flex justify-end mb-4">
                        <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Método de Pagamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="cash">Dinheiro</SelectItem>
                            <SelectItem value="card">Cartão</SelectItem>
                            <SelectItem value="pix">Pix</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        {filteredSales(salesByRegister[register.id])?.map((sale) => (
                          <div
                            key={sale.id}
                            className="bg-gray-50 rounded-lg shadow-sm"
                            onClick={() => toggleSale(sale.id)}
                          >
                            <div className="p-4">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                  {/* Prioridade: nome do cliente > horário > ícone */}
                                  {sale.customer_name ? (
                                    <span className="font-medium text-gray-900 truncate">{sale.customer_name}</span>
                                  ) : sale.createdAt && isValid(new Date(sale.createdAt)) ? (
                                    <span className="text-gray-600 text-xs">{format(new Date(sale.createdAt), 'HH:mm')}</span>
                                  ) : (
                                    <ShoppingCart className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                  <span className="font-semibold whitespace-nowrap">
                                    {formatCurrency(sale.total)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {openSales.includes(sale.id) && (
                              <div className="px-4 pb-4 border-t">
                                <div className="space-y-2 pt-2">
                                  {sale.items?.map((item, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>{item.quantity}x {item.product_name}</span>
                                      <span>{formatCurrency(item.total_price)}</span>
                                    </div>
                                  ))}
                                  <div className="pt-2 border-t mt-2">
                                    <div className="flex justify-between text-sm">
                                      <span>Subtotal:</span>
                                      <span>{formatCurrency(sale.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Taxa de Serviço:</span>
                                      <span>{formatCurrency(sale.tax)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                      <span>Total:</span>
                                      <span>{formatCurrency(sale.total)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="expenses" className="px-4 md:px-0">
                      <div className="space-y-3">
                        {expensesByRegister[register.id]?.map((expense) => (
                          <div key={expense.id} className="bg-gray-50 rounded-lg shadow-sm p-4">
                            <div className="flex justify-between items-start">
                              <div className="text-xl font-bold text-red-600">
                                {formatCurrency(expense.amount)}
                              </div>
                              <span className="text-sm text-gray-500">
                                {format(new Date(expense.created_at), "HH:mm")}
                              </span>
                            </div>
                            <div className="mt-2 space-y-2">
                              <p className="text-sm">{expense.description}</p>
                              {expense.quantity && (
                                <p className="text-sm text-gray-600">Quantidade: {expense.quantity}</p>
                              )}
                              {expense.reason && (
                                <div className="bg-gray-100 p-2 rounded-md">
                                  <p className="text-sm font-medium">Motivo:</p>
                                  <p className="text-sm text-gray-700">
                                    {(typeof expense === 'object' && expense !== null && 'reason' in expense ? (expense as unknown as { reason?: string }).reason || '-' : '-')}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {(!expensesByRegister[register.id] || expensesByRegister[register.id].length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            Nenhuma despesa registrada
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};