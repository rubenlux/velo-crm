import { useEffect, useState } from 'react';
import { AuthApiError } from '../../services/auth-api';
import { AccessHistoryEntry, listAccessHistory } from '../../services/users-api';
import { getSession } from '../../services/session';

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
  }, [session]);

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando historial…</p>;
  }

  return (
    <main>
      <h1>Historial de accesos</h1>
      {error && <p role="alert">{error}</p>}
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            {entry.device.userAgent} — {new Date(entry.createdAt).toLocaleString()} ({entry.status})
          </li>
        ))}
      </ul>
    </main>
  );
}
