// Illustrative sample data — Calendar has no backing spec yet (014). Visual-only page
// matching Diseño/_template.html's "CALENDAR" screen (~line 922).
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../lib/icons';

const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const SAMPLE_EVENTS: Record<number, { label: string; color: string }[]> = {
  3: [{ label: 'Llamada · Halcón', color: 'var(--accent)' }],
  8: [{ label: 'Demo Nordika', color: 'var(--blue)' }],
  12: [{ label: 'Renovación contrato', color: 'var(--green)' }],
  15: [{ label: 'Reunión equipo', color: 'var(--purple)' }],
  21: [{ label: 'Cierre Q3', color: 'var(--accent)' }],
  24: [{ label: 'Capacitación', color: 'var(--amber)' }],
};

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells: { day: number; inMonth: boolean; isToday: boolean }[] = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, inMonth: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      inMonth: true,
      isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - startOffset - daysInMonth + 1, inMonth: false, isToday: false });
  }
  return cells;
}

export function CalendarMock() {
  const [cursor, setCursor] = useState(() => new Date());
  const cells = useMemo(() => buildMonthCells(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = cursor.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  function shiftMonth(delta: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div className="flex h-full flex-col px-[30px] pb-[26px] pt-6">
      <div className="mb-[18px] flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-3.5">
          <h1 className="text-[22px] font-extrabold capitalize tracking-tight">{monthLabel}</h1>
          <div className="flex gap-0.5">
            <button onClick={() => shiftMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-2">
              <Icon name="chevR" size={16} className="rotate-180" />
            </button>
            <button onClick={() => shiftMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-2">
              <Icon name="chevR" size={16} />
            </button>
          </div>
          <button onClick={() => setCursor(new Date())} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-2">
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-border bg-surface-2 p-[3px] text-xs font-bold">
            <span className="rounded-md bg-surface px-3 py-1 text-text shadow-sm">Mes</span>
            <span className="cursor-pointer px-3 py-1 text-text-3">Semana</span>
            <span className="cursor-pointer px-3 py-1 text-text-3">Agenda</span>
          </div>
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />}>
            Evento
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="grid flex-shrink-0 grid-cols-7 border-b border-border">
          {DOW.map((d) => (
            <div key={d} className="p-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-text-3">
              {d}
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7 [grid-auto-rows:1fr]">
          {cells.map((cell, i) => (
            <div key={i} className={`border-b border-r border-border p-2 ${!cell.inMonth ? 'bg-surface-2/40' : ''}`}>
              <div className="flex justify-end">
                <span
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-md text-xs font-semibold ${
                    cell.isToday ? 'bg-accent text-white' : cell.inMonth ? 'text-text' : 'text-text-3'
                  }`}
                >
                  {cell.day}
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {cell.inMonth &&
                  SAMPLE_EVENTS[cell.day]?.map((ev, idx) => (
                    <div
                      key={idx}
                      className="truncate rounded px-1.5 py-0.5 text-[10.5px] font-bold"
                      style={{ background: `color-mix(in srgb, ${ev.color} 15%, transparent)`, color: ev.color }}
                    >
                      {ev.label}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
