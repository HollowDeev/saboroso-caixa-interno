
import React from 'react';
import { Sale } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrintSaleProps {
  sale: Sale;
}

export const PrintSale = ({ sale }: PrintSaleProps) => {
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  return (
    <div className="print-container" style={{ 
      width: '58mm', 
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '1.2',
      margin: '0',
      padding: '8px'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          margin: '0 0 4px 0',
          letterSpacing: '1px'
        }}>
          VARANDA
        </h1>
        <div style={{ fontSize: '10px', margin: '2px 0' }}>
          {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ 
        borderTop: '1px dashed #000', 
        margin: '6px 0',
        width: '100%'
      }}></div>

      {/* Customer */}
      {sale.customerName && (
        <div style={{ marginBottom: '6px', fontSize: '11px' }}>
          <strong>Cliente:</strong> {sale.customerName}
        </div>
      )}

      {/* Items */}
      <div style={{ marginBottom: '8px' }}>
        {sale.items?.map((item, index) => (
          <div key={index} style={{ marginBottom: '4px', fontSize: '11px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: '1', paddingRight: '4px' }}>
                <div style={{ fontWeight: 'bold' }}>
                  {item.product_name}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {item.quantity}x R$ {(item.totalPrice / item.quantity).toFixed(2)}
                </div>
              </div>
              <div style={{ 
                fontWeight: 'bold',
                minWidth: 'fit-content'
              }}>
                R$ {item.totalPrice.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ 
        borderTop: '1px dashed #000', 
        margin: '6px 0',
        width: '100%'
      }}></div>

      {/* Total */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontWeight: 'bold',
        fontSize: '14px',
        marginBottom: '6px'
      }}>
        <span>TOTAL:</span>
        <span>R$ {sale.total.toFixed(2)}</span>
      </div>

      {/* Payment Method */}
      <div style={{ 
        fontSize: '11px',
        marginBottom: '8px'
      }}>
        <strong>Pagamento:</strong> {getPaymentMethodLabel(sale.paymentMethod)}
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center',
        fontSize: '10px',
        marginTop: '12px',
        borderTop: '1px dashed #000',
        paddingTop: '6px'
      }}>
        <div>Obrigado pela preferência!</div>
      </div>
    </div>
  );
};
