import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Activity, ActivitySearchFilters, ActivityStatus, ActivityType, listActivityTypes, searchActivities } from '../../services/activities-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<ActivityStatus, BadgeTone> = {
  Pendiente: 'blue',
  EnProceso: 'amber',
  Finalizada: 'green',
  Cancelada: 'neutral',
};
const STATUS_LABEL: Record<ActivityStatus, string> = {
  Pendiente: 'Pendiente',
  EnProceso: 'En proceso',
  Finalizada: 'Finalizada',
  Cancelada: 'Cancelada',
};

export function ActivitiesList() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [filters, setFilters] = useState<ActivitySearchFilters>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) return;
    setLoading(true);
    try {
      const [types, result] = await Promise.all([
        listActivityTypes(session.accessToken, organizationId),
        searchActivities(session.accessToken, organizationId, filters),
      ]);
      setActivityTypes(types);
      setActivities(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar las Activities.');
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

  const columns: DataTableColumn<Activity>[] = [
    {
      key: 'title',
      label: 'Título',
      render: (a) => (
        <div>
          <div className="font-bold">{a.title}</div>
          <div className="text-[11.5px] text-text-3">{a.activityType.name}</div>
        </div>
      ),
    },
    { key: 'scheduledAt', label: 'Fecha', render: (a) => new Date(a.scheduledAt).toLocaleString() },
    { key: 'priority', label: 'Prioridad', render: (a) => a.priority },
    { key: 'status', label: 'Estado', render: (a) => <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge> },
  ];

  return (
    <div className="max-w-[1300px] p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Activities</h1>
          <p className="mt-1 text-[13px] text-text-2">{total} Activities en esta Organization</p>
        </div>
        <Button variant="primary" icon={<Icon name="plus" size={15} />} onClick={() => navigate(`/organizations/${organizationId}/activities/new`)}>
          Nueva Activity
        </Button>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex w-[280px] items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text-3">
          <Icon name="search" size={15} />
          <input
            placeholder="Buscar por título…"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
            className="w-full border-none bg-transparent text-[12.5px] text-text outline-none"
          />
        </div>
        <select
          value={filters.activityTypeId ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, activityTypeId: e.target.value || undefined }))}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2"
        >
          <option value="">Cualquier tipo</option>
          {activityTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((current) => ({ ...current, status: (e.target.value || undefined) as ActivityStatus | undefined }))}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2"
        >
          <option value="">Cualquier estado</option>
          {(Object.keys(STATUS_LABEL) as ActivityStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
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
          rows={activities}
          getRowId={(a) => a.id}
          onRowClick={(a) => navigate(`/organizations/${organizationId}/activities/${a.id}`)}
          emptyMessage="No hay Activities que coincidan con la búsqueda."
        />
      )}
    </div>
  );
}
