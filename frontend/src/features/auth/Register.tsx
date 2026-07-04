import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthApiError, register } from '../../services/auth-api';
import { OAuthButtons } from './OAuthButtons';
import { AuthLayout, AuthInput, AuthError, AuthSubmit } from './AuthLayout';

export function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(email, password);
      navigate('/login', { state: { justRegistered: true } });
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo completar el registro.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Crear cuenta">
      <form onSubmit={handleSubmit}>
        <AuthInput id="register-email" label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <AuthInput
          id="register-password"
          label="Contraseña"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit submitting={submitting}>{submitting ? 'Creando cuenta…' : 'Crear cuenta'}</AuthSubmit>
      </form>
      <p className="mt-5 text-center text-[12.5px] font-semibold text-text-2">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="text-accent">
          Iniciar sesión
        </Link>
      </p>
      <OAuthButtons />
    </AuthLayout>
  );
}
