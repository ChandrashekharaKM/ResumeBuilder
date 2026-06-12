import { BookOpen, Sparkles, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

interface LandingPageProps {
  onOpenAuth: () => void;
}

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
  return (
    <div className="landing-container">
      {/* Top Navigation Bar */}
      <header className="landing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Logo size={28} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)' }}>
            HoldMy<span style={{ color: 'var(--secondary)' }}>Resume</span>
          </span>
        </div>

        <nav className="landing-nav-links">
          <a className="landing-nav-link" href="#how-it-works">How It Works</a>
          <a className="landing-nav-link" href="#features">Features</a>
          <a className="landing-nav-link" href="#privacy">Privacy</a>
          <a className="landing-nav-link" onClick={onOpenAuth}>Pricing</a>
          <a className="landing-nav-link" onClick={onOpenAuth}>Help & resources</a>
        </nav>

        <div className="landing-auth-buttons">
          <button onClick={onOpenAuth} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>
            Log in
          </button>
          <button onClick={onOpenAuth} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            Sign up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-code-block">
          \begin{'{'}HoldMyResume{'}'}
        </div>
        <h1 className="hero-title">
          Write like a rockstar candidate.
        </h1>
        <p className="hero-subtitle">
          Optimize your resume to land interviews with our online AI editor. Bridging skills gaps in real-time through intelligent interactive questionnaires.
        </p>
        <button 
          onClick={onOpenAuth} 
          className="btn btn-primary" 
          style={{ 
            fontSize: '1.1rem', 
            padding: '1rem 2.5rem', 
            borderRadius: '30px', 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)'
          }}
        >
          Try it now, for free <ArrowRight size={18} />
        </button>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="landing-section">
        <h2 className="section-title">How It Works</h2>
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <FileText size={24} />
            </div>
            <h3 className="feature-title">1. Ingest</h3>
            <p className="feature-description">
              Upload your resume PDF for instant client-side parsing, or fill in our structured web forms from scratch.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <BookOpen size={24} />
            </div>
            <h3 className="feature-title">2. Target</h3>
            <p className="feature-description">
              Paste the target job description (JD). We align your experience terms to highlight matching qualifications.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <Sparkles size={24} />
            </div>
            <h3 className="feature-title">3. Interactive Q&A Gate</h3>
            <p className="feature-description">
              Cloudflare Workers AI generates 3 specific prompt questions targeting missing skills, adding your details back into the CV.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <h3 className="feature-title">4. Export</h3>
            <p className="feature-description">
              Review your tailored resume in our live A4 preview panel. Download a pixel-perfect PDF using browser print overrides.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="landing-section" style={{ borderTop: '1px solid var(--border-color)', paddingBottom: '6rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h2 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Your Data is Secure</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.7' }}>
            We prioritize candidate privacy. Your uploaded PDF contents are parsed entirely client-side inside your browser, never passing through our servers. AI optimizations are run securely on serverless nodes and historical resume logs can be permanently deleted at any time from your dashboard profile.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Logo size={20} />
              <span style={{ fontWeight: 700 }}>HoldMyResume</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Watch me land this interview. AI-powered resume builder deployed serverless on global edge nodes.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">About</h4>
            <a className="footer-link" onClick={onOpenAuth}>About us</a>
            <a className="footer-link" onClick={onOpenAuth}>Careers</a>
            <a className="footer-link" onClick={onOpenAuth}>Blog</a>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Solutions</h4>
            <a className="footer-link" onClick={onOpenAuth}>For Candidates</a>
            <a className="footer-link" onClick={onOpenAuth}>For Universities</a>
            <a className="footer-link" onClick={onOpenAuth}>For Enterprise</a>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Help</h4>
            <a className="footer-link" onClick={onOpenAuth}>Documentation</a>
            <a className="footer-link" onClick={onOpenAuth}>Contact us</a>
            <a className="footer-link" onClick={onOpenAuth}>Status</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} HoldMyResume. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a className="footer-link" onClick={onOpenAuth}>Privacy and Terms</a>
            <a className="footer-link" onClick={onOpenAuth}>Compliance</a>
            <a className="footer-link" onClick={onOpenAuth}>Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
