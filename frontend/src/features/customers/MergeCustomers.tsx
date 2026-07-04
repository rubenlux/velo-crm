import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { mergeCustomers } from '../../services/customers-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/ui/Field';

export function MergeCustomers() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [survivorCustomerId, setSurvivorCustomerId] = useState('');
  const [discardedCustomerId, setDiscardedCustomerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const survivor = await mergeCustomers(session.accessToken, organizationId, survivorCustomerId, discardedCustomerId);
      navigate(`/organizations/${organizationId}/customers/${survivor.id}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo fusionar los Customers.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-[560px] p-7">
      <h1 className="mb-1.5 text-[22px] font-extrabold tracking-tight">Fusionar Customers duplicados</h1>
      <p className="mb-5 text-[13px] text-text-2">El Customer a conservar absorbe el historial del duplicado descartado.</p>
      {error && (
        <p role="alert" className="mb-4 font-semibold text-red-text">
          {error}
        </p>
      )}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput id="survivor-id" label="Customer a conservar (id)" required value={survivorCustomerId} onChange={(e) => setSurvivorCustomerId(e.target.value)} />
          <FormInput id="discarded-id" label="Customer duplicado a descartar (id)" required value={discardedCustomerId} onChange={(e) => setDiscardedCustomerId(e.target.value)} />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Fusionando…' : 'Fusionar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
