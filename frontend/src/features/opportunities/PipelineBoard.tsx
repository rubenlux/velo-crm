import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Customer, getCustomer } from '../../services/customers-api';
import { Opportunity, Pipeline, listPipelines, moveOpportunityStage, searchOpportunities } from '../../services/opportunities-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../lib/icons';

const PRIORITY_TONE: Record<string, BadgeTone> = { low: 'neutral', medium: 'blue', high: 'red' };
const PRIORITY_LABEL: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

function formatMoney(value: string | null): string {
  if (!value) return '—';
  const n = Number(value);
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

type View = 'kanban' | 'table';

export function PipelineBoard() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [view, setView] = useState<View>('kanban');
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) return;
    setLoading(true);
    try {
      const [pipelines, result] = await Promise.all([
        listPipelines(session.accessToken, organizationId),
        searchOpportunities(session.accessToken, organizationId),
      ]);
      setPipeline(pipelines[0] ?? null);
      setOpportunities(result.items);

      const uniqueCustomerIds = [...new Set(result.items.map((o) => o.customerId))].filter((id) => !customers[id]);
      if (uniqueCustomerIds.length > 0) {
        const fetched = await Promise.all(uniqueCustomerIds.map((id) => getCustomer(session.accessToken, organizationId, id).catch(() => null)));
        setCustomers((current) => {
          const next = { ...current };
          fetched.forEach((c) => {
            if (c) next[c.id] = c;
          });
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el pipeline.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  const archivedCount = useMemo(() => opportunities.filter((o) => o.state === 'Archivada').length, [opportunities]);
  const openTotal = useMemo(
    () => opportunities.filter((o) => o.state === 'Abierta').reduce((sum, o) => sum + Number(o.estimatedValue ?? 0), 0),
    [opportunities],
  );

  async function handleMoveStage(opportunityId: string, stageId: string) {
    if (!session || !organizationId) return;
    setError(null);
    try {
      await moveOpportunityStage(session.accessToken, organizationId, opportunityId, stageId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo mover la Oportunidad de etapa.');
    }
  }

  if (!session || !organizationId) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 px-[26px] pb-3.5 pt-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight">Pipeline de Oportunidades</h1>
            <p className="mt-1 text-[13px] text-text-2">
              {opportunities.filter((o) => o.state === 'Abierta').length} abiertas · {formatMoney(String(openTotal))} en juego
              {archivedCount > 0 && ` · ${archivedCount} archivadas`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate(`/organizations/${organizationId}/pipeline/kpis`)}>
              KPIs y forecast
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/organizations/${organizationId}/pipeline/settings`)}>
              Configurar etapas
            </Button>
            <Button variant="primary" icon={<Icon name="plus" size={15} />} onClick={() => navigate(`/organizations/${organizationId}/pipeline/new`)}>
              Nueva oportunidad
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex gap-0.5 rounded-lg border border-border bg-surface-2 p-[3px]">
            {(['kanban', 'table'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${v === view ? 'bg-surface text-text shadow-sm' : 'text-text-3'}`}
              >
                {v === 'kanban' ? 'Kanban' : 'Tabla'}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-red-text">
            {error}
          </p>
        )}
      </div>

      {loading ? (
        <p className="px-[26px] text-text-2">Cargando…</p>
      ) : !pipeline ? (
        <p className="px-[26px] text-text-2">No hay un Pipeline configurado todavía.</p>
      ) : view === 'kanban' ? (
        <KanbanView
          pipeline={pipeline}
          opportunities={opportunities}
          customers={customers}
          onOpen={(id) => navigate(`/organizations/${organizationId}/pipeline/${id}`)}
          onMoveStage={handleMoveStage}
        />
      ) : (
        <TableView
          opportunities={opportunities}
          customers={customers}
          onOpen={(id) => navigate(`/organizations/${organizationId}/pipeline/${id}`)}
        />
      )}
    </div>
  );
}

