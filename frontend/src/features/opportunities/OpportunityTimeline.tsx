import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { getOpportunityTimeline } from '../../services/opportunities-api';
import { searchActivities } from '../../services/activities-api';
import { getSession } from '../../services/session';
import { TimelineList, TimelineEntryLike } from '../../components/ui/TimelineList';

export function OpportunityTimeline() {
  const { organizationId, opportunityId } = useParams<{ organizationId: string; opportunityId: string }>();
  const session = getSession();

  const [entries, setEntries] = useState<TimelineEntryLike[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId || !opportunityId) {
        return;
      }
      setLoading(true);
      try {
        // Las Activities de esta Opportunity se agregan automáticamente (FR-009 de
        // spec 012, research.md #13).
        const [opportunityEntries, activitiesResult] = await Promise.all([
          getOpportunityTimeline(session.accessToken, organizationId, opportunityId),
          searchActivities(session.accessToken, organizationId, { opportunityId }),
        ]);
        const activityEntries: TimelineEntryLike[] = activitiesResult.items.map((a) => ({
          type: 'activity',
          occurredAt: a.scheduledAt,
          actorUserId: a.authorUserId,
          detail: { title: a.title, activityTypeName: a.activityType.name, status: a.status },
        }));
        const merged = [...(opportunityEntries as TimelineEntryLike[]), ...activityEntries].sort(
          (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
        );
        setEntries(merged);
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar la línea de tiempo.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, opportunityId, session?.accessToken]);

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
