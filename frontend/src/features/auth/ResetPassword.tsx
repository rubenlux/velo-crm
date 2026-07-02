import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthApiError, confirmPasswordReset } from '../../services/auth-api';

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
      <main>
        <h1>Enlace inválido</h1>
        <Link to="/forgot-password">Solicitar un nuevo enlace</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Restablecer contraseña</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="reset-new-password">Nueva contraseña</label>
        <input
          id="reset-new-password"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />

        {error && (
          <p role="alert">
            {error} <Link to="/forgot-password">Solicitar de nuevo</Link>
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </main>
  );
}
