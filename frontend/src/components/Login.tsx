import { useState, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
  onLogin: (token: string, email: string) => void;
  apiBaseUrl?: string;
}

type Tab = 'login' | 'register';

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  // Cap at 4
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--danger)', 'var(--warning)', '#60d394', 'var(--success)'];
  return { score: capped, label: labels[capped], color: colors[capped] };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function Login({ onLogin }: LoginProps) {
  const [tab, setTab] = useState<Tab>('login');

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const strength = getPasswordStrength(password);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
    setError('');
    setSuccess('');
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    resetForm();
  };

  // ── LOGIN ────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json() as { success: boolean; token?: string; email?: string; message?: string };

      if (!res.ok || !data.success) {
        setError(data.message || 'Login failed. Please check your credentials.');
        return;
      }

      onLogin(data.token!, data.email!);
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json() as { success: boolean; token?: string; email?: string; message?: string };

      if (!res.ok || !data.success) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccess('Account created! Logging you in...');
      setTimeout(() => onLogin(data.token!, data.email!), 900);
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ position: 'relative' }}>
      {/* Brand mark top-left */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
        <Logo size={28} />
        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.01em' }}>
          HoldMy<span style={{ color: 'var(--secondary)' }}>Resume</span>
        </span>
      </div>

      <div className="login-card glass-panel">
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Logo size={72} />
          <div style={{ textAlign: 'center' }}>
            <h1 className="login-logo" style={{ margin: 0 }}>
              HoldMy<span style={{ color: 'var(--secondary)' }}>Resume</span>
            </h1>
            <p style={{ textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Watch me land this interview.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            id="auth-tab-login"
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => switchTab('login')}
            type="button"
          >
            <LogIn size={15} />
            Sign In
          </button>
          <button
            id="auth-tab-register"
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => switchTab('register')}
            type="button"
          >
            <UserPlus size={15} />
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-alert auth-alert-success" role="status">
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input"
                  placeholder="you@example.com"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="form-input"
                  placeholder="Enter your password"
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginBottom: '1.75rem' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                onClick={() => setError('Password reset via email coming soon. Contact support if needed.')}
              >
                Forgot password?
              </button>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading
                ? <><span className="auth-spinner" />Signing in...</>
                : <><LogIn size={16} />Sign In</>}
            </button>

            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <button type="button" onClick={() => switchTab('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                Create one
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input"
                  placeholder="you@example.com"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: '0.6rem' }}>
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="form-input"
                  placeholder="Min. 8 characters"
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="password-strength-track">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="password-strength-seg"
                        style={{
                          background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                          transition: 'background 0.25s ease',
                        }}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strength.color, marginTop: '0.3rem', display: 'inline-block' }}>
                      {strength.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="form-input"
                  placeholder="Re-enter password"
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '2.75rem',
                    borderColor: confirmPassword && confirmPassword !== password ? 'var(--danger)' : undefined,
                  }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                  Passwords don't match
                </span>
              )}
            </div>

            <button
              id="btn-register-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)}
            >
              {loading
                ? <><span className="auth-spinner" />Creating account...</>
                : <><UserPlus size={16} />Create Account</>}
            </button>

            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => switchTab('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Footer note */}
        <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Your data is encrypted and never sold. By continuing you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
