import { useEffect, useState } from 'react';
import { SessionSummary, listSessions, revokeAllSessions, revokeSession } from '../../services/auth-api';

interface SessionsProps {
  accessToken: string;
  currentSessionId?: string;
}

export function Sessions({ accessToken, currentSessionId }: SessionsProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setSessions(await listSessions(accessToken));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleRevoke(sessionId: string) {
    await revokeSession(accessToken, sessionId);
    await refresh();
  }

  async function handleRevokeAll() {
    await revokeAllSessions(accessToken);
    await refresh();
  }

  if (loading) {
    return <p>Cargando sesiones…</p>;
  }

  return (
    <section>
      <h2>Sesiones activas</h2>
      <ul>
        {sessions.map((session) => (
          <li key={session.id}>
            {session.device.userAgent}
            {session.id === currentSessionId && ' (esta sesión)'} — última actividad{' '}
            {new Date(session.lastActivityAt).toLocaleString()}
            {session.id !== currentSessionId && (
              <button type="button" onClick={() => handleRevoke(session.id)}>
                Cerrar sesión
              </button>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={handleRevokeAll}>
        Cerrar todas las sesiones
      </button>
    </section>
  );
}
