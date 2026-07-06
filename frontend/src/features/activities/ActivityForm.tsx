import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Customer, CustomerPriority, searchCustomers } from '../../services/customers-api';
import { Contact, searchContacts } from '../../services/contacts-api';
import { Lead, searchLeads } from '../../services/leads-api';
import { Opportunity, searchOpportunities } from '../../services/opportunities-api';
import { ActivityType, createActivity, listActivityTypes } from '../../services/activities-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput, FormSelect, FormField } from '../../components/ui/Field';

const PRIORITY_LABEL: Record<CustomerPriority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

type RelatedKind = 'customer' | 'contact' | 'lead' | 'opportunity';
const RELATED_KIND_LABEL: Record<RelatedKind, string> = {
  customer: 'Cliente',
  contact: 'Contacto',
  lead: 'Prospecto',
  opportunity: 'Oportunidad',
};

interface RelatedResult {
  id: string;
  label: string;
}

export function ActivityForm() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [relatedKind, setRelatedKind] = useState<RelatedKind>('customer');
  const [relatedQuery, setRelatedQuery] = useState('');
  const [relatedResults, setRelatedResults] = useState<RelatedResult[]>([]);
  const [related, setRelated] = useState<RelatedResult | null>(null);

  const [activityTypeId, setActivityTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [priority, setPriority] = useState<CustomerPriority>('medium');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTypes() {
      if (!session || !organizationId) return;
      const types = await listActivityTypes(session.accessToken, organizationId);
      setActivityTypes(types);
      if (types.length > 0) setActivityTypeId(types[0].id);
    }
    void loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  async function handleRelatedSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId || !relatedQuery.trim()) return;
    if (relatedKind === 'customer') {
      const result = await searchCustomers(session.accessToken, organizationId, { q: relatedQuery.trim() });
      setRelatedResults(result.items.map((c: Customer) => ({ id: c.id, label: c.name })));
    } else if (relatedKind === 'contact') {
      const result = await searchContacts(session.accessToken, organizationId, { q: relatedQuery.trim() });
      setRelatedResults(result.items.map((c: Contact) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` })));
    } else if (relatedKind === 'lead') {
      const result = await searchLeads(session.accessToken, organizationId, { q: relatedQuery.trim() });
      setRelatedResults(result.items.map((l: Lead) => ({ id: l.id, label: l.name })));
    } else {
      const result = await searchOpportunities(session.accessToken, organizationId, { q: relatedQuery.trim() });
      setRelatedResults(result.items.map((o: Opportunity) => ({ id: o.id, label: o.name })));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId || !related || !title.trim() || !activityTypeId || !scheduledAt) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await createActivity(session.accessToken, organizationId, {
        [relatedKind === 'customer' ? 'customerId' : relatedKind === 'contact' ? 'contactId' : relatedKind === 'lead' ? 'leadId' : 'opportunityId']:
          related.id,
        activityTypeId,
        title: title.trim(),
        description: description || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        priority,
      });
      navigate(`/organizations/${organizationId}/activities/${created.id}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo registrar la Activity.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  return (
    <div className="max-w-[760px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">Nueva Activity</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      <Card className="mb-4 p-6">
        <FormField label="Asociar a" htmlFor="activity-related-kind">
          <div className="mb-2 flex gap-1.5">
            {(Object.keys(RELATED_KIND_LABEL) as RelatedKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setRelatedKind(kind);
                  setRelated(null);
                  setRelatedResults([]);
                  setRelatedQuery('');
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  kind === relatedKind ? 'bg-accent text-white' : 'bg-surface-2 text-text-2'
                }`}
              >
                {RELATED_KIND_LABEL[kind]}
              </button>
            ))}
          </div>
          {related ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
              <span className="text-[13px] font-bold">{related.label}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRelated(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleRelatedSearch} className="flex gap-1.5">
                <input
                  id="activity-related-kind"
                  value={relatedQuery}
                  onChange={(e) => setRelatedQuery(e.target.value)}
                  placeholder={`Buscar ${RELATED_KIND_LABEL[relatedKind]}…`}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none"
                />
                <Button type="submit" variant="secondary">
                  Buscar
                </Button>
              </form>
              {relatedResults.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-surface p-1.5">
                  {relatedResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRelated(r);
                        setRelatedResults([]);
                      }}
                      className="rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-semibold hover:bg-surface-2"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </FormField>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect id="activity-type" label="Tipo" value={activityTypeId} onChange={(e) => setActivityTypeId(e.target.value)}>
            {activityTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FormSelect>
          <FormSelect id="activity-priority" label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as CustomerPriority)}>
            {(Object.keys(PRIORITY_LABEL) as CustomerPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </FormSelect>
          <FormInput id="activity-title" label="Título" required className="sm:col-span-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          <FormInput
            id="activity-scheduled-at"
            label="Fecha y hora"
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <FormInput
            id="activity-duration"
            label="Duración (minutos)"
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
          <FormInput
            id="activity-description"
            label="Descripción"
            className="sm:col-span-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={submitting || !related}>
              {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
