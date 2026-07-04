import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Lead, LeadSearchFilters, LeadStatus, searchLeads } from '../../services/leads-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  Nuevo: 'blue',
  Contactado: 'amber',
  Calificado: 'purple',
  EnNegociacion: 'accent',
  Convertido: 'green',
  Perdido: 'red',
  Archivado: 'neutral',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  Nuevo: 'Nuevo',
  Contactado: 'Contactado',
  Calificado: 'Calificado',
  EnNegociacion: 'En negociación',
  Convertido: 'Convertido',
  Perdido: 'Perdido',
  Archivado: 'Archivado',
};

export function LeadsList() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [filters, setFilters] = useState<LeadSearchFilters>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) return;
    setLoading(true);
    try {
      const result = await searchLeads(session.accessToken, organizationId, filters);
      setLeads(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los Prospectos.');
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

  const columns: DataTableColumn<Lead>[] = [
    {
      key: 'name',
      label: 'Nombre',
      render: (lead) => (
        <div>
          <div className="font-bold">{lead.name}</div>
          {lead.company && <div className="text-[11.5px] text-text-3">{lead.company}</div>}
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (lead) => lead.email ?? '—' },
    { key: 'phone', label: 'Teléfono', render: (lead) => lead.phone ?? '—' },
    { key: 'source', label: 'Origen', render: (lead) => lead.source },
    { key: 'score', label: 'Score', align: 'right', render: (lead) => lead.score ?? '—' },
    {
      key: 'status',
      label: 'Estado',
      render: (lead) => <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>,
    },
  ];

  return (
    <div className="max-w-[1300px] p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Prospectos</h1>
          <p className="mt-1 text-[13px] text-text-2">{total} Prospectos en esta Organization</p>
        </div>
        <Button variant="primary" icon={<Icon name="plus" size={15} />} onClick={() => navigate(`/organizations/${organizationId}/leads/new`)}>
          Nuevo Prospecto
        </Button>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex w-[280px] items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text-3">
          <Icon name="search" size={15} />
          <input
            placeholder="Buscar por nombre, empresa, email, teléfono…"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
            className="w-full border-none bg-transparent text-[12.5px] text-text outline-none"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, status: (e.target.value || undefined) as LeadStatus | undefined }))}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2"
        >
          <option value="">Cualquier estado</option>
          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
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
          rows={leads}
          getRowId={(lead) => lead.id}
          onRowClick={(lead) => navigate(`/organizations/${organizationId}/leads/${lead.id}`)}
          emptyMessage="No hay Prospectos que coincidan con la búsqueda."
        />
      )}
    </div>
  );
}
