import { FormEvent, useState } from 'react';
import { AuthApiError, changePassword } from '../../services/auth-api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

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
    <Card className="p-5">
      <form onSubmit={handleSubmit}>
        <div className="mb-4 text-[15px] font-extrabold">Cambiar contraseña</div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="current-password" className="mb-1.5 block text-[11.5px] font-bold text-text-2">
              Contraseña actual
            </label>
            <input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent focus:bg-surface"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-[11.5px] font-bold text-text-2">
              Contraseña nueva
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent focus:bg-surface"
            />
          </div>
        </div>

        {status === 'success' && <p className="mt-3 text-[12.5px] font-semibold text-green-text">Contraseña actualizada.</p>}
        {status === 'error' && <p className="mt-3 text-[12.5px] font-semibold text-red-text">La contraseña actual no es correcta.</p>}

        <Button type="submit" variant="primary" disabled={submitting} className="mt-4">
          {submitting ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Card>
  );
}
