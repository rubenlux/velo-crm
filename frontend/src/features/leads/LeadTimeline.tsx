import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { LeadTimelineEntry, getLeadTimeline } from '../../services/leads-api';
import { getSession } from '../../services/session';
import { TimelineList } from '../../components/ui/TimelineList';

export function LeadTimeline() {
  const { organizationId, leadId } = useParams<{ organizationId: string; leadId: string }>();
  const session = getSession();

  const [entries, setEntries] = useState<LeadTimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId || !leadId) {
        return;
      }
      setLoading(true);
      try {
        setEntries(await getLeadTimeline(session.accessToken, organizationId, leadId));
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar la línea de tiempo.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, leadId, session?.accessToken]);

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
