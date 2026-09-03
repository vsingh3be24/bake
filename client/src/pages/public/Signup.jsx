import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function Signup() {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(name.trim(), phone.trim(), password);
      navigate('/me', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-lhh flex justify-center py-16">
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="font-heading text-3xl text-brown text-center">Sign Up</h1>

        <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />
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
          helperText="At least 6 characters"
        />
        {error && <p className="text-sm text-out-stock">{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={loading} loadingText="Creating your account...">
          Sign Up
        </Button>

        <p className="text-center text-sm text-brown-soft">
          Already have an account? <Link to="/login" className="font-medium text-maroon underline">Login</Link>
        </p>
      </form>
    </div>
  );
}
