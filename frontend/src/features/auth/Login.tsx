import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthApiError, login, verifyMfa } from '../../services/auth-api';
import { OAuthButtons } from './OAuthButtons';

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
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await login(email, password, rememberMe);

      if ('mfaRequired' in result) {
        setMfaChallengeToken(result.mfaChallengeToken);
        return;
      }

      // Access/refresh token storage is intentionally out of scope for this MVP
      // slice; a dedicated session-storage strategy lands with User Story 4.
      setEmailVerified(result.user.emailVerified);
    } catch (err) {
      setError(err instanceof AuthApiError ? 'Email o contraseña incorrectos.' : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaChallengeToken) return;

    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyMfa(mfaChallengeToken, mfaCode);
      setEmailVerified(result.user.emailVerified);
      setMfaChallengeToken(null);
    } catch (err) {
      setError(err instanceof AuthApiError ? 'Código incorrecto.' : 'No se pudo verificar el código.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mfaChallengeToken) {
    return (
      <main>
        <h1>Verificación en dos pasos</h1>
        <form onSubmit={handleMfaSubmit}>
          <label htmlFor="mfa-code">Código de tu app autenticadora</label>
          <input
            id="mfa-code"
            inputMode="numeric"
            required
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Verificando…' : 'Verificar'}
          </button>
        </form>
      </main>
    );
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
      <p>
        <Link to="/forgot-password">Olvidé mi contraseña</Link>
      </p>
      <OAuthButtons />
    </main>
  );
}
