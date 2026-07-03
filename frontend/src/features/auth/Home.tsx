import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../services/auth-api';
import { clearSession, getActiveOrganizationId, getSession } from '../../services/session';

export function Home() {
  const navigate = useNavigate();
  const session = getSession();
  const activeOrganizationId = getActiveOrganizationId();

  async function handleLogout() {
    if (session) {
      await logout(session.accessToken, session.refreshToken).catch(() => undefined);
    }
    clearSession();
    navigate('/login');
  }

  if (!session) {
    return null;
  }

  return (
    <main>
      <h1>Hola, {session.user.email}</h1>
      {!session.user.emailVerified && <p role="status">Tu email todavía no está verificado.</p>}

      <nav>
        <ul>
          {activeOrganizationId && (
            <li>
              <Link to={`/organizations/${activeOrganizationId}`}>Mi organización</Link>
            </li>
          )}
          <li>
            <Link to="/organizations">Mis organizaciones</Link>
          </li>
          <li>
            <Link to="/organizations/new">Crear organización</Link>
          </li>
          <li>
            <Link to="/profile">Mi perfil</Link>
          </li>
          <li>
            <Link to="/preferences">Preferencias</Link>
          </li>
          <li>
            <Link to="/access-history">Historial de accesos</Link>
          </li>
          <li>
            <Link to="/sessions">Sesiones activas</Link>
          </li>
          <li>
            <Link to="/mfa">Autenticación en dos pasos</Link>
          </li>
          <li>
            <Link to="/change-password">Cambiar contraseña</Link>
          </li>
        </ul>
      </nav>

      <button type="button" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </main>
  );
}
