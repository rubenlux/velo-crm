import { FormEvent, useState } from 'react';
import { AuthApiError, changePassword } from '../../services/auth-api';

interface ChangePasswordProps {
  accessToken: string;
}

export function ChangePassword({ accessToken }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus('idle');

    try {
      await changePassword(accessToken, currentPassword, newPassword);
      setStatus('success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setStatus('error');
      void (err as AuthApiError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Cambiar contraseña</h2>

      <label htmlFor="current-password">Contraseña actual</label>
      <input
        id="current-password"
        type="password"
        required
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />

      <label htmlFor="new-password">Contraseña nueva</label>
      <input
        id="new-password"
        type="password"
        required
        minLength={8}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />

      {status === 'success' && <p role="status">Contraseña actualizada.</p>}
      {status === 'error' && <p role="alert">La contraseña actual no es correcta.</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
