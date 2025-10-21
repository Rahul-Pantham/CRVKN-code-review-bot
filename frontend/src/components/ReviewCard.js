import React, { useState } from 'react';

// Utility to sanitize AI text: remove markdown bold ** markers from headings/content
const sanitizeContent = (text) => {
  if (!text) return '';
  // Simple pass: remove all double-asterisk markers
  let cleaned = text.replace(/\*\*/g, '');
  // Optional: collapse extra blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
};

// Format review content with clean, readable typography
const formatReviewContent = (raw) => {
  const text = sanitizeContent(raw || '');
  const lines = text.split(/\r?\n/);
  const headingRegex = /^(\s*)(General Review|Security Check|Issues Found|Performance Review|Optimization Suggestions|Security Analysis|Summary|Recommendations|Notes|Findings)\s*:?\s*$/i;
  return (
    <div className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-gray-100">
      {lines.map((line, idx) => {
        if (headingRegex.test(line)) {
          // Extract indentation to preserve structure
            const indent = line.match(/^(\s*)/)[0] || '';
            const label = line.replace(/:/g, '').trim();
            return (
              <div key={idx} className="mt-4 mb-2">
                {indent && <span style={{ whiteSpace: 'pre' }}>{indent}</span>}
                <span className="text-base font-semibold tracking-wide text-white border-l-4 border-[#10a37f] pl-3">
                  {label}:
                </span>
              </div>
            );
        }
        return <div key={idx} className="leading-7">{line === '' ? '\u00A0' : line}</div>;
      })}
    </div>
  );
};

const ReviewCard = ({ review, onAccept, onReject, codeContainerStyles, showActions = true, onReviewAnother }) => {
  // State to track acceptance/rejection of each section - MUST be called before any early returns
  const [sectionStates, setSectionStates] = useState({
    codeQuality: null,       // null, 'accepted', 'rejected'
    keyFindings: null,
    security: null,
    performance: null,
    architecture: null,
    bestPractices: null,
    recommendations: null,
    originalCode: null,
    optimizedCode: null,
    explanation: null,
    syntaxErrors: null,      // NEW: track syntax errors section
    semanticErrors: null     // NEW: track semantic errors section
  });

  // State for improvement suggestion
  const [showSuggestionBox, setShowSuggestionBox] = useState(false);
  const [improvementSuggestion, setImprovementSuggestion] = useState('');
  const [suggestionSubmitted, setSuggestionSubmitted] = useState(false);

  if (!review) return null;

  const codeContent = review.code || review.comment || '';
  const rawReviewText = review.ai_feedback || review.review || '';
  
  // Parse sections from the review text using markers
  const parseSectionFromText = (text, marker) => {
    const regex = new RegExp(`${marker}\\s*\\n([\\s\\S]*?)(?=###[A-Z_]+###|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };
  
  // Extract all new sections, including syntax/semantic errors
  const sections = {
    codeQuality: parseSectionFromText(rawReviewText, '###CODE_QUALITY###'),
    keyFindings: parseSectionFromText(rawReviewText, '###KEY_FINDINGS###'),
    security: parseSectionFromText(rawReviewText, '###SECURITY###'),
    performance: parseSectionFromText(rawReviewText, '###PERFORMANCE###'),
    architecture: parseSectionFromText(rawReviewText, '###ARCHITECTURE###'),
    bestPractices: parseSectionFromText(rawReviewText, '###BEST_PRACTICES###'),
    recommendations: parseSectionFromText(rawReviewText, '###RECOMMENDATIONS###'),
    syntaxErrors: parseSectionFromText(rawReviewText, '###SYNTAX_ERRORS###'),
    semanticErrors: parseSectionFromText(rawReviewText, '###SEMANTIC_ERRORS###')
  };
  
  // Determine which sections are actually present in this review
  // Only include sections that have Accept/Reject buttons
  const availableSections = {
    // codeQuality: !!sections.codeQuality, // Excluded - no buttons, read-only
    keyFindings: !!sections.keyFindings,
    security: !!sections.security,
    // performance: !!sections.performance, // Excluded - no buttons, read-only
    architecture: !!sections.architecture,
    // bestPractices: !!sections.bestPractices, // Excluded - no buttons, read-only
    recommendations: !!sections.recommendations,
    // originalCode: !!codeContent, // Excluded - no buttons, always visible
    optimizedCode: !!review.optimized_code,
    // explanation: !!review.explanation // Excluded - no buttons, read-only
    syntaxErrors: !!sections.syntaxErrors,      // NEW: Include syntax errors section with buttons
    semanticErrors: !!sections.semanticErrors   // NEW: Include semantic errors section with buttons
  };
  
  // Check if all available sections have been reviewed (accepted or rejected)
  const allSectionsReviewed = Object.keys(availableSections).every(section => {
    // Skip sections that don't exist in this review
    if (!availableSections[section]) return true;
    // Check if this section has been reviewed
    return sectionStates[section] === 'accepted' || sectionStates[section] === 'rejected';
  });

  // Debug logging
  console.log('Available sections:', availableSections);
  console.log('Section states:', sectionStates);
  console.log('All sections reviewed:', allSectionsReviewed);
  console.log('onReviewAnother exists:', !!onReviewAnother);

  const handleSectionAction = async (section, action) => {
    // Update local state first for immediate visual feedback
    setSectionStates(prev => ({
      ...prev,
      [section]: action
    }));

    // Immediately save to backend if onAccept callback is provided
    if (onAccept && review.id) {
      const updatedStates = {
        ...sectionStates,
        [section]: action
      };
      
      // Call the parent's onAccept with updated section states
      // This will trigger the API call to save feedback
      onAccept(review.id, updatedStates);
    }
  };



  const getSectionBorderClass = (sectionState) => {
    if (sectionState === 'accepted') return 'border-2 border-green-500';
    if (sectionState === 'rejected') return 'border-2 border-red-500';
    return '';
  };

  const getSectionHeaderClass = (sectionState) => {
    if (sectionState === 'accepted') return 'text-green-400';
    if (sectionState === 'rejected') return 'text-red-400';
    return 'text-white';
  };

  const SectionButtons = ({ section }) => (
    <div className="flex gap-3 mt-4">
      <button
        onClick={() => handleSectionAction(section, 'accepted')}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 font-sans ${
          sectionStates[section] === 'accepted' 
            ? 'bg-green-600 text-white shadow-lg shadow-green-500/50' 
            : 'bg-gray-700 hover:bg-green-500 text-gray-200 hover:text-white hover:shadow-lg'
        }`}
      >
        ✓ Accept
      </button>
      <button
        onClick={() => handleSectionAction(section, 'rejected')}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 font-sans ${
          sectionStates[section] === 'rejected' 
            ? 'bg-red-600 text-white shadow-lg shadow-red-500/50' 
            : 'bg-gray-700 hover:bg-red-500 text-gray-200 hover:text-white hover:shadow-lg'
        }`}
      >
        ✗ Reject
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card px-4 py-3 text-lg font-bold text-white gradient-accent rounded-md shadow-md font-sans">
        {review.filename || review.title || 'Review'}
      </div>
      <div className="pt-2">
        {/* CODE QUALITY Section - Read-only, no buttons */}
        {sections.codeQuality && (
          <div className="card card-hover p-5 bg-gray-800/50">
            <div className="text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans text-gray-200">
              📋 Code Quality
            </div>
            {formatReviewContent(sections.codeQuality)}
          </div>
        )}

        {/* KEY FINDINGS Section */}
        {sections.keyFindings && (
          <div className={`card card-hover p-5 mt-2 ${getSectionBorderClass(sectionStates.keyFindings)}`}>
            <div className={`text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans ${getSectionHeaderClass(sectionStates.keyFindings)}`}>
              🔍 Key Findings
              {sectionStates.keyFindings === 'accepted' && <span className="ml-2 text-lg">✓</span>}
              {sectionStates.keyFindings === 'rejected' && <span className="ml-2 text-lg">✗</span>}
            </div>
            {formatReviewContent(sections.keyFindings)}
            <SectionButtons section="keyFindings" />
          </div>
        )}

        {/* SECURITY Section */}
        {sections.security && (
          <div className={`card card-hover p-5 mt-2 ${getSectionBorderClass(sectionStates.security)}`}>
            <div className={`text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans ${getSectionHeaderClass(sectionStates.security)}`}>
              🛡️ Security Analysis
              {sectionStates.security === 'accepted' && <span className="ml-2 text-lg">✓</span>}
              {sectionStates.security === 'rejected' && <span className="ml-2 text-lg">✗</span>}
            </div>
            {formatReviewContent(sections.security)}
            <SectionButtons section="security" />
          </div>
        )}

        {/* PERFORMANCE Section - Read-only, no buttons */}
        {sections.performance && (
          <div className="card card-hover p-5 mt-2 bg-gray-800/50">
            <div className="text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans text-gray-200">
              ⚡ Performance Analysis
            </div>
            {formatReviewContent(sections.performance)}
          </div>
        )}

        {/* ARCHITECTURE Section */}
        {sections.architecture && (
          <div className={`card card-hover p-5 mt-2 ${getSectionBorderClass(sectionStates.architecture)}`}>
            <div className={`text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans ${getSectionHeaderClass(sectionStates.architecture)}`}>
              🏗️ Architecture & Design
              {sectionStates.architecture === 'accepted' && <span className="ml-2 text-lg">✓</span>}
              {sectionStates.architecture === 'rejected' && <span className="ml-2 text-lg">✗</span>}
            </div>
            {formatReviewContent(sections.architecture)}
            <SectionButtons section="architecture" />
          </div>
        )}

        {/* BEST PRACTICES Section - Read-only, no buttons */}
        {sections.bestPractices && (
          <div className="card card-hover p-5 mt-2 bg-gray-800/50">
            <div className="text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans text-gray-200">
              📖 Best Practices
            </div>
            {formatReviewContent(sections.bestPractices)}
          </div>
        )}

        {/* RECOMMENDATIONS Section */}
        {sections.recommendations && (
          <div className={`card card-hover p-5 mt-2 ${getSectionBorderClass(sectionStates.recommendations)}`}>
            <div className={`text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans ${getSectionHeaderClass(sectionStates.recommendations)}`}>
              💡 Recommendations
              {sectionStates.recommendations === 'accepted' && <span className="ml-2 text-lg">✓</span>}
              {sectionStates.recommendations === 'rejected' && <span className="ml-2 text-lg">✗</span>}
            </div>
            {formatReviewContent(sections.recommendations)}
            <SectionButtons section="recommendations" />
          </div>
        )}

        {/* SYNTAX ERRORS Section - WITH Accept/Reject buttons */}
        {sections.syntaxErrors && (
          <div className={`card card-hover p-5 mt-2 ${getSectionBorderClass(sectionStates.syntaxErrors)}`}>
            <div className={`text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans ${getSectionHeaderClass(sectionStates.syntaxErrors) || 'text-yellow-300'}`}>
              📝 Syntax Errors
              {sectionStates.syntaxErrors === 'accepted' && <span className="ml-2 text-lg">✓</span>}
              {sectionStates.syntaxErrors === 'rejected' && <span className="ml-2 text-lg">✗</span>}
            </div>
            {formatReviewContent(sections.syntaxErrors)}
            <SectionButtons section="syntaxErrors" />
          </div>
        )}

        {/* SEMANTIC ERRORS Section - WITH Accept/Reject buttons */}
        {sections.semanticErrors && (
          <div className={`card card-hover p-5 mt-2 ${getSectionBorderClass(sectionStates.semanticErrors)}`}>
            <div className={`text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans ${getSectionHeaderClass(sectionStates.semanticErrors) || 'text-orange-300'}`}>
              🧠 Semantic Errors
              {sectionStates.semanticErrors === 'accepted' && <span className="ml-2 text-lg">✓</span>}
              {sectionStates.semanticErrors === 'rejected' && <span className="ml-2 text-lg">✗</span>}
            </div>
            {formatReviewContent(sections.semanticErrors)}
            <SectionButtons section="semanticErrors" />
          </div>
        )}

        {/* Original code / submitted content - NO BUTTONS (always visible per user request) */}
        {codeContent && (
          <div className="card card-hover p-5 mt-2 overflow-hidden bg-gray-800/50">
            <div className="text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans text-gray-200">
              📄 Original Code
            </div>
            <pre className="text-gray-100 font-mono text-[14px] leading-relaxed" style={codeContainerStyles}>{codeContent}</pre>
          </div>
        )}

        {/* Optimized code */}
        {review.optimized_code && (
          <div className={`card card-hover p-5 overflow-hidden mt-2 ${getSectionBorderClass(sectionStates.optimizedCode)}`}>
            <div className={`text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans ${getSectionHeaderClass(sectionStates.optimizedCode)}`}>
              ✨ Optimized Code
              {sectionStates.optimizedCode === 'accepted' && <span className="ml-2 text-lg">✓</span>}
              {sectionStates.optimizedCode === 'rejected' && <span className="ml-2 text-lg">✗</span>}
            </div>
            <pre className="text-gray-100 font-mono text-[14px] leading-relaxed whitespace-pre-wrap" style={codeContainerStyles}>{sanitizeContent(review.optimized_code)}</pre>
            <SectionButtons section="optimizedCode" />
          </div>
        )}

        {/* Explanation - Read-only, no buttons */}
        {review.explanation && (
          <div className="card card-hover p-5 mt-2 bg-gray-800/50">
            <div className="text-xl md:text-2xl mb-3 font-bold tracking-tight font-sans text-gray-200">
              📚 Explanation
            </div>
            <p className="text-gray-100 whitespace-pre-wrap text-[15px] leading-7 font-sans">{sanitizeContent(review.explanation)}</p>
          </div>
        )}

        {/* Review Completion - Show improvement suggestion box or completion message */}
        {allSectionsReviewed && onReviewAnother && !suggestionSubmitted && (
          <div className="card p-8 mt-6 bg-gradient-to-br from-green-900/30 via-blue-900/30 to-purple-900/30 border-2 border-green-500/50 shadow-2xl">
            <div className="mb-4 text-center">
              <span className="text-6xl animate-bounce inline-block">✅</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 font-sans text-center">Review Complete!</h3>
            <p className="text-base text-gray-200 mb-6 font-sans text-center">
              Thank you for providing feedback on all sections.
            </p>

            {!showSuggestionBox ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300 text-center font-sans">
                  Would you like to suggest improvements for future reviews?
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowSuggestionBox(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    💡 Yes, Share Suggestions
                  </button>
                  <button
                    onClick={() => setSuggestionSubmitted(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    🚀 Skip & Continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2 font-sans">
                    Share your suggestions to improve future reviews:
                  </label>
                  <textarea
                    value={improvementSuggestion}
                    onChange={(e) => setImprovementSuggestion(e.target.value)}
                    placeholder="e.g., 'Include more code examples', 'Focus more on security', 'Add performance benchmarks', etc."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans"
                    rows="4"
                  />
                </div>
                <p className="text-xs text-gray-400 font-sans">
                  💡 Your feedback helps us improve the AI's review quality for your next code submission.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={async () => {
                      if (improvementSuggestion.trim()) {
                        // Submit suggestion to backend
                        try {
                          const token = localStorage.getItem('token');
                          if (token) {
                            const response = await fetch('http://localhost:8000/submit-improvement-suggestion', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                review_id: review.id,
                                suggestion: improvementSuggestion.trim()
                              })
                            });
                            if (response.ok) {
                              console.log('Improvement suggestion submitted successfully');
                            }
                          }
                        } catch (error) {
                          console.error('Error submitting suggestion:', error);
                        }
                      }
                      setSuggestionSubmitted(true);
                    }}
                    disabled={!improvementSuggestion.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                  >
                    ✅ Submit & Continue
                  </button>
                  <button
                    onClick={() => setSuggestionSubmitted(true)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Final Review Another Code Button */}
        {allSectionsReviewed && onReviewAnother && suggestionSubmitted && (
          <div className="card p-8 mt-6 text-center bg-gradient-to-br from-green-900/30 via-blue-900/30 to-purple-900/30 border-2 border-green-500/50 shadow-2xl">
            <div className="mb-4">
              <span className="text-6xl animate-bounce inline-block">🎉</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 font-sans">
              {improvementSuggestion.trim() ? 'Thank You for Your Feedback!' : 'All Set!'}
            </h3>
            <p className="text-base text-gray-200 mb-6 font-sans">
              {improvementSuggestion.trim() 
                ? 'Your suggestions will help improve future reviews. Ready to review more code?' 
                : 'Ready to review more code?'}
            </p>
            <button
              onClick={onReviewAnother}
              className="btn btn-primary px-8 py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500"
            >
              🚀 Review Another Code
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReviewCard;
