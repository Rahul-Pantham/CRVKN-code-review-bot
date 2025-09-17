import React, { useState, useEffect, useRef } from 'react';
import { Plus, Link as IconLink, Upload } from 'lucide-react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './components/login';
import Register from './components/register';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const CodeReviewApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [pastReviews, setPastReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const fileInputRef = useRef(null);

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Custom CSS styles for code containers
  const codeContainerStyles = {
    overflowX: 'auto',
    whiteSpace: 'pre',
    maxWidth: '100%',
    wordWrap: 'break-word',
    scrollbarWidth: 'thin',
    scrollbarColor: '#6b7280 #40414f'
  };

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
      fetchPastReviews();
    } else {
      setIsAuthenticated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUsername('');
    setShowLogin(false);
    setShowRegister(false);
    setPastReviews([]);
    setSelectedReview(null);
    setReviewData(null);
    setCodeInput('');
    navigate('/');
  };

  const fetchPastReviews = async () => {
    try {
      const response = await fetch(API_BASE + '/past-reviews', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const reviews = await response.json();
        setPastReviews(reviews);
      }
    } catch (error) {
      console.error('Error fetching past reviews:', error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCodeInput(e.target.result);
        setShowDropdown(false);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmitCode = async () => {
    if (!codeInput.trim()) return;

    if (!token) {
      // Don't auto-open the login modal from the submit button.
      // Prompt the user to use the Login button at the top-right instead.
      setShowAuthPrompt(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_BASE + '/generate-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: codeInput }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        alert('Error: ' + data.error);
        return;
      }

      setReviewData(data);
      setCodeInput(''); // Clear textbox after submission
      fetchPastReviews(); // Refresh past reviews
    } catch (error) {
      console.error('Error:', error);
      const msg = error?.message || String(error);
      alert('Failed to connect to backend: ' + msg + '\nEnsure the backend is running and accessible at the configured API host.');
    }
    setIsLoading(false);
  };

  const handleFeedbackSubmit = async (feedback, rejectionReason = null) => {
    try {
      await fetch(API_BASE + '/submit-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          review_id: reviewData.review_id,
          feedback,
          rejection_reason: rejectionReason
        }),
      });
      setShowThanks(true);
      setShowFeedback(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleReviewAnother = () => {
    setShowThanks(false);
    setReviewData(null);
    setCodeInput('');
    setSelectedReview(null);
  };

  const handleSelectReview = async (review) => {
    // fetch full review details from backend to ensure we have full code + fields
    try {
      const resp = await fetch(API_BASE + `/past-reviews/${review.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const full = await resp.json();
        setSelectedReview(full);
        setReviewData(null);
        setCodeInput('');
      } else {
        console.error('Failed to fetch review detail', resp.status);
        setSelectedReview(review); // fallback to what we have
      }
    } catch (e) {
      console.error('Error fetching review detail', e);
      setSelectedReview(review);
    }
  };

  const feedbackTags = [
    'Syntax errors present',
    'Security vulnerabilities found',
    'Incorrect output / results',
    'Code logic is incorrect',
    'Poor or missing comments',
    'Code style inconsistent',
    'Inefficient algorithm',
    'Unnecessary complexity',
    'Duplicate / redundant code',
    'Variable/method naming not clear',
    'Does not handle edge cases',
    'Other (optional text box)'
  ];

  const detectLanguage = (code) => {
    if (!code) return 'text';
    if (code.includes('public class') || code.includes('System.out.println') || code.includes('import java.')) return 'java';
    if (code.includes('#include') || code.includes('cout <<') || code.includes('std::')) return 'cpp';
    if (code.includes('function') || code.includes('console.log') || code.includes('const ') || code.includes('let ')) return 'javascript';
    if (code.includes('def ') || code.includes('print(') || (code.includes('import ') && !code.includes('import java.'))) return 'python';
    return 'text';
  };


  if (showThanks) {
    return (
      <div className="flex min-h-screen bg-[#343541]"><div className="fixed top-4 right-4 z-50">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
        <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex items-center justify-between gap-3 mb-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-[#343541] rounded flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
                  </div>
                </div>
                <span className="text-white text-xl font-semibold">CRVKN</span>
              </div>
              <div>
                {isAuthenticated ? (
                  <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
                ) : (
                  <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="flex justify-end mb-6">
              <div className="bg-white rounded-full px-6 py-3 max-w-md">
                <span className="text-[#343541]">{codeInput.substring(0, 50)}...</span>
              </div>
            </div>

            <div className="space-y-6 text-white">
              <h2 className="text-xl font-medium">Your line</h2>

              <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                <div className="text-sm text-gray-300 mb-2">{detectLanguage(codeInput)}</div>
                <pre 
                  className="text-white font-mono text-sm leading-relaxed"
                  style={codeContainerStyles}
                >
                  {codeInput}
                </pre>
              </div>

              <div className="space-y-4">
                <p>{reviewData?.review}</p>

                {reviewData?.optimized_code && (
                  <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                    <div className="text-sm text-gray-300 mb-2">{detectLanguage(reviewData.optimized_code)}</div>
                    <pre 
                      className="text-white font-mono text-sm leading-relaxed"
                      style={codeContainerStyles}
                    >
                      {reviewData.optimized_code}
                    </pre>
                  </div>
                )}

                {reviewData?.explanation && (
                  <p>{reviewData.explanation}</p>
                )}

                {reviewData?.security_issues && (
                  <div className="bg-[#40414f] rounded-xl p-6">
                    <div className="text-sm text-gray-300 mb-2">Security Analysis</div>
                    <p className="text-white">{reviewData.security_issues}</p>
                  </div>
                )}
              </div>

              <div className="pt-8">
                <p className="text-gray-300 italic">"Thanks for your feedback — it helps us improve."</p>
                <button
                  className="mt-6 bg-[#10a37f] text-white px-6 py-2 rounded-lg hover:bg-[#0d8c6b] font-medium"
                  onClick={handleReviewAnother}
                >
                  Review Another Code
                </button>
              </div>
            </div>
          </div>

          <style jsx>{`
            pre::-webkit-scrollbar {
              height: 6px;
            }
            pre::-webkit-scrollbar-track {
              background: #40414f;
              border-radius: 3px;
            }
            pre::-webkit-scrollbar-thumb {
              background: #6b7280;
              border-radius: 3px;
            }
            pre::-webkit-scrollbar-thumb:hover {
              background: #9ca3af;
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (reviewData && !showThanks) {
    return (
      <div className="flex min-h-screen bg-[#343541]"><div className="fixed top-4 right-4 z-50">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
        <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex items-center justify-between gap-3 mb-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-[#343541] rounded flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
                  </div>
                </div>
                <span className="text-white text-xl font-semibold">CRVKN</span>
              </div>
             
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="flex justify-end mb-6">
              <div className="bg-white rounded-full px-6 py-3 max-w-md">
                <span className="text-[#343541]">{codeInput.substring(0, 50)}...</span>
              </div>
            </div>

            <div className="space-y-6 text-white">
              <h2 className="text-xl font-medium">Your line</h2>

              <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                <div className="text-sm text-gray-300 mb-2">{detectLanguage(codeInput)}</div>
                <pre 
                  className="text-white font-mono text-sm leading-relaxed"
                  style={codeContainerStyles}
                >
                  {codeInput}
                </pre>
              </div>

              <div className="space-y-4">
                <p>{reviewData.review}</p>

                {reviewData.optimized_code && (
                  <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                    <div className="text-sm text-gray-300 mb-2">{detectLanguage(reviewData.optimized_code)}</div>
                    <pre 
                      className="text-white font-mono text-sm leading-relaxed"
                      style={codeContainerStyles}
                    >
                      {reviewData.optimized_code}
                    </pre>
                  </div>
                )}

                {reviewData.explanation && (
                  <p>{reviewData.explanation}</p>
                )}

                {reviewData.security_issues && (
                  <div className="bg-[#40414f] rounded-xl p-6">
                    <div className="text-sm text-gray-300 mb-2">Security Analysis</div>
                    <p className="text-white">{reviewData.security_issues}</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-4 pt-6">
                <button 
                  onClick={() => handleFeedbackSubmit('positive')}
                  className="flex-shrink-0 p-3 bg-[#10a37f] hover:bg-[#0d8c6b] rounded-lg transition-colors"
                  title="Accept Review"
                >
                  <span className="text-white font-medium">✓ Accept</span>
                </button>

                <button 
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="flex-shrink-0 p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  title="Reject Review"
                >
                  <span className="text-white font-medium">✗ Reject</span>
                </button>

                {showFeedback && (
                  <div className="bg-[#40414f] rounded-2xl p-6 flex-1">
                    <h3 className="text-white mb-4 font-medium">Why are you rejecting this review?</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {feedbackTags.map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => handleFeedbackSubmit('negative', tag)}
                          className="bg-[#40414f] hover:bg-[#4a4b5b] text-white px-4 py-2 rounded-lg text-sm transition-colors text-left"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <style jsx>{`
            pre::-webkit-scrollbar {
              height: 6px;
            }
            pre::-webkit-scrollbar-track {
              background: #40414f;
              border-radius: 3px;
            }
            pre::-webkit-scrollbar-thumb {
              background: #6b7280;
              border-radius: 3px;
            }
            pre::-webkit-scrollbar-thumb:hover {
              background: #9ca3af;
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (selectedReview) {
    // Render identical layout to an immediate generated review: original code, optimized_code, explanation, security_issues
    return (
      <div className="flex min-h-screen bg-[#343541]"><div className="fixed top-4 right-4 z-50">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
        <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-[#343541] rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
              </div>
            </div>
            <span className="text-white text-xl font-semibold">CRVKN</span>
          </div>

          <div className="max-w-4xl mx-auto text-white">
            <div className="flex justify-end mb-6">
              <div className="bg-white rounded-full px-6 py-3 max-w-md">
                <span className="text-[#343541]">{(selectedReview.code || '').substring(0,50)}...</span>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-medium">Your submission</h2>

              <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                <div className="text-sm text-gray-300 mb-2">{detectLanguage(selectedReview.code)}</div>
                <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap" style={codeContainerStyles}>{selectedReview.code}</pre>
              </div>

              <div className="space-y-4">
                <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                  <div className="text-sm text-gray-300 mb-2">Review</div>
                  <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap">{selectedReview.review}</pre>
                </div>

                {selectedReview.optimized_code && (
                  <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                    <div className="text-sm text-gray-300 mb-2">Optimized code</div>
                    <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap" style={codeContainerStyles}>{selectedReview.optimized_code}</pre>
                  </div>
                )}

                {selectedReview.explanation && (
                  <div className="bg-[#40414f] rounded-xl p-4">
                    <div className="text-sm text-gray-300 mb-2">Explanation</div>
                    <p className="text-white whitespace-pre-wrap">{selectedReview.explanation}</p>
                  </div>
                )}

                {selectedReview.security_issues && (
                  <div className="bg-[#40414f] rounded-xl p-6">
                    <div className="text-sm text-gray-300 mb-2">Security Analysis</div>
                    <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap">{selectedReview.security_issues}</pre>
                  </div>
                )}
              </div>

              <div className="pt-8">
                <div className="text-sm text-gray-300 italic">Reviewed on: {selectedReview.created_at ? new Date(selectedReview.created_at).toLocaleString() : ''}</div>
                <button
                  className="mt-6 bg-[#10a37f] text-white px-6 py-2 rounded-lg hover:bg-[#0d8c6b] font-medium"
                  onClick={() => setSelectedReview(null)}
                >
                  Back to Code Input
                </button>
              </div>
            </div>
          </div>

          <style jsx>{`\n            pre::-webkit-scrollbar {\n              height: 6px;\n            }\n            pre::-webkit-scrollbar-track {\n              background: #40414f;\n              border-radius: 3px;\n            }\n            pre::-webkit-scrollbar-thumb {\n              background: #6b7280;\n              border-radius: 3px;\n            }\n            pre::-webkit-scrollbar-thumb:hover {\n              background: #9ca3af;\n            }\n          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#343541]"><div className="fixed top-4 right-4 z-50">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
      <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
      <div className="flex-1 p-6">
        <div className="flex items-center gap-3 mb-20">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#343541] rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
          </div>
          <span className="text-white text-xl font-semibold">CRVKN</span>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {showAuthPrompt && (
            <div className="max-w-2xl w-full mb-4">
              <div className="bg-yellow-600 text-white rounded-lg p-3 flex items-center justify-between">
                <div>Please log in using the Login button at the top-right to submit code for review.</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowAuthPrompt(false); setShowLogin(true); }} className="bg-white text-[#10a37f] px-3 py-1 rounded">Login</button>
                  <button onClick={() => setShowAuthPrompt(false)} className="text-white px-3 py-1">Dismiss</button>
                </div>
              </div>
            </div>
          )}
          {showLogin && (
            <Login setIsAuthenticated={setIsAuthenticated} setUsername={setUsername} setShowLogin={setShowLogin} setShowRegister={setShowRegister} setToken={setToken} />
          )}
          {showRegister && (
            <Register setShowLogin={setShowLogin} setShowRegister={setShowRegister} setIsAuthenticated={setIsAuthenticated} setUsername={setUsername} setToken={setToken} />
          )}
          <div className="relative w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
              <div className="flex items-start gap-4 mb-4">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex-shrink-0 mt-1"
                >
                  <Plus className="w-6 h-6 text-[#343541]" />
                </button>

                <textarea
                  placeholder="Paste your code here..."
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="flex-1 bg-transparent text-[#343541] placeholder-gray-400 outline-none text-base font-mono resize-none min-h-[120px]"
                  rows={6}
                  style={{ overflowX: 'auto', whiteSpace: 'pre', maxWidth: '100%' }}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSubmitCode}
                  disabled={isLoading || !codeInput.trim()}
                  className="bg-[#10a37f] text-white px-8 py-3 rounded-lg hover:bg-[#0d8c6b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    'Submit for Review'
                  )}
                </button>
              </div>
            </div>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-lg p-4 w-64 z-10">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconLink className="w-5 h-5 text-[#343541]" />
                  <span className="text-[#343541]">Upload URL</span>
                </button>

                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Upload className="w-5 h-5 text-[#343541]" />
                  <span className="text-[#343541]">Upload File</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.py,.js,.java,.cpp,.c,.html,.css,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        <style jsx>{`
          pre::-webkit-scrollbar {
            height: 6px;
          }
          pre::-webkit-scrollbar-track {
            background: #40414f;
            border-radius: 3px;
          }
          pre::-webkit-scrollbar-thumb {
            background: #6b7280;
            border-radius: 3px;
          }
          pre::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          textarea::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          textarea::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }
          textarea::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 3px;
          }
          textarea::-webkit-scrollbar-thumb:hover{
            background: #555;
          }
        `}</style>
      </div>
    </div>
  );
};

export default CodeReviewApp;
