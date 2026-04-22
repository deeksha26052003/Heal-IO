import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WaveBackground from '../components/WaveBackground';
import Logo from '../components/Logo';
import '../css/pages/Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-page">
      <WaveBackground />
      <main className="auth-card">
        <div style={{ marginBottom: 20 }}>
          <Logo />
        </div>
        <h2>Welcome back</h2>
        <p className="sub">Sign in to your health journal</p>

        {error && (
          <div className="toast error" role="alert" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="lbl" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="inp"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div>
            <label className="lbl" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="inp"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>
          <button className="btn-full" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-link">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </div>
      </main>
    </div>
  );
}
