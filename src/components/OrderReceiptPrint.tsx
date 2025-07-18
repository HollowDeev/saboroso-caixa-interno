import { Order } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderReceiptPrintProps {
  order: Order;
}

export const OrderReceiptPrint = ({ order }: OrderReceiptPrintProps) => {
  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const total = typeof order.total === 'number' ? order.total : 0;
  const createdAt = order.created_at || new Date().toISOString();
  const customerName = order.customer_name || 'Não informado';
  const tableNumber = order.table_number !== undefined && order.table_number !== null ? order.table_number : 'S/N';

  // Função para criar linha centralizada
  const centerLine = (text: string) => {
    const padding = Math.max(0, Math.floor((32 - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  // Função para criar linha com valor à direita
  const rightAlign = (text: string, value: string) => {
    const padding = Math.max(0, 32 - text.length - value.length);
    return text + ' '.repeat(padding) + value;
  };

  // Função para formatar valor monetário
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

  // Função para criar linha de produto
  const formatProductLine = (name: string, quantity: number, unitPrice: number, totalPrice: number) => {
    const qtyAndUnit = `${quantity}x ${formatCurrency(unitPrice)}`;
    const right = formatCurrency(totalPrice);
    const maxNameLength = 30;
    let trimmedName = name;
    if (trimmedName.length > maxNameLength) {
      trimmedName = trimmedName.slice(0, maxNameLength - 1) + '…';
    }
    return `${trimmedName}\n  - ${qtyAndUnit} \n  - Total: ${right}\n`;
  };

  const divider = '-'.repeat(32);

  return (
    <pre style={{
      margin: 0,
      padding: '0 5mm',
      fontSize: '14px',
      fontFamily: 'monospace',
      whiteSpace: 'pre',
      width: '80mm',
      background: 'white'
    }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          pre {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            margin: 0;
            size: 58mm auto;
          }
        }
      `}</style>
      {centerLine('VARANDA')}
      {'\n'}
      {centerLine(format(new Date(createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }))}
      {'\n'}
      {divider}
      {'\n'}
      Cliente: {customerName}
      {'\n'}
      Mesa: {tableNumber}
      {'\n'}
      {divider}
      {'\n'}
      {items.map((item, idx) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const totalPrice = Number(item.totalPrice) || 0;
        const productName = item.product_name || 'Produto não identificado';
        return formatProductLine(productName, quantity, unitPrice, totalPrice) + (idx < items.length - 1 ? '\n' : '');
      }).join('')}
      {'\n'}
      {divider}
      {'\n'}
      {rightAlign('Subtotal:', formatCurrency(order.subtotal))}
      {'\n'}
      {rightAlign('Taxa:', formatCurrency(order.tax))}
      {'\n'}
      {rightAlign('TOTAL:', formatCurrency(total))}
      {'\n'}
      {divider}
      {'\n'}
      {centerLine('Obrigado pela preferência!')}
      {'\n'}
      {centerLine('Volte sempre!')}
    </pre>
  );
}; 