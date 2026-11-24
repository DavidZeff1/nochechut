import { useState } from 'react';
import { today } from '../lib/dates';
import { downloadText, toCsv, toTsv, type Table } from '../lib/csv';
import { CopyFallbackModal } from './Modal';
import { copyToClipboard, useToast } from './Toast';

export function TableActions({ table, copyLabel = 'העתקת טבלה' }: { table: () => Table; copyLabel?: string }) {
  const toast = useToast();
  const [fallback, setFallback] = useState<string | null>(null);
  return (
    <>
      <button
        className="ghost sm"
        onClick={async () => {
          const text = toTsv(table());
          if (await copyToClipboard(text)) toast('הטבלה הועתקה, אפשר להדביק באקסל');
          else setFallback(text);
        }}
      >
        {copyLabel}
      </button>
      <button
        className="ghost sm"
        onClick={() => {
          const t = table();
          downloadText(`${t.name} ${today()}.csv`, toCsv(t));
        }}
      >
        ייצוא CSV
      </button>
      {fallback && <CopyFallbackModal text={fallback} onClose={() => setFallback(null)} />}
    </>
  );
}
