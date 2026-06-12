import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, LogIn } from 'lucide-react';
import Logo from './Logo';

interface ResetPasswordProps {
  token: string;
  onDone: () => void; // Navigate back to login after success
}

function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--danger)', 'var(--warning)', '#60d394', 'var(--success)'];
  return { score: capped, label: labels[capped], color: colors[capped] };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function ResetPassword({ token, onDone }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { success: boolean; message?: string };
      if (!res.ok || !data.success) {
        setError(data.message || 'Reset failed. The link may have expired.');
        return;
      }
      setDone(true);
      // Clear the token from the URL without a page reload
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Brand mark */}
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
          </div>
        </div>

        {done ? (
          /* ── SUCCESS STATE ── */
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
            }}>
              <CheckCircle2 size={30} color="var(--success)" />
            </div>
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-color)', fontSize: '1.15rem', fontWeight: 700 }}>
              Password updated!
            </h2>
            <p style={{ margin: '0 0 1.75rem', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <button
              id="btn-reset-go-login"
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={onDone}
            >
              <LogIn size={16} /> Sign In Now
            </button>
          </div>
        ) : (
          /* ── RESET FORM ── */
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <KeyRound size={18} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)' }}>
                  Choose a new password
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Pick something strong. This link is single-use and expires in 1 hour.
              </p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* New password */}
              <div className="form-group" style={{ marginBottom: '0.6rem' }}>
                <label className="form-label" htmlFor="reset-password">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    id="reset-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="form-input"
                    placeholder="Min. 8 characters"
                    style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1} aria-label="Toggle password visibility">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="password-strength-track">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="password-strength-seg" style={{
                          background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                          transition: 'background 0.25s ease',
                        }} />
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
                <label className="form-label" htmlFor="reset-confirm">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    id="reset-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="form-input"
                    placeholder="Re-enter new password"
                    style={{
                      width: '100%', paddingLeft: '2.5rem', paddingRight: '2.75rem',
                      borderColor: confirm && confirm !== password ? 'var(--danger)' : undefined,
                    }}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowConfirm(v => !v)} tabIndex={-1} aria-label="Toggle confirm password visibility">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                    Passwords don't match
                  </span>
                )}
              </div>

              <button
                id="btn-reset-submit"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading || (confirm.length > 0 && password !== confirm)}
              >
                {loading
                  ? <><span className="auth-spinner" />Updating password...</>
                  : <><KeyRound size={15} />Set New Password</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
