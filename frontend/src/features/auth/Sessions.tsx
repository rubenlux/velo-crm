import { useEffect, useState } from 'react';
import { SessionSummary, listSessions, revokeAllSessions, revokeSession } from '../../services/auth-api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

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
    return <p className="text-[13px] text-text-2">Cargando sesiones…</p>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="text-[15px] font-extrabold">Sesiones activas</div>
        <Button variant="secondary" size="sm" onClick={handleRevokeAll}>
          Cerrar todas
        </Button>
      </div>
      {sessions.map((session) => (
        <div key={session.id} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="truncate">{session.device.userAgent}</span>
              {session.id === currentSessionId && <Badge tone="green">Esta sesión</Badge>}
            </div>
            <div className="mt-0.5 text-[11.5px] text-text-3">Última actividad: {new Date(session.lastActivityAt).toLocaleString()}</div>
          </div>
          {session.id !== currentSessionId && (
            <Button variant="secondary" size="sm" onClick={() => handleRevoke(session.id)}>
              Cerrar
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}