function DealCard({
  opportunity,
  customer,
  pipeline,
  onOpen,
  onMoveStage,
}: {
  opportunity: Opportunity;
  customer: Customer | undefined;
  pipeline: Pipeline;
  onOpen: () => void;
  onMoveStage: (stageId: string) => void;
}) {
  return (
    <Card className="p-3.5 transition-shadow hover:shadow">
      <div onClick={onOpen} className="mb-2 cursor-pointer">
        <div className="mb-1 flex items-start justify-between gap-2">
          <span className="text-[13px] font-bold">{opportunity.name}</span>
          <Badge tone={PRIORITY_TONE[opportunity.priority]}>{PRIORITY_LABEL[opportunity.priority]}</Badge>
        </div>
        <div className="text-[11.5px] text-text-3">{customer?.name ?? 'Cliente'}</div>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[14px] font-extrabold [font-variant-numeric:tabular-nums]">{formatMoney(opportunity.estimatedValue)}</span>
        {opportunity.probability !== null && <span className="text-[11px] font-bold text-text-3">{opportunity.probability}%</span>}
      </div>
      {opportunity.state === 'Abierta' && (
        <select
          value={opportunity.stageId}
          onChange={(e) => onMoveStage(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-semibold text-text-2 outline-none"
        >
          {pipeline.stages
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
        </select>
      )}
      {opportunity.state !== 'Abierta' && <Badge tone={opportunity.state === 'Ganada' ? 'green' : opportunity.state === 'Perdida' ? 'red' : 'neutral'}>{opportunity.state}</Badge>}
    </Card>
  );
}

function KanbanView({
  pipeline,
  opportunities,
  customers,
  onOpen,
  onMoveStage,
}: {
  pipeline: Pipeline;
  opportunities: Opportunity[];
  customers: Record<string, Customer>;
  onOpen: (id: string) => void;
  onMoveStage: (opportunityId: string, stageId: string) => void;
}) {
  const stages = pipeline.stages.slice().sort((a, b) => a.order - b.order);
  const visible = opportunities.filter((o) => o.state !== 'Archivada');

  return (
    <div data-scroll className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-[26px] pb-[26px] pt-1">
      <div className="flex h-full min-w-min gap-3.5">
        {stages.map((stage) => {
          const deals = visible.filter((o) => o.stageId === stage.id);
          const sum = deals.reduce((s, o) => s + Number(o.estimatedValue ?? 0), 0);
          return (
            <div key={stage.id} className="flex w-[260px] flex-shrink-0 flex-col">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ background: stage.isWonStage ? 'var(--green)' : stage.isLostStage ? 'var(--red)' : 'var(--accent)' }} />
                <span className="text-[13px] font-bold">{stage.name}</span>
                <span className="text-[11px] font-semibold text-text-3">{deals.length}</span>
                <div className="flex-1" />
                <span className="text-[11px] font-bold text-text-3">{formatMoney(String(sum))}</span>
              </div>
              <div data-scroll className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl bg-surface-2 p-2">
                {deals.map((opportunity) => (
                  <DealCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    customer={customers[opportunity.customerId]}
                    pipeline={pipeline}
                    onOpen={() => onOpen(opportunity.id)}
                    onMoveStage={(stageId) => onMoveStage(opportunity.id, stageId)}
                  />
                ))}
                {deals.length === 0 && <p className="px-1.5 py-2 text-[11.5px] text-text-3">Sin Oportunidades.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableView({
  opportunities,
  customers,
  onOpen,
}: {
  opportunities: Opportunity[];
  customers: Record<string, Customer>;
  onOpen: (id: string) => void;
}) {
  const columns: DataTableColumn<Opportunity>[] = [
    { key: 'name', label: 'Oportunidad', render: (o) => <span className="font-bold">{o.name}</span> },
    { key: 'customer', label: 'Cliente', render: (o) => customers[o.customerId]?.name ?? '—' },
    { key: 'stage', label: 'Etapa', render: (o) => <Badge tone="blue">{o.stage.name}</Badge> },
    { key: 'state', label: 'Estado', render: (o) => <Badge tone={o.state === 'Ganada' ? 'green' : o.state === 'Perdida' ? 'red' : o.state === 'Archivada' ? 'neutral' : 'accent'}>{o.state}</Badge> },
    { key: 'priority', label: 'Prioridad', render: (o) => <Badge tone={PRIORITY_TONE[o.priority]}>{PRIORITY_LABEL[o.priority]}</Badge> },
    { key: 'value', label: 'Valor', align: 'right', render: (o) => <span className="font-bold [font-variant-numeric:tabular-nums]">{formatMoney(o.estimatedValue)}</span> },
  ];
  return (
    <div className="px-[26px] pb-[26px]">
      <DataTable columns={columns} rows={opportunities} getRowId={(o) => o.id} onRowClick={(o) => onOpen(o.id)} emptyMessage="No hay Oportunidades todavía." />
    </div>
  );
}
