import { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Record<string, boolean>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  selectable,
  selected = {},
  onToggleRow,
  onToggleAll,
  emptyMessage = 'Sin resultados.',
}: DataTableProps<T>) {
  const allChecked = rows.length > 0 && rows.every((row) => selected[getRowId(row)]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface-2">
            {selectable && (
              <th className="w-11 border-b border-border p-0">
                <div className="flex justify-center">
                  <Checkbox checked={allChecked} onChange={() => onToggleAll?.()} />
                </div>
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase text-text-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-10 text-center text-text-3">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const id = getRowId(row);
            return (
              <tr
                key={id}
                data-gridrow
                onClick={() => onRowClick?.(row)}
                className={`border-b border-border transition-colors last:border-b-0 hover:bg-surface-2 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {selectable && (
                  <td className="p-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center py-3">
                      <Checkbox checked={Boolean(selected[id])} onChange={() => onToggleRow?.(id)} />
                    </div>
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={onChange}
      className={`flex h-4 w-4 cursor-pointer items-center justify-center rounded-[5px] border-[1.8px] ${
        checked ? 'border-accent bg-accent text-white' : 'border-border-strong bg-transparent'
      }`}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
        </svg>
      )}
    </span>
  );
}
