import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { mergeContacts, transferContact } from '../../services/contacts-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/ui/Field';

export function TransferOrMergeContact() {
  const { organizationId, contactId } = useParams<{ organizationId: string; contactId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [toCustomerId, setToCustomerId] = useState('');
  const [duplicateContactId, setDuplicateContactId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId || !contactId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await transferContact(session.accessToken, organizationId, contactId, toCustomerId);
      navigate(`/organizations/${organizationId}/contacts/${contactId}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo transferir el Contact.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMerge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId || !contactId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const survivor = await mergeContacts(session.accessToken, organizationId, contactId, duplicateContactId);
      navigate(`/organizations/${organizationId}/contacts/${survivor.id}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo fusionar los Contacts.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-[560px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">Transferir o fusionar Contact</h1>
      {error && (
        <p role="alert" className="mb-4 font-semibold text-red-text">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Card className="p-6">
          <div className="mb-3 text-[15px] font-extrabold">Transferir a otro Customer</div>
          <form onSubmit={handleTransfer} className="flex flex-col gap-3.5">
            <FormInput id="to-customer-id" label="Customer de destino (id)" required value={toCustomerId} onChange={(e) => setToCustomerId(e.target.value)} />
            <Button type="submit" variant="primary" disabled={submitting} className="self-start">
              Transferir
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="mb-3 text-[15px] font-extrabold">Fusionar con un duplicado (mismo Customer)</div>
          <form onSubmit={handleMerge} className="flex flex-col gap-3.5">
            <FormInput
              id="duplicate-contact-id"
              label="Contact duplicado a descartar (id)"
              required
              value={duplicateContactId}
              onChange={(e) => setDuplicateContactId(e.target.value)}
            />
            <Button type="submit" variant="primary" disabled={submitting} className="self-start">
              Fusionar (este Contact sobrevive)
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
