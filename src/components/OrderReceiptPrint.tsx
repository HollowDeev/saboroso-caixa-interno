import { Order, Product, ExternalProduct } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderReceiptPrintProps {
  order: Order;
}

export const OrderReceiptPrint = ({ order }: OrderReceiptPrintProps) => {
  if (!order) return null;

  // DEBUG: Log para verificar os dados do pedido
  console.log('OrderReceiptPrint - order received:', JSON.stringify(order, null, 2));

  const items = Array.isArray(order.items) ? order.items : [];
  const total = typeof order.total === 'number' ? order.total : 0;
  const createdAt = order.created_at || new Date().toISOString();
  const customerName = order.customer_name || 'Não informado';
  const tableNumber = order.table_number !== undefined && order.table_number !== null ? order.table_number : 'S/N';

  // DEBUG: Verificar items processados
  console.log('OrderReceiptPrint - items count:', items.length, 'items:', items);

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

  const divider = '-'.repeat(32);

  // Calcular desconto: usar total_discount se disponível, senão calcular da diferença
  const calculatedDiscount = (order.subtotal || 0) + (order.tax || 0) - total;
  const totalDiscount = order.total_discount || (calculatedDiscount > 0 ? calculatedDiscount : 0);

  console.log('OrderReceiptPrint - discount calculation:', {
    order_total_discount: order.total_discount,
    subtotal: order.subtotal,
    tax: order.tax,
    total: total,
    calculatedDiscount: calculatedDiscount,
    finalDiscount: totalDiscount
  });

  // Função para renderizar item com desconto em negrito
  const renderItem = (item: typeof items[0], idx: number) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice ?? item.unit_price) || 0;
    const totalPrice = Number(item.totalPrice ?? item.total_price) || 0;
    const productName = item.product_name || 'Produto não identificado';
    const originalPrice = item.originalPrice ?? item.original_price;
    const discountValue = item.discountValue ?? item.discount_value;
    
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
          #print-content-order,
          #print-content-order * {
            visibility: visible !important;
          }
          #print-content-order {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          pre, pre * {
            visibility: visible !important;
            position: relative !important;
            margin: 0 !important;
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
      {items.length > 0 ? (
        items.map((item, idx) => renderItem(item, idx))
      ) : (
        <span>{'(Nenhum item encontrado)'}{'\n'}</span>
      )}
      {'\n'}
      {divider}
      {'\n'}
      {rightAlign('Subtotal:', formatCurrency(order.subtotal || 0))}
      {'\n'}
      {totalDiscount > 0 && (
        <>
          <span style={{ fontWeight: 'bold' }}>{rightAlign('DESCONTO:', '-' + formatCurrency(totalDiscount))}</span>
          {'\n'}
        </>
      )}
      {rightAlign('Taxa:', formatCurrency(order.tax || 0))}
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