export interface Table {
  name: string;
  head: string[];
  rows: Array<Array<string | number>>;
}

const clean = (v: unknown) => String(v ?? '').replace(/[\t\r\n]+/g, ' ');

/** CSV with a UTF-8 BOM so Hebrew opens correctly in Excel. */
export const toCsv = (t: Table) =>
  '﻿' + [t.head, ...t.rows].map((r) => r.map((v) => `"${clean(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');

/** Tab-separated text that pastes into Excel/Sheets as a table. */
export const toTsv = (t: Table) => [t.head, ...t.rows].map((r) => r.map(clean).join('\t')).join('\n');

export const safeFileName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '-');

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
