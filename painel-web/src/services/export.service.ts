import { toCsv } from '@herois/shared';

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T)[],
  filename: string,
) {
  const csv = toCsv(rows, columns);
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T)[],
  filename: string,
) {
  exportToCsv(rows, columns, filename);
}

export function exportToPdf(title: string, content: string, filename: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #e94560; }
          pre { white-space: pre-wrap; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${content}</pre>
        <script>window.print();</script>
      </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    downloadFile(content, `${filename}.txt`, 'text/plain');
  }
}
