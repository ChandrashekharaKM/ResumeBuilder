import React, { useState, useRef } from 'react';
import { Upload, FileText, ChevronRight, ChevronLeft, Sparkles, Printer, Plus, Trash } from 'lucide-react';
import { parsePdfText } from '../utils/pdfParser';

interface WizardStepsProps {
  apiBaseUrl: string;
  token: string;
  onGenerationComplete: (saveName: string, tailoredData: any) => void;
  guestMode?: boolean;
  onOpenAuth?: () => void;
}

export default function WizardSteps({ apiBaseUrl, token, onGenerationComplete, guestMode = false, onOpenAuth }: WizardStepsProps) {
  const [step, setStep] = useState(1);
  const [ingestionMode, setIngestionMode] = useState<'upload' | 'scratch'>('upload');
  
  // State for Upload Mode
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsedText, setParsedText] = useState('');
  const [parsingPdf, setParsingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Structured Form Mode (Prefilled with high-fidelity template content for testing ease)
  const [formData, setFormData] = useState({
    name: "Jane Doe",
    email: "jane.doe@example.com",
    phone: "+1 (555) 012-3456",
    github: "github.com/janedoe",
    linkedin: "linkedin.com/in/janedoe",
    summary: "Dedicated Software Engineer with 3+ years of experience specialized in building clean, scalable React applications and backend systems.",
    skills: "React, TypeScript, JavaScript, CSS, Node.js, Express, SQL, Git",
    experience: [
      {
        role: "Frontend Engineer",
        company: "WebTech Corp",
        duration: "2023 - Present",
        details: "Built interactive web layouts using React and styled-components. Collaborated with designers to deliver premium pixel-perfect dashboards."
      }
    ],
    education: [
      {
        degree: "B.S. Computer Science",
        school: "Tech University",
        duration: "2019 - 2023"
      }
    ],
    projects: [
      {
        title: "Portfolio website",
        description: "Created a personal portfolio with CSS grid configurations and responsive media queries.",
        technologies: "HTML, CSS, JavaScript"
      }
    ]
  });

  // Step 2 States (JD & Save Name)
  const [jobDescription, setJobDescription] = useState('');
  const [saveName, setSaveName] = useState('');

  // Step 3 States (Q&A Gate)
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [generatingResume, setGeneratingResume] = useState(false);

  // Step 4 States (Final CV)
  const [tailoredResume, setTailoredResume] = useState<any>(null);

  // PDF Upload Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setParsingPdf(true);
      try {
        const text = await parsePdfText(file);
        setParsedText(text);
      } catch (err) {
        alert("Error reading PDF. Please try again or paste resume details manually.");
        console.error(err);
      } finally {
        setParsingPdf(false);
      }
    } else if (file) {
      alert("Please upload a PDF file.");
    }
  };

  // Structured Form Handlers
  const handleExperienceChange = (index: number, field: string, value: string) => {
    const updated = [...formData.experience];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, experience: updated });
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [...formData.experience, { role: '', company: '', duration: '', details: '' }]
    });
  };

  const removeExperience = (index: number) => {
    const updated = formData.experience.filter((_, i) => i !== index);
    setFormData({ ...formData, experience: updated });
  };

  const handleProjectChange = (index: number, field: string, value: string) => {
    const updated = [...formData.projects];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, projects: updated });
  };

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { title: '', description: '', technologies: '' }]
    });
  };

  const removeProject = (index: number) => {
    const updated = formData.projects.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: updated });
  };

  // Compile Resume Object for API calls
  const getCompiledResumeText = () => {
    if (ingestionMode === 'upload') {
      return parsedText || `Uploaded PDF: ${pdfFile?.name || 'Resume'}`;
    }
    
    // Compile form details into plain text context
    return `
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Links: Github: ${formData.github} | LinkedIn: ${formData.linkedin}
Summary: ${formData.summary}
Skills: ${formData.skills}
Experience:
${formData.experience.map(exp => `- ${exp.role} at ${exp.company} (${exp.duration}): ${exp.details}`).join('\n')}
Education:
${formData.education.map(edu => `- ${edu.degree} from ${edu.school} (${edu.duration})`).join('\n')}
Projects:
${formData.projects.map(proj => `- ${proj.title} [Tech: ${proj.technologies}]: ${proj.description}`).join('\n')}
    `.trim();
  };

  // Fetch Questions for Step 3
  const handleProceedToQA = async () => {
    if (!jobDescription || !saveName) {
      alert("Please fill out both the Job Description and Save Name fields.");
      return;
    }

    setStep(3);
    setLoadingQuestions(true);

    try {
      const resumeText = getCompiledResumeText();
      const response = await fetch(`${apiBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resumeText, jobDescription })
      });

      const result = await response.json();
      if (result.success && result.questions) {
        setQuestions(result.questions);
      } else {
        throw new Error(result.message || "Failed to load questions");
      }
    } catch (error) {
      console.error(error);
      // Fallback
      setQuestions([
        "Can you elaborate on your experience with serverless architecture or deploying to Cloudflare Workers?",
        "How have you handled scaling database connections in high-throughput environments?",
        "Have you worked with client-side PDF rendering or text extraction libraries (like pdfjs-dist) in past projects?"
      ]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Call Generator endpoint for Step 4
  const handleGenerateTailoredResume = async () => {
    setGeneratingResume(true);
    try {
      const resumeText = getCompiledResumeText();
      const response = await fetch(`${apiBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          qaAnswers: answers,
          saveName
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setTailoredResume(result.data);
        onGenerationComplete(saveName, result.data);
        setStep(4);
      } else {
        throw new Error(result.message || "Failed to generate tailored resume");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to connect to Workers AI. Activating local layout compile...");
      
      // Fallback simulation layout
      const mockResult = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        github: formData.github,
        linkedin: formData.linkedin,
        summary: `Optimized Professional: ${formData.summary}. Tailored to match role requirements. Proven capabilities in aligning with parameters: ${jobDescription.slice(0, 100)}...`,
        skills: formData.skills.split(',').map(s => s.trim()),
        experience: formData.experience.map(e => ({
          role: e.role,
          company: e.company,
          duration: e.duration,
          details: [
            e.details,
            `Successfully addressed optimization criteria: ${Object.values(answers).join('; ') || 'Enhanced core delivery cycles'}`
          ]
        })),
        education: formData.education,
        projects: formData.projects.map(p => ({
          title: p.title,
          description: [p.description],
          technologies: p.technologies.split(',').map(t => t.trim())
        }))
      };
      setTailoredResume(mockResult);
      onGenerationComplete(saveName, mockResult);
      setStep(4);
    } finally {
      setGeneratingResume(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Render Wizard Progress Bar
  const renderProgressBar = () => {
    const labels = ["Resume Ingestion", "Target Matching", "Interactive Gate", "Final CV"];
    return (
      <div className="wizard-progress">
        <div className="wizard-progress-bar" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        {labels.map((lbl, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          return (
            <div 
              key={lbl} 
              className={`wizard-step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              {stepNum}
              <span className="wizard-step-label">{lbl}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      {renderProgressBar()}

      <div className="glass-panel" style={{ padding: '2.5rem', marginTop: '2rem' }}>
        
        {/* STEP 1: INGESTION */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Step 1: Provide Your Current Resume</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Upload an existing resume file for instant text extraction or fill in our structured layout from scratch.
            </p>

            <div className="ingestion-toggle-container">
              <div 
                className={`toggle-card ${ingestionMode === 'upload' ? 'active' : ''}`}
                onClick={guestMode ? onOpenAuth : () => setIngestionMode('upload')}
              >
                <Upload className="toggle-card-icon" />
                <div className="toggle-card-title">Upload Existing Resume</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports PDF text parsing directly in the browser.</p>
              </div>

              <div 
                className={`toggle-card ${ingestionMode === 'scratch' ? 'active' : ''}`}
                onClick={guestMode ? onOpenAuth : () => setIngestionMode('scratch')}
              >
                <FileText className="toggle-card-icon" />
                <div className="toggle-card-title">Fill from Scratch</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Build a structured CV timeline instantly.</p>
              </div>
            </div>

            {ingestionMode === 'upload' ? (
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf" 
                  style={{ display: 'none' }} 
                />
                <div 
                  className="upload-zone"
                  onClick={guestMode ? onOpenAuth : () => fileInputRef.current?.click()}
                >
                  <Upload className="upload-icon" />
                  <h3>Click to Upload PDF Resume</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Only PDF format is supported for text extraction</p>
                  
                  {parsingPdf && (
                    <p style={{ color: 'var(--primary)', marginTop: '1rem', fontStyle: 'italic' }}>
                      Extracting text contents locally...
                    </p>
                  )}
                  {pdfFile && !parsingPdf && (
                    <div className="upload-filename">
                      ✓ {pdfFile.name} (Ready)
                    </div>
                  )}
                </div>
                {parsedText && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <label className="form-label">Extracted Text Preview</label>
                    <textarea 
                      className="form-textarea" 
                      style={{ width: '100%', height: '150px', fontSize: '0.85rem' }}
                      value={parsedText}
                      onChange={(e) => setParsedText(e.target.value)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div 
                style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '1rem', position: 'relative' }}
                onClickCapture={guestMode ? (e) => { e.preventDefault(); e.stopPropagation(); onOpenAuth?.(); } : undefined}
              >
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Contact Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GitHub Link</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.github} 
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">LinkedIn Link</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.linkedin} 
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Professional Summary</label>
                  <textarea 
                    className="form-textarea" 
                    rows={3} 
                    value={formData.summary} 
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Skills (comma separated)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.skills} 
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })} 
                    placeholder="React, TypeScript, Node.js"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '2rem' }}>
                  <h3 style={{ color: 'var(--primary)' }}>Work Experience</h3>
                  <button onClick={addExperience} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    <Plus size={14} /> Add Work
                  </button>
                </div>
                {formData.experience.map((exp, idx) => (
                  <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 40px', gap: '0.5rem', alignItems: 'end' }}>
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <input type="text" className="form-input" value={exp.role} onChange={(e) => handleExperienceChange(idx, 'role', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Company</label>
                        <input type="text" className="form-input" value={exp.company} onChange={(e) => handleExperienceChange(idx, 'company', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Duration</label>
                        <input type="text" className="form-input" value={exp.duration} onChange={(e) => handleExperienceChange(idx, 'duration', e.target.value)} />
                      </div>
                      <button onClick={() => removeExperience(idx)} className="btn" style={{ background: 'transparent', color: 'var(--danger)', padding: '0.5rem', marginBottom: '1.5rem' }}>
                        <Trash size={16} />
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Details / Accomplishments</label>
                      <textarea className="form-textarea" rows={2} value={exp.details} onChange={(e) => handleExperienceChange(idx, 'details', e.target.value)} />
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '2rem' }}>
                  <h3 style={{ color: 'var(--primary)' }}>Projects</h3>
                  <button onClick={addProject} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    <Plus size={14} /> Add Project
                  </button>
                </div>
                {formData.projects.map((proj, idx) => (
                  <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '0.5rem', alignItems: 'end' }}>
                      <div className="form-group">
                        <label className="form-label">Project Title</label>
                        <input type="text" className="form-input" value={proj.title} onChange={(e) => handleProjectChange(idx, 'title', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Technologies (comma separated)</label>
                        <input type="text" className="form-input" value={proj.technologies} onChange={(e) => handleProjectChange(idx, 'technologies', e.target.value)} />
                      </div>
                      <button onClick={() => removeProject(idx)} className="btn" style={{ background: 'transparent', color: 'var(--danger)', padding: '0.5rem', marginBottom: '1.5rem' }}>
                        <Trash size={16} />
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="form-textarea" rows={2} value={proj.description} onChange={(e) => handleProjectChange(idx, 'description', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                onClick={guestMode ? onOpenAuth : () => setStep(2)} 
                className="btn btn-primary"
                disabled={!guestMode && ingestionMode === 'upload' && !parsedText}
              >
                Next Step: Target Job <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONTEXT MATCHING */}
        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Step 2: Enter Job Targeting Parameters</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Provide the Job Description you want to align your resume with, and name this generation workspace.
            </p>

            <div onClickCapture={guestMode ? (e) => { e.preventDefault(); e.stopPropagation(); onOpenAuth?.(); } : undefined}>
              <div className="form-group">
                <label className="form-label">Save Identifier Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Google_Staff_FE_V2" 
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Job Description (JD)</label>
                <textarea 
                  className="form-textarea" 
                  rows={8} 
                  placeholder="Paste the target JD here..." 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={guestMode ? onOpenAuth : handleProceedToQA} className="btn btn-primary">
                Next: Optimization Gate <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: INTERACTIVE GATE */}
        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Step 3: Interactive Optimization Gate</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Cloudflare Workers AI has compared your CV to the job description and highlighted some gaps. Please answer these questions to help fill the gaps.
            </p>

            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <Sparkles className="upload-icon" style={{ animation: 'spin 2s linear infinite' }} />
                <h3>Analyzing your resume and target JD...</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Comparing profiles and locating missing skills...</p>
              </div>
            ) : (
              <div className="qa-gate-container" onClickCapture={guestMode ? (e) => { e.preventDefault(); e.stopPropagation(); onOpenAuth?.(); } : undefined}>
                {questions.map((q, idx) => (
                  <div key={idx} className="qa-card">
                    <div className="qa-question">Question {idx + 1}: {q}</div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        placeholder="Type your answer here..."
                        value={answers[idx] || ''}
                        onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
                      />
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                  <button onClick={() => setStep(2)} className="btn btn-secondary" disabled={generatingResume}>
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button 
                    onClick={guestMode ? onOpenAuth : handleGenerateTailoredResume} 
                    className="btn btn-primary" 
                    disabled={generatingResume}
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
                  >
                    <Sparkles size={16} />
                    {generatingResume ? 'Tailoring CV Content...' : 'Generate Tailored Resume'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: FINAL PREVIEW & EXPORT */}
        {step === 4 && tailoredResume && (
          <div>
            <div className="preview-actions">
              <div>
                <h2>Step 4: Your Tailored Resume</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Created: <strong>{saveName}</strong>. Ready for download.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setStep(3)} className="btn btn-secondary">
                  Refine Answers
                </button>
                <button onClick={handlePrint} className="btn btn-primary" style={{ gap: '0.5rem' }}>
                  <Printer size={18} />
                  Download PDF / Print
                </button>
              </div>
            </div>

            <div className="preview-container">
              {/* Actual physical A4 page structure */}
              <div className="a4-page">
                <div className="cv-header">
                  <div className="cv-name">{tailoredResume.name}</div>
                  <div className="cv-contact">
                    <span>📧 {tailoredResume.email}</span>
                    <span>📞 {tailoredResume.phone}</span>
                    {tailoredResume.github && <span>💻 {tailoredResume.github}</span>}
                    {tailoredResume.linkedin && <span>🔗 {tailoredResume.linkedin}</span>}
                  </div>
                </div>

                <div className="cv-section">
                  <div className="cv-section-title">Professional Summary</div>
                  <div className="cv-summary">{tailoredResume.summary}</div>
                </div>

                {tailoredResume.skills && tailoredResume.skills.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-title">Technical Skills</div>
                    <div className="cv-skills-grid">
                      {tailoredResume.skills.map((skill: string, sIdx: number) => (
                        <span key={sIdx} className="cv-skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {tailoredResume.experience && tailoredResume.experience.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-title">Work History</div>
                    {tailoredResume.experience.map((exp: any, eIdx: number) => (
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

                {tailoredResume.projects && tailoredResume.projects.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-title">Key Projects</div>
                    {tailoredResume.projects.map((proj: any, pIdx: number) => (
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

                {tailoredResume.education && tailoredResume.education.length > 0 && (
                  <div className="cv-section" style={{ marginTop: 'auto' }}>
                    <div className="cv-section-title">Education</div>
                    {tailoredResume.education.map((edu: any, eduIdx: number) => (
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

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => {
                  setStep(1);
                  setPdfFile(null);
                  setParsedText('');
                  setAnswers({});
                  setTailoredResume(null);
                }} 
                className="btn btn-secondary"
              >
                Create Another Version
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
