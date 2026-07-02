import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthApiError, login } from '../../services/auth-api';

interface LocationState {
  justRegistered?: boolean;
}

export function Login() {
  const location = useLocation();
  const justRegistered = Boolean((location.state as LocationState | null)?.justRegistered);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await login(email, password, rememberMe);
      // Access/refresh token storage is intentionally out of scope for this MVP
      // slice; a dedicated session-storage strategy lands with User Story 4.
      setEmailVerified(result.user.emailVerified);
    } catch (err) {
      setError(err instanceof AuthApiError ? 'Email o contraseña incorrectos.' : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Iniciar sesión</h1>
      {justRegistered && <p>Te enviamos un email para verificar tu cuenta.</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="login-password">Contraseña</label>
        <input
          id="login-password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label htmlFor="login-remember-me">
          <input
            id="login-remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Recordar sesión
        </label>

        {error && <p role="alert">{error}</p>}
        {emailVerified === false && <p role="status">Tu email todavía no está verificado.</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p>
        ¿No tenés cuenta? <Link to="/register">Crear cuenta</Link>
      </p>
    </main>
  );
}
