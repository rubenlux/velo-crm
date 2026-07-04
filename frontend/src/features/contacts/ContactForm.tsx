import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Contact, createContact, getContact, updateContact } from '../../services/contacts-api';
import { CustomerPriority } from '../../services/customers-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput, FormSelect } from '../../components/ui/Field';

const emptyForm = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  department: '',
  area: '',
  decisionLevel: '',
  primaryEmail: '',
  secondaryEmails: '',
  primaryPhone: '',
  secondaryPhones: '',
  whatsapp: '',
  linkedin: '',
  website: '',
  country: '',
  state: '',
  city: '',
  address: '',
  tags: '',
  priority: 'medium' as CustomerPriority,
};

export function ContactForm() {
  const { organizationId, customerId, contactId } = useParams<{
    organizationId: string;
    customerId?: string;
    contactId?: string;
  }>();
  const navigate = useNavigate();
  const session = getSession();
  const isEditing = Boolean(contactId);

  const [form, setForm] = useState(emptyForm);
  const [version, setVersion] = useState<number | null>(null);
  const [targetCustomerId, setTargetCustomerId] = useState(customerId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId || !contactId) {
        return;
      }
      setLoading(true);
      try {
        const contact = await getContact(session.accessToken, organizationId, contactId);
        applyContact(contact);
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el Contact.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, contactId, session?.accessToken]);

  function applyContact(contact: Contact) {
    setForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      jobTitle: contact.jobTitle ?? '',
      department: contact.department ?? '',
      area: contact.area ?? '',
      decisionLevel: contact.decisionLevel ?? '',
      primaryEmail: contact.primaryEmail ?? '',
      secondaryEmails: contact.secondaryEmails.join(', '),
      primaryPhone: contact.primaryPhone ?? '',
      secondaryPhones: contact.secondaryPhones.join(', '),
      whatsapp: contact.whatsapp ?? '',
      linkedin: contact.linkedin ?? '',
      website: contact.website ?? '',
      country: contact.country ?? '',
      state: contact.state ?? '',
      city: contact.city ?? '',
      address: contact.address ?? '',
      tags: contact.tags.join(', '),
      priority: contact.priority,
    });
    setVersion(contact.version);
    setTargetCustomerId(contact.customerId);
  }

  function field<K extends keyof typeof emptyForm>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((current) => ({ ...current, [key]: e.target.value })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const listify = (value: string) =>
        value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        jobTitle: form.jobTitle || undefined,
        department: form.department || undefined,
        area: form.area || undefined,
        decisionLevel: form.decisionLevel || undefined,
        primaryEmail: form.primaryEmail || undefined,
        secondaryEmails: listify(form.secondaryEmails),
        primaryPhone: form.primaryPhone || undefined,
        secondaryPhones: listify(form.secondaryPhones),
        whatsapp: form.whatsapp || undefined,
        linkedin: form.linkedin || undefined,
        website: form.website || undefined,
        country: form.country || undefined,
        state: form.state || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        tags: listify(form.tags),
        priority: form.priority,
      };
      if (isEditing && contactId && version !== null) {
        await updateContact(session.accessToken, organizationId, contactId, { ...payload, version });
        navigate(`/organizations/${organizationId}/contacts/${contactId}`);
      } else if (targetCustomerId) {
        const created = await createContact(session.accessToken, organizationId, targetCustomerId, payload);
        navigate(`/organizations/${organizationId}/contacts/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo guardar el Contact.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p className="p-7 text-text-2">Cargando…</p>;
  }

  return (
    <div className="max-w-[760px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">{isEditing ? 'Editar Contact' : 'Nuevo Contact'}</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!isEditing && (
            <FormInput
              id="contact-customer-id"
              label="Customer (id)"
              required
              value={targetCustomerId}
              onChange={(e) => setTargetCustomerId(e.target.value)}
              className="sm:col-span-2"
            />
          )}
          <FormInput id="contact-first-name" label="Nombre" required {...field('firstName')} />
          <FormInput id="contact-last-name" label="Apellido" required {...field('lastName')} />
          <FormInput id="contact-job-title" label="Cargo" {...field('jobTitle')} />
          <FormInput id="contact-department" label="Departamento" {...field('department')} />
          <FormInput id="contact-area" label="Área" {...field('area')} />
          <FormInput id="contact-decision-level" label="Nivel de decisión" {...field('decisionLevel')} />
          <FormInput id="contact-primary-email" label="Email principal" type="email" {...field('primaryEmail')} />
          <FormInput id="contact-secondary-emails" label="Emails secundarios (separados por coma)" {...field('secondaryEmails')} />
          <FormInput id="contact-primary-phone" label="Teléfono principal" {...field('primaryPhone')} />
          <FormInput id="contact-secondary-phones" label="Teléfonos secundarios (separados por coma)" {...field('secondaryPhones')} />
          <FormInput id="contact-whatsapp" label="WhatsApp" {...field('whatsapp')} />
          <FormInput id="contact-linkedin" label="LinkedIn" {...field('linkedin')} />
          <FormInput id="contact-website" label="Sitio web" {...field('website')} />
          <FormInput id="contact-country" label="País" {...field('country')} />
          <FormInput id="contact-state" label="Provincia" {...field('state')} />
          <FormInput id="contact-city" label="Ciudad" {...field('city')} />
          <FormInput id="contact-address" label="Dirección" className="sm:col-span-2" {...field('address')} />
          <FormInput id="contact-tags" label="Etiquetas (separadas por coma)" {...field('tags')} />
          <FormSelect id="contact-priority" label="Prioridad" {...field('priority')}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </FormSelect>

          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
