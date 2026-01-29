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

  // DEBUG: Log para verificar os dados da venda
  console.log('ReceiptPrint - sale received:', JSON.stringify(sale, null, 2));

  const items = Array.isArray(sale.items) ? sale.items : [];
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const total = typeof sale.total === 'number' ? sale.total : 0;
  const createdAt = sale.createdAt || new Date().toISOString();
  const customerName = sale.customer_name || 'Não informado';

  // DEBUG: Verificar items processados
  console.log('ReceiptPrint - items count:', items.length, 'items:', items);

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

  // Função para criar linha divisória
  const divider = '-'.repeat(32);

  // Calcular desconto: usar total_discount se disponível, senão calcular da diferença (subtotal - taxa) - total
  // Note: total já inclui taxa, então desconto = subtotal + taxa - total
  const calculatedDiscount = (sale.subtotal || 0) + (sale.tax || 0) - total;
  const totalDiscount = sale.total_discount || (calculatedDiscount > 0 ? calculatedDiscount : 0);

  console.log('ReceiptPrint - discount calculation:', {
    sale_total_discount: sale.total_discount,
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: total,
    calculatedDiscount: calculatedDiscount,
    finalDiscount: totalDiscount
  });

  // Função para renderizar item com desconto em negrito
  const renderItem = (item: typeof items[0], idx: number) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const totalPrice = Number(item.total_price) || 0;
    const productName = item.product_name || 'Produto não identificado';
    const originalPrice = item.original_price;
    const discountValue = item.discount_value;
    
    const maxNameLength = 30;
    let trimmedName = productName;
    if (trimmedName.length > maxNameLength) {
      trimmedName = trimmedName.slice(0, maxNameLength - 1) + '…';
    }
    
    const qtyAndUnit = `${quantity}x ${formatCurrency(unitPrice)}`;
    const hasDiscount = originalPrice && discountValue && discountValue > 0;

    return (
      <span key={idx}>
        {trimmedName}{'\n'}
        {'  - '}{qtyAndUnit}{'\n'}
        {'  - Total: '}{formatCurrency(totalPrice)}{'\n'}
        {hasDiscount && (
          <>
            {'  - Preço original: '}{formatCurrency(originalPrice)}{'\n'}
            <span style={{ fontWeight: 'bold' }}>{'  >>> DESCONTO: -'}{formatCurrency(discountValue * quantity)}{' <<<'}</span>{'\n'}
          </>
        )}
        {idx < items.length - 1 && '\n'}
      </span>
    );
  };

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
          #print-content,
          #print-content * {
            visibility: visible !important;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
          }
          pre, pre * {
            visibility: visible !important;
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
      {items.length > 0 ? (
        items.map((item, idx) => renderItem(item, idx))
      ) : (
        <span>{'(Nenhum item encontrado)'}{'\n'}</span>
      )}
      {'\n'}
      {divider}
      {'\n'}
      {rightAlign('Subtotal:', formatCurrency(sale.subtotal || 0))}
      {'\n'}
      {totalDiscount > 0 && (
        <>
          <span style={{ fontWeight: 'bold' }}>{rightAlign('DESCONTO:', '-' + formatCurrency(totalDiscount))}</span>
          {'\n'}
        </>
      )}
      {rightAlign('Taxa:', formatCurrency(sale.tax || 0))}
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