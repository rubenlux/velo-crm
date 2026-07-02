import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import {
  AuditLogEntry,
  Organization,
  getOrganization,
  listAuditLog,
  updateBranding,
  updateModules,
  updateOrganization,
  updateTaxSettings,
} from '../../services/organizations-api';
import { getSession, setActiveOrganizationId } from '../../services/session';

const AVAILABLE_MODULES = ['crm', 'agenda', 'facturacion', 'inventario', 'rrhh', 'automatizaciones'];

export function OrganizationSettings() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');
  const [language, setLanguage] = useState('');

  const [logoUrl, setLogoUrl] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [taxSettingsText, setTaxSettingsText] = useState('{}');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session || !organizationId) {
      return;
    }
    setActiveOrganizationId(organizationId);

    async function load() {
      setLoading(true);
      try {
        const [org, log] = await Promise.all([
          getOrganization(session!.accessToken, organizationId!),
          listAuditLog(session!.accessToken, organizationId!),
        ]);
        setOrganization(org);
        setName(org.name);
        setTimezone(org.timezone);
        setCurrency(org.currency);
        setLanguage(org.language);
        setLogoUrl(org.logoUrl ?? '');
        setCustomDomain(org.customDomain ?? '');
        setTaxSettingsText(JSON.stringify(org.taxSettings ?? {}, null, 2));
        setEnabledModules(org.enabledModules ?? []);
        setAuditLog(log);
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar la organización.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [organizationId, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setStatus(null);
    setSubmitting(true);

    try {
      const updated = await updateOrganization(session.accessToken, organizationId, {
        name,
        timezone,
        currency,
        language,
      });
      setOrganization(updated);
      setStatus('Cambios guardados.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar la organización.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBrandingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setStatus(null);
    setSubmitting(true);

    try {
      const updated = await updateBranding(session.accessToken, organizationId, {
        logoUrl: logoUrl || undefined,
        customDomain: customDomain || undefined,
      });
      setOrganization(updated);
      setStatus('Branding actualizado.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar el branding.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTaxSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setStatus(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(taxSettingsText);
    } catch {
      setError('Los impuestos deben ser un JSON válido.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateTaxSettings(session.accessToken, organizationId, parsed);
      setOrganization(updated);
      setStatus('Impuestos actualizados.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron actualizar los impuestos.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleModule(module: string) {
    setEnabledModules((current) =>
      current.includes(module) ? current.filter((m) => m !== module) : [...current, module],
    );
  }

  async function handleModulesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setStatus(null);
    setSubmitting(true);

    try {
      const updated = await updateModules(session.accessToken, organizationId, enabledModules);
      setOrganization(updated);
      setStatus('Módulos actualizados.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron actualizar los módulos.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando organización…</p>;
  }
  if (!organization) {
    return <p role="alert">{error ?? 'Organización no encontrada.'}</p>;
  }

  return (
    <main>
      <h1>Configuración de {organization.name}</h1>
      <p>
        <Link to={`/organizations/${organization.id}/members`}>Miembros</Link>
        {' · '}
        <Link to={`/organizations/${organization.id}/plan`}>Plan y facturación</Link>
      </p>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}

      <form onSubmit={handleSubmit}>
        <h2>Datos generales</h2>
        <label htmlFor="settings-name">Nombre</label>
        <input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} />

        <label htmlFor="settings-timezone">Zona horaria</label>
        <input id="settings-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />

        <label htmlFor="settings-currency">Moneda</label>
        <input id="settings-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} />

        <label htmlFor="settings-language">Idioma</label>
        <input id="settings-language" value={language} onChange={(event) => setLanguage(event.target.value)} />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      <form onSubmit={handleBrandingSubmit}>
        <h2>Branding</h2>
        <label htmlFor="settings-logo">Logo (URL)</label>
        <input id="settings-logo" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />

        <label htmlFor="settings-domain">Dominio personalizado</label>
        <input
          id="settings-domain"
          value={customDomain}
          onChange={(event) => setCustomDomain(event.target.value)}
        />

        <button type="submit" disabled={submitting}>
          Guardar branding
        </button>
      </form>

      <form onSubmit={handleTaxSettingsSubmit}>
        <h2>Impuestos</h2>
        <label htmlFor="settings-tax">Configuración de impuestos (JSON)</label>
        <textarea
          id="settings-tax"
          value={taxSettingsText}
          onChange={(event) => setTaxSettingsText(event.target.value)}
          rows={4}
        />

        <button type="submit" disabled={submitting}>
          Guardar impuestos
        </button>
      </form>

      <form onSubmit={handleModulesSubmit}>
        <h2>Módulos habilitados</h2>
        {AVAILABLE_MODULES.map((module) => (
          <label key={module} htmlFor={`module-${module}`}>
            <input
              id={`module-${module}`}
              type="checkbox"
              checked={enabledModules.includes(module)}
              onChange={() => toggleModule(module)}
            />
            {module}
          </label>
        ))}

        <button type="submit" disabled={submitting}>
          Guardar módulos
        </button>
      </form>

      <section>
        <h2>Audit Log</h2>
        <ul>
          {auditLog.map((entry) => (
            <li key={entry.id}>
              {new Date(entry.occurredAt).toLocaleString()} — {entry.action}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
