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
      const resp = await fetch(API_BASE + '/user/preferences', { headers: { Authorization: `Bearer ${authToken}` } });
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
    if (!files) return;
    const newFiles = [];
    for (const file of files) {
      const content = await file.text();
      if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        newFiles.push({ name: file.name, content, size: file.size });
      }
    }
    if (newFiles.length) {
      setSelectedFiles(prev => {
        const updated = [...prev, ...newFiles];
        setCodeInput(updated.map(f => `File: ${f.name}`).join('\n'));
        return updated;
      });
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
      const sectionFeedback = sectionStates ? { ai_review: sectionStates.review, original_code: sectionStates.originalCode, optimized_code: sectionStates.optimizedCode, explanation: sectionStates.explanation, security_analysis: sectionStates.securityAnalysis } : {};
      await fetch(API_BASE + '/submit-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ review_id: reviewId, feedback, rejection_reasons: rejectionReason ? [rejectionReason] : [], custom_rejection_reason: null, section_feedback: sectionFeedback }) });
      const review = reviewList.find(r => r.id === reviewId) || (reviewData && reviewData.id === reviewId ? reviewData : null);
      if (review) {
        setPastReviews(prev => [{ ...review, feedback, status: rejectionReason ? 'rejected' : 'reviewed', section_feedback: sectionFeedback }, ...prev]);
        setReviewList(prev => prev.filter(r => r.id !== reviewId));
      }
      setShowThanks(true);
      setTimeout(() => setShowThanks(false), 3000);
    } catch (e) { console.error('Feedback error', e); }
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
      const resp = await fetch(API_BASE + '/user/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ feedback: feedbackText }) });
      if (resp.ok) { setFeedbackMessage('Feedback updated – thank you!'); fetchUserPreferences(); } else { setFeedbackMessage('Failed to submit feedback'); }
    } catch (e) { setFeedbackMessage('Error: ' + e.message); }
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
            <ReviewCard review={{ ...selectedReview, ai_feedback: selectedReview.review, comment: selectedReview.code || selectedReview.comment }} codeContainerStyles={codeContainerStyles} showActions={false} />
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
                  <ReviewCard key={rd.id || idx} review={rd} codeContainerStyles={codeContainerStyles} onAccept={(id, sectionStates) => handleFeedbackSubmitForReview(id, 'positive', null, sectionStates)} onReject={(r, sectionStates) => { setSelectedForRejection({ review: r, sectionStates }); setShowRejectionModal(true); }} />
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

      <RejectionReasonsModal isOpen={showRejectionModal} onClose={() => { setShowRejectionModal(false); setSelectedForRejection(null); }} reviewId={selectedForRejection?.review?.id || selectedForRejection?.id || reviewData?.id} sectionStates={selectedForRejection?.sectionStates} onSubmitSuccess={(response) => { const rid = selectedForRejection?.review?.id || selectedForRejection?.id || reviewData?.id; const sectionFeedback = selectedForRejection?.sectionStates; if (rid) { const review = (reviewList.find(r => r.id === rid) || (reviewData && reviewData.id === rid ? reviewData : null)); if (review) { setPastReviews(prev => [{ ...review, status: response?.status || 'rejected', section_feedback: sectionFeedback }, ...prev]); setReviewList(prev => prev.filter(r => r.id !== rid)); if (reviewData && reviewData.id === rid) setReviewData(null); } } setShowRejectionModal(false); setSelectedForRejection(null); setShowThanks(true); setTimeout(() => setShowThanks(false), 3000); }} />

      {showGitModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Repository Review</h3>
            <input value={gitRepoUrl} onChange={e => setGitRepoUrl(e.target.value)} placeholder="https://github.com/user/repo" className="w-full mb-3 px-3 py-2 rounded bg-white/10 border border-white/10 text-white placeholder:text-white/40" />
            <input value={gitBranch} onChange={e => setGitBranch(e.target.value)} placeholder="main" className="w-full mb-4 px-3 py-2 rounded bg-white/10 border border-white/10 text-white placeholder:text-white/40" />
            <div className="flex gap-3"><button onClick={() => setShowGitModal(false)} className="btn btn-outline flex-1">Cancel</button><button onClick={() => {/* TODO: implement repo submit */}} className="btn btn-primary flex-1" disabled={!gitRepoUrl.trim()}>Review</button></div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Improve Future Reviews</h3>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={6} className="w-full mb-3 px-3 py-2 rounded bg-white/10 border border-white/10 text-white placeholder:text-white/40 resize-none" placeholder="Tell us what to focus on..." />
            {feedbackMessage && <div className="text-sm mb-3 text-accent">{feedbackMessage}</div>}
            <div className="flex gap-3"><button onClick={() => { setShowFeedbackModal(false); setFeedbackText(''); setFeedbackMessage(''); }} className="btn btn-outline flex-1">Cancel</button><button onClick={submitFeedback} disabled={!feedbackText.trim()} className="btn btn-primary flex-1">Submit</button></div>
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
          <input ref={fileInputRef} type="file" multiple className="hidden" accept=".txt,.py,.js,.java,.cpp,.c,.html,.css,.json" onChange={handleFileUpload} />
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


