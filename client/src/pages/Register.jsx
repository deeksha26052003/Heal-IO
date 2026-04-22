import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WaveBackground from '../components/WaveBackground';
import Logo from '../components/Logo';
import '../css/pages/Register.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', gender: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.gender) return setError('Please select your biological sex');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.gender);
      navigate('/login', { state: { success: 'Account created! Please sign in.' } });
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
        <h2>Create account</h2>
        <p className="sub">Start tracking your health today</p>

        {error && (
          <div className="toast error" role="alert" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="lbl" htmlFor="reg-name">
              Full Name
            </label>
            <input
              id="reg-name"
              className="inp"
              type="text"
              placeholder="Sara Johnson"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>
          <div>
            <label className="lbl" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              className="inp"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div>
            <span id="gender-label" className="lbl">Biological Sex</span>
            <div className="gender-row" role="group" aria-labelledby="gender-label">
              {['female', 'male'].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`gender-btn${form.gender === g ? ' on' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, gender: g }))}
                  aria-pressed={form.gender === g}
                >
                  {g === 'female' ? 'Female' : 'Male'}
                </button>
              ))}
            </div>
            <p className="gender-note">Used only to personalise cycle tracking features</p>
          </div>
          <div>
            <label className="lbl" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              className="inp"
              type="password"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>
          <div>
            <label className="lbl" htmlFor="reg-confirm">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              className="inp"
              type="password"
              placeholder="Re-enter password"
              value={form.confirm}
              onChange={set('confirm')}
              required
            />
          </div>
          <button className="btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </main>
    </div>
  );
}
