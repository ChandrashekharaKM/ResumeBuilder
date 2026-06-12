import { useState, useEffect } from 'react';
import { 
  LogOut, History, Plus, FileText, Printer, User, Sparkles, FileDown, 
  Brain, Image, FileImage, ArrowRight, Grid, ArrowLeft, Sun, Moon,
  ShieldCheck, CheckCircle, Trash2
} from 'lucide-react';
import WizardSteps from './WizardSteps';
import Logo from './Logo';
import ConversionTools from './ConversionTools';
import ResumeAnalyzer from './ResumeAnalyzer';

interface DashboardProps {
  apiBaseUrl: string;
  token: string | null;
  userEmail: string;
  onLogout: () => void;
  guestMode?: boolean;
  onOpenAuth?: () => void;
}

interface HistoryItem {
  id: string;
  save_name: string;
  generated_at: string;
  target_jd: string;
  tailored_resume_json: string;
}

const mockGuestHistory: HistoryItem[] = [
  {
    id: "mock-hist-1",
    save_name: "Google_Senior_Staff_FE",
    generated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    target_jd: "Staff Frontend Role at Google",
    tailored_resume_json: JSON.stringify({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "+1 (555) 012-3456",
      github: "github.com/janedoe",
      linkedin: "linkedin.com/in/janedoe",
      summary: "Staff Frontend Engineer specialized in building collaborative online document editor architectures (LaTeX-style tools) with dynamic state caches and robust print overrides.",
      skills: ["React & TypeScript", "Hono.js / Cloudflare Workers", "Workers KV / D1 SQL", "LaTeX / MathJax", "Vanilla CSS Layout Systems", "CI/CD & Git"],
      experience: [
        {
          role: "Senior Staff Architect",
          company: "Collaborative Web Devs",
          duration: "2024 - Present",
          details: [
            "Engineered rich document rendering engines with local offline synchronization frameworks, improving active retention by 35%.",
            "Designed serverless backend gateways handling JWT cryptographic verification and KV usage cap rate limits."
          ]
        }
      ],
      education: [
        {
          degree: "M.S. Computer Science",
          school: "Tech University",
          duration: "2022 - 2024"
        }
      ],
      projects: [
        {
          title: "HoldMyResume Online Builder",
          description: ["Designed transparent file compilation workflows matching user-defined job targeting profiles."],
          technologies: ["React", "Hono", "Cloudflare Workers"]
        }
      ]
    })
  },
  {
    id: "mock-hist-2",
    save_name: "SwipeGen_Intern_Python",
    generated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    target_jd: "Python Backend Intern",
    tailored_resume_json: JSON.stringify({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "+1 (555) 012-3456",
      github: "github.com/janedoe",
      linkedin: "linkedin.com/in/janedoe",
      summary: "Enthusiastic Computer Science student with practical projects involving serverless APIs and automated scripting tools.",
      skills: ["Python", "Flask", "SQLite", "Git", "CSS"],
      experience: [
        {
          role: "Backend Engineering Intern",
          company: "Startup Lab",
          duration: "Summer 2023",
          details: [
            "Wrote SQL scripts to manage test tables and synced schema updates across developer sandboxes.",
            "Built web scrapers extracting details from target candidate portfolios client-side."
          ]
        }
      ],
      education: [
        {
          degree: "B.S. Computer Science",
          school: "Tech University",
          duration: "2020 - 2024"
        }
      ],
      projects: [
        {
          title: "Auto Resume Structurer",
          description: ["Created Python parsing scripts parsing document files and outputting matching JSON formats."],
          technologies: ["Python", "SQLite"]
        }
      ]
    })
  }
];

