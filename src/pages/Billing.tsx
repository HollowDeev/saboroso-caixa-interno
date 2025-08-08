import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { CashRegister } from '@/types';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, isSameDay, addDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

type WeekOption = {
  key: string;
  start: Date;
  end: Date;
  label: string; // "01 a 07 - Agosto"
};

type MonthOption = {
  key: string; // yyyy-MM
  start: Date;
  end: Date;
  label: string; // "Agosto/2025"
};

function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildWeekLabel(dateInWeek: Date): WeekOption {
  const start = startOfWeek(dateInWeek, { weekStartsOn: 1 }); // monday
  const end = endOfWeek(dateInWeek, { weekStartsOn: 1 });
  const label = `${format(start, 'dd', { locale: ptBR })} a ${format(end, 'dd', { locale: ptBR })} - ${format(end, 'LLLL', { locale: ptBR })}`;
  return { key: `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`, start, end, label };
}

function buildMonthLabel(dateInMonth: Date): MonthOption {
  const start = startOfMonth(dateInMonth);
  const end = endOfMonth(dateInMonth);
  const label = `${format(start, 'LLLL', { locale: ptBR })}/${format(start, 'yyyy')}`;
  return { key: format(start, 'yyyy-MM'), start, end, label };
}

async function fetchRegistersInRange(start: Date, end: Date): Promise<CashRegister[]> {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('id, opened_at, total_sales, total_expenses')
    .gte('opened_at', start.toISOString())
    .lt('opened_at', end.toISOString());

  if (error) throw error;
  return (data || []) as unknown as CashRegister[];
}

