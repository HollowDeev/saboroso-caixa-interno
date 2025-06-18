import { Sale } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptPrintProps {
  sale: Sale;
}

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Dinheiro';
    case 'card': return 'Cartão';
    case 'pix': return 'PIX';
    default: return method;
  }
};

export const ReceiptPrint = ({ sale }: ReceiptPrintProps) => {
  if (!sale) return null;

  const items = Array.isArray(sale.items) ? sale.items : [];
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const total = typeof sale.total === 'number' ? sale.total : 0;
  const createdAt = sale.createdAt || new Date().toISOString();
  const customerName = sale.customer_name || 'Não informado';

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
    const lines = [];
    // Nome do produto
    lines.push(name);
    // Quantidade e valores alinhados à direita
    const qtyAndPrices = `${quantity}x ${formatCurrency(unitPrice)}`;
    const total = formatCurrency(totalPrice);
    lines.push(rightAlign(qtyAndPrices, total));
    return lines.join('\n');
  };

  // Função para criar linha divisória
  const divider = '-'.repeat(32);

  return (
    <pre style={{
      margin: 0,
      padding: '0 5mm',
      fontSize: '10px',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      width: '58mm',
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
      {divider}
      {'\n'}
      {items.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const totalPrice = Number(item.total_price) || 0;
        const productName = item.product_name || 'Produto não identificado';

        return formatProductLine(productName, quantity, unitPrice, totalPrice) + '\n';
      }).join('\n')}
      {divider}
      {'\n'}
      {rightAlign('Subtotal:', formatCurrency(sale.subtotal))}
      {'\n'}
      {rightAlign('Taxa:', formatCurrency(sale.tax))}
      {'\n'}
      {rightAlign('TOTAL:', formatCurrency(total))}
      {'\n'}
      {divider}
      {'\n'}
      {centerLine('PAGAMENTOS')}
      {'\n'}
      {payments.map((payment) => {
        const amount = Number(payment.amount) || 0;
        const method = payment.method || 'Não especificado';
        return rightAlign(getPaymentMethodLabel(method) + ':', formatCurrency(amount)) + '\n';
      }).join('')}
      {divider}
      {'\n'}
      {centerLine('Obrigado pela preferencia!')}
      {'\n'}
      {centerLine('Volte sempre!')}
    </pre>
  );
}; 