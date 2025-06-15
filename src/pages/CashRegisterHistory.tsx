
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { CashRegister } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, DollarSign, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SaleData {
  id: string;
  total: number;
  payment_method: string;
  customer_name?: string;
  created_at: string;
}

interface CashRegisterWithSales extends CashRegister {
  sales: SaleData[];
  profit: number;
}

export const CashRegisterHistory = () => {
  const [cashRegisters, setCashRegisters] = useState<CashRegisterWithSales[]>([]);
  const [selectedCashRegister, setSelectedCashRegister] = useState<CashRegisterWithSales | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCashRegisters();
  }, []);

  const loadCashRegisters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar todos os caixas fechados do usuário
      const { data: registers, error: registersError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_open', false)
        .order('closed_at', { ascending: false });

      if (registersError) throw registersError;

      if (!registers) {
        setCashRegisters([]);
        return;
      }

      // Para cada caixa, buscar as vendas correspondentes
      const registersWithSales = await Promise.all(
        registers.map(async (register) => {
          const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('id, total, payment_method, customer_name, created_at')
            .eq('cash_register_id', register.id)
            .order('created_at', { ascending: false });

          if (salesError) throw salesError;

          const salesData: SaleData[] = (sales || []).map(sale => ({
            id: sale.id,
            total: sale.total,
            payment_method: sale.payment_method,
            customer_name: sale.customer_name,
            created_at: sale.created_at
          }));

          const profit = register.total_sales - register.total_cost - register.total_expenses;

          return {
            ...register,
            sales: salesData,
            profit
          };
        })
      );

      setCashRegisters(registersWithSales);
    } catch (error) {
      console.error('Erro ao carregar histórico de caixas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const groupSalesByDate = (sales: SaleData[]) => {
    const grouped = sales.reduce((acc, sale) => {
      const date = format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: ptBR });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(sale);
      return acc;
    }, {} as Record<string, SaleData[]>);

    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando histórico de caixas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Histórico de Caixas</h1>
      </div>

      {cashRegisters.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              Nenhum caixa fechado encontrado
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashRegisters.map((register) => (
            <Card 
              key={register.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedCashRegister(register)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">Caixa</span>
                  <Badge variant={register.profit >= 0 ? "default" : "destructive"}>
                    {register.profit >= 0 ? "Lucro" : "Prejuízo"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <div>
                      <div>Aberto: {formatDate(register.opened_at)}</div>
                      <div>Fechado: {register.closed_at ? formatDate(register.closed_at) : 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="font-semibold">
                      Lucro: {formatCurrency(register.profit)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    <span>{register.total_orders} pedidos</span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Vendas: {formatCurrency(register.total_sales)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de detalhes do caixa */}
      <Dialog open={!!selectedCashRegister} onOpenChange={() => setSelectedCashRegister(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Caixa</DialogTitle>
          </DialogHeader>
          
          {selectedCashRegister && (
            <div className="space-y-6">
              {/* Informações gerais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Abertura</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(selectedCashRegister.opening_amount)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Fechamento</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(selectedCashRegister.closing_amount || 0)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Total Vendas</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(selectedCashRegister.total_sales)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Lucro Total</div>
                    <div className={`text-lg font-semibold ${selectedCashRegister.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedCashRegister.profit)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vendas por dia */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Vendas por Dia</h3>
                
                {selectedCashRegister.sales.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Nenhuma venda registrada neste caixa
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {groupSalesByDate(selectedCashRegister.sales).map(([date, sales]) => {
                      const dayTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
                      
                      return (
                        <AccordionItem key={date} value={date}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex justify-between items-center w-full mr-4">
                              <span>{date}</span>
                              <div className="flex gap-4 text-sm">
                                <span>{sales.length} vendas</span>
                                <span className="font-semibold">{formatCurrency(dayTotal)}</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Horário</TableHead>
                                  <TableHead>Cliente</TableHead>
                                  <TableHead>Pagamento</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sales.map((sale) => (
                                  <TableRow key={sale.id}>
                                    <TableCell>
                                      {format(new Date(sale.created_at), 'HH:mm', { locale: ptBR })}
                                    </TableCell>
                                    <TableCell>
                                      {sale.customer_name || 'Cliente não informado'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {sale.payment_method === 'cash' ? 'Dinheiro' :
                                         sale.payment_method === 'card' ? 'Cartão' : 'PIX'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {formatCurrency(sale.total)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
