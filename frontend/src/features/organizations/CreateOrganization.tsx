import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { createOrganization } from '../../services/organizations-api';
import { getSession, setActiveOrganizationId } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/ui/Field';

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
    <div className="max-w-[560px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">Crear organización</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput id="org-name" label="Nombre" required value={name} onChange={(event) => setName(event.target.value)} />
          <FormInput id="org-timezone" label="Zona horaria" required value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <FormInput id="org-currency" label="Moneda" required value={currency} onChange={(event) => setCurrency(event.target.value)} />
          <FormInput id="org-language" label="Idioma" required value={language} onChange={(event) => setLanguage(event.target.value)} />

          {error && (
            <p role="alert" className="font-semibold text-red-text">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={submitting} className="self-start">
            {submitting ? 'Creando…' : 'Crear organización'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
