import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useToast } from '../../hooks/useToast.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const toast = useToast();

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
      const dest = location.state?.from || '/me';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-lhh flex justify-center py-16">
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="font-heading text-3xl text-brown text-center">Login</h1>

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

        <p className="text-center text-sm text-brown-soft">
          Don't have an account? <Link to="/signup" className="font-medium text-maroon underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