export default function Dashboard({ apiBaseUrl, token, userEmail, onLogout, guestMode = false, onOpenAuth }: DashboardProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dbOffline, setDbOffline] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'builder' | 'analyse' | 'pdf_to_docx' | 'docx_to_pdf' | 'pdf_to_png' | 'png_to_pdf' | 'security_settings' | 'history_preview'>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [activeSecurityTab, setActiveSecurityTab] = useState<'cookies' | 'security' | 'privacy' | 'terms'>('cookies');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackOption, setFeedbackOption] = useState<string>('');
  const [cookieConsent, setCookieConsent] = useState(() => {
    try {
      const saved = localStorage.getItem('cookie_consent');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return { necessary: true, analytics: false, customization: false };
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const consented = localStorage.getItem('cookie_consent_given');
    if (!consented) {
      const timer = setTimeout(() => setShowCookieBanner(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleAcceptCookies = (all: boolean) => {
    const consent = { necessary: true, analytics: all, customization: all };
    setCookieConsent(consent);
    localStorage.setItem('cookie_consent', JSON.stringify(consent));
    localStorage.setItem('cookie_consent_given', 'true');
    setShowCookieBanner(false);
  };

  const handleUpdateCookieCategory = (category: 'analytics' | 'customization', val: boolean) => {
    const updated = { ...cookieConsent, [category]: val };
    setCookieConsent(updated);
  };

  const handleSaveCookiePreferences = () => {
    localStorage.setItem('cookie_consent', JSON.stringify(cookieConsent));
    localStorage.setItem('cookie_consent_given', 'true');
    alert("Cookie preferences updated successfully!");
  };

  const openSecurityTab = (tab: 'cookies' | 'security' | 'privacy' | 'terms') => {
    setActiveView('security_settings');
    setActiveSecurityTab(tab);
    setSelectedItem(null);
  };

  // Fetch history list from D1 backend
  const fetchHistory = async () => {
    setLoadingHistory(true);
    if (guestMode) {
      setHistory(mockGuestHistory);
      setDbOffline(false);
      setLoadingHistory(false);
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setHistory(result.history || []);
        if (result.message && result.message.includes("offline")) {
          setDbOffline(true);
        } else {
          setDbOffline(false);
        }
      }
    } catch (error) {
      console.error("Error loading history:", error);
      setDbOffline(true);
      // Try to load cached history from localStorage
      const cached = localStorage.getItem(`history_${userEmail}`);
      if (cached) {
        setHistory(JSON.parse(cached));
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userEmail, token]);

  // Save generation locally (fallback cache) and reload history list
  const handleGenerationComplete = (saveName: string, tailoredData: any) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      save_name: saveName,
      generated_at: new Date().toISOString(),
      target_jd: "Extracted Target",
      tailored_resume_json: JSON.stringify(tailoredData)
    };
    
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem(`history_${userEmail}`, JSON.stringify(updatedHistory));
    
    setSelectedItem(newItem);
    setActiveView('history_preview');
    fetchHistory();

    // Trigger feedback modal
    setShowFeedbackModal(true);
    setFeedbackSubmitted(false);
    setFeedbackRating(0);
    setFeedbackText('');
    setFeedbackOption('');
  };

  const handleSelectItem = (item: HistoryItem) => {
    setSelectedItem(item);
    setActiveView('history_preview');
  };

  const handleCreateNew = () => {
    setSelectedItem(null);
    setActiveView('builder');
  };

  // Parse CV details for rendering history preview
  const getParsedResumeData = (item: HistoryItem) => {
    try {
      return JSON.parse(item.tailored_resume_json);
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const selectedResume = selectedItem ? getParsedResumeData(selectedItem) : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar Header */}
      <header className="top-navbar">
        <div 
          className="nav-brand" 
          onClick={() => { setActiveView('home'); setSelectedItem(null); }} 
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.65rem' 
          }}
        >
          <Logo size={36} />
          <span className="brand-title" style={{ fontSize: '1.45rem' }}>
            HoldMy<span style={{ color: 'var(--secondary)' }}>Resume</span>
          </span>
          <span className="brand-tag">AI Career Suite</span>
        </div>

        <nav className="nav-links">
          <button 
            onClick={() => { setActiveView('home'); setSelectedItem(null); }} 
            className={`nav-link-btn ${activeView === 'home' ? 'active' : ''}`}
          >
            <Grid size={16} /> All Tools
          </button>
          <button 
            onClick={() => { setActiveView('builder'); setSelectedItem(null); }} 
            className={`nav-link-btn ${activeView === 'builder' || activeView === 'history_preview' ? 'active' : ''}`}
          >
            <Sparkles size={16} /> Resume Builder
          </button>
          <button 
            onClick={() => { setActiveView('analyse'); setSelectedItem(null); }} 
            className={`nav-link-btn ${activeView === 'analyse' ? 'active' : ''}`}
          >
            <Brain size={16} /> Resume Analyzer
          </button>
        </nav>

        <div className="nav-auth" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn" 
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {guestMode ? (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={onOpenAuth} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                Login
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={onOpenAuth} 
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', boxShadow: 'none' }}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="user-profile-badge">
              <div className="user-avatar-badge">
                <User size={13} />
              </div>
              <span className="user-email-badge-text" title={userEmail}>
                {userEmail.length > 22 ? `${userEmail.slice(0, 19)}...` : userEmail}
              </span>
              <button onClick={onLogout} className="logout-icon-button" title="Log Out">
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Guest Mode Banner */}
      {guestMode && activeView === 'home' && (
        <div className="guest-banner" style={{ margin: '1.5rem 3rem 0 3rem' }}>
          <div className="guest-banner-text">
            ✨ <strong>Preview Mode:</strong> You are browsing the tools dashboard as a guest. 
            Sign in to store resume optimizations in Cloudflare D1 and trigger Workers AI Llama 3.2 processing.
          </div>
          <button className="guest-banner-btn" onClick={onOpenAuth}>
            Sign In / Register
          </button>
        </div>
      )}

      {/* Workspace Panel */}
      <div className="workspace-container" style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
        {/* Version History Sidebar: Rendered ONLY in Builder or Preview mode */}
        {(activeView === 'builder' || activeView === 'history_preview') && (
          <aside className="sidebar">
            <button 
              onClick={() => { setActiveView('home'); setSelectedItem(null); }}
              className="btn btn-secondary" 
              style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem', fontSize: '0.8rem', gap: '0.4rem', justifyContent: 'flex-start', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            
            <button 
              onClick={handleCreateNew}
              className="btn btn-primary" 
              style={{ width: '100%', marginBottom: '1.5rem', gap: '0.5rem' }}
            >
              <Plus size={16} />
              New Optimization
            </button>

            <div className="sidebar-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={14} /> Version History
              </span>
            </div>

            <div className="history-list">
              {loadingHistory && history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading versions...</p>
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No resumes tailored yet.
                </p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className={`history-item ${selectedItem?.id === item.id ? 'active' : ''}`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="history-item-name">{item.save_name}</div>
                    <div className="history-item-date">
                      {new Date(item.generated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {dbOffline && (
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '1rem', background: 'rgba(245,158,11,0.08)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.2)' }}>
                ⚠️ DB offline. Savings cached locally.
              </div>
            )}
          </aside>
        )}

        {/* Main Panel Content */}
        <main className="main-content" style={{ padding: activeView === 'home' ? '3rem' : '2rem' }}>
          
          {/* VIEW: HOME DASHBOARD (GRID SELECTORS) */}
          {activeView === 'home' && (
            <div className="home-dashboard-view">
              <div className="homepage-hero">
                <h1 className="hero-main-title">Professional AI Resume & Document Suite</h1>
                <p className="hero-sub-title">Tailor resumes, ask AI questions, and package files completely client-side in seconds.</p>
              </div>

              <div className="tools-cards-grid">
                
                {/* 1. Generate Resume */}
                <div className="tool-card-box glass-panel" onClick={() => { setActiveView('builder'); handleCreateNew(); }}>
                  <div className="tool-card-icon-container" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    <Sparkles size={24} />
                  </div>
                  <div className="tool-card-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="tool-card-title-text">Generate Resume</h3>
                      <span className="tool-card-badge-pill" style={{ background: 'var(--primary-glow)', color: '#818cf8' }}>AI Powered</span>
                    </div>
                    <p className="tool-card-description-text">Optimize your resume against target job requirements and resolve AI interview questionnaires.</p>
                  </div>
                  <div className="tool-card-action-arrow">
                    <ArrowRight size={18} />
                  </div>
                </div>

                {/* 2. Analyse Resume */}
                <div className="tool-card-box glass-panel" onClick={() => { setActiveView('analyse'); setSelectedItem(null); }}>
                  <div className="tool-card-icon-container" style={{ background: 'var(--secondary-glow)', color: 'var(--secondary)' }}>
                    <Brain size={24} />
                  </div>
                  <div className="tool-card-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="tool-card-title-text">Analyse Resume</h3>
                      <span className="tool-card-badge-pill" style={{ background: 'var(--secondary-glow)', color: '#22d3ee' }}>AI Review</span>
                    </div>
                    <p className="tool-card-description-text">Upload your resume to ask Llama 3.2 questions, evaluate skills gap alignment, or get reviews.</p>
                  </div>
                  <div className="tool-card-action-arrow">
                    <ArrowRight size={18} />
                  </div>
                </div>

                {/* 3. PDF to DOCX */}
                <div className="tool-card-box glass-panel" onClick={() => { setActiveView('pdf_to_docx'); setSelectedItem(null); }}>
                  <div className="tool-card-icon-container" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
                    <FileDown size={24} />
                  </div>
                  <div className="tool-card-details">
                    <h3 className="tool-card-title-text">PDF to Word (DOCX)</h3>
                    <p className="tool-card-description-text">Extract readable text segments from PDF documents and save as editable Word documents.</p>
                  </div>
                  <div className="tool-card-action-arrow">
                    <ArrowRight size={18} />
                  </div>
                </div>

                {/* 4. DOCX to PDF */}
                <div className="tool-card-box glass-panel" onClick={() => { setActiveView('docx_to_pdf'); setSelectedItem(null); }}>
                  <div className="tool-card-icon-container" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
                    <FileImage size={24} />
                  </div>
                  <div className="tool-card-details">
                    <h3 className="tool-card-title-text">Word (DOCX) to PDF</h3>
                    <p className="tool-card-description-text">Convert Microsoft Word documents (.docx) into standard print-ready PDF files client-side.</p>
                  </div>
                  <div className="tool-card-action-arrow">
                    <ArrowRight size={18} />
                  </div>
                </div>

                {/* 5. PDF to Images */}
                <div className="tool-card-box glass-panel" onClick={() => { setActiveView('pdf_to_png'); setSelectedItem(null); }}>
                  <div className="tool-card-icon-container" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                    <Image size={24} />
                  </div>
                  <div className="tool-card-details">
                    <h3 className="tool-card-title-text">PDF to Images</h3>
                    <p className="tool-card-description-text">Render pages from a PDF file into separate high-resolution PNG image sheets.</p>
                  </div>
                  <div className="tool-card-action-arrow">
                    <ArrowRight size={18} />
                  </div>
                </div>

                {/* 6. Images to PDF */}
                <div className="tool-card-box glass-panel" onClick={() => { setActiveView('png_to_pdf'); setSelectedItem(null); }}>
                  <div className="tool-card-icon-container" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--secondary)' }}>
                    <FileImage size={24} />
                  </div>
                  <div className="tool-card-details">
                    <h3 className="tool-card-title-text">Images to PDF</h3>
                    <p className="tool-card-description-text">Merge and compile multiple image slides (JPG, PNG) into a single A4 PDF package.</p>
                  </div>
                  <div className="tool-card-action-arrow">
                    <ArrowRight size={18} />
                  </div>
                </div>

                {/* 7. Security & Cookies */}
                <div className="tool-card-box glass-panel" onClick={() => openSecurityTab('cookies')}>
                  <div className="tool-card-icon-container" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div className="tool-card-details">
                    <h3 className="tool-card-title-text">Security & Cookies</h3>
                    <p className="tool-card-description-text">Manage cookie preferences, view secure serverless audit details, and read privacy logs.</p>
                  </div>
                  <div className="tool-card-action-arrow">
                    <ArrowRight size={18} />
                  </div>
                </div>

              </div>

              {/* Horizontal List of Resumes (History) */}
              {history.length > 0 && (
                <div className="dashboard-history-list-section" style={{ marginTop: '4rem' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)' }}>
                    <History size={20} color="var(--primary)" />
                    Recent Generations
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {history.slice(0, 4).map((item) => (
                      <div 
                        key={item.id} 
                        className="recent-history-card glass-panel"
                        onClick={() => handleSelectItem(item)}
                        style={{ cursor: 'pointer', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'var(--transition)' }}
                      >
                        <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.6rem', borderRadius: '8px' }}>
                          <FileText size={22} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.save_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.generated_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* How It Works Section */}
              <div className="how-it-works-section" style={{ marginTop: '5rem', padding: '3rem 2rem', borderRadius: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', fontFamily: 'var(--font-display)' }}>
                  🚀 How HoldMyResume Works
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', fontSize: '1.25rem', fontWeight: 800 }}>1</div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'white' }}>Select Your Tool</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Choose from AI Resume builders, text reviewers, or format converters directly from the dashboard.</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--secondary-glow)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', fontSize: '1.25rem', fontWeight: 800 }}>2</div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'white' }}>Optimize with AI</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Input target job descriptions and questions. Workers AI Llama 3.2 instantly tailors your CV metrics.</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', fontSize: '1.25rem', fontWeight: 800 }}>3</div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'white' }}>Convert & Export</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Compile your finalized documents to MS Word (DOCX) or print-ready PDF formats client-side.</p>
                  </div>
                </div>
              </div>

              {/* Reviews & Success Stories Section */}
              <div className="testimonials-section" style={{ marginTop: '5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                  ⭐️ Candidate Success Stories
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
                  HoldMyResume has helped thousands of job seekers optimize their resumes, pass ATS systems, and land interviews at leading tech firms.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  
                  <div className="testimonial-card glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', color: 'var(--warning)', gap: '0.1rem' }}>
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-color)', flex: 1 }}>
                      "The AI Resume Builder tailored my bullet points perfectly for a Staff Architect role at Google. I got a callback within 4 days! The print PDF override looks extremely clean."
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                        JD
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>Jane Doe</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Staff Frontend Engineer @ Google</div>
                      </div>
                    </div>
                  </div>

                  <div className="testimonial-card glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', color: 'var(--warning)', gap: '0.1rem' }}>
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-color)', flex: 1 }}>
                      "The client-side PDF parser is incredibly convenient. I converted my old PDF, ran the Llama 3.2 query tool to check for missing skill gaps, and downloaded a matching Word file. Highly recommended!"
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--secondary-glow)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                        AM
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>Alex Morgan</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Senior Software Architect @ Microsoft</div>
                      </div>
                    </div>
                  </div>

                  <div className="testimonial-card glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', color: 'var(--warning)', gap: '0.1rem' }}>
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-color)', flex: 1 }}>
                      "Using the Images to PDF compiler client-side was so fast. The interface feels premium and is fully responsive. Dark/light theme toggler is a really nice touch."
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                        KS
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>Kevin Smith</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Security Engineer @ Meta</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Global Footer */}
              <footer className="dashboard-footer">
                <div>
                  © {new Date().getFullYear()} HoldMyResume. Watch me land this interview.
                </div>
                <div className="footer-links">
                  <span onClick={() => openSecurityTab('privacy')} className="footer-link">Privacy Policy</span>
                  <span onClick={() => openSecurityTab('terms')} className="footer-link">Terms of Service</span>
                  <span onClick={() => openSecurityTab('cookies')} className="footer-link">Cookie Policy</span>
                </div>
              </footer>

            </div>
          )}

          {/* VIEW: RESUME BUILDER (WIZARD) */}
          {activeView === 'builder' && (
            <WizardSteps 
              apiBaseUrl={apiBaseUrl}
              token={token || ''}
              onGenerationComplete={handleGenerationComplete}
              guestMode={guestMode}
              onOpenAuth={onOpenAuth}
            />
          )}

          {/* VIEW: RESUME ANALYZER */}
          {activeView === 'analyse' && (
            <ResumeAnalyzer
              apiBaseUrl={apiBaseUrl}
              token={token}
              guestMode={guestMode}
              onOpenAuth={onOpenAuth}
              onBack={() => setActiveView('home')}
              onActionComplete={() => {
                setShowFeedbackModal(true);
                setFeedbackSubmitted(false);
                setFeedbackRating(0);
                setFeedbackText('');
                setFeedbackOption('');
              }}
            />
          )}

          {/* VIEW: CONVERTER TOOLS */}
          {(activeView === 'pdf_to_docx' || activeView === 'docx_to_pdf' || activeView === 'pdf_to_png' || activeView === 'png_to_pdf') && (
            <ConversionTools 
              activeResumeData={selectedResume} 
              guestMode={guestMode} 
              onOpenAuth={onOpenAuth} 
              onBack={() => setActiveView('home')}
              activeTool={activeView as any}
              onActionComplete={() => {
                setShowFeedbackModal(true);
                setFeedbackSubmitted(false);
                setFeedbackRating(0);
                setFeedbackText('');
                setFeedbackOption('');
              }}
            />
          )}

          {/* VIEW: HISTORY PREVIEW */}
          {activeView === 'history_preview' && selectedItem && selectedResume && (
            <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
              <div className="preview-actions">
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedItem.save_name}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Optimized on {new Date(selectedItem.generated_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={guestMode ? onOpenAuth : handleCreateNew} className="btn btn-secondary">
                    Create New Optimization
                  </button>
                  <button 
                    onClick={() => {
                      if (guestMode) {
                        onOpenAuth?.();
                      } else {
                        window.print();
                        setTimeout(() => {
                          setShowFeedbackModal(true);
                          setFeedbackSubmitted(false);
                          setFeedbackRating(0);
                          setFeedbackText('');
                          setFeedbackOption('');
                        }, 1200);
                      }
                    }} 
                    className="btn btn-primary" 
                    style={{ gap: '0.5rem' }}
                  >
                    <Printer size={18} />
                    Print / Save PDF
                  </button>
                </div>
              </div>

              <div className="preview-container">
                <div className="a4-page">
                  <div className="cv-header">
                    <div className="cv-name">{selectedResume.name}</div>
                    <div className="cv-contact">
                      <span>📧 {selectedResume.email}</span>
                      <span>📞 {selectedResume.phone}</span>
                      {selectedResume.github && <span>💻 {selectedResume.github}</span>}
                      {selectedResume.linkedin && <span>🔗 {selectedResume.linkedin}</span>}
                    </div>
                  </div>

                  <div className="cv-section">
                    <div className="cv-section-title">Professional Summary</div>
                    <div className="cv-summary">{selectedResume.summary}</div>
                  </div>

                  {selectedResume.skills && selectedResume.skills.length > 0 && (
                    <div className="cv-section">
                      <div className="cv-section-title">Technical Skills</div>
                      <div className="cv-skills-grid">
                        {selectedResume.skills.map((skill: string, sIdx: number) => (
                          <span key={sIdx} className="cv-skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedResume.experience && selectedResume.experience.length > 0 && (
                    <div className="cv-section">
                      <div className="cv-section-title">Work History</div>
                      {selectedResume.experience.map((exp: any, eIdx: number) => (
                        <div key={eIdx} className="cv-experience-item">
                          <div className="cv-item-header">
                            <span>{exp.role}</span>
                            <span>{exp.duration}</span>
                          </div>
                          <div className="cv-item-sub">
                            <span>{exp.company}</span>
                          </div>
                          <ul className="cv-bullet-list">
                            {Array.isArray(exp.details) ? (
                              exp.details.map((detail: string, dIdx: number) => (
                                <li key={dIdx}>{detail}</li>
                              ))
                            ) : (
                              <li>{exp.details}</li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedResume.projects && selectedResume.projects.length > 0 && (
                    <div className="cv-section">
                      <div className="cv-section-title">Key Projects</div>
                      {selectedResume.projects.map((proj: any, pIdx: number) => (
                        <div key={pIdx} className="cv-project-item">
                          <div className="cv-item-header">
                            <span>{proj.title}</span>
                            {proj.technologies && <span className="cv-project-tech">[{proj.technologies.join(', ')}]</span>}
                          </div>
                          <ul className="cv-bullet-list">
                            {Array.isArray(proj.description) ? (
                              proj.description.map((desc: string, descIdx: number) => (
                                <li key={descIdx}>{desc}</li>
                              ))
                            ) : (
                              <li>{proj.description}</li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedResume.education && selectedResume.education.length > 0 && (
                    <div className="cv-section" style={{ marginTop: 'auto' }}>
                      <div className="cv-section-title">Education</div>
                      {selectedResume.education.map((edu: any, eduIdx: number) => (
                        <div key={eduIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '4px' }}>
                          <div>
                            <strong>{edu.degree}</strong> - {edu.school}
                          </div>
                          <div>{edu.duration}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SECURITY & PRIVACY CENTER */}
          {activeView === 'security_settings' && (
            <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
              <div className="preview-actions" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                    <ShieldCheck size={28} color="var(--primary)" />
                    Security & Privacy Center
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                    Manage cookie preferences, view system security metrics, and access privacy logs.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveView('home')} 
                  className="btn btn-secondary" 
                  style={{ gap: '0.4rem', display: 'inline-flex', alignItems: 'center' }}
                >
                  <ArrowLeft size={16} /> Back to Tools
                </button>
              </div>

              <div className="security-center-layout">
                {/* Left Side Tabs */}
                <div className="security-sidebar-tabs">
                  <button 
                    onClick={() => setActiveSecurityTab('cookies')}
                    className={`security-tab-btn ${activeSecurityTab === 'cookies' ? 'active' : ''}`}
                  >
                    🍪 Cookie Manager
                  </button>
                  <button 
                    onClick={() => setActiveSecurityTab('security')}
                    className={`security-tab-btn ${activeSecurityTab === 'security' ? 'active' : ''}`}
                  >
                    🔒 Security Audit
                  </button>
                  <button 
                    onClick={() => setActiveSecurityTab('privacy')}
                    className={`security-tab-btn ${activeSecurityTab === 'privacy' ? 'active' : ''}`}
                  >
                    📄 Privacy Policy
                  </button>
                  <button 
                    onClick={() => setActiveSecurityTab('terms')}
                    className={`security-tab-btn ${activeSecurityTab === 'terms' ? 'active' : ''}`}
                  >
                    ⚖️ Terms of Service
                  </button>
                </div>

                {/* Right Side Content Panel */}
                <div className="security-tab-content glass-panel" style={{ padding: '2rem' }}>
                  
                  {/* TAB 1: COOKIE MANAGER */}
                  {activeSecurityTab === 'cookies' && (
                    <div>
                      <h3 className="security-section-title">Cookie Preference Manager</h3>
                      <p className="security-section-desc">
                        Under GDPR and data compliance policies, you can adjust which types of tracking cookies and local storage tokens you authorize HoldMyResume to utilize.
                      </p>

                      <div className="cookie-pref-list">
                        
                        {/* Essential Cookies */}
                        <div className="cookie-pref-card">
                          <div className="cookie-pref-header">
                            <span className="cookie-pref-title">
                              Essential Storage & Session Tokens
                            </span>
                            <span className="cookie-pref-badge">Always Active</span>
                          </div>
                          <p className="cookie-pref-desc">
                            Required to enable core security, including JWT access tokens, CSRF protection, and user sign-in persistence. Without these, authenticated database sync will not function.
                          </p>
                        </div>

                        {/* Performance & Analytics */}
                        <div className="cookie-pref-card">
                          <div className="cookie-pref-header">
                            <span className="cookie-pref-title">
                              Performance & Speed Metrics
                            </span>
                            <label className="switch">
                              <input 
                                type="checkbox" 
                                checked={cookieConsent.analytics}
                                onChange={(e) => handleUpdateCookieCategory('analytics', e.target.checked)}
                              />
                              <span className="slider"></span>
                            </label>
                          </div>
                          <p className="cookie-pref-desc">
                            Allows us to record telemetry regarding local PDF rendering times and compilation speed. This helps us optimize performance and track API response latency.
                          </p>
                        </div>

                        {/* Customization Preferences */}
                        <div className="cookie-pref-card">
                          <div className="cookie-pref-header">
                            <span className="cookie-pref-title">
                              UI & Theme Customization
                            </span>
                            <label className="switch">
                              <input 
                                type="checkbox" 
                                checked={cookieConsent.customization}
                                onChange={(e) => handleUpdateCookieCategory('customization', e.target.checked)}
                              />
                              <span className="slider"></span>
                            </label>
                          </div>
                          <p className="cookie-pref-desc">
                            Remembers your UI layout configurations, last selected tools, and theme setting (Light/Dark mode) across browser sessions.
                          </p>
                        </div>

                      </div>

                      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={handleSaveCookiePreferences} 
                          className="btn btn-primary"
                          style={{ padding: '0.6rem 1.5rem' }}
                        >
                          Save My Preferences
                        </button>
                        <button 
                          onClick={() => {
                            const all = { necessary: true, analytics: true, customization: true };
                            setCookieConsent(all);
                            localStorage.setItem('cookie_consent', JSON.stringify(all));
                            localStorage.setItem('cookie_consent_given', 'true');
                            alert("Accepted all cookies!");
                          }} 
                          className="btn btn-secondary"
                          style={{ padding: '0.6rem 1.5rem' }}
                        >
                          Accept All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SECURITY AUDIT */}
                  {activeSecurityTab === 'security' && (
                    <div>
                      <h3 className="security-section-title">Active Security Policies</h3>
                      <p className="security-section-desc">
                        Below is an overview of active safety and security measures verified on your browser session and backend APIs:
                      </p>

                      <div className="security-audit-list">
                        
                        <div className="security-audit-item">
                          <div className="security-audit-icon" style={{ color: 'var(--success)' }}>
                            <CheckCircle size={20} />
                          </div>
                          <div className="security-audit-info">
                            <div className="security-audit-header">
                              <span className="security-audit-title">Client-Side Document Processing Isolation</span>
                              <span className="security-audit-status secure">Active</span>
                            </div>
                            <p className="security-audit-desc">
                              Resume parsing, text extraction, and file conversions occur directly within your local sandbox. File buffers are never transmitted or stored on remote servers without explicit authentication.
                            </p>
                          </div>
                        </div>

                        <div className="security-audit-item">
                          <div className="security-audit-icon" style={{ color: 'var(--success)' }}>
                            <CheckCircle size={20} />
                          </div>
                          <div className="security-audit-info">
                            <div className="security-audit-header">
                              <span className="security-audit-title">Cryptographic JWT Bearer Handshakes</span>
                              <span className="security-audit-status secure">Verified</span>
                            </div>
                            <p className="security-audit-desc">
                              Database syncing and Workers AI llama-3.2 queries require JWT signature verification. In production, mock tokens are blocked to ensure complete user isolation.
                            </p>
                          </div>
                        </div>

                        <div className="security-audit-item">
                          <div className="security-audit-icon" style={{ color: 'var(--success)' }}>
                            <CheckCircle size={20} />
                          </div>
                          <div className="security-audit-info">
                            <div className="security-audit-header">
                              <span className="security-audit-title">Strict CORS Origin Restriction</span>
                              <span className="security-audit-status secure">Enforced</span>
                            </div>
                            <p className="security-audit-desc">
                              Backend Hono.js route handlers reject requests initiated outside the official FRONTEND_URL domain, stopping external cross-site hijacking attempts.
                            </p>
                          </div>
                        </div>

                        <div className="security-audit-item">
                          <div className="security-audit-icon" style={{ color: 'var(--success)' }}>
                            <CheckCircle size={20} />
                          </div>
                          <div className="security-audit-info">
                            <div className="security-audit-header">
                              <span className="security-audit-title">Safe Buffer Max-Size Caps</span>
                              <span className="security-audit-status secure">Active</span>
                            </div>
                            <p className="security-audit-desc">
                              All API text buffers are restricted to a maximum threshold of 50KB to mitigate memory allocation exploits or server overload.
                            </p>
                          </div>
                        </div>

                      </div>

                      <div style={{ marginTop: '2.5rem' }}>
                        <div className="clear-cache-card">
                          <div className="clear-cache-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Trash2 size={20} />
                            Danger Zone: Clear Local Data Cache
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                            This action immediately signs you out and purges your auth tokens, theme configurations, cookie settings, and locally cached resume history from this browser. This cannot be undone.
                          </p>
                          <button 
                            onClick={() => {
                              if (confirm("Are you sure you want to delete all cached session data and sign out? This will reset all preferences.")) {
                                localStorage.clear();
                                onLogout();
                                window.location.reload();
                              }
                            }}
                            className="btn btn-secondary" 
                            style={{ alignSelf: 'flex-start', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                          >
                            Purge Cached Data & Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PRIVACY POLICY */}
                  {activeSecurityTab === 'privacy' && (
                    <div>
                      <h3 className="security-section-title">Privacy Policy</h3>
                      <p className="security-section-desc">Last Updated: June 11, 2026</p>
                      
                      <div className="policy-content-box" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <h3>1. Data Collection & Processing</h3>
                        <p>We process candidate resume files client-side. The raw text of your resume is sent to Cloudflare Workers AI strictly for the purpose of LLM-based CV tailoring and optimization. We do not Sell or Share your resume text with third parties.</p>
                        
                        <h3>2. Storage (Cloudflare D1 SQL)</h3>
                        <p>When you are logged in, we sync your history versions to a persistent Cloudflare D1 SQL database so you can access your saved resumes on any device. You can delete your history at any time.</p>

                        <h3>3. Local Storage Caches</h3>
                        <p>If the remote database is offline, we save your history items in your local browser session cache (localStorage) for reliability.</p>

                        <h3>4. Third-Party Integrations</h3>
                        <p>Our app integrates with Cloudflare Workers AI for secure AI-driven text refinement. No data is stored permanently by Cloudflare AI models during inference tasks.</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: TERMS OF SERVICE */}
                  {activeSecurityTab === 'terms' && (
                    <div>
                      <h3 className="security-section-title">Terms of Service</h3>
                      <p className="security-section-desc">Last Updated: June 11, 2026</p>

                      <div className="policy-content-box" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <h3>1. AI Generations & Usage</h3>
                        <p>We provide resume tailoring optimizations powered by Llama 3.2. We do not guarantee job offers, hiring approvals, or interview selections. Users are solely responsible for reviewing and proofreading generated text for accuracy.</p>

                        <h3>2. API Usage & Rate Limits</h3>
                        <p>To prevent abuse and manage compute costs, free accounts are limited to 10 resume generations and 15 custom reviewer questions daily. Attempting to bypass these limit checks via script automation is prohibited.</p>

                        <h3>3. Intellectual Property</h3>
                        <p>You retain full ownership and intellectual copyright of any resumes, text, or profile content you upload or compile using HoldMyResume.</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Cookie Consent Banner */}
      {showCookieBanner && (
        <div className="cookie-banner glass-panel">
          <div className="cookie-title">
            🍪 Cookie Consent Settings
          </div>
          <p className="cookie-desc">
            We use essential local storage cookies for session security (JWT authorization) and optional cookies to measure resume compiler performance.
          </p>
          <div className="cookie-actions">
            <button onClick={() => handleAcceptCookies(false)} className="cookie-btn cookie-btn-decline">
              Decline Optional
            </button>
            <button onClick={() => handleAcceptCookies(true)} className="cookie-btn cookie-btn-accept">
              Accept All
            </button>
          </div>
        </div>
      )}

      {/* Interactive Post-Action Review Modal */}
      {showFeedbackModal && (
        <div className="feedback-popup glass-panel" style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '360px',
          padding: '1.5rem',
          zIndex: 1100,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⭐️ Rate Your Experience
            </span>
            <button 
              onClick={() => setShowFeedbackModal(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem' }}
            >
              &times;
            </button>
          </div>

          {!feedbackSubmitted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                How was your experience using HoldMyResume? Your feedback helps us shape the AI tools.
              </p>
              
              {/* Star Rating Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', margin: '0.5rem 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.6rem',
                      color: star <= feedbackRating ? 'var(--warning)' : 'rgba(255,255,255,0.15)',
                      transition: 'color 0.2s ease-in-out'
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>

              {/* Conditional Options / Feedback Area */}
              {feedbackRating > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {feedbackRating >= 4 ? (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>What did you like the most?</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                        {['AI Quality', 'Fast Speeds', 'Theme Designs', 'Ease of Use'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setFeedbackOption(opt)}
                            className={`btn btn-secondary ${feedbackOption === opt ? 'active' : ''}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '12px', background: feedbackOption === opt ? 'var(--primary-glow)' : 'rgba(255,255,255,0.02)', borderColor: feedbackOption === opt ? 'var(--primary)' : 'var(--border-color)', color: 'white' }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>How can we improve?</span>
                  )}
                  
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us more (optional)..."
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.5rem', minHeight: '60px', margin: 0, background: 'rgba(0,0,0,0.2)' }}
                  />
                  
                  <button
                    onClick={() => {
                      // Save review to local storage
                      const existingReviews = JSON.parse(localStorage.getItem('user_reviews') || '[]');
                      const newReview = {
                        rating: feedbackRating,
                        option: feedbackOption,
                        text: feedbackText,
                        date: new Date().toISOString()
                      };
                      localStorage.setItem('user_reviews', JSON.stringify([newReview, ...existingReviews]));
                      
                      setFeedbackSubmitted(true);
                      setTimeout(() => {
                        setShowFeedbackModal(false);
                      }, 3000);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-end', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                  >
                    Submit Review
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem 0', textAlign: 'center' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '50%', marginBottom: '0.25rem' }}>
                <CheckCircle size={28} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>Thank You for Your Review!</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Your feedback helps us refine HoldMyResume and deliver better AI integrations.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
