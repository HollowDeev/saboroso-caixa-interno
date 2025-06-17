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

export const CashRegisters = () => {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesByRegister, setSalesByRegister] = useState<Record<string, Sale[]>>({});
  const [expensesByRegister, setExpensesByRegister] = useState<Record<string, Expense[]>>({});

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Caixas</h1>
      </div>

      <div className="grid gap-4">
        <Accordion type="single" collapsible className="w-full">
          {cashRegisters.map((register) => (
            <AccordionItem key={register.id} value={register.id} className="bg-white rounded-lg border mb-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Valor de Abertura</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <div className="text-2xl font-bold">{formatCurrency(register.opening_amount)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Valor de Fechamento</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <div className="text-2xl font-bold">
                        {register.closing_amount ? formatCurrency(register.closing_amount) : '-'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <div className="text-2xl font-bold">{formatCurrency(register.total_sales)}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <Tabs defaultValue="sales" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="sales">Vendas</TabsTrigger>
                      <TabsTrigger value="expenses">Despesas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sales">
                      <h3 className="text-lg font-semibold mb-4">Vendas do Caixa</h3>
                      <Accordion type="single" collapsible className="w-full">
                        {salesByRegister[register.id]?.map((sale) => (
                          <AccordionItem key={sale.id} value={sale.id} className="border-b">
                            <AccordionTrigger className="py-2 hover:no-underline">
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-left">
                                <span className="text-sm">
                                  {sale.created_at && isValid(new Date(sale.created_at))
                                    ? format(new Date(sale.created_at), "HH:mm")
                                    : "Horário não disponível"} -
                                  {sale.customerName || 'Venda Direta'}
                                </span>
                                <span className="font-semibold">{formatCurrency(sale.total)}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
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
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </TabsContent>

                    <TabsContent value="expenses">
                      <h3 className="text-lg font-semibold mb-4">Despesas do Caixa</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {expensesByRegister[register.id]?.map((expense) => (
                          <Card key={expense.id} className="overflow-hidden">
                            <CardHeader className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="text-xl font-bold text-red-600">
                                  {formatCurrency(expense.amount)}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(expense.created_at), "HH:mm")}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="space-y-3">
                                <p className="text-sm line-clamp-2">{expense.description}</p>
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
                            </CardContent>
                          </Card>
                        ))}
                        {(!expensesByRegister[register.id] || expensesByRegister[register.id].length === 0) && (
                          <div className="col-span-full text-center py-8 text-gray-500">
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