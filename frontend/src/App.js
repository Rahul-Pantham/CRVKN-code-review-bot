import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, GitBranch } from 'lucide-react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './components/login';
import Register from './components/register';
import RejectionReasonsModal from './components/RejectionReasonsModal';
import ReviewCard from './components/ReviewCard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

// Main App Component (existing functionality)
const CodeReviewApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  const [showThanks, setShowThanks] = useState(false);
  const [pastReviews, setPastReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const fileInputRef = useRef(null);
  const codeTopRef = useRef(null);

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // { name, content }
  const [reviewList, setReviewList] = useState([]); // array of reviews when multiple files submitted
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [selectedForRejection, setSelectedForRejection] = useState(null);
  
  // Git repository states
  const [showGitModal, setShowGitModal] = useState(false);
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [includePatterns] = useState(['*.py', '*.js', '*.jsx', '*.ts', '*.tsx', '*.java', '*.cpp', '*.c', '*.h', '*.cs', '*.php', '*.rb', '*.go', '*.rs', '*.swift']);
  const [excludePatterns] = useState(['node_modules/**', '*.min.js', '*.min.css', 'dist/**', 'build/**', '__pycache__/**', '*.pyc', '.git/**']);
  const [maxFiles] = useState(50);
  
  // Pattern Learning states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [userPreferences, setUserPreferences] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  const removeSelectedFile = (idx) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(updatedFiles);
    // Update code input to reflect remaining files
    if (updatedFiles.length > 0) {
      setCodeInput(updatedFiles.map(f => `File: ${f.name}`).join('\n'));
    } else {
      setCodeInput('');
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setCodeInput('');
  };

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
      fetchUserPreferences();
    } else {
      setIsAuthenticated(false);
      setUserPreferences(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // When a review is available, scroll the main area into view so the user sees the input + review
  useEffect(() => {
    if (reviewData || selectedReview || (reviewList && reviewList.length > 0)) {
      try {
        codeTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        // ignore
      }
    }
  }, [reviewData, selectedReview, reviewList]);

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

  // Pattern Learning Functions
  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    try {
      const response = await fetch(API_BASE + '/feedback/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback_text: feedbackText }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setFeedbackMessage(result.message);
        if (result.changes && result.changes.length > 0) {
          setFeedbackMessage(result.message + ": " + result.changes.join(", "));
        }
        setFeedbackText('');
        setShowFeedbackModal(false);
        // Refresh preferences after feedback
        fetchUserPreferences();
      } else {
        setFeedbackMessage('Error submitting feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setFeedbackMessage('Error submitting feedback');
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch(API_BASE + '/preferences/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const preferences = await response.json();
        setUserPreferences(preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  // When user selects files, read them and show filenames in the UI
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const fileObjs = [];
    for (const file of files) {
      try {
        // Check if file is already selected to prevent duplicates
        const alreadyExists = selectedFiles.some(existingFile => 
          existingFile.name === file.name && existingFile.size === file.size
        );
        
        if (alreadyExists) {
          console.log(`File ${file.name} is already selected, skipping...`);
          continue;
        }

        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });
        fileObjs.push({ name: file.name, content, size: file.size });
      } catch (err) {
        console.error('Error reading file', file.name, err);
      }
    }

    if (fileObjs.length > 0) {
      // Append new files to existing ones instead of replacing
      setSelectedFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...fileObjs];
        // Update the textbox to show all selected files
        setCodeInput(updatedFiles.map(f => `File: ${f.name}`).join('\n'));
        console.log(`Added ${fileObjs.length} files. Total files selected: ${updatedFiles.length}`);
        return updatedFiles;
      });
    }

    // reset file input so same files can be re-selected later
    if (event.target) event.target.value = null;
    setShowDropdown(false);
  };

  const handleSubmitCode = async () => {
    // if there are selected files, submit them sequentially; otherwise submit the textbox content
    if (!codeInput.trim() && selectedFiles.length === 0) return;

    if (!token) {
      setShowAuthPrompt(true);
      return;
    }

    setIsLoading(true);
    const results = [];

    try {
      if (selectedFiles.length > 0) {
        console.log(`Starting to process ${selectedFiles.length} files:`, selectedFiles.map(f => f.name));
        // send each file sequentially and collect results
        for (let i = 0; i < selectedFiles.length; i++) {
          const f = selectedFiles[i];
          console.log(`Processing file ${i + 1}/${selectedFiles.length}: ${f.name}`);
          console.log(`File content preview (first 100 chars):`, f.content?.substring(0, 100));
          
          try {
            const resp = await fetch(API_BASE + '/generate-review', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ code: f.content, filename: f.name }),
            });

            if (!resp.ok) {
              const errorText = await resp.text();
              console.error('Failed to generate review for', f.name, resp.status, resp.statusText, errorText);
              // Add an error entry to results so user knows this file failed
              results.push({
                id: `error-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                title: `❌ Error processing ${f.name}`,
                filename: f.name,
                comment: f.content,
                ai_feedback: `Failed to generate review for ${f.name}. Status: ${resp.status} ${resp.statusText}\nError: ${errorText}`,
                optimized_code: '',
                explanation: '',
                security_issues: '',
                created_at: new Date().toISOString(),
                isError: true,
                fileIndex: i + 1,
                totalFiles: selectedFiles.length
              });
              continue;
            }

            const data = await resp.json();
            const reviewObj = {
              id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              title: `📄 ${f.name} - ${data.title || 'Code Review'}`,
              filename: f.name,
              comment: f.content,
              ai_feedback: data.review || data.ai_feedback || 'Review completed',
              optimized_code: data.optimized_code,
              explanation: data.explanation,
              security_issues: data.security_issues,
              language: data.language,
              rating: data.rating,
              created_at: new Date().toISOString(),
              fileIndex: i + 1,
              totalFiles: selectedFiles.length
            };
            results.push(reviewObj);
            console.log(`Successfully processed file: ${f.name}`);
          } catch (error) {
            console.error('Error processing file', f.name, error);
            results.push({
              id: `error-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              title: `❌ Error processing ${f.name}`,
              filename: f.name,
              comment: f.content,
              ai_feedback: `Error processing ${f.name}: ${error.message}`,
              optimized_code: '',
              explanation: '',
              security_issues: '',
              created_at: new Date().toISOString(),
              isError: true,
              fileIndex: i + 1,
              totalFiles: selectedFiles.length
            });
          }
        }

        console.log('Final results after processing all files:', results);
        
        if (results.length > 0) {
          // Store all reviews but show them sequentially
          console.log('Setting review list with results:', results);
          setReviewList(results);
          setCurrentReviewIndex(0);
          setReviewData(null); // Clear single review data when showing multiple
          setPastReviews((prev) => [...results, ...prev]);
          
          console.log(`Generated ${results.length} reviews for ${selectedFiles.length} files`);
          console.log('Current review index set to:', 0);
          console.log('Review list length:', results.length);
          
          // Log each result for debugging
          results.forEach((result, index) => {
            console.log(`Result ${index + 1}:`, {
              filename: result.filename,
              title: result.title,
              hasReview: !!result.ai_feedback,
              isError: result.isError
            });
          });
        } else {
          console.warn('No results generated from file processing');
        }

        // clear selections
        setSelectedFiles([]);
        setCodeInput('');
      } else {
        // single textbox submission
        const response = await fetch(API_BASE + '/generate-review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ code: codeInput }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.error) { alert('Error: ' + data.error); return; }

        const single = {
          id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          title: data.title || 'Review',
          filename: null,
          comment: codeInput,
          ai_feedback: data.review || data.ai_feedback || 'Review completed',
          optimized_code: data.optimized_code,
          explanation: data.explanation,
          security_issues: data.security_issues,
          created_at: new Date().toISOString(),
        };

        setReviewList([single]);
        setCurrentReviewIndex(0);
        setReviewData(null); // Use reviewList for consistency
        setPastReviews((prev) => [single, ...prev]);
        setCodeInput('');
      }

      fetchPastReviews();
    } catch (err) {
      console.error('Error submitting for review:', err);
      alert('Failed to submit for review: ' + (err?.message || String(err)));
    }

    setIsLoading(false);
  };

  const handleGitRepoSubmit = async () => {
    if (!gitRepoUrl.trim()) {
      alert('Please enter a valid Git repository URL');
      return;
    }

    if (!token) {
      setShowAuthPrompt(true);
      return;
    }

    setIsLoading(true);
    setShowGitModal(false);

    try {
      console.log(`Starting Git repository review for: ${gitRepoUrl} (branch: ${gitBranch})`);
      
      const response = await fetch(API_BASE + '/generate-repo-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          repo_url: gitRepoUrl,
          branch: gitBranch,
          include_patterns: includePatterns,
          exclude_patterns: excludePatterns,
          max_files: maxFiles
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process repository: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log('Git repository review completed:', data);

      if (data.reviews && data.reviews.length > 0) {
        // Format the reviews for display - each file review becomes a navigation item
        const formattedReviews = data.reviews.map((fileReview, index) => ({
          id: data.review_id, // All files share the same review ID (single database entry)
          title: `� ${fileReview.file_path}`,
          filename: fileReview.file_path,
          comment: 'Repository File Review',
          review: fileReview.review,
          optimized_code: fileReview.optimized_code,
          explanation: fileReview.explanation,
          security_issues: fileReview.security_issues,
          language: fileReview.language,
          rating: fileReview.rating,
          created_at: new Date().toISOString(),
          fileIndex: fileReview.file_index,
          totalFiles: fileReview.total_files,
          repositoryUrl: data.repository_url,
          branch: data.branch,
          original_code: fileReview.original_code,
          is_repository_review: true
        }));

        // Set reviews for display
        setReviewList(formattedReviews);
        setCurrentReviewIndex(0);
        setReviewData(null);
        
        // Only add the repository review once to past reviews (not each file)
        const repoReviewSummary = {
          id: data.review_id,
          title: `🏗️ Repository: ${data.repository_url.split('/').pop().replace('.git', '')} (${data.branch})`,
          comment: `${data.total_files} files reviewed`,
          created_at: new Date().toISOString(),
          is_repository_review: true
        };
        setPastReviews((prev) => [repoReviewSummary, ...prev]);

        console.log(`Successfully reviewed ${formattedReviews.length} files from Git repository`);
        
        // Clear Git form
        setGitRepoUrl('');
        setGitBranch('main');
      } else {
        alert('No code files found in the repository or all files failed to process.');
      }

      fetchPastReviews();
    } catch (err) {
      console.error('Error processing Git repository:', err);
      alert('Failed to process Git repository: ' + (err?.message || String(err)));
    }

    setIsLoading(false);
  };

  const handleFeedbackSubmitForReview = async (reviewId, feedback, rejectionReason = null, sectionStates = null) => {
    try {
      if (!reviewId) return;
      // Prepare detailed section feedback (use backend expected keys)
      const sectionFeedback = sectionStates ? {
        ai_review: sectionStates.review,
        original_code: sectionStates.originalCode,
        optimized_code: sectionStates.optimizedCode,
        explanation: sectionStates.explanation,
        security_analysis: sectionStates.securityAnalysis
      } : {};

      await fetch(API_BASE + '/submit-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          review_id: reviewId,
          feedback,
          rejection_reasons: rejectionReason ? [rejectionReason] : [],
          custom_rejection_reason: null,
          section_feedback: sectionFeedback
        }),
      });

      // Update UI: move the review to completed list
      const review = (reviewList.find(r => r.id === reviewId) || (reviewData && reviewData.id === reviewId ? reviewData : null));
      if (review) {
        setPastReviews(prev => [{ 
          ...review, 
          feedback, 
          status: rejectionReason ? 'rejected' : 'reviewed',
          section_feedback: sectionFeedback
        }, ...prev]);
        setReviewList(prev => prev.filter(r => r.id !== reviewId));
        if (reviewData && reviewData.id === reviewId) setReviewData(null);
      }
    } catch (err) {
      console.error('Error submitting feedback for review:', err);
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
        // clear any previous rejection state so modal doesn't re-appear
        setShowRejectionModal(false);
        setSelectedForRejection(null);
        
        // Check if this is a repository review
        if (full.is_repository_review && full.file_reviews) {
          // Format file reviews for navigation
          const formattedReviews = full.file_reviews.map((fileReview, index) => ({
            id: full.id,
            title: `📁 ${fileReview.file_path}`,
            filename: fileReview.file_path,
            comment: 'Repository File Review',
            review: fileReview.review,
            optimized_code: fileReview.optimized_code,
            explanation: fileReview.explanation,
            security_issues: fileReview.security_issues,
            language: fileReview.language,
            rating: fileReview.rating,
            created_at: full.created_at,
            fileIndex: fileReview.file_index,
            totalFiles: fileReview.total_files,
            repositoryUrl: full.repository_url,
            branch: full.repository_branch,
            original_code: fileReview.original_code,
            is_repository_review: true
          }));
          
          // Set up navigation through repository files
          setReviewList(formattedReviews);
          setCurrentReviewIndex(0);
          setSelectedReview(null);
          setReviewData(null);
        } else {
          // Regular single file review
          setSelectedReview(full);
          setReviewList([]);
          setCurrentReviewIndex(0);
          setReviewData(null);
        }
        setCodeInput('');
      } else {
        console.error('Failed to fetch review detail', resp.status);
        setShowRejectionModal(false);
        setSelectedForRejection(null);
        setSelectedReview(review); // fallback to what we have
      }
    } catch (e) {
      console.error('Error fetching review detail', e);
      setShowRejectionModal(false);
      setSelectedForRejection(null);
      setSelectedReview(review);
    }
  };

  const detectLanguage = (code) => {
    if (!code) return 'text';
    if (code.includes('public class') || code.includes('System.out.println') || code.includes('import java.')) return 'java';
    if (code.includes('#include') || code.includes('cout <<') || code.includes('std::')) return 'cpp';
    if (code.includes('function') || code.includes('console.log') || code.includes('const ') || code.includes('let ')) return 'javascript';
    if (code.includes('def ') || code.includes('print(') || (code.includes('import ') && !code.includes('import java.'))) return 'python';
    return 'text';
  };

  const getDisplayedArray = () => {
    console.log('getDisplayedArray called - reviewList:', reviewList, 'currentReviewIndex:', currentReviewIndex, 'reviewData:', reviewData);
    
    if (reviewList && reviewList.length > 0) {
      // TEMPORARY: Show all reviews to debug the issue
      if (reviewList.length > 1) {
        console.log('Showing ALL reviews for debugging:', reviewList);
        return reviewList; // Show all reviews at once for debugging
      } else {
        // For single review, show normally
        const currentReview = reviewList[currentReviewIndex];
        console.log('Showing single review:', currentReview);
        return [currentReview].filter(Boolean);
      }
    }
    if (reviewData) {
      console.log('Showing single reviewData:', reviewData);
      return [reviewData];
    }
    console.log('No reviews to display');
    return [];
  };

  const handleNextReview = () => {
    console.log('handleNextReview called - current index:', currentReviewIndex, 'list length:', reviewList?.length);
    if (reviewList && currentReviewIndex < reviewList.length - 1) {
      const newIndex = currentReviewIndex + 1;
      setCurrentReviewIndex(newIndex);
      console.log('Moving to next review, new index:', newIndex);
    } else {
      console.log('Cannot move to next review - at end or no reviews');
    }
  };

  const handlePreviousReview = () => {
    console.log('handlePreviousReview called - current index:', currentReviewIndex, 'list length:', reviewList?.length);
    if (reviewList && currentReviewIndex > 0) {
      const newIndex = currentReviewIndex - 1;
      setCurrentReviewIndex(newIndex);
      console.log('Moving to previous review, new index:', newIndex);
    } else {
      console.log('Cannot move to previous review - at beginning or no reviews');
    }
  };


  if (showThanks) {
    return (
      <div className="flex min-h-screen bg-[#343541]">{!showLogin && !showRegister && (<><div className="fixed top-4 right-4 z-50">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
        <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
        </>)}
        <div ref={codeTopRef} className="flex-1 p-6" style={{ marginLeft: 64 }}>
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
              <div className="flex gap-3">
                <button 
                  onClick={() => window.location.href = '/admin/login'} 
                  className="bg-[#8B5CF6] text-white px-4 py-2 rounded hover:bg-[#7C3AED] transition-colors"
                >
                  Admin
                </button>
                {isAuthenticated ? (
                  <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
                ) : (
                  <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-6 text-white">
              {/* User's input at the top */}
              {selectedFiles && selectedFiles.length > 0 ? (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 bg-[#343541] rounded flex items-center justify-center">
                      <div className="w-2 h-2 border border-white rounded-sm"></div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {selectedFiles.map((f, idx) => (
                      <div key={f.name + idx} className="flex items-center gap-3 bg-[#40414f] rounded-xl p-4">
                        <img src="https://cdn.builder.io/api/v1/image/assets%2Fa6020cfe29b945cfb33ac3b4d4f91053%2F7c023e819d5f4a75886f912732747854?format=webp&width=800" alt="file" className="w-6 h-6 object-cover rounded-sm" />
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-white">{f.name}</div>
                          <div className="text-xs text-gray-300">{detectLanguage(f.content)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 bg-[#343541] rounded flex items-center justify-center">
                      <div className="w-2 h-2 border border-white rounded-sm"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden">
                      <div className="text-sm text-gray-300 mb-2">{detectLanguage(codeInput)}</div>
                      <pre 
                        className="text-white font-mono text-sm leading-relaxed"
                        style={codeContainerStyles}
                      >
                        {codeInput}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Debug Info */}
              {reviewList && reviewList.length > 0 && (
                <div className="bg-blue-600 text-white rounded-xl p-3 mb-4">
                  <div className="text-sm">
                    DEBUG: Found {reviewList.length} review(s) | Current Index: {currentReviewIndex}
                  </div>
                  <div className="text-xs mt-1">
                    Files: {reviewList.map(r => r.filename || 'unknown').join(', ')}
                  </div>
                </div>
              )}

              {/* Multiple Files Navigation */}
              {reviewList && reviewList.length > 1 && (
                <div className="bg-[#40414f] rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">
                        Review {currentReviewIndex + 1} of {reviewList.length}
                      </span>
                      <div className="text-gray-300 text-sm">
                        {reviewList[currentReviewIndex]?.filename || `File ${currentReviewIndex + 1}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousReview}
                        disabled={currentReviewIndex === 0}
                        className="bg-[#565869] text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#6b6d82] transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={handleNextReview}
                        disabled={currentReviewIndex >= reviewList.length - 1}
                        className="bg-[#565869] text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#6b6d82] transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-[#565869] rounded-full h-2">
                      <div 
                        className="bg-[#10a37f] h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${((currentReviewIndex + 1) / reviewList.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                { getDisplayedArray().map((rd, idx) => (
                  <div key={rd.id || idx} className="space-y-4">
                    <ReviewCard
                      review={rd}
                      codeContainerStyles={codeContainerStyles}
                      onAccept={(id, sectionStates) => handleFeedbackSubmitForReview(id, 'positive', null, sectionStates)}
                      onReject={(r, sectionStates) => { 
                        setSelectedForRejection({ review: r, sectionStates }); 
                        setShowRejectionModal(true); 
                      }}
                    />
                  </div>
                ))}
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

          <style>{`
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

  if ((reviewData || (reviewList && reviewList.length > 0)) && !showThanks) {
    return (
      <div className="flex min-h-screen bg-[#343541]">{!showLogin && !showRegister && (<><div className="fixed top-4 right-4 z-50">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
        <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
        </>)}
        <div ref={codeTopRef} className="flex-1 p-6" style={{ marginLeft: 64 }}>
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
              <div className="w-full max-w-2xl">
                <div className="flex items-center bg-[#2b2b2b] rounded-xl px-3 py-2">
                  <div className="flex gap-2 overflow-x-auto flex-1">
                    {selectedFiles && selectedFiles.length > 0 ? (
                      selectedFiles.map((f, idx) => (
                        <div key={f.name + idx} className="flex items-center gap-3 bg-[#3a3a3a] px-3 py-1 rounded-md mr-2 flex-shrink-0">
                          <img src="https://cdn.builder.io/api/v1/image/assets%2Fa6020cfe29b945cfb33ac3b4d4f91053%2F7c023e819d5f4a75886f912732747854?format=webp&width=800" alt="file" className="w-5 h-5 object-cover rounded-sm" />
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-white truncate" style={{ maxWidth: 220 }}>{f.name}</div>
                            <div className="text-xs text-gray-300">{detectLanguage(f.content)}</div>
                          </div>
                          <button onClick={() => removeSelectedFile(idx)} className="ml-2 text-gray-400 hover:text-white" title="Remove file">✕</button>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400">{codeInput.substring(0, 50)}...</div>
                    )}
                  </div>
                  
                  {/* Clear All Button */}
                  {selectedFiles && selectedFiles.length > 1 && (
                    <button
                      onClick={clearAllFiles}
                      className="ml-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors flex-shrink-0"
                      title="Clear all files"
                    >
                      Clear All
                    </button>
                  )}

                  {(reviewData || (reviewList && reviewList.length > 0) || selectedReview) ? (
                    <div className="flex-1 px-4 text-gray-300">
                      {selectedFiles && selectedFiles.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {selectedFiles.map((f, idx) => (
                            <div key={f.name + idx} className="text-sm text-gray-200 truncate" style={{ maxWidth: 600 }}>{f.name}</div>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-sm font-mono text-gray-200 whitespace-pre-wrap max-h-40 overflow-auto">{codeInput}</pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 px-4 text-gray-400">+ Ask anything</div>
                  )}
                  <button className="p-2 text-gray-300" title="Voice input">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 1v11"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-14 0"/></svg>
                  </button>
                  <button onClick={handleSubmitCode} disabled={isLoading} className="ml-2 bg-white p-2 rounded-full text-[#343541]" title="Send">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
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

              {/* Multiple Files Navigation */}
              {reviewList && reviewList.length > 1 && (
                <div className="bg-[#40414f] rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">
                        Review {currentReviewIndex + 1} of {reviewList.length}
                      </span>
                      <div className="text-gray-300 text-sm">
                        {reviewList[currentReviewIndex]?.filename || `File ${currentReviewIndex + 1}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousReview}
                        disabled={currentReviewIndex === 0}
                        className="bg-[#565869] text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#6b6d82] transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={handleNextReview}
                        disabled={currentReviewIndex >= reviewList.length - 1}
                        className="bg-[#565869] text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#6b6d82] transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-[#565869] rounded-full h-2">
                      <div 
                        className="bg-[#10a37f] h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${((currentReviewIndex + 1) / reviewList.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                { getDisplayedArray().map((rd, idx) => (
                  <div key={rd.id || idx} className="space-y-4">
                    <ReviewCard
                      review={rd}
                      codeContainerStyles={codeContainerStyles}
                      onAccept={(id, sectionStates) => handleFeedbackSubmitForReview(id, 'positive', null, sectionStates)}
                      onReject={(r, sectionStates) => { 
                        setSelectedForRejection({ review: r, sectionStates }); 
                        setShowRejectionModal(true); 
                      }}
                    />
                  </div>
                ))}

              </div>


            </div>
          </div>

          <style>{`
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
        
        {/* Rejection Reasons Modal */}
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
                setPastReviews(prev => [{ 
                  ...review, 
                  status: response?.status || 'rejected',
                  section_feedback: sectionFeedback
                }, ...prev]);
                setReviewList(prev => prev.filter(r => r.id !== rid));
                if (reviewData && reviewData.id === rid) setReviewData(null);
              }
            }
            setShowRejectionModal(false);
            setSelectedForRejection(null);
            setShowThanks(true);
            setTimeout(() => setShowThanks(false), 3000);
          }}
        />
      </div>
    );
  }

  if (selectedReview) {
    // Render identical layout to an immediate generated review: original code, optimized_code, explanation, security_issues
    return (
      <div className="flex min-h-screen bg-[#343541]">{!showLogin && !showRegister && (<><div className="fixed top-4 right-4 z-50 flex gap-3">
              <button
                onClick={() => window.location.href = '/admin/login'}
                className="bg-[#8B5CF6] text-white px-4 py-2 rounded hover:bg-[#7C3AED] transition-colors"
              >
                Admin
              </button>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
        <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
        </>)}
        <div ref={codeTopRef} className="flex-1 p-6" style={{ marginLeft: 64 }}>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-[#343541] rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
              </div>
            </div>
            <span className="text-white text-xl font-semibold">CRVKN</span>
          </div>

          <div className="max-w-4xl mx-auto text-white">
            <div className="space-y-6">
              {/* User's input at the top */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-[#343541] rounded flex items-center justify-center">
                    <div className="w-2 h-2 border border-white rounded-sm"></div>
                  </div>
                </div>
                <div className="flex-1">
                  {/* Show the original code block if present */}
                  {selectedReview.filename ? (
                    <div className="flex items-center gap-3 bg-[#40414f] rounded-xl p-4 mb-4">
                      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa6020cfe29b945cfb33ac3b4d4f91053%2F7c023e819d5f4a75886f912732747854?format=webp&width=800" alt="file" className="w-6 h-6 object-cover rounded-sm" />
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-white">{selectedReview.filename}</div>
                        <div className="text-xs text-gray-300">{detectLanguage(selectedReview.code)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden mb-4">
                      <div className="text-sm text-gray-300 mb-2">{detectLanguage(selectedReview.code)}</div>
                      <pre
                        className="text-white font-mono text-sm leading-relaxed"
                        style={codeContainerStyles}
                      >
                        {selectedReview.code}
                      </pre>
                    </div>
                  )}

                  <ReviewCard
                    review={{
                      ...selectedReview,
                      ai_feedback: selectedReview.review,
                      comment: selectedReview.code || selectedReview.comment
                    }}
                    codeContainerStyles={codeContainerStyles}
                    showActions={false}
                  />
                </div>
              </div>

              <div className="pt-8">
                <div className="text-sm text-gray-300 italic">Reviewed on: {selectedReview.created_at ? new Date(selectedReview.created_at).toLocaleDateString() : ''}</div>
                <button
                  className="mt-6 bg-[#10a37f] text-white px-6 py-2 rounded-lg hover:bg-[#0d8c6b] font-medium"
                  onClick={() => setSelectedReview(null)}
                >
                  Back to Code Input
                </button>
              </div>
            </div>
          </div>

          <style>{`\n            pre::-webkit-scrollbar {\n              height: 6px;\n            }\n            pre::-webkit-scrollbar-track {\n              background: #40414f;\n              border-radius: 3px;\n            }\n            pre::-webkit-scrollbar-thumb {\n              background: #6b7280;\n              border-radius: 3px;\n            }\n            pre::-webkit-scrollbar-thumb:hover {\n              background: #9ca3af;\n            }\n          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#343541]">{!showLogin && !showRegister && (<><div className="fixed top-4 right-4 z-50 flex gap-3">
              <button
                onClick={() => window.location.href = '/admin/login'}
                className="bg-[#8B5CF6] text-white px-4 py-2 rounded hover:bg-[#7C3AED] transition-colors"
              >
                Admin
              </button>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="bg-[#10a37f] text-white px-4 py-2 rounded">Logout</button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-transparent border border-white text-white px-4 py-2 rounded">Login</button>
              )}
            </div>
      <Sidebar reviews={pastReviews} onSelectReview={handleSelectReview} username={username} onLogout={handleLogout} />
      </>)}
      <div ref={codeTopRef} className="flex-1 p-6" style={{ marginLeft: 64 }}>
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
          {!showLogin && !showRegister && (
          <div className="relative w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
              <div className="flex items-start gap-4 mb-4">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex-shrink-0 mt-1"
                >
                  <Plus className="w-6 h-6 text-[#343541]" />
                </button>

                {selectedFiles && selectedFiles.length > 0 ? (
                  <div className="flex flex-col gap-2 w-full font-mono text-[#343541]">
                    {selectedFiles.map((f, idx) => (
                      <div key={f.name + idx} className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded">
                        <div className="text-base">+</div>
                        <div className="text-sm truncate">File: {f.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    placeholder="Paste your code here..."
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className="flex-1 bg-transparent text-[#343541] placeholder-gray-400 outline-none text-base font-mono resize-none min-h-[120px]"
                    rows={6}
                    style={{ overflowX: 'auto', whiteSpace: 'pre', maxWidth: '100%' }}
                  />
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSubmitCode}
                  disabled={isLoading || (!codeInput.trim() && selectedFiles.length === 0)}
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
                    setShowGitModal(true);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <GitBranch className="w-5 h-5 text-[#343541]" />
                  <span className="text-[#343541]">Git Repository</span>
                </button>

                <div className="border-t border-gray-200 my-2"></div>
                
                <button
                  onClick={() => {
                    setShowFeedbackModal(true);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="w-5 h-5 text-[#343541] flex items-center justify-center">💡</span>
                  <span className="text-[#343541]">Give Feedback</span>
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
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          )}

          {/* Git Repository Modal */}
          {showGitModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-semibold text-[#343541] mb-4">Review Git Repository</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#343541] mb-2">
                      Repository URL *
                    </label>
                    <input
                      type="url"
                      value={gitRepoUrl}
                      onChange={(e) => setGitRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10a37f] text-[#343541]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#343541] mb-2">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10a37f] text-[#343541]"
                    />
                  </div>

                  <div className="text-sm text-gray-600">
                    <p><strong>File Types:</strong> Python, JavaScript, TypeScript, Java, C/C++, C#, PHP, Ruby, Go, Rust, Swift</p>
                    <p><strong>Max Files:</strong> {maxFiles}</p>
                    <p><strong>Excludes:</strong> node_modules, dist, build, __pycache__, .git</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowGitModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-[#343541] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGitRepoSubmit}
                    disabled={!gitRepoUrl.trim() || isLoading}
                    className="flex-1 bg-[#10a37f] text-white px-4 py-2 rounded-lg hover:bg-[#0d8c6b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : 'Review Repository'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Modal */}
          {showFeedbackModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-semibold text-[#343541] mb-4">💡 Improve Future Reviews</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#343541] mb-2">
                      How can we improve your code reviews?
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Examples:&#10;• 'Security analysis not required'&#10;• 'Focus more on performance'&#10;• 'Skip code optimization suggestions'&#10;• 'Need more detailed explanations'"
                      rows="6"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10a37f] text-[#343541] resize-none"
                    />
                  </div>
                  
                  {feedbackMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      feedbackMessage.includes('updated') 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {feedbackMessage}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false);
                      setFeedbackText('');
                      setFeedbackMessage('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-[#343541] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim()}
                    className="flex-1 bg-[#10a37f] text-white px-4 py-2 rounded-lg hover:bg-[#0d8c6b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Preferences Modal */}
          {showPreferences && userPreferences && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg mx-4">
                <h3 className="text-xl font-semibold text-[#343541] mb-4">🎯 Your Review Preferences</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Security Analysis</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      userPreferences.security_analysis 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userPreferences.security_analysis ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Performance Analysis</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      userPreferences.performance_analysis 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userPreferences.performance_analysis ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Code Optimization</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      userPreferences.code_optimization 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userPreferences.code_optimization ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Best Practices</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      userPreferences.best_practices 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userPreferences.best_practices ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Detailed Explanations</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      userPreferences.detailed_explanations 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userPreferences.detailed_explanations ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">AST Analysis</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      userPreferences.ast_analysis 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userPreferences.ast_analysis ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Feedback received:</strong> {userPreferences.feedback_count} times
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Preferences automatically learned from your feedback
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-[#343541] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowPreferences(false);
                      setShowFeedbackModal(true);
                    }}
                    className="flex-1 bg-[#10a37f] text-white px-4 py-2 rounded-lg hover:bg-[#0d8c6b] transition-colors"
                  >
                    Give Feedback
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
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

// Main App with Routing
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Application Route */}
        <Route path="/" element={<CodeReviewApp />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        
        {/* Fallback Route */}
        <Route path="*" element={<CodeReviewApp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
