import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check for persistent session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedEmail = localStorage.getItem('user_email');
    if (savedToken && savedEmail) {
      setToken(savedToken);
      setUserEmail(savedEmail);
    }
    setLoading(false);
  }, []);

  const handleLogin = (newToken: string, email: string) => {
    setToken(newToken);
    setUserEmail(email);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user_email', email);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Initializing HoldMyResume...</div>
      </div>
    );
  }

  return (
    <>
      <Dashboard 
        apiBaseUrl={API_BASE_URL} 
        token={token} 
        userEmail={userEmail || 'guest.user@example.com'} 
        onLogout={handleLogout}
        guestMode={!token}
        onOpenAuth={() => setShowAuthModal(true)}
      />
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuthModal(false)}>
              <X size={20} />
            </button>
            <Login onLogin={handleLogin} />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
