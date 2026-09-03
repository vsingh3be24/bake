import { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function Profile() {
  const customer = useAuthStore((s) => s.customer);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToast();

  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name, email });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSavingPassword(true);
    try {
      await api.patch('/customer/me/password', { currentPassword, newPassword });
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Could not change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-brown">Profile</h1>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-heading text-xl text-brown">Details</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone Number" value={customer?.phone || ''} disabled helperText="Phone number cannot be changed" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button type="submit" loading={savingProfile} className="w-fit">
            Save Changes
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-heading text-xl text-brown">Change Password</h2>
        <form onSubmit={savePassword} className="flex flex-col gap-4">
          <Input
            label="Current Password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New Password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="At least 6 characters"
            error={passwordError}
          />
          <Button type="submit" loading={savingPassword} className="w-fit">
            Update Password
          </Button>
        </form>
      </Card>

      <Button variant="secondary" onClick={logout} className="w-fit">
        Log Out
      </Button>
    </div>
  );
}
