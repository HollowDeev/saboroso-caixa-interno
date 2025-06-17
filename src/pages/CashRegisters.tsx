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
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SaleCard = ({ sale, isOpen, onToggle }: { sale: Sale, isOpen: boolean, onToggle: () => void }) => {
  return (
    <div className="bg-gray-50 rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-left p-4" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {sale.created_at && isValid(new Date(sale.created_at))
              ? format(new Date(sale.created_at), "HH:mm")
              : "Horário não disponível"} -
            {sale.customerName || 'Venda Direta'}
          </span>
          <Badge variant={
            sale.payment_method === 'cash' ? 'default' :
              sale.payment_method === 'card' ? 'secondary' :
                'outline'
          }>
            {sale.payment_method === 'cash' ? 'Dinheiro' :
              sale.payment_method === 'card' ? 'Cartão' :
                'Pix'}
          </Badge>
        </div>
        <span className="font-semibold">{formatCurrency(sale.total)}</span>
      </div>

      {isOpen && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {sale.items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.product_name}</span>
                <span>{formatCurrency(item.total_price || item.totalPrice)}</span>
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
      </div>

      <div className="grid gap-4">
        <Accordion type="single" collapsible className="w-full">
          {cashRegisters.map((register) => (
            <AccordionItem key={register.id} value={register.id} className="bg-white border-x-0 md:border-x md:rounded-lg mb-4 first:border-t-0 md:first:border-t last:border-b-0 md:last:border-b">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-left">
                  <div className="text-sm md:text-base font-medium">
                    {format(new Date(register.opened_at), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <Badge variant={register.is_open ? "default" : "secondary"} className="w-fit">
                    {register.is_open ? "Aberto" : "Fechado"}
                  </Badge>
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
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Vendas em Dinheiro</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          salesByRegister[register.id]?.filter(sale => sale.payment_method === 'cash')
                            .reduce((acc, sale) => acc + sale.total, 0) || 0
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {salesByRegister[register.id]?.filter(sale => sale.payment_method === 'cash').length || 0} vendas
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Vendas em Cartão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          salesByRegister[register.id]?.filter(sale => sale.payment_method === 'card')
                            .reduce((acc, sale) => acc + sale.total, 0) || 0
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {salesByRegister[register.id]?.filter(sale => sale.payment_method === 'card').length || 0} vendas
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Vendas em Pix</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          salesByRegister[register.id]?.filter(sale => sale.payment_method === 'pix')
                            .reduce((acc, sale) => acc + sale.total, 0) || 0
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {salesByRegister[register.id]?.filter(sale => sale.payment_method === 'pix').length || 0} vendas
                      </div>
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
                                  <span className="text-sm whitespace-nowrap">
                                    {sale.created_at && isValid(new Date(sale.created_at))
                                      ? format(new Date(sale.created_at), "HH:mm")
                                      : "Horário não disponível"}
                                  </span>
                                  {sale.customer_name && (
                                    <span className="text-sm text-gray-600">
                                      {sale.customer_name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                  <Badge variant={
                                    sale.payment_method === 'cash' ? 'default' :
                                      sale.payment_method === 'card' ? 'secondary' :
                                        'outline'
                                  }>
                                    {sale.payment_method === 'cash' ? 'Dinheiro' :
                                      sale.payment_method === 'card' ? 'Cartão' :
                                        'Pix'}
                                  </Badge>
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
                                      <span>{formatCurrency(item.total_price || item.totalPrice)}</span>
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
                                  <p className="text-sm text-gray-700">{expense.reason}</p>
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