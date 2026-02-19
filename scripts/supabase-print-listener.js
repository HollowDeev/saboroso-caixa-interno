/*
  Supabase Realtime -> Thermal Printer listener
  - Listens for INSERTs on `fila_impressao` and prints 2 copies to a local thermal printer.
  - Configure via environment variables (see .env):
      SUPABASE_URL or VITE_SUPABASE_URL
      SUPABASE_KEY or VITE_SUPABASE_ANON_KEY
      PRINTER_INTERFACE (optional) e.g. "printer:My_Printer_Name" or "usb://..." or "tcp://192.168.0.100"
      PRINTER_TYPE (optional) "EPSON" or "STAR" (default EPSON)

  Dependencies:
    npm install @supabase/supabase-js node-thermal-printer dotenv

  Notes on Windows: If using the `printer:` interface you may need the `printer` native module installed
  (may require build tools). If you prefer, set `PRINTER_INTERFACE` to a network address (tcp://...) or use USB string.

  Run:
    node scripts/supabase-print-listener.js
*/

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ThermalPrinterLib = require('node-thermal-printer');
const { printer: ThermalPrinter, types: PrinterTypes } = ThermalPrinterLib;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY. Set env variables first.');
  process.exit(1);
}

const PRINTER_INTERFACE = process.env.PRINTER_INTERFACE || 'printer'; // fallback: 'printer' (uses system default)
const PRINTER_TYPE = (process.env.PRINTER_TYPE || 'EPSON').toUpperCase();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Supabase print listener starting...');
console.log('Supabase URL:', SUPABASE_URL);
console.log('Printer interface:', PRINTER_INTERFACE, 'type:', PRINTER_TYPE);

async function buildPrintText(conteudo) {
  // conteudo expected: { nome, horario, mesa, itens: [{nome, quantidade, preco, total}, ...] }
  const lines = [];
  lines.push('--------------------------------');
  lines.push("COMANDA - CÓPIA DO PEDIDO");
  lines.push('--------------------------------');
  if (conteudo.nome) lines.push(`Funcionário: ${conteudo.nome}`);
  if (conteudo.horario) lines.push(`Horário: ${new Date(conteudo.horario).toLocaleString()}`);
  if (conteudo.mesa) lines.push(`Mesa: ${conteudo.mesa}`);
  lines.push('');
  lines.push('Itens:');
  let total = 0;
  if (Array.isArray(conteudo.itens)) {
    conteudo.itens.forEach(item => {
      const name = item.nome || item.product_name || '';
      const qty = item.quantidade ?? item.quantity ?? 0;
      const price = item.preco ?? item.unitPrice ?? item.unit_price ?? 0;
      const lineTotal = item.total ?? item.totalPrice ?? item.total_price ?? (qty * price);
      total += Number(lineTotal || 0);
      lines.push(`${name} x${qty}  R$ ${Number(lineTotal).toFixed(2)}`);
    });
  }
  lines.push('');
  lines.push(`Total: R$ ${Number(total).toFixed(2)}`);
  lines.push('');
  lines.push('--------------------------------');
  lines.push('Obrigado!');
  lines.push('\n\n');
  return lines.join('\n');
}

async function printTwoCopies(conteudo) {
  // Try using node-thermal-printer
  const printerType = PRINTER_TYPE === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;
  const printer = new ThermalPrinter({ type: printerType, interface: PRINTER_INTERFACE });

  const text = await buildPrintText(conteudo);

  try {
    const isConnected = await printer.isPrinterConnected();
    console.log('Printer connected:', isConnected);
  } catch (e) {
    console.warn('Warning: could not detect printer connection via node-thermal-printer:', e.message || e);
  }

  try {
    for (let i = 0; i < 2; i++) {
      printer.clear();
      printer.alignCenter();
      printer.println('COMANDA');
      printer.newLine();
      printer.setTypeFontA();
      printer.println(text);
      printer.newLine();
      printer.cut();
      // execute sends to device; may return boolean or buffer
      const executeResult = await printer.execute();
      console.log(`Printed copy ${i + 1}, result:`, executeResult);
      // small delay between copies
      await new Promise(r => setTimeout(r, 800));
    }
  } catch (err) {
    console.error('Thermal printer error:', err);
    // fallback: print plain text using OS printer if available
    try {
      const printerModule = require('printer');
      for (let i = 0; i < 2; i++) {
        printerModule.printDirect({
          data: text,
          type: 'RAW',
          success: function(jobID) {
            console.log('Sent to printer, jobID:', jobID);
          },
          error: function(err) {
            console.error('Printer module error:', err);
          }
        });
        await new Promise(r => setTimeout(r, 800));
      }
    } catch (fallbackErr) {
      console.error('Fallback printing failed (printer module missing or error):', fallbackErr);
      throw err; // rethrow original
    }
  }
}

async function handleInsert(payload) {
  try {
    console.log('New fila_impressao insert payload:', payload);
    const newRow = payload.new || payload.record || null;
    if (!newRow) return console.warn('Insert payload missing new row');
    let conteudo = newRow.conteudo;
    if (typeof conteudo === 'string') {
      try { conteudo = JSON.parse(conteudo); } catch (e) { /* keep string */ }
    }
    console.log('Conteudo for printing:', conteudo);
    await printTwoCopies(conteudo);

    // Optionally update status to 'impresso' and impresso_em
    const { data, error } = await supabase
      .from('fila_impressao')
      .update({ status: 'impresso', impresso_em: new Date().toISOString() })
      .eq('id', newRow.id);
    if (error) console.error('Error updating fila_impressao status:', error);
    else console.log('Updated fila_impressao status for id', newRow.id);
  } catch (err) {
    console.error('Error handling insert event:', err);
    // Optionally update status to 'erro'
    try {
      if (payload.new && payload.new.id) {
        await supabase.from('fila_impressao').update({ status: 'erro' }).eq('id', payload.new.id);
      }
    } catch (uerr) {
      console.error('Failed to mark fila_impressao as erro:', uerr);
    }
  }
}

async function start() {
  console.log('Subscribing to fila_impressao inserts...');

  const channel = supabase.channel('public:fila_impressao')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fila_impressao' }, (payload) => {
      handleInsert(payload).catch(err => console.error('handleInsert error:', err));
    })
    .subscribe(status => {
      console.log('Subscription status:', status);
    });

  // Keep process alive
}

start().catch(err => {
  console.error('Fatal error starting listener:', err);
  process.exit(1);
});