export const Billing: React.FC = () => {
  const { currentUser } = useAppContext();

  // Última semana completa (segunda a domingo) já finalizada
  const lastCompletedWeek = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const lastWeekEnd = addDays(currentWeekStart, -1); // domingo anterior
    return buildWeekLabel(lastWeekEnd);
  }, []);

  // Último mês completo
  const lastCompletedMonth = useMemo(() => buildMonthLabel(subMonths(new Date(), 1)), []);

  // Opções de semanas (últimas 12 semanas encerradas)
  const weekOptions = useMemo<WeekOption[]>(() => {
    const options: WeekOption[] = [];
    let cursor = lastCompletedWeek.end;
    for (let i = 0; i < 12; i++) {
      options.push(buildWeekLabel(cursor));
      cursor = subWeeks(cursor, 1);
    }
    return options;
  }, [lastCompletedWeek.end]);

  // Opções de meses (últimos 12 meses, incluindo o último completo)
  const monthOptions = useMemo<MonthOption[]>(() => {
    const options: MonthOption[] = [];
    let cursor = lastCompletedMonth.start;
    for (let i = 0; i < 12; i++) {
      options.push(buildMonthLabel(cursor));
      cursor = subMonths(cursor, 1);
    }
    return options;
  }, [lastCompletedMonth.start]);

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(lastCompletedWeek.key);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(lastCompletedMonth.key);

  const selectedWeek = weekOptions.find(w => w.key === selectedWeekKey) || lastCompletedWeek;
  const selectedMonth = monthOptions.find(m => m.key === selectedMonthKey) || lastCompletedMonth;

  const [weekRegisters, setWeekRegisters] = useState<CashRegister[]>([]);
  const [monthRegisters, setMonthRegisters] = useState<CashRegister[]>([]);
  const [lastWeekRegisters, setLastWeekRegisters] = useState<CashRegister[]>([]);
  const [lastMonthRegisters, setLastMonthRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar cartões de última semana/mês completos
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [lw, lm] = await Promise.all([
          fetchRegistersInRange(lastCompletedWeek.start, lastCompletedWeek.end),
          fetchRegistersInRange(lastCompletedMonth.start, lastCompletedMonth.end),
        ]);
        if (!active) return;
        setLastWeekRegisters(lw);
        setLastMonthRegisters(lm);
      } catch (e) {
        console.error('Erro ao carregar caixas de última semana/mês:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [lastCompletedWeek.start, lastCompletedWeek.end, lastCompletedMonth.start, lastCompletedMonth.end]);

  // Carregar dados da semana selecionada e do mês selecionado (para gráficos)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [wr, mr] = await Promise.all([
          fetchRegistersInRange(selectedWeek.start, selectedWeek.end),
          fetchRegistersInRange(selectedMonth.start, selectedMonth.end),
        ]);
        if (!active) return;
        setWeekRegisters(wr);
        setMonthRegisters(mr);
      } catch (e) {
        console.error('Erro ao carregar caixas de semana/mês selecionados:', e);
      }
    })();
    return () => { active = false; };
  }, [selectedWeek.start, selectedWeek.end, selectedMonth.start, selectedMonth.end]);

  // Agregações
  function totalsFrom(registers: CashRegister[]) {
    const totalSales = registers.reduce((sum, r) => sum + (Number(r.total_sales) || 0), 0);
    const totalExpenses = registers.reduce((sum, r) => sum + (Number(r.total_expenses) || 0), 0);
    const profit = totalSales - totalExpenses;
    return { totalSales, totalExpenses, profit };
  }

  const lastWeekTotals = useMemo(() => totalsFrom(lastWeekRegisters), [lastWeekRegisters]);
  const lastMonthTotals = useMemo(() => totalsFrom(lastMonthRegisters), [lastMonthRegisters]);

  // Dados do gráfico semanal (lucro por dia)
  const weekChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: selectedWeek.start, end: selectedWeek.end });
    return days.map(day => {
      const dayRegisters = weekRegisters.filter(r => r.opened_at && isSameDay(new Date(r.opened_at), day));
      const t = totalsFrom(dayRegisters);
      return { name: format(day, 'dd/MM', { locale: ptBR }), lucro: t.profit };
    });
  }, [weekRegisters, selectedWeek.start, selectedWeek.end]);

  // Dados do gráfico mensal (lucro por dia)
  const monthChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: selectedMonth.start, end: selectedMonth.end });
    return days.map(day => {
      const dayRegisters = monthRegisters.filter(r => r.opened_at && isSameDay(new Date(r.opened_at), day));
      const t = totalsFrom(dayRegisters);
      return { name: format(day, 'dd/MM', { locale: ptBR }), lucro: t.profit };
    });
  }, [monthRegisters, selectedMonth.start, selectedMonth.end]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Faturamento</h1>

      {/* Cards: Última semana completa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vendas (Última Semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(lastWeekTotals.totalSales)}</div>
            <div className="text-sm text-muted-foreground">{lastCompletedWeek.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Despesas (Última Semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(lastWeekTotals.totalExpenses)}</div>
            <div className="text-sm text-muted-foreground">{lastCompletedWeek.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lucro (Última Semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(lastWeekTotals.profit)}</div>
            <div className="text-sm text-muted-foreground">{lastCompletedWeek.label}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cards: Último mês completo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vendas (Último Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(lastMonthTotals.totalSales)}</div>
            <div className="text-sm text-muted-foreground">{lastCompletedMonth.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Despesas (Último Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(lastMonthTotals.totalExpenses)}</div>
            <div className="text-sm text-muted-foreground">{lastCompletedMonth.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lucro (Último Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(lastMonthTotals.profit)}</div>
            <div className="text-sm text-muted-foreground">{lastCompletedMonth.label}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico: Lucro da Semana selecionada */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lucro da Semana</CardTitle>
          <div className="w-56">
            <Select value={selectedWeekKey} onValueChange={setSelectedWeekKey}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a semana" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map(opt => (
                  <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ lucro: { label: 'Lucro', color: 'hsl(142, 71%, 45%)' } }}>
            <BarChart data={weekChartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyBRL(Number(v))} width={80} />
              <Bar dataKey="lucro" fill="var(--color-lucro)" radius={4} />
              <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [formatCurrencyBRL(value), 'Lucro']} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico: Lucro do Mês selecionado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lucro do Mês</CardTitle>
          <div className="w-56">
            <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ lucro: { label: 'Lucro', color: 'hsl(221, 83%, 53%)' } }}>
            <BarChart data={monthChartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyBRL(Number(v))} width={80} />
              <Bar dataKey="lucro" fill="var(--color-lucro)" radius={4} />
              <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [formatCurrencyBRL(value), 'Lucro']} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};


