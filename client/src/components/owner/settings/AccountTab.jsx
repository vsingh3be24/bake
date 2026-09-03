import { useState } from 'react';
import { useOwnerStore } from '../../../store/ownerStore.js';
import { useToast } from '../../../hooks/useToast.js';
import { api } from '../../../lib/api.js';
import { Input } from '../../ui/Input.jsx';
import { Button } from '../../ui/Button.jsx';

export function AccountTab() {
  const owner = useOwnerStore((s) => s.owner);
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await api.patch('/owner/me/password', { currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-sm flex-col gap-5">
      <div>
        <p className="text-sm text-brown-mute">Signed in as</p>
        <p className="font-medium text-brown">
          {owner?.name} • {owner?.phone}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <p className="text-sm text-out-stock">{error}</p>}
      </div>

      <Button
        className="w-fit"
        loading={saving}
        disabled={!currentPassword || !newPassword || !confirmPassword}
        onClick={submit}
      >
        Update Password
      </Button>
    </div>
  );
}
