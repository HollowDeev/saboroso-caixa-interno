import { Sale } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptPrintProps {
    sale: Sale;
}

export const ReceiptPrint = ({ sale }: ReceiptPrintProps) => {
    return (
        <div className="receipt-print" style={{ width: '58mm', padding: '10px', fontFamily: 'monospace' }}>
            <style>
                {`
          @media print {
            body * {
              visibility: hidden;
            }
            .receipt-print, .receipt-print * {
              visibility: visible;
            }
            .receipt-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 58mm !important;
            }
            @page {
              size: 58mm auto;
              margin: 0;
            }
          }

          .receipt-print {
            text-align: center;
            font-size: 10px;
            line-height: 1.2;
          }

          .receipt-header {
            margin-bottom: 10px;
          }

          .receipt-divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }

          .receipt-item {
            text-align: left;
            margin: 2px 0;
          }

          .receipt-total {
            text-align: right;
            margin-top: 5px;
            font-weight: bold;
          }

          .receipt-footer {
            margin-top: 10px;
            font-size: 9px;
          }
        `}
            </style>

            <div className="receipt-header">
                <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0' }}>VARANDA</h1>
                <div>{format(new Date(sale.createdAt), "dd/MM/yyyy, HH:mm", { locale: ptBR })}</div>
            </div>

            <div className="receipt-divider" />

            <div style={{ textAlign: 'left', marginBottom: '5px' }}>
                Cliente: {sale.customerName || 'Não informado'}
            </div>

            <div className="receipt-divider" />

            <div style={{ marginBottom: '10px' }}>
                {sale.items.map((item, index) => (
                    <div key={index} className="receipt-item">
                        <div>{item.product_name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.quantity}x R$ {item.unitPrice.toFixed(2)}</span>
                            <span>R$ {item.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-total">
                <div>TOTAL: R$ {sale.total.toFixed(2)}</div>
                <div style={{ fontSize: '9px' }}>Pagamento: {sale.paymentMethod}</div>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-footer">
                Obrigado pela preferência!
            </div>
        </div>
    );
}; 