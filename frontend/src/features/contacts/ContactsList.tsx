import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Contact, ContactSearchFilters, ContactStatus, searchContacts } from '../../services/contacts-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<ContactStatus, BadgeTone> = { active: 'green', inactive: 'neutral', archived: 'red' };
const STATUS_LABEL: Record<ContactStatus, string> = { active: 'Activo', inactive: 'Inactivo', archived: 'Archivado' };

export function ContactsList() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = getSession();

  const [filters, setFilters] = useState<ContactSearchFilters>({ customerId: searchParams.get('customerId') ?? undefined });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) return;
    setLoading(true);
    try {
      const result = await searchContacts(session.accessToken, organizationId, filters);
      setContacts(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los Contacts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void refresh();
  }

  if (!session || !organizationId) return null;

  const columns: DataTableColumn<Contact>[] = [
    {
      key: 'name',
      label: 'Nombre',
      render: (c) => (
        <div>
          <div className="font-bold">
            {c.firstName} {c.lastName} {c.isPrimary && <Badge tone="accent">Principal</Badge>}
          </div>
          {c.jobTitle && <div className="text-[11.5px] text-text-3">{c.jobTitle}</div>}
        </div>
      ),
    },
    { key: 'company', label: 'Empresa', render: (c) => c.company ?? '—' },
    { key: 'email', label: 'Email', render: (c) => c.primaryEmail ?? '—' },
    { key: 'phone', label: 'Teléfono', render: (c) => c.primaryPhone ?? '—' },
    { key: 'status', label: 'Estado', render: (c) => <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge> },
  ];

  return (
    <div className="max-w-[1300px] p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Contactos</h1>
          <p className="mt-1 text-[13px] text-text-2">{total} Contacts en esta Organization</p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex w-[300px] items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text-3">
          <Icon name="search" size={15} />
          <input
            placeholder="Buscar por nombre, email, teléfono, cargo, empresa…"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
            className="w-full border-none bg-transparent text-[12.5px] text-text outline-none"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, status: (e.target.value || undefined) as ContactStatus | undefined }))}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2"
        >
          <option value="">Cualquier estado</option>
          {(Object.keys(STATUS_LABEL) as ContactStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          placeholder="Etiqueta"
          value={filters.tag ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, tag: e.target.value || undefined }))}
          className="w-[120px] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-text outline-none"
        />
        <Button type="submit" variant="secondary" size="sm">
          Buscar
        </Button>
      </form>

      {error && (
        <p role="alert" className="mb-3 text-[13px] font-semibold text-red-text">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-text-2">Cargando…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={contacts}
          getRowId={(c) => c.id}
          onRowClick={(c) => navigate(`/organizations/${organizationId}/contacts/${c.id}`)}
          emptyMessage="No hay Contacts que coincidan con la búsqueda."
        />
      )}
    </div>
  );
}
