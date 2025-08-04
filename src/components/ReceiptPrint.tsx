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

  // Função para criar linha de produto com desconto
  const formatProductLine = (name: string, quantity: number, unitPrice: number, totalPrice: number, originalPrice?: number, discountValue?: number) => {
    const qtyAndUnit = `${quantity}x ${formatCurrency(unitPrice)}`;
    const right = formatCurrency(totalPrice);
    const maxNameLength = 30;
    let trimmedName = name;
    if (trimmedName.length > maxNameLength) {
      trimmedName = trimmedName.slice(0, maxNameLength - 1) + '…';
    }
    let line = `${trimmedName}\n  - ${qtyAndUnit} \n  - Total: ${right}`;
    
    if (originalPrice && discountValue && discountValue > 0) {
      line += `\n  - Preço original: ${formatCurrency(originalPrice)}`;
      line += `\n  (Desconto de: ${formatCurrency(discountValue)})`;
    }
    return line + '\n';
  };

  // Função para criar linha divisória
  const divider = '-'.repeat(32);

  // Calcular total de descontos usando dados persistidos nos itens
  const totalDiscount = items.reduce((sum, item) => {
    return sum + (item.discount_value && item.discount_value > 0 ? item.discount_value * (Number(item.quantity) || 1) : 0);
  }, 0);

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
      {divider}
      {'\n'}
      {items.map((item, idx) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const totalPrice = Number(item.total_price) || 0;
        const productName = item.product_name || 'Produto não identificado';
        const originalPrice = item.original_price;
        const discountValue = item.discount_value;
        return formatProductLine(productName, quantity, unitPrice, totalPrice, originalPrice, discountValue) + (idx < items.length - 1 ? '\n' : '');
      }).join('')}
      {'\n'}
      {divider}
      {'\n'}
      {rightAlign('Subtotal:', formatCurrency(sale.subtotal))}
      {'\n'}
      {totalDiscount > 0 && rightAlign('Total descontos:', formatCurrency(totalDiscount))}
      {totalDiscount > 0 && '\n'}
      {rightAlign('Taxa:', formatCurrency(sale.tax))}
      {'\n'}
      {rightAlign('TOTAL:', formatCurrency(total))}
      {'\n'}
      {divider}
      {'\n'}
      {centerLine('PAGAMENTOS')}
      {'\n'}
      {payments.map((payment, idx) => {
        const amount = Number(payment.amount) || 0;
        const method = payment.method || 'Não especificado';
        return rightAlign(getPaymentMethodLabel(method) + ':', formatCurrency(amount)) + (idx < payments.length - 1 ? '\n' : '');
      }).join('')}
      {'\n'}
      {divider}
      {'\n'}
      {centerLine('Obrigado pela preferencia!')}
      {'\n'}
      {centerLine('Volte sempre!')}
    </pre>
  );
}; 