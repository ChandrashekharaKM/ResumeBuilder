import React, { useState, useRef } from 'react';
import { Upload, FileText, Brain, ArrowLeft, Send, Sparkles, AlertCircle } from 'lucide-react';
import { parsePdfText } from '../utils/pdfParser';

interface ResumeAnalyzerProps {
  apiBaseUrl: string;
  token: string | null;
  guestMode?: boolean;
  onOpenAuth?: () => void;
  onBack: () => void;
  onActionComplete?: () => void;
}

export default function ResumeAnalyzer({ apiBaseUrl, token, guestMode = false, onOpenAuth, onBack, onActionComplete }: ResumeAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [resumeText, setResumeText] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggested questions
  const presetQuestions = [
    "What are the top 3 strengths of this resume?",
    "Identify 3 missing skills or keywords for a Senior Frontend Developer role.",
    "How can I rewrite my experience section to be more result-oriented?",
    "Does this resume layout feel concise, and how is the professional summary?"
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      setParsing(true);
      setErrorMessage('');
      setAnalysisResult('');
      
      try {
        const text = await parsePdfText(uploadedFile);
        if (!text || text.trim().length === 0) {
          throw new Error("No text content could be extracted from this PDF.");
        }
        setResumeText(text);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || "Failed to extract text from PDF. Make sure it contains readable text.");
        setFile(null);
      } finally {
        setParsing(false);
      }
    } else if (uploadedFile) {
      setErrorMessage("Please upload a valid PDF document.");
    }
  };

  const handleSendQuestion = async (queryText: string) => {
    if (!queryText.trim()) return;
    if (!resumeText) {
      setErrorMessage("Please upload a resume first before asking questions.");
      return;
    }

    // Intercept guest mode
    if (guestMode) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setAnalysisResult('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/query-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeText,
          question: queryText
        })
      });

      const result = await response.json();
      if (result.success) {
        setAnalysisResult(result.answer);
        if (onActionComplete) onActionComplete();
      } else {
        setErrorMessage(result.message || "AI Analysis failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error connecting to the AI service.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to format simple markdown output to styled HTML
  const formatMarkdown = (mdText: string) => {
    if (!mdText) return null;
    
    return mdText.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} style={{ color: 'var(--secondary)', marginTop: '1.25rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>{trimmed.replace(/^###\s*/, '')}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} style={{ color: 'var(--primary)', marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>{trimmed.replace(/^##\s*/, '')}</h3>;
      }
      if (trimmed.startsWith('#')) {
        return <h2 key={idx} style={{ color: 'var(--text-color)', marginTop: '1.75rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>{trimmed.replace(/^#\s*/, '')}</h2>;
      }
      
      // List items
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const content = trimmed.replace(/^[-*]\s*/, '');
        return (
          <li key={idx} style={{ marginLeft: '1.5rem', marginBottom: '0.4rem', color: 'var(--text-color)' }}>
            {parseInlineStyles(content)}
          </li>
        );
      }
      
      // Numbered lists
      if (/^\d+\.\s+/.test(trimmed)) {
        const content = trimmed.replace(/^\d+\.\s+/, '');
        const num = trimmed.match(/^\d+/)?.[0];
        return (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{num}.</span>
            <span style={{ color: 'var(--text-color)' }}>{parseInlineStyles(content)}</span>
          </div>
        );
      }

      // Empty lines
      if (trimmed === '') {
        return <div key={idx} style={{ height: '0.5rem' }} />;
      }

      // Paragraph
      return <p key={idx} style={{ marginBottom: '0.75rem', color: 'var(--text-color)', textAlign: 'justify' }}>{parseInlineStyles(trimmed)}</p>;
    });
  };

  // Simple parser for inline elements like **bold**
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'white', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <button 
        onClick={onBack}
        className="btn btn-secondary" 
        style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} /> Back to Tools
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{ background: 'var(--primary-glow)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}>
          <Brain size={24} />
        </div>
        <h2 style={{ fontSize: '1.75rem' }}>AI Resume Analyzer</h2>
      </div>
      
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Upload your PDF resume and ask the Llama 3.2 AI reviewer for instant feedback, keyword recommendations, or structural improvements.
      </p>

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* Upload Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--secondary)" />
            Step 1: Upload PDF Resume
          </h3>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="application/pdf" 
            style={{ display: 'none' }} 
          />

          {!file ? (
            <div 
              className="upload-zone" 
              onClick={guestMode ? onOpenAuth : () => fileInputRef.current?.click()}
              style={{ padding: '2.5rem' }}
            >
              <Upload size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                {parsing ? 'Extracting text content...' : 'Click to Upload PDF'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                PDF format only. Content is processed completely client-side.
              </p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '0.5rem', borderRadius: '6px' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>{file.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB • Extracted {resumeText.split(/\s+/).length} words
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setFile(null); setResumeText(''); setAnalysisResult(''); }} 
                className="btn"
                style={{ background: 'transparent', color: 'var(--danger)', fontSize: '0.85rem', padding: '0.5rem' }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Query/Chat Card */}
        {resumeText && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--primary)" />
              Step 2: Ask a Question
            </h3>

            {/* preset questions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {presetQuestions.map((qText, index) => (
                <button
                  key={index}
                  onClick={() => { setQuestion(qText); handleSendQuestion(qText); }}
                  className="btn btn-secondary"
                  disabled={loading}
                  style={{ 
                    fontSize: '0.8rem', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '20px', 
                    textAlign: 'left', 
                    whiteSpace: 'normal',
                    lineHeight: 1.3
                  }}
                >
                  {qText}
                </button>
              ))}
            </div>

            {/* Custom Question Entry */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Or ask a custom question (e.g. Is my profile ready for a Tech Lead role?)..."
                className="form-input"
                style={{ flex: 1, margin: 0 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendQuestion(question);
                  }
                }}
                disabled={loading}
              />
              <button
                onClick={() => handleSendQuestion(question)}
                className="btn btn-primary"
                disabled={loading || !question.trim()}
                style={{ width: '48px', height: '48px', padding: 0 }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Results Block */}
        {(loading || analysisResult) && (
          <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', animation: loading ? 'pulse 2s infinite' : 'none' }} />
            
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={18} color="var(--primary)" />
              AI Review & Analysis Report
            </h3>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Llama 3.2 is reviewing resume context...</div>
              </div>
            ) : (
              <div 
                style={{ 
                  background: 'rgba(0,0,0,0.15)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '1.5rem', 
                  maxHeight: '450px', 
                  overflowY: 'auto',
                  lineHeight: '1.6',
                  fontSize: '0.95rem'
                }}
              >
                {formatMarkdown(analysisResult)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
