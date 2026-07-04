import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthApiError, confirmPasswordReset } from '../../services/auth-api';
import { AuthLayout, AuthInput, AuthError, AuthSubmit } from './AuthLayout';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await confirmPasswordReset(token, newPassword);
      navigate('/login');
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? 'El enlace no es válido o ya venció. Solicitá uno nuevo.'
          : 'No se pudo restablecer la contraseña.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Enlace inválido">
        <Link to="/forgot-password" className="text-[12.5px] font-bold text-accent">
          Solicitar un nuevo enlace
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Restablecer contraseña">
      <form onSubmit={handleSubmit}>
        <AuthInput
          id="reset-new-password"
          label="Nueva contraseña"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />

        {error && (
          <AuthError>
            {error} <Link to="/forgot-password">Solicitar de nuevo</Link>
          </AuthError>
        )}

        <AuthSubmit submitting={submitting}>{submitting ? 'Guardando…' : 'Guardar nueva contraseña'}</AuthSubmit>
      </form>
    </AuthLayout>
  );
}
