import { FormEvent, useEffect, useState } from 'react';
import { AuthApiError } from '../../services/auth-api';
import { getMyProfile, updateMyPreferences } from '../../services/users-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function Preferences() {
  const session = getSession();

  const [preferencesText, setPreferencesText] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }
    getMyProfile(session.accessToken)
      .then((data) => setPreferencesText(JSON.stringify(data.preferences ?? {}, null, 2)))
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar las preferencias.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    setError(null);
    setStatus(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(preferencesText);
    } catch {
      setError('Las preferencias deben ser un JSON válido.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateMyPreferences(session.accessToken, parsed);
      setPreferencesText(JSON.stringify(updated.preferences, null, 2));
      setStatus('Preferencias guardadas.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron guardar las preferencias.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p className="text-[13px] text-text-2">Cargando preferencias…</p>;
  }

  return (
    <Card className="p-6">
      <div className="mb-4 text-[15px] font-extrabold">Preferencias avanzadas</div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="preferences-json" className="mb-1.5 block text-[11.5px] font-bold text-text-2">
          Preferencias (JSON)
        </label>
        <textarea
          id="preferences-json"
          value={preferencesText}
          onChange={(event) => setPreferencesText(event.target.value)}
          rows={6}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] text-text outline-none focus:border-accent focus:bg-surface"
        />

        {error && (
          <p role="alert" className="mt-3 text-[12.5px] font-semibold text-red-text">
            {error}
          </p>
        )}
        {status && (
          <p role="status" className="mt-3 text-[12.5px] font-semibold text-green-text">
            {status}
          </p>
        )}

        <Button type="submit" variant="secondary" disabled={submitting} className="mt-4">
          {submitting ? 'Guardando…' : 'Guardar preferencias'}
        </Button>
      </form>
    </Card>
  );
}
