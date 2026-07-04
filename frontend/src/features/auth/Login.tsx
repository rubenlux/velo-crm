import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthApiError, login, verifyMfa } from '../../services/auth-api';
import { saveSession } from '../../services/session';
import { OAuthButtons } from './OAuthButtons';
import { AuthLayout, AuthInput, AuthError, AuthSubmit } from './AuthLayout';

interface LocationState {
  justRegistered?: boolean;
}

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const justRegistered = Boolean((location.state as LocationState | null)?.justRegistered);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      saveSession(result);
      navigate('/');
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
      saveSession(result);
      navigate('/');
    } catch (err) {
      setError(err instanceof AuthApiError ? 'Código incorrecto.' : 'No se pudo verificar el código.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mfaChallengeToken) {
    return (
      <AuthLayout title="Verificación en dos pasos" subtitle="Ingresá el código de tu app autenticadora.">
        <form onSubmit={handleMfaSubmit}>
          <AuthInput
            id="mfa-code"
            label="Código"
            inputMode="numeric"
            required
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
          />
          {error && <AuthError>{error}</AuthError>}
          <AuthSubmit submitting={submitting}>{submitting ? 'Verificando…' : 'Verificar'}</AuthSubmit>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Iniciar sesión" subtitle={justRegistered ? 'Te enviamos un email para verificar tu cuenta.' : undefined}>
      <form onSubmit={handleSubmit}>
        <AuthInput id="login-email" label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <AuthInput
          id="login-password"
          label="Contraseña"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label htmlFor="login-remember-me" className="mb-4 flex items-center gap-2 text-[12.5px] font-semibold text-text-2">
          <input
            id="login-remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Recordar sesión
        </label>

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit submitting={submitting}>{submitting ? 'Ingresando…' : 'Ingresar'}</AuthSubmit>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2 text-[12.5px] font-semibold text-text-2">
        <span>
          ¿No tenés cuenta? <Link to="/register" className="text-accent">Crear cuenta</Link>
        </span>
        <Link to="/forgot-password" className="text-accent">
          Olvidé mi contraseña
        </Link>
      </div>
      <OAuthButtons />
    </AuthLayout>
  );
}
