import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { createOrganization } from '../../services/organizations-api';
import { getSession, setActiveOrganizationId } from '../../services/session';

export function CreateOrganization() {
  const navigate = useNavigate();
  const session = getSession();

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [currency, setCurrency] = useState('ARS');
  const [language, setLanguage] = useState('es');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const organization = await createOrganization(session!.accessToken, { name, timezone, currency, language });
      setActiveOrganizationId(organization.id);
      navigate(`/organizations/${organization.id}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo crear la organización.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Crear organización</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="org-name">Nombre</label>
        <input id="org-name" required value={name} onChange={(event) => setName(event.target.value)} />

        <label htmlFor="org-timezone">Zona horaria</label>
        <input id="org-timezone" required value={timezone} onChange={(event) => setTimezone(event.target.value)} />

        <label htmlFor="org-currency">Moneda</label>
        <input id="org-currency" required value={currency} onChange={(event) => setCurrency(event.target.value)} />

        <label htmlFor="org-language">Idioma</label>
        <input id="org-language" required value={language} onChange={(event) => setLanguage(event.target.value)} />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear organización'}
        </button>
      </form>
    </main>
  );
}
