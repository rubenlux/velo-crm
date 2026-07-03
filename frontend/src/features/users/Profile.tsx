import { FormEvent, useEffect, useState } from 'react';
import { AuthApiError } from '../../services/auth-api';
import { UserProfile, getMyProfile, updateMyProfile } from '../../services/users-api';
import { getSession } from '../../services/session';

export function Profile() {
  const session = getSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }
    getMyProfile(session.accessToken)
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setAvatarUrl(data.avatarUrl ?? '');
        setLanguage(data.language);
        setTimezone(data.timezone);
      })
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el perfil.'))
      .finally(() => setLoading(false));
  }, [session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    setError(null);
    setStatus(null);
    setSubmitting(true);

    try {
      const updated = await updateMyProfile(session.accessToken, { firstName, lastName, avatarUrl, language, timezone });
      setProfile(updated);
      setStatus('Perfil actualizado.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar el perfil.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando perfil…</p>;
  }
  if (!profile) {
    return <p role="alert">{error ?? 'Perfil no encontrado.'}</p>;
  }

  return (
    <main>
      <h1>Mi perfil</h1>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="profile-first-name">Nombre</label>
        <input id="profile-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />

        <label htmlFor="profile-last-name">Apellido</label>
        <input id="profile-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />

        <label htmlFor="profile-avatar">Avatar (URL)</label>
        <input id="profile-avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />

        <label htmlFor="profile-language">Idioma</label>
        <input id="profile-language" value={language} onChange={(event) => setLanguage(event.target.value)} />

        <label htmlFor="profile-timezone">Zona horaria</label>
        <input id="profile-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </main>
  );
}
