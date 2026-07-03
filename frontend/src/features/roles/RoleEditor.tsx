import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import {
  PermissionDefinition,
  Role,
  createCustomRole,
  listAvailablePermissions,
  listRoles,
  updateCustomRole,
} from '../../services/roles-api';
import { getSession } from '../../services/session';

export function RoleEditor() {
  const { organizationId, roleId } = useParams<{ organizationId: string; roleId?: string }>();
  const navigate = useNavigate();
  const session = getSession();
  const isEditing = Boolean(roleId);

  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDefinition[]>([]);
  const [inheritsFromRoleId, setInheritsFromRoleId] = useState('');
  const [defaultRoles, setDefaultRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId) {
        return;
      }
      setLoading(true);
      try {
        const [roles, catalog] = await Promise.all([
          listRoles(session.accessToken, organizationId),
          listAvailablePermissions(session.accessToken, organizationId),
        ]);
        setDefaultRoles(roles.filter((role) => role.isDefault));
        setAvailablePermissions(catalog);
        if (roleId) {
          const current = roles.find((role) => role.id === roleId);
          if (current) {
            setName(current.name);
            setSelectedPermissions(new Set(current.permissions));
            setInheritsFromRoleId(current.inheritsFromRoleId ?? '');
          }
        }
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el rol.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, roleId, session]);

  function togglePermission(key: string) {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const permissions = [...selectedPermissions];
      if (isEditing && roleId) {
        await updateCustomRole(session.accessToken, organizationId, roleId, {
          name,
          permissions,
          inheritsFromRoleId: inheritsFromRoleId || null,
        });
      } else {
        await createCustomRole(session.accessToken, organizationId, {
          name,
          permissions,
          inheritsFromRoleId: inheritsFromRoleId || undefined,
        });
      }
      navigate(`/organizations/${organizationId}/roles`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo guardar el rol.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando…</p>;
  }

  // A permission already granted on this Role stays offered/checked even if its
  // module was since disabled (spec.md Assumptions: permissions aren't silently
  // dropped, only hidden from new selection once the module is off).
  const checkboxOptions = [
    ...availablePermissions,
    ...[...selectedPermissions]
      .filter((key) => !availablePermissions.some((p) => p.key === key))
      .map((key) => ({ key, module: null })),
  ];

  return (
    <main>
      <h1>{isEditing ? 'Editar rol' : 'Crear rol personalizado'}</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="role-name">Nombre</label>
        <input id="role-name" required value={name} onChange={(e) => setName(e.target.value)} />

        <fieldset>
          <legend>Permisos</legend>
          {checkboxOptions.map((permission) => (
            <label key={permission.key}>
              <input
                type="checkbox"
                checked={selectedPermissions.has(permission.key)}
                onChange={() => togglePermission(permission.key)}
              />
              {permission.key}
            </label>
          ))}
        </fieldset>

        <label htmlFor="role-inherits">Hereda de (opcional)</label>
        <select id="role-inherits" value={inheritsFromRoleId} onChange={(e) => setInheritsFromRoleId(e.target.value)}>
          <option value="">Ninguno</option>
          {defaultRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </main>
  );
}
