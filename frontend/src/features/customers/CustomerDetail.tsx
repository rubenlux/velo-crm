import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Customer, archiveCustomer, getCustomer, restoreCustomer } from '../../services/customers-api';
import { Contact, searchContacts } from '../../services/contacts-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<Customer['status'], BadgeTone> = { active: 'green', inactive: 'neutral', suspended: 'amber', archived: 'red' };
const STATUS_LABEL: Record<Customer['status'], string> = { active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', archived: 'Archivado' };
const PRIORITY_TONE: Record<Customer['priority'], BadgeTone> = { low: 'neutral', medium: 'blue', high: 'red' };
const PRIORITY_LABEL: Record<Customer['priority'], string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

export function CustomerDetail() {
  const { organizationId, customerId } = useParams<{ organizationId: string; customerId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId || !customerId) return;
    setLoading(true);
    try {
      const [c, contactsResult] = await Promise.all([
        getCustomer(session.accessToken, organizationId, customerId),
        searchContacts(session.accessToken, organizationId, { customerId }),
      ]);
      setCustomer(c);
      setContacts(contactsResult.items);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el Customer.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, customerId, session?.accessToken]);

  async function handleArchive() {
    if (!session || !organizationId || !customerId) return;
    setError(null);
    try {
      await archiveCustomer(session.accessToken, organizationId, customerId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo archivar el Customer.');
    }
  }

  async function handleRestore() {
    if (!session || !organizationId || !customerId) return;
    setError(null);
    try {
      await restoreCustomer(session.accessToken, organizationId, customerId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo restaurar el Customer.');
    }
  }

  if (!session) return null;
  if (loading) return <p className="p-7 text-text-2">Cargando…</p>;
  if (!customer) {
    return (
      <p role="alert" className="p-7 font-semibold text-red-text">
        {error ?? 'Customer no encontrado.'}
      </p>
    );
  }

  const initials = customer.name
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
            <Avatar initials={initials} tone="green" size="xl" />
            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight">{customer.name}</h1>
                <Badge tone={STATUS_TONE[customer.status]}>{STATUS_LABEL[customer.status]}</Badge>
                <Badge tone={PRIORITY_TONE[customer.priority]}>Prioridad {PRIORITY_LABEL[customer.priority]}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[12.5px] font-semibold text-text-2">
                {customer.website && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="globe" size={14} /> {customer.website}
                  </span>
                )}
                {customer.city && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="pin" size={14} /> {customer.city}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={14} /> Cliente desde {new Date(customer.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(`/organizations/${organizationId}/customers/${customer.id}/edit`)}>
                Editar
              </Button>
              {customer.status === 'archived' ? (
                <Button variant="primary" onClick={handleRestore}>
                  Restaurar
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleArchive}>
                  Archivar
                </Button>
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
              onClick={() => navigate(`/organizations/${organizationId}/customers/${customer.id}/timeline`)}
              className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-text-2 hover:text-text"
            >
              Línea de tiempo
            </button>
            <button
              onClick={() => navigate(`/organizations/${organizationId}/contacts?customerId=${customer.id}`)}
              className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-text-2 hover:text-text"
            >
              Contactos ({contacts.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryField label="Razón social" value={customer.legalName} />
          <SummaryField label="Nombre comercial" value={customer.tradeName} />
          <SummaryField label="CUIT/NIF" value={customer.taxId} mono />
          <SummaryField label="Condición fiscal" value={customer.taxCondition} />
          <SummaryField label="Tipo" value={customer.type === 'company' ? 'Empresa' : 'Persona'} />
          <SummaryField label="Categoría" value={customer.category} />
          <SummaryField label="Fuente" value={customer.source} />
          <SummaryField label="Dirección" value={customer.address} />
          <SummaryField label="Etiquetas" value={customer.tags.length ? customer.tags.join(', ') : null} />
        </div>
      </div>

      <aside data-scroll className="w-[308px] flex-shrink-0 overflow-y-auto border-l border-border bg-surface px-5 py-[22px]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Detalles</div>
        <div className="mb-6 flex flex-col gap-3.5">
          <ContactRow icon="mail" label="Correo" value={customer.email} />
          <ContactRow icon="phone" label="Teléfono" value={customer.phone} />
          <ContactRow icon="globe" label="Sitio web" value={customer.website} />
        </div>

        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Contactos ({contacts.length})</div>
        <div className="mb-6 flex flex-col gap-1">
          {contacts.length === 0 && <p className="text-[12px] text-text-3">Sin Contacts todavía.</p>}
          {contacts.slice(0, 5).map((contact) => (
            <button
              key={contact.id}
              onClick={() => navigate(`/organizations/${organizationId}/contacts/${contact.id}`)}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-surface-2"
            >
              <Avatar initials={`${contact.firstName[0] ?? ''}${contact.lastName[0] ?? ''}`.toUpperCase()} tone="blue" size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-bold">
                  {contact.firstName} {contact.lastName}
                </div>
                <div className="truncate text-[10.5px] font-semibold text-text-3">{contact.jobTitle ?? '—'}</div>
              </div>
            </button>
          ))}
          <Button variant="secondary" size="sm" className="mt-1.5" onClick={() => navigate(`/organizations/${organizationId}/customers/${customer.id}/contacts/new`)}>
            + Agregar Contact
          </Button>
        </div>

        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Documentos</div>
        <Card className="p-3 text-[12px] text-text-3">Próximamente — módulo de Documentos aún no implementado.</Card>
      </aside>
    </div>
  );
}

function SummaryField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-text-3">{label}</div>
      <div className={`mt-1 text-[13px] font-semibold ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </Card>
  );
}

function ContactRow({ icon, label, value }: { icon: 'mail' | 'phone' | 'globe'; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex text-text-3">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold text-text-3">{label}</div>
        <div className="truncate text-[13px] font-semibold">{value || '—'}</div>
      </div>
    </div>
  );
}
