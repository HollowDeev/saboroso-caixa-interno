import { CashRegister, Sale, Expense } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCashRegisterReport = (
  register: CashRegister,
  sales: Sale[],
  expenses: Expense[]
): string => {
  const vendas = sales.reduce((acc, sale) => acc + sale.total, 0) || 0;
  const despesasTotal = expenses.reduce((acc, exp) => acc + exp.amount, 0) || 0;

  const vendasText = sales.map(sale => {
    const items = sale.items ? sale.items.map(item => `${item.quantity}x ${item.product_name}`).join(', ') : '';
    return `> ${sale.customer_name || 'Cliente não informado'} - ${items} - R$ ${sale.total?.toFixed(2) ?? ''}`;
  }).join('\n');

  const expensesList = expenses.length > 0
    ? '\n*DESPESAS*\nData | Descrição | Tipo | Valor | Motivo\n' +
      expenses.map(expense => [
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
    `Total de Despesas: R$ ${despesasTotal.toFixed(2)}`,
    '',
    '*VENDAS*',
    vendasText || 'Nenhuma venda registrada.',
    expensesList
  ].join('\n');
};

export const sendReportToWhatsApp = (report: string, phoneNumber: string = '5519995799224') => {
  const encodedMessage = encodeURIComponent(report);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};
