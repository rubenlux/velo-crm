import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Customer, CustomerSearchFilters, CustomerStatus, searchCustomers } from '../../services/customers-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<CustomerStatus, BadgeTone> = {
  active: 'green',
  inactive: 'neutral',
  suspended: 'amber',
  archived: 'red',
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  archived: 'Archivado',
};

export function CustomersList() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [filters, setFilters] = useState<CustomerSearchFilters>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) return;
    setLoading(true);
    try {
      const result = await searchCustomers(session.accessToken, organizationId, filters);
      setCustomers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los Customers.');
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

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      label: 'Nombre',
      render: (c) => (
        <div>
          <div className="font-bold">{c.name}</div>
          {c.taxId && <div className="font-mono text-[11.5px] text-text-3">{c.taxId}</div>}
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (c) => c.email ?? '—' },
    { key: 'phone', label: 'Teléfono', render: (c) => c.phone ?? '—' },
    { key: 'city', label: 'Ciudad', render: (c) => c.city ?? '—' },
    {
      key: 'status',
      label: 'Estado',
      render: (c) => <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>,
    },
    {
      key: 'tags',
      label: 'Etiquetas',
      render: (c) => (c.tags.length ? c.tags.join(', ') : '—'),
    },
  ];

  return (
    <div className="max-w-[1300px] p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Clientes</h1>
          <p className="mt-1 text-[13px] text-text-2">{total} Customers en esta Organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/organizations/${organizationId}/customers/merge`)}>
            Fusionar duplicados
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/organizations/${organizationId}/customers/import-export`)}>
            Exportar / Importar
          </Button>
          <Button variant="primary" icon={<Icon name="plus" size={15} />} onClick={() => navigate(`/organizations/${organizationId}/customers/new`)}>
            Nuevo Customer
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex w-[280px] items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text-3">
          <Icon name="search" size={15} />
          <input
            placeholder="Buscar por nombre, CUIT, email, teléfono, etiqueta…"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
            className="w-full border-none bg-transparent text-[12.5px] text-text outline-none"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, status: (e.target.value || undefined) as CustomerStatus | undefined }))}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2"
        >
          <option value="">Cualquier estado</option>
          {(Object.keys(STATUS_LABEL) as CustomerStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          placeholder="Ciudad"
          value={filters.city ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, city: e.target.value || undefined }))}
          className="w-[140px] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-text outline-none"
        />
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
          rows={customers}
          getRowId={(c) => c.id}
          onRowClick={(c) => navigate(`/organizations/${organizationId}/customers/${c.id}`)}
          emptyMessage="No hay Customers que coincidan con la búsqueda."
        />
      )}
    </div>
  );
}
