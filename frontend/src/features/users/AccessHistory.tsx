import { useEffect, useState } from 'react';
import { AuthApiError } from '../../services/auth-api';
import { AccessHistoryEntry, listAccessHistory } from '../../services/users-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export function AccessHistory() {
  const session = getSession();

  const [entries, setEntries] = useState<AccessHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }
    listAccessHistory(session.accessToken)
      .then(setEntries)
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el historial.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  if (!session) {
    return null;
  }
  if (loading) {
    return <p className="text-[13px] text-text-2">Cargando historial…</p>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 text-[15px] font-extrabold">Historial de accesos</div>
      {error && (
        <p role="alert" className="px-5 py-3 font-semibold text-red-text">
          {error}
        </p>
      )}
      {entries.length === 0 && <p className="px-5 py-4 text-[12.5px] text-text-3">Sin accesos registrados.</p>}
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{entry.device.userAgent}</div>
            <div className="mt-0.5 text-[11.5px] text-text-3">{new Date(entry.createdAt).toLocaleString()}</div>
          </div>
          <Badge tone={entry.status === 'active' ? 'green' : 'neutral'}>{entry.status === 'active' ? 'Activa' : 'Revocada'}</Badge>
        </div>
      ))}
    </Card>
  );
}
