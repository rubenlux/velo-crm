import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Customer, getCustomer } from '../../services/customers-api';
import {
  Opportunity,
  Pipeline,
  archiveOpportunity,
  getOpportunity,
  listPipelines,
  loseOpportunity,
  moveOpportunityStage,
  reopenOpportunity,
  restoreOpportunity,
  updateOpportunity,
  winOpportunity,
} from '../../services/opportunities-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../lib/icons';

const STATE_TONE: Record<string, BadgeTone> = { Abierta: 'accent', Ganada: 'green', Perdida: 'red', Archivada: 'neutral', Cancelada: 'neutral' };

function formatMoney(value: string | null): string {
  if (!value) return '—';
  return Number(value).toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function OpportunityDetail() {
  const { organizationId, opportunityId } = useParams<{ organizationId: string; opportunityId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [competitor, setCompetitor] = useState('');

  async function refresh() {
    if (!session || !organizationId || !opportunityId) return;
    setLoading(true);
    try {
      const o = await getOpportunity(session.accessToken, organizationId, opportunityId);
      const [pipelines, c] = await Promise.all([
        listPipelines(session.accessToken, organizationId),
        getCustomer(session.accessToken, organizationId, o.customerId),
      ]);
      setOpportunity(o);
      setPipeline(pipelines.find((p) => p.id === o.pipelineId) ?? pipelines[0] ?? null);
      setCustomer(c);
      setNotes(o.notes ?? '');
      setCompetitor(o.competitor ?? '');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar la Oportunidad.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, opportunityId, session?.accessToken]);

  async function withErrorHandling(action: () => Promise<Opportunity>, fallbackMessage: string) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : fallbackMessage);
    }
  }

  async function handleMoveStage(stageId: string) {
    if (!session || !organizationId || !opportunityId) return;
    await withErrorHandling(() => moveOpportunityStage(session.accessToken, organizationId, opportunityId, stageId), 'No se pudo mover de etapa.');
  }

  async function handleFieldBlur(field: 'estimatedValue' | 'probability', value: string) {
    if (!session || !organizationId || !opportunityId || !opportunity || !value) return;
    await withErrorHandling(
      () =>
        updateOpportunity(session.accessToken, organizationId, opportunityId, {
          version: opportunity.version,
          [field]: Number(value),
        }),
      'No se pudo actualizar el valor.',
    );
  }

  async function handleTextBlur(field: 'notes' | 'competitor', value: string) {
    if (!session || !organizationId || !opportunityId || !opportunity) return;
    await withErrorHandling(
      () => updateOpportunity(session.accessToken, organizationId, opportunityId, { version: opportunity.version, [field]: value }),
      'No se pudo actualizar.',
    );
  }

  if (!session) return null;
  if (loading) return <p className="p-7 text-text-2">Cargando…</p>;
  if (!opportunity) {
    return (
      <p role="alert" className="p-7 font-semibold text-red-text">
        {error ?? 'Oportunidad no encontrada.'}
      </p>
    );
  }

  const initials = opportunity.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-full animate-veloFade">
      <div data-scroll className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-8 pt-6">
          <div className="flex flex-wrap items-start gap-[18px]">
            <Avatar initials={initials} tone="accent" size="xl" />
            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight">{opportunity.name}</h1>
                <Badge tone={STATE_TONE[opportunity.state]}>{opportunity.state}</Badge>
                <Badge tone="blue">{opportunity.stage.name}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[12.5px] font-semibold text-text-2">
                {customer && (
                  <button onClick={() => navigate(`/organizations/${organizationId}/customers/${customer.id}`)} className="flex items-center gap-1.5 hover:text-accent">
                    <Icon name="building" size={14} /> {customer.name}
                  </button>
                )}
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={14} /> Creada el {new Date(opportunity.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {opportunity.state === 'Archivada' ? (
                <Button variant="primary" onClick={() => withErrorHandling(() => restoreOpportunity(session.accessToken, organizationId!, opportunityId!), 'No se pudo restaurar.')}>
                  Restaurar
                </Button>
              ) : (
                <>
                  {opportunity.state === 'Perdida' && (
                    <Button variant="primary" onClick={() => withErrorHandling(() => reopenOpportunity(session.accessToken, organizationId!, opportunityId!), 'No se pudo reabrir.')}>
                      Reabrir
                    </Button>
                  )}
                  {opportunity.state === 'Abierta' && (
                    <>
                      <Button variant="primary" onClick={() => withErrorHandling(() => winOpportunity(session.accessToken, organizationId!, opportunityId!), 'No se pudo marcar como Ganada.')}>
                        Marcar Ganada
                      </Button>
                      <Button variant="secondary" onClick={() => withErrorHandling(() => loseOpportunity(session.accessToken, organizationId!, opportunityId!), 'No se pudo marcar como Perdida.')}>
                        Marcar Perdida
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" onClick={() => withErrorHandling(() => archiveOpportunity(session.accessToken, organizationId!, opportunityId!), 'No se pudo archivar.')}>
                    Archivar
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[13px] font-semibold text-red-text">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-1 border-b border-border">
            <span className="-mb-px border-b-2 border-accent px-3.5 py-2.5 text-[13px] font-bold text-text">Resumen</span>
            <button
              onClick={() => navigate(`/organizations/${organizationId}/pipeline/${opportunity.id}/timeline`)}
              className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-text-2 hover:text-text"
            >
              Línea de tiempo
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          {opportunity.state === 'Abierta' && pipeline && (
            <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
              <span className="text-[12px] font-bold uppercase tracking-wide text-text-3">Etapa</span>
              <select
                value={opportunity.stageId}
                onChange={(e) => handleMoveStage(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-text outline-none"
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
              <span className="ml-2 flex items-center gap-2">
                <label htmlFor="opportunity-value" className="text-[12px] font-semibold text-text-2">
                  Valor
                </label>
                <input
                  id="opportunity-value"
                  type="number"
                  min={0}
                  defaultValue={opportunity.estimatedValue ?? ''}
                  onBlur={(e) => e.target.value && handleFieldBlur('estimatedValue', e.target.value)}
                  className="w-28 rounded-lg border border-border bg-surface px-2 py-1 text-[12.5px] text-text outline-none"
                />
              </span>
              <span className="flex items-center gap-2">
                <label htmlFor="opportunity-probability" className="text-[12px] font-semibold text-text-2">
                  Prob. %
                </label>
                <input
                  id="opportunity-probability"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={opportunity.probability ?? ''}
                  onBlur={(e) => e.target.value && handleFieldBlur('probability', e.target.value)}
                  className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-[12.5px] text-text outline-none"
                />
              </span>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryField label="Valor estimado" value={formatMoney(opportunity.estimatedValue)} />
            <SummaryField label="Valor ponderado" value={opportunity.weightedValue !== undefined ? formatMoney(String(opportunity.weightedValue)) : '—'} />
            <SummaryField label="Fecha estimada de cierre" value={opportunity.estimatedCloseDate ? new Date(opportunity.estimatedCloseDate).toLocaleDateString() : '—'} />
            <SummaryField label="Prioridad" value={opportunity.priority} />
            <SummaryField label="Etiquetas" value={opportunity.tags.length > 0 ? opportunity.tags.join(', ') : '—'} />
            <SummaryField label="Responsable" value={opportunity.ownerUserId === session.user.id ? 'Yo' : opportunity.ownerUserId ?? '—'} />
          </div>

          <Card className="mt-4 p-4">
            <label htmlFor="opportunity-competitor" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-text-3">
              Competidor
            </label>
            <input
              id="opportunity-competitor"
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              onBlur={(e) => handleTextBlur('competitor', e.target.value)}
              className="mb-3 w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[13px] outline-none"
            />
            <label htmlFor="opportunity-notes" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-text-3">
              Notas
            </label>
            <textarea
              id="opportunity-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={(e) => handleTextBlur('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[13px] outline-none"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-text-3">{label}</div>
      <div className="mt-1 text-[13px] font-semibold">{value || '—'}</div>
    </Card>
  );
}
