import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOwnerStore } from '../../store/ownerStore.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function OwnerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useOwnerStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), password);
      const dest = location.state?.from || '/owner';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
        <div className="mb-2 text-center">
          <h1 className="font-heading text-3xl text-brown">Lucky's Home Harvest</h1>
          <p className="text-sm text-brown-mute">Owner Login</p>
        </div>

        <Input
          label="Phone Number"
          required
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="98765 43210"
        />
        <Input
          label="Password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-out-stock">{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={loading} loadingText="Logging in...">
          Login
        </Button>
      </form>
    </div>
  );
}
