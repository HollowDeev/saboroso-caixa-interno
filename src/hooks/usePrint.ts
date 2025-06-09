
import { useCallback } from 'react';
import { Sale } from '@/types';

export const usePrint = () => {
  const printSale = useCallback((sale: Sale) => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    
    if (!printWindow) {
      alert('Por favor, permita pop-ups para usar a função de impressão');
      return;
    }

    // CSS específico para impressão em 58mm
    const printCSS = `
      <style>
        @media print {
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
          }
          .print-container {
            width: 58mm !important;
            max-width: 58mm !important;
            margin: 0 !important;
            padding: 2mm !important;
          }
          @page {
            size: 58mm auto;
            margin: 0;
          }
        }
        
        body { 
          margin: 0; 
          padding: 8px; 
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
        }
        
        .print-container {
          width: 58mm;
          max-width: 58mm;
          margin: 0 auto;
          padding: 4px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        
        .header h1 {
          fontSize: 18px;
          font-weight: bold;
          margin: 0 0 4px 0;
          letter-spacing: 1px;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
          width: 100%;
        }
        
        .item {
          margin-bottom: 4px;
          font-size: 11px;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .item-name {
          font-weight: bold;
        }
        
        .item-details {
          font-size: 10px;
          color: #666;
        }
        
        .item-price {
          font-weight: bold;
          min-width: fit-content;
        }
        
        .total {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 6px;
        }
        
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 12px;
          border-top: 1px dashed #000;
          padding-top: 6px;
        }
      </style>
    `;

    const getPaymentMethodLabel = (method: string) => {
      switch (method) {
        case 'cash': return 'Dinheiro';
        case 'card': return 'Cartão';
        case 'pix': return 'PIX';
        default: return method;
      }
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // HTML para impressão
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Impressão de Venda - Varanda</title>
          ${printCSS}
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <h1>VARANDA</h1>
              <div style="font-size: 10px; margin: 2px 0;">
                ${formatDate(sale.createdAt)}
              </div>
            </div>

            <div class="divider"></div>

            ${sale.customerName ? `
              <div style="margin-bottom: 6px; font-size: 11px;">
                <strong>Cliente:</strong> ${sale.customerName}
              </div>
            ` : ''}

            <div style="margin-bottom: 8px;">
              ${sale.items?.map(item => `
                <div class="item">
                  <div class="item-header">
                    <div style="flex: 1; padding-right: 4px;">
                      <div class="item-name">${item.product_name}</div>
                      <div class="item-details">
                        ${item.quantity}x R$ ${(item.totalPrice / item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div class="item-price">
                      R$ ${item.totalPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              `).join('') || ''}
            </div>

            <div class="divider"></div>

            <div class="total">
              <span>TOTAL:</span>
              <span>R$ ${sale.total.toFixed(2)}</span>
            </div>

            <div style="font-size: 11px; margin-bottom: 8px;">
              <strong>Pagamento:</strong> ${getPaymentMethodLabel(sale.paymentMethod)}
            </div>

            <div class="footer">
              <div>Obrigado pela preferência!</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              // Fechar a janela após a impressão (opcional)
              // window.onafterprint = function() {
              //   window.close();
              // };
            };
          </script>
        </body>
      </html>
    `;

    // Escrever o HTML na nova janela
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Focar na janela de impressão
    printWindow.focus();
  }, []);

  return { printSale };
};
