import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Customer, CustomerPriority, searchCustomers } from '../../services/customers-api';
import { Contact, searchContacts } from '../../services/contacts-api';
import { Membership, listMembers } from '../../services/organizations-api';
import { createOpportunity } from '../../services/opportunities-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput, FormSelect, FormField } from '../../components/ui/Field';

const PRIORITY_LABEL: Record<CustomerPriority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

export function OpportunityForm() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);

  const [name, setName] = useState('');
  const [contactId, setContactId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [probability, setProbability] = useState('');
  const [estimatedCloseDate, setEstimatedCloseDate] = useState('');
  const [priority, setPriority] = useState<CustomerPriority>('medium');
  const [competitor, setCompetitor] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      if (!session || !organizationId) return;
      try {
        setMembers(await listMembers(session.accessToken, organizationId));
      } catch {
        // Falta de acceso al listado de miembros no bloquea la creación.
      }
    }
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  useEffect(() => {
    async function loadContacts() {
      if (!session || !organizationId || !customer) {
        setContacts([]);
        return;
      }
      const result = await searchContacts(session.accessToken, organizationId, { customerId: customer.id });
      setContacts(result.items);
    }
    void loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, organizationId, session?.accessToken]);

  async function handleCustomerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId || !customerQuery.trim()) return;
    const result = await searchCustomers(session.accessToken, organizationId, { q: customerQuery.trim() });
    setCustomerResults(result.items);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId || !customer || !name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await createOpportunity(session.accessToken, organizationId, {
        customerId: customer.id,
        contactId: contactId || undefined,
        name: name.trim(),
        ownerUserId: ownerUserId || undefined,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        probability: probability ? Number(probability) : undefined,
        estimatedCloseDate: estimatedCloseDate ? new Date(estimatedCloseDate).toISOString() : undefined,
        priority,
        competitor: competitor || undefined,
        notes: notes || undefined,
        tags: tags
          ? tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });
      navigate(`/organizations/${organizationId}/pipeline/${created.id}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo crear la Oportunidad.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  return (
    <div className="max-w-[760px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">Nueva Oportunidad</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      <Card className="mb-4 p-6">
        <FormField label="Cliente" htmlFor="opportunity-customer-search">
          {customer ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
              <span className="text-[13px] font-bold">{customer.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleCustomerSearch} className="flex gap-1.5">
                <input
                  id="opportunity-customer-search"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Buscar Cliente por nombre…"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none"
                />
                <Button type="submit" variant="secondary">
                  Buscar
                </Button>
              </form>
              {customerResults.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-surface p-1.5">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomer(c);
                        setCustomerResults([]);
                      }}
                      className="rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-semibold hover:bg-surface-2"
                    >
                      {c.name}
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
          <FormInput
            id="opportunity-name"
            label="Nombre de la Oportunidad"
            required
            className="sm:col-span-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {contacts.length > 0 && (
            <FormSelect id="opportunity-contact" label="Contacto" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Sin contacto asociado</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                  {c.isPrimary ? ' (principal)' : ''}
                </option>
              ))}
            </FormSelect>
          )}

          <FormSelect id="opportunity-owner" label="Responsable" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId === session.user.id ? 'Yo' : m.userId.slice(0, 8)} — {m.role}
              </option>
            ))}
          </FormSelect>

          <FormInput
            id="opportunity-value"
            label="Valor estimado"
            type="number"
            min={0}
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
          />
          <FormInput
            id="opportunity-probability"
            label="Probabilidad (%)"
            type="number"
            min={0}
            max={100}
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
          />
          <FormInput
            id="opportunity-close-date"
            label="Fecha estimada de cierre"
            type="date"
            value={estimatedCloseDate}
            onChange={(e) => setEstimatedCloseDate(e.target.value)}
          />
          <FormSelect id="opportunity-priority" label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as CustomerPriority)}>
            {(Object.keys(PRIORITY_LABEL) as CustomerPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </FormSelect>
          <FormInput id="opportunity-competitor" label="Competidor" value={competitor} onChange={(e) => setCompetitor(e.target.value)} />
          <FormInput id="opportunity-tags" label="Etiquetas (separadas por coma)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <FormInput id="opportunity-notes" label="Notas" className="sm:col-span-2" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={submitting || !customer}>
              {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
