/**
 * Export utilities for data tables
 * Pure JavaScript — no external dependencies
 */

/**
 * Export data array to CSV file and trigger download
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Output filename (without extension)
 * @param {Array<{key: string, label: string}>} columns - Column mapping
 */
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) return;

  const headers = columns.map(c => c.label);
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c.key] ?? '';
      // Escape quotes and wrap in quotes if contains comma
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    })
  );

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data array to Excel-compatible XLSX (as HTML table)
 * Uses HTML table format that Excel can open natively
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Output filename (without extension)
 * @param {Array<{key: string, label: string}>} columns - Column mapping
 */
export function exportToExcel(data, filename, columns) {
  if (!data || data.length === 0) return;

  const headerCells = columns.map(c => `<th style="background:#E8F5E9;font-weight:bold;border:1px solid #ccc;padding:8px">${c.label}</th>`).join('');
  const bodyRows = data.map(row =>
    '<tr>' + columns.map(c => `<td style="border:1px solid #ccc;padding:6px">${row[c.key] ?? ''}</td>`).join('') + '</tr>'
  ).join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Data</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
    </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print data as PDF using browser print dialog
 * @param {Array<Object>} data - Array of objects to print
 * @param {string} title - Document title
 * @param {Array<{key: string, label: string}>} columns - Column mapping
 */
export function exportToPDF(data, title, columns) {
  if (!data || data.length === 0) return;

  const headerCells = columns.map(c => `<th style="background:#4CAF50;color:white;padding:10px 14px;text-align:left;font-size:12px">${c.label}</th>`).join('');
  const bodyRows = data.map((row, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#F1F8E9'}">` +
    columns.map(c => `<td style="padding:8px 14px;border-bottom:1px solid #E8F5E9;font-size:11px">${row[c.key] ?? ''}</td>`).join('') +
    '</tr>'
  ).join('');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: 'Inter', Arial, sans-serif; padding: 24px; }
      h1 { font-size: 18px; color: #1B5E20; margin-bottom: 4px; }
      p { font-size: 12px; color: #616161; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>${title}</h1>
    <p>LKP Parduli Rasa Komputer — Dicetak: ${new Date().toLocaleDateString('id-ID')}</p>
    <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
    </body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
}
