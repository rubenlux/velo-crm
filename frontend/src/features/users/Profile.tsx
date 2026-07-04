import { FormEvent, useEffect, useState } from 'react';
import { AuthApiError } from '../../services/auth-api';
import { UserProfile, getMyProfile, updateMyProfile } from '../../services/users-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/ui/Field';
import { Avatar } from '../../components/ui/Avatar';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

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
    return <p className="text-[13px] text-text-2">Cargando perfil…</p>;
  }
  if (!profile) {
    return <p className="font-semibold text-red-text">{error ?? 'Perfil no encontrado.'}</p>;
  }

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || profile.email[0].toUpperCase();

  return (
    <Card className="p-6">
      <div className="mb-5 text-[15px] font-extrabold">Perfil</div>
      <p className="-mt-4 mb-5 text-[12.5px] text-text-2">Actualiza tu información personal y preferencias.</p>
      <div className="mb-5 flex items-center gap-4">
        <Avatar initials={initials} gradient="linear-gradient(140deg,#5B93EA,#7C6BDD)" size="lg" />
        <div className="text-[13px] text-text-2">{profile.email}</div>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput id="profile-first-name" label="Nombre" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        <FormInput id="profile-last-name" label="Apellido" value={lastName} onChange={(event) => setLastName(event.target.value)} />
        <FormInput id="profile-avatar" label="Avatar (URL)" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
        <FormInput id="profile-language" label="Idioma" value={language} onChange={(event) => setLanguage(event.target.value)} />
        <FormInput id="profile-timezone" label="Zona horaria" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="sm:col-span-2" />

        {error && (
          <p role="alert" className="sm:col-span-2 text-[12.5px] font-semibold text-red-text">
            {error}
          </p>
        )}
        {status && (
          <p role="status" className="sm:col-span-2 text-[12.5px] font-semibold text-green-text">
            {status}
          </p>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
