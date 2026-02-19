// Test printing helper for Windows
// Usage: node scripts/test-print.js "Printer Name"

require('dotenv').config();
const cp = require('child_process');
const fs = require('fs');

const printerName = process.argv[2] || process.env.PRINTER_NAME || '';
const sampleText = `COMANDA TESTE\n------------------------------\nProduto A x1  R$ 10.00\nProduto B x2  R$ 20.00\n------------------------------\nTotal: R$ 30.00\n\n\n`;

async function tryNativePrinter() {
  try {
    const printer = require('printer');
    console.log('printer module loaded. Sending RAW job...');
    printer.printDirect({
      data: sampleText,
      printer: printerName || undefined,
      type: 'RAW',
      success: function(jobID) {
        console.log('Sent to printer, jobID:', jobID);
      },
      error: function(err) {
        console.error('printer.printDirect error:', err);
      }
    });
    return true;
  } catch (e) {
    console.warn('native printer module not available:', e.message || e);
    return false;
  }
}

async function tryPowerShellPrinter() {
  try {
    const tmpPath = require('path').join(require('os').tmpdir(), 'print_temp.txt');
    fs.writeFileSync(tmpPath, sampleText, 'utf8');
    const escaped = tmpPath.replace(/'/g, "''");
    const nameArg = printerName ? `-Name "${printerName}"` : '';
    const cmd = `powershell -Command Get-Content -Path '${escaped}' | Out-Printer ${nameArg}`;
    console.log('Running PowerShell print command:', cmd);
    return new Promise((resolve) => {
      cp.exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error('PowerShell print error:', err, stderr);
          resolve(false);
        } else {
          console.log('PowerShell print sent.');
          resolve(true);
        }
      });
    });
  } catch (e) {
    console.error('PowerShell fallback failed:', e);
    return false;
  }
}

async function tryPrintExe() {
  try {
    const tmpPath = require('path').join(require('os').tmpdir(), 'print_temp.txt');
    // ensure file exists
    fs.writeFileSync(tmpPath, sampleText, 'utf8');
    const nameArg = printerName ? `/D:"${printerName}"` : '';
    // print.exe may require quoting
    const cmd = `print ${nameArg} "${tmpPath}"`;
    console.log('Running print.exe command:', cmd);
    return new Promise((resolve) => {
      cp.exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error('print.exe error:', err, stderr);
          resolve(false);
        } else {
          console.log('print.exe sent.');
          resolve(true);
        }
      });
    });
  } catch (e) {
    console.error('print.exe fallback failed:', e);
    return false;
  }
}

async function tryNotepadPrint() {
  try {
    const tmpPath = require('path').join(require('os').tmpdir(), 'print_temp.txt');
    fs.writeFileSync(tmpPath, sampleText, 'utf8');
    // Use Notepad's /p to print the file to the default printer (or specified via PRINTER_NAME env is ignored)
    const cmd = `powershell -Command Start-Process -FilePath notepad.exe -ArgumentList '/p', '${tmpPath}' -NoNewWindow -Wait`;
    console.log('Running Notepad print command:', cmd);
    return new Promise((resolve) => {
      cp.exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error('Notepad print error:', err, stderr);
          resolve(false);
        } else {
          console.log('Notepad print sent.');
          resolve(true);
        }
      });
    });
  } catch (e) {
    console.error('Notepad fallback failed:', e);
    return false;
  }
}

(async () => {
  console.log('Test print starting. Printer name:', printerName || '(system default)');
  const native = await tryNativePrinter();
  if (!native) {
    console.log('Trying PowerShell fallback...');
    const psOk = await tryPowerShellPrinter();
    if (!psOk) {
      console.log('PowerShell fallback failed, trying print.exe fallback...');
      const printOk = await tryPrintExe();
      if (!printOk) {
        console.log('print.exe failed, trying Notepad fallback...');
        const notepadOk = await tryNotepadPrint();
        if (!notepadOk) console.error('All print fallbacks failed.');
      }
    }
  }
})();
