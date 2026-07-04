import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { CustomerTimelineEntry, getCustomerTimeline } from '../../services/customers-api';
import { getSession } from '../../services/session';
import { TimelineList } from '../../components/ui/TimelineList';

export function CustomerTimeline() {
  const { organizationId, customerId } = useParams<{ organizationId: string; customerId: string }>();
  const session = getSession();

  const [entries, setEntries] = useState<CustomerTimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId || !customerId) {
        return;
      }
      setLoading(true);
      try {
        setEntries(await getCustomerTimeline(session.accessToken, organizationId, customerId));
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar la línea de tiempo.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, customerId, session?.accessToken]);

  if (!session) {
    return null;
  }
  if (loading) {
    return <p className="p-7 text-text-2">Cargando…</p>;
  }

  return (
    <div className="max-w-[720px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">Línea de tiempo</h1>
      {error && (
        <p role="alert" className="mb-4 font-semibold text-red-text">
          {error}
        </p>
      )}
      <TimelineList entries={entries} />
    </div>
  );
}
