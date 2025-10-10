import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, GitBranch } from 'lucide-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/login';
import Register from './components/register';
import RejectionReasonsModal from './components/RejectionReasonsModal';
import ReviewCard from './components/ReviewCard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const CodeReviewApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const [codeInput, setCodeInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [reviewList, setReviewList] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [selectedReview, setSelectedReview] = useState(null);
  const [pastReviews, setPastReviews] = useState([]);

  const [showHistory, setShowHistory] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedForRejection, setSelectedForRejection] = useState(null);
  const [showThanks, setShowThanks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showGitModal, setShowGitModal] = useState(false);
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [includePatterns] = useState([]);
  const [excludePatterns] = useState([]);
  const [maxFiles] = useState(50);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [userPreferences, setUserPreferences] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);

  const codeTopRef = useRef(null);

  const codeContainerStyles = { maxHeight: '300px', overflow: 'auto' };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchPastReviews(savedToken);
      fetchUserPreferences(savedToken);
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setToken(null);
    localStorage.removeItem('token');
  };

  const fetchPastReviews = async (overrideToken) => {
    const authToken = overrideToken || token;
    if (!authToken) return;
    try {
      const resp = await fetch(API_BASE + '/past-reviews', { headers: { Authorization: `Bearer ${authToken}` } });
      if (resp.ok) setPastReviews(await resp.json());
    } catch (e) { /* ignore */ }
  };

  const fetchUserPreferences = async (overrideToken) => {
    const authToken = overrideToken || token;
    if (!authToken) return;
    try {
      const resp = await fetch(API_BASE + '/preferences/', { headers: { Authorization: `Bearer ${authToken}` } });
      if (resp.ok) setUserPreferences(await resp.json());
    } catch (e) { /* ignore */ }
  };

  const detectLanguage = (code) => {
    if (!code) return 'text';
    if (/public class|System\.out\.println|import java\./.test(code)) return 'java';
    if (/#include|cout <<|std::/.test(code)) return 'cpp';
    if (/function |console\.log|const |let /.test(code)) return 'javascript';
    if (/def |print\(|^import (?!java\.)/m.test(code)) return 'python';
    return 'text';
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    console.log('File upload triggered, files:', files);
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    const newFiles = [];
    const skippedFiles = [];
    
    for (const file of files) {
      console.log('Processing file:', file.name, 'size:', file.size, 'type:', file.type);
      
      // Check if file already exists
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        console.log('File already selected:', file.name);
        skippedFiles.push(file.name + ' (already selected)');
        continue;
      }
      
      try {
        const content = await file.text();
        newFiles.push({ name: file.name, content, size: file.size });
        console.log('Successfully added file:', file.name, 'content length:', content.length);
      } catch (error) {
        console.error('Error reading file:', file.name, error);
        skippedFiles.push(file.name + ' (read error)');
      }
    }
    
    console.log('Files processed - New:', newFiles.length, 'Skipped:', skippedFiles.length);
    
    if (newFiles.length > 0) {
      setSelectedFiles(prev => {
        const updated = [...prev, ...newFiles];
        console.log('Updated selectedFiles state:', updated);
        // Only update textarea if it's currently showing file list or is empty
        if (!codeInput.trim() || codeInput.startsWith('File:')) {
          setCodeInput(updated.map(f => `File: ${f.name}`).join('\n'));
        }
        return updated;
      });
    }
    
    if (skippedFiles.length > 0) {
      console.warn('Skipped files:', skippedFiles);
    }
    
    if (newFiles.length === 0 && skippedFiles.length > 0) {
      alert('No new files were added:\n' + skippedFiles.join('\n'));
    }
    
    e.target.value = null;
    setShowDropdown(false);
  };

  const handleSubmitCode = async () => {
    if (!codeInput.trim() && selectedFiles.length === 0) return;
    if (!token) { setShowAuthPrompt(true); return; }
    setIsLoading(true);
    try {
      if (selectedFiles.length) {
        const results = [];
        for (const f of selectedFiles) {
          try {
            const resp = await fetch(API_BASE + '/generate-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code: f.content, filename: f.name }) });
            if (!resp.ok) throw new Error(await resp.text());
            const data = await resp.json();
            results.push({ id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title: data.title || `Review: ${f.name}`, filename: f.name, comment: f.content, ai_feedback: data.review || data.ai_feedback || '', optimized_code: data.optimized_code, explanation: data.explanation, security_issues: data.security_issues, created_at: new Date().toISOString() });
          } catch (err) {
            results.push({ id: `error-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title: `Error: ${f.name}`, filename: f.name, comment: f.content, ai_feedback: `Failed: ${err.message}`, optimized_code: '', explanation: '', security_issues: '', created_at: new Date().toISOString(), isError: true });
          }
        }
        setReviewList(results);
        setCurrentReviewIndex(0);
        setPastReviews(prev => [...results, ...prev]);
        setSelectedFiles([]);
        setCodeInput('');
      } else {
        const resp = await fetch(API_BASE + '/generate-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code: codeInput }) });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const single = { id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title: data.title || 'Review', comment: codeInput, ai_feedback: data.review || data.ai_feedback || '', optimized_code: data.optimized_code, explanation: data.explanation, security_issues: data.security_issues, created_at: new Date().toISOString() };
        setReviewList([single]);
        setCurrentReviewIndex(0);
        setPastReviews(prev => [single, ...prev]);
        setCodeInput('');
      }
      fetchPastReviews();
    } catch (e) { alert('Submission failed: ' + e.message); }
    setIsLoading(false);
  };

  const handleFeedbackSubmitForReview = async (reviewId, feedback, rejectionReason = null, sectionStates = null) => {
    if (!reviewId || !token) return;
    try {
      // Map frontend camelCase to backend snake_case
      const sectionFeedback = sectionStates ? { 
        ai_review: sectionStates.review, 
        original_code: sectionStates.originalCode, 
        optimized_code: sectionStates.optimizedCode, 
        explanation: sectionStates.explanation, 
        security_analysis: sectionStates.securityAnalysis 
      } : {};
      
      const response = await fetch(API_BASE + '/submit-feedback', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ 
          review_id: reviewId, 
          feedback, 
          rejection_reasons: rejectionReason ? [rejectionReason] : [], 
          custom_rejection_reason: null, 
          section_feedback: sectionFeedback 
        }) 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Request failed with status code ${response.status}`);
      }
      // Only finalize a review when all available sections have been reviewed
      const review = reviewList.find(r => r.id === reviewId) || (reviewData && reviewData.id === reviewId ? reviewData : null);
      if (review && sectionStates) {
        const codeContent = review.code || review.comment || '';
        const rawReviewText = review.ai_feedback || review.review || '';
        const hasContent = (txt) => !!(txt && String(txt).trim().length > 0);
        const availableSections = {
          ai_review: hasContent(rawReviewText),
          original_code: hasContent(codeContent),
          optimized_code: hasContent(review.optimized_code),
          explanation: hasContent(review.explanation),
          security_analysis: hasContent(review.security_issues) || /security\s*check/i.test(rawReviewText)
        };
        const allSectionsReviewed = Object.entries(availableSections).every(([key, present]) => {
          if (!present) return true; // skip sections not present
          const state = sectionStates[
            key === 'ai_review' ? 'review' :
            key === 'original_code' ? 'originalCode' :
            key === 'optimized_code' ? 'optimizedCode' :
            key === 'security_analysis' ? 'securityAnalysis' : 'explanation'
          ];
          return state === 'accepted' || state === 'rejected';
        });

        if (allSectionsReviewed) {
          setPastReviews(prev => [{ ...review, feedback, status: rejectionReason ? 'rejected' : 'reviewed', section_feedback: sectionFeedback }, ...prev]);
          setReviewList(prev => prev.filter(r => r.id !== reviewId));
          if (reviewData && reviewData.id === reviewId) setReviewData(null);
          // Do not show the generic thank-you card here; ReviewCard shows completion CTA
        }
      }
    } catch (e) { 
      console.error('Feedback error', e); 
      alert('Failed to submit feedback: ' + e.message);
    }
  };

  const handleSelectReview = async (review) => {
    if (!token) return;
    try {
      const resp = await fetch(API_BASE + `/past-reviews/${review.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) { const full = await resp.json(); setSelectedReview(full); setReviewList([]); setCurrentReviewIndex(0); } else { setSelectedReview(review); }
    } catch { setSelectedReview(review); }
  };

  const handleReviewAnother = () => { setShowThanks(false); setSelectedReview(null); setReviewData(null); setReviewList([]); };
  const handleNextReview = () => { if (reviewList && currentReviewIndex < reviewList.length - 1) setCurrentReviewIndex(i => i + 1); };
  const handlePreviousReview = () => { if (reviewList && currentReviewIndex > 0) setCurrentReviewIndex(i => i - 1); };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || !token) return;
    try {
      const resp = await fetch(API_BASE + '/feedback/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ feedback_text: feedbackText }) });
      if (resp.ok) { 
        const data = await resp.json();
        const msg = data?.message || 'Preferences updated – thank you!';
        const changes = Array.isArray(data?.changes) && data.changes.length ? ` (Changes: ${data.changes.join(', ')})` : '';
        setFeedbackMessage(msg + changes);
        await fetchUserPreferences();
        
        // Close modal after 2 seconds to show success message
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackText('');
          setFeedbackMessage('');
        }, 2000);
      } else {
        const err = await resp.json().catch(() => ({}));
        setFeedbackMessage(err?.detail ? `Failed: ${err.detail}` : 'Failed to submit feedback');
      }
    } catch (e) { setFeedbackMessage('Error: ' + e.message); }
  };

  const handleGitRepoSubmit = async () => {
    if (!gitRepoUrl.trim()) return;
    if (!token) {
      setShowGitModal(false);
      setShowAuthPrompt(true);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE + '/generate-repo-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          repo_url: gitRepoUrl,
          branch: gitBranch || 'main',
          include_patterns: includePatterns.length ? includePatterns : undefined,
          exclude_patterns: excludePatterns.length ? excludePatterns : undefined,
          max_files: maxFiles
        })
      });
      if (response.ok) {
        const data = await response.json();
        setReviewList(data.reviews || [data]);
        setCurrentReviewIndex(0);
        setShowGitModal(false);
        setGitRepoUrl('');
        setGitBranch('main');
      } else {
        const errorData = await response.json();
        alert('Repository review failed: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Git review error:', error);
      alert('Failed to review repository: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#343541] relative">
      <div className="fixed top-4 right-4 z-50 flex gap-3">
    <button onClick={() => window.location.href = '/admin/login'} className="bg-[#8B5CF6] text-white px-4 py-2 rounded hover:bg-[#7C3AED] transition-colors">Admin</button>
  {isAuthenticated ? <button onClick={handleLogout} className="btn btn-logout">Logout</button> : <button onClick={() => setShowLogin(true)} className="btn btn-auth">Login</button>}
      </div>

  {!showHistory && <button onClick={() => setShowHistory(true)} className="fixed left-6 top-4 z-50 btn btn-primary">History</button>}
      {showHistory && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm">
          <div className="card w-full max-w-xl max-h-[70vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold">History</h3>
              <button onClick={() => setShowHistory(false)} className="icon-btn" aria-label="Close history">&times;</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-2">
              {pastReviews.length === 0 && <div className="text-sm text-muted">No past reviews yet.</div>}
              {pastReviews.map(r => (
                <div key={r.id} onClick={() => { setShowHistory(false); handleSelectReview(r); }} className="p-3 rounded-md hover:bg-white/5 cursor-pointer transition-base border border-transparent hover:border-white/10">
                  <div className="text-sm font-medium truncate">{r.title || r.comment || 'Review'}</div>
                  {r.created_at && <div className="text-xs text-muted mt-1">{new Date(r.created_at).toLocaleString()}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={codeTopRef} className="max-w-6xl mx-auto px-6 pt-28 pb-24 space-y-10">
        <h1 className="text-4xl font-bold text-white">CRVKN Code Review</h1>

        {showThanks && <div className="card p-8 text-center"><h2 className="text-2xl font-semibold mb-2">Thank you!</h2><p className="text-muted mb-6">Your feedback helps us improve.</p><button onClick={handleReviewAnother} className="btn btn-primary">Review Another Code</button></div>}

        {selectedReview && !showThanks && (
          <div className="space-y-6">
            <button onClick={() => setSelectedReview(null)} className="btn btn-outline">← Back</button>
            <ReviewCard review={{ ...selectedReview, ai_feedback: selectedReview.review, comment: selectedReview.code || selectedReview.comment }} codeContainerStyles={codeContainerStyles} showActions={false} onReviewAnother={handleReviewAnother} />
          </div>
        )}

        {!selectedReview && !showThanks && (
          <div className="space-y-10">
            {/* Intro blurb about the bot */}
            <div className="blurb">
              <div className="blurb-title">Meet your AI code reviewer</div>
              <p className="blurb-text">
                CRVKN inspects logic, style, and security patterns in your snippets or uploads and returns
                concise, prioritized suggestions with ready-to-apply fixes.
              </p>
              <div className="blurb-badges">
                <span className="badge-pill">Multi‑file</span>
                <span className="badge-pill">AST‑aware</span>
                <span className="badge-pill">Actionable fixes</span>
                <span className="badge-pill">Learns from feedback</span>
              </div>
            </div>
            
            {/* Hidden file input kept mounted (outside dropdown) */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".txt,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.h,.html,.css,.json,.md,.xml,.sql,.go,.rs,.kt,.swift,.php,.rb"
              onChange={handleFileUpload}
            />
            
            {/* Selected Files Display */}
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mb-4 p-4 card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">Selected Files ({selectedFiles.length})</h4>
                  <button 
                    onClick={() => { 
                      console.log('Clearing all files');
                      setSelectedFiles([]); 
                      setCodeInput(''); 
                    }} 
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm">
                      <span className="text-white">📄</span>
                      <span className="text-gray-200">{file.name}</span>
                      <button
                        onClick={() => {
                          console.log('Removing file:', file.name);
                          const updated = selectedFiles.filter((_, i) => i !== idx);
                          setSelectedFiles(updated);
                          if (updated.length > 0) {
                            setCodeInput(updated.map(f => `File: ${f.name}`).join('\n'));
                          } else {
                            setCodeInput('');
                          }
                        }}
                        className="text-red-400 hover:text-red-300 ml-1"
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="input-shell">
              <textarea placeholder="Paste your code for intelligent AI review..." value={codeInput} onChange={e => setCodeInput(e.target.value)} className="input-area" rows={8} />
              <div className="input-toolbar">
                <div className="flex gap-3">
                  <button onClick={() => setShowDropdown(!showDropdown)} className="icon-btn" title="Add / Upload"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSubmitCode} disabled={isLoading || (!codeInput.trim() && selectedFiles.length === 0)} className="icon-btn send-btn disabled:opacity-40 disabled:cursor-not-allowed" title="Submit">{isLoading ? <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>}</button>
                </div>
              </div>
            </div>
            {(reviewData || (reviewList && reviewList.length > 0)) && (
              <div className="space-y-4">
                {(reviewList && reviewList.length > 0 ? reviewList : (reviewData ? [reviewData] : [])).map((rd, idx) => (
                  <ReviewCard key={rd.id || idx} review={rd} codeContainerStyles={codeContainerStyles} onAccept={(id, sectionStates) => handleFeedbackSubmitForReview(id, 'positive', null, sectionStates)} onReject={(r, sectionStates) => { setSelectedForRejection({ review: r, sectionStates }); setShowRejectionModal(true); }} onReviewAnother={handleReviewAnother} />
                ))}
                {reviewList.length > 1 && (
                  <div className="flex items-center gap-4 pt-2">
                    <button onClick={handlePreviousReview} disabled={currentReviewIndex === 0} className="btn btn-outline disabled:opacity-40">Previous</button>
                    <div className="text-sm text-muted">{currentReviewIndex + 1} / {reviewList.length}</div>
                    <button onClick={handleNextReview} disabled={currentReviewIndex >= reviewList.length - 1} className="btn btn-outline disabled:opacity-40">Next</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <RejectionReasonsModal
        isOpen={showRejectionModal}
        onClose={() => { setShowRejectionModal(false); setSelectedForRejection(null); }}
        reviewId={selectedForRejection?.review?.id || selectedForRejection?.id || reviewData?.id}
        sectionStates={selectedForRejection?.sectionStates}
        onSubmitSuccess={(response) => {
          const rid = selectedForRejection?.review?.id || selectedForRejection?.id || reviewData?.id;
          const sectionFeedback = selectedForRejection?.sectionStates;
          if (rid) {
            const review = (reviewList.find(r => r.id === rid) || (reviewData && reviewData.id === rid ? reviewData : null));
            if (review) {
              // Determine if all sections are reviewed before finalizing
              const codeContent = review.code || review.comment || '';
              const rawReviewText = review.ai_feedback || review.review || '';
              const hasContent = (txt) => !!(txt && String(txt).trim().length > 0);
              const availableSections = {
                review: hasContent(rawReviewText),
                originalCode: hasContent(codeContent),
                optimizedCode: hasContent(review.optimized_code),
                explanation: hasContent(review.explanation),
                securityAnalysis: hasContent(review.security_issues) || /security\s*check/i.test(rawReviewText)
              };
              const ss = selectedForRejection?.sectionStates || {};
              const allSectionsReviewed = Object.entries(availableSections).every(([key, present]) => {
                if (!present) return true;
                const state = ss[key];
                return state === 'accepted' || state === 'rejected';
              });

              if (allSectionsReviewed) {
                setPastReviews(prev => [{ ...review, status: response?.status || 'rejected', section_feedback: sectionFeedback }, ...prev]);
                setReviewList(prev => prev.filter(r => r.id !== rid));
                if (reviewData && reviewData.id === rid) setReviewData(null);
              }
            }
          }
          setShowRejectionModal(false);
          setSelectedForRejection(null);
          // Do not show global thank-you here; ReviewCard shows completion UI when appropriate
        }}
      />

      {showGitModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Repository Review</h3>
            <input value={gitRepoUrl} onChange={e => setGitRepoUrl(e.target.value)} placeholder="https://github.com/user/repo" className="field mb-3" />
            <input value={gitBranch} onChange={e => setGitBranch(e.target.value)} placeholder="main" className="field mb-4" />
            <div className="flex gap-3"><button onClick={() => setShowGitModal(false)} className="btn btn-outline flex-1">Cancel</button><button onClick={handleGitRepoSubmit} className="btn btn-primary flex-1" disabled={!gitRepoUrl.trim() || isLoading}>{isLoading ? 'Reviewing...' : 'Review'}</button></div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6">
            {!isAuthenticated ? (
              <div className="space-y-4 text-center">
                <h3 className="text-lg font-semibold">Login Required</h3>
                <p className="text-sm text-muted">Please login to save your preferences.</p>
                <div className="flex gap-3">
                  <button onClick={() => { setShowFeedbackModal(false); setShowLogin(true); }} className="btn btn-primary flex-1">Login</button>
                  <button onClick={() => setShowFeedbackModal(false)} className="btn btn-outline flex-1">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Customize Future Reviews</h3>
                <p className="text-xs text-muted mb-3">
                  💡 Tell the AI what to include or skip in your next review:
                </p>
                <div className="text-xs mb-3 p-2.5 bg-white/5 rounded space-y-1">
                  <div className="text-muted">✓ "give optimized code" or "skip optimization"</div>
                  <div className="text-muted">✓ "focus on security" or "no security analysis"</div>
                  <div className="text-muted">✓ "brief explanations" or "detailed explanations"</div>
                  <div className="text-muted">✓ "include best practices" or "no best practices"</div>
                </div>
                {userPreferences && (
                  <div className="text-xs mb-3 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded">
                    <div className="font-semibold mb-1.5 text-blue-300">Current Settings:</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted">
                      <div>{userPreferences.code_optimization ? '✅' : '❌'} Optimization</div>
                      <div>{userPreferences.security_analysis ? '✅' : '❌'} Security</div>
                      <div>{userPreferences.detailed_explanations ? '✅' : '❌'} Detailed</div>
                      <div>{userPreferences.best_practices ? '✅' : '❌'} Best Practices</div>
                    </div>
                  </div>
                )}
                <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={3} className="field mb-3 resize-none" placeholder="e.g., 'give 2 optimized codes' or 'skip security checks'" />
                {feedbackMessage && <div className="text-sm mb-3 text-green-400 whitespace-pre-wrap font-medium">{feedbackMessage}</div>}
                <div className="flex gap-3"><button onClick={() => { setShowFeedbackModal(false); setFeedbackText(''); setFeedbackMessage(''); }} className="btn btn-outline flex-1">Cancel</button><button onClick={submitFeedback} disabled={!feedbackText.trim()} className="btn btn-primary flex-1">Submit</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {showDropdown && <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />}
      {showDropdown && (
        <div className="absolute left-6 top-[140px] z-40 menu p-3 w-64">
          <button onClick={() => { setShowGitModal(true); setShowDropdown(false); }} className="menu-item"><GitBranch className="w-5 h-5 text-muted" /><span>Git Repository</span></button>
          <div className="menu-separator" />
          <button onClick={() => { setShowFeedbackModal(true); setShowDropdown(false); }} className="menu-item"><span className="w-5 h-5 flex items-center justify-center">💡</span><span>Preferences</span></button>
          <button onClick={() => { fileInputRef.current?.click(); setShowDropdown(false); }} className="menu-item"><Upload className="w-5 h-5" /><span>Upload File</span></button>
        </div>
      )}

      {/* Auth Prompt (shown when user tries action requiring auth) */}
      {showAuthPrompt && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 space-y-4 text-center">
            <h3 className="text-xl font-semibold">Login Required</h3>
            <p className="text-sm text-muted">Please login or register to submit code for review.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowAuthPrompt(false); setShowLogin(true); }} className="btn btn-primary flex-1">Login</button>
              <button onClick={() => { setShowAuthPrompt(false); setShowRegister(true); }} className="btn btn-outline flex-1">Register</button>
            </div>
            <button onClick={() => setShowAuthPrompt(false)} className="text-xs text-muted hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md">
            <button onClick={() => setShowLogin(false)} aria-label="Close login" className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white">×</button>
            <Login
              setIsAuthenticated={setIsAuthenticated}
              setUsername={setUsername}
              setShowLogin={setShowLogin}
              setShowRegister={setShowRegister}
              setToken={(t) => { setToken(t); fetchPastReviews(t); fetchUserPreferences(t); }}
            />
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md">
            <button onClick={() => setShowRegister(false)} aria-label="Close register" className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white">×</button>
            <Register
              setShowLogin={setShowLogin}
              setShowRegister={setShowRegister}
              setIsAuthenticated={setIsAuthenticated}
              setUsername={setUsername}
              setToken={(t) => { setToken(t); fetchPastReviews(t); fetchUserPreferences(t); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<CodeReviewApp />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<CodeReviewApp />} />
    </Routes>
  </BrowserRouter>
);

export default App;


