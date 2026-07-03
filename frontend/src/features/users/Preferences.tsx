import { FormEvent, useEffect, useState } from 'react';
import { AuthApiError } from '../../services/auth-api';
import { getMyProfile, updateMyPreferences } from '../../services/users-api';
import { getSession } from '../../services/session';

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
  }, [session]);

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
    return <p>Cargando preferencias…</p>;
  }

  return (
    <main>
      <h1>Preferencias</h1>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="preferences-json">Preferencias (JSON)</label>
        <textarea
          id="preferences-json"
          value={preferencesText}
          onChange={(event) => setPreferencesText(event.target.value)}
          rows={6}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar preferencias'}
        </button>
      </form>
    </main>
  );
}
