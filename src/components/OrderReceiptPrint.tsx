import { Order, Product, ExternalProduct } from '@/types';
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

  const divider = '-'.repeat(32);

  // Usar o total_discount da comanda (inclui descontos manuais + descontos de itens)
  const totalDiscount = order.total_discount || 0;

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
          #print-content-order {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          pre {
            visibility: visible !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 5mm !important;
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
        const originalPrice = item.originalPrice;
        const discountValue = item.discountValue;
        return formatProductLine(productName, quantity, unitPrice, totalPrice, originalPrice, discountValue) + (idx < items.length - 1 ? '\n' : '');
      }).join('')}
      {'\n'}
      {divider}
      {'\n'}
      {rightAlign('Subtotal:', formatCurrency(order.subtotal))}
      {'\n'}
      {totalDiscount > 0 && rightAlign('Total de descontos:', formatCurrency(totalDiscount))}
      {totalDiscount > 0 && '\n'}
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