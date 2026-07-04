import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../lib/icons';
import { ALL_DEALS, Deal, KANBAN_COLUMNS } from './mock-data';

type View = 'kanban' | 'table' | 'cards';

export function Pipeline() {
  const [view, setView] = useState<View>('kanban');

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 px-[26px] pb-3.5 pt-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight">Pipeline CRM</h1>
            <p className="mt-1 text-[13px] text-text-2">68 oportunidades · $1.24M en juego</p>
          </div>
          <Button variant="primary" icon={<Icon name="plus" size={15} />}>
            Nueva oportunidad
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex gap-0.5 rounded-lg border border-border bg-surface-2 p-[3px]">
            {(['kanban', 'table', 'cards'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${v === view ? 'bg-surface text-text shadow-sm' : 'text-text-3'}`}
              >
                {v === 'kanban' ? 'Kanban' : v === 'table' ? 'Tabla' : 'Tarjetas'}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={<Icon name="filter" size={14} />}>
            Filtros <Badge tone="accent">2</Badge>
          </Button>
        </div>
      </div>

      {view === 'kanban' && <KanbanView />}
      {view === 'table' && <TableView />}
      {view === 'cards' && <CardsView />}
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <Card className="cursor-pointer p-3.5 transition-shadow hover:shadow">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[13px] font-bold">{deal.company}</span>
        <Badge tone="neutral">{deal.tag}</Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-extrabold [font-variant-numeric:tabular-nums]">{deal.amount}</span>
        <Avatar initials={deal.ownerInitials} gradient={`linear-gradient(140deg,${deal.ownerColor},var(--accent-hover))`} size="sm" />
      </div>
    </Card>
  );
}

function KanbanView() {
  return (
    <div data-scroll className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-[26px] pb-[26px] pt-1">
      <div className="flex h-full min-w-min gap-3.5">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.title} className="flex w-[260px] flex-shrink-0 flex-col">
            <div className="mb-2.5 flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
              <span className="text-[13px] font-bold">{col.title}</span>
              <span className="text-[11px] font-semibold text-text-3">{col.count}</span>
              <div className="flex-1" />
              <span className="text-[11px] font-bold text-text-3">{col.sum}</span>
            </div>
            <div data-scroll className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl bg-surface-2 p-2">
              {col.deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableView() {
  const columns: DataTableColumn<Deal>[] = [
    { key: 'company', label: 'Compañía', render: (d) => <span className="font-bold">{d.company}</span> },
    { key: 'stage', label: 'Etapa', render: (d) => <Badge tone="blue">{d.stage}</Badge> },
    { key: 'tag', label: 'Industria', render: (d) => d.tag },
    {
      key: 'owner',
      label: 'Responsable',
      render: (d) => <Avatar initials={d.ownerInitials} gradient={`linear-gradient(140deg,${d.ownerColor},var(--accent-hover))`} size="sm" />,
    },
    { key: 'amount', label: 'Monto', align: 'right', render: (d) => <span className="font-bold [font-variant-numeric:tabular-nums]">{d.amount}</span> },
  ];
  return (
    <div className="px-[26px] pb-[26px]">
      <DataTable columns={columns} rows={ALL_DEALS} getRowId={(d) => d.id} />
    </div>
  );
}

function CardsView() {
  return (
    <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-[26px]">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ALL_DEALS.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
