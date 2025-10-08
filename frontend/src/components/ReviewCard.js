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

// Format review content: detect internal subheadings (ending with ':') and apply medium emphasis
const formatReviewContent = (raw) => {
  const text = sanitizeContent(raw || '');
  const lines = text.split(/\r?\n/);
  const headingRegex = /^(\s*)(General Review|Security Check|Issues Found|Performance Review|Optimization Suggestions|Security Analysis|Summary|Recommendations|Notes|Findings)\s*:?\s*$/i;
  return (
    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
      {lines.map((line, idx) => {
        if (headingRegex.test(line)) {
          // Extract indentation to preserve structure
            const indent = line.match(/^(\s*)/)[0] || '';
            const label = line.replace(/:/g, '').trim();
            return (
              <div key={idx} className="mt-4 mb-1">
                {indent && <span style={{ whiteSpace: 'pre' }}>{indent}</span>}
                <span className="text-[13px] md:text-sm font-semibold tracking-wide text-gray-200 border-l-4 border-[#10a37f] pl-2">
                  {label}:
                </span>
              </div>
            );
        }
        return <div key={idx}>{line === '' ? '\u00A0' : line}</div>;
      })}
    </div>
  );
};

const ReviewCard = ({ review, onAccept, onReject, codeContainerStyles, showActions = true }) => {
  // State to track acceptance/rejection of each section - MUST be called before any early returns
  const [sectionStates, setSectionStates] = useState({
    review: null, // null, 'accepted', 'rejected'
    originalCode: null,
    optimizedCode: null,
    explanation: null,
    securityAnalysis: null
  });

  if (!review) return null;

  const codeContent = review.code || review.comment || '';

  const handleSectionAction = (section, action) => {
    setSectionStates(prev => ({
      ...prev,
      [section]: action
    }));
  };

  // --- Extract an internal "Security Check:" subsection from the main AI review text (if present) ---
  // We want to:
  // 1. Identify the text starting at a line containing "Security Check:" (case-insensitive)
  // 2. Capture all subsequent lines until another top-level heading (ending with ':') or end of text
  // 3. Remove those lines from the main review body so we can display them in a dedicated section with Accept/Reject
  const rawReviewText = review.ai_feedback || review.review || '';
  let securityCheckContent = '';
  let reviewWithoutSecurityCheck = rawReviewText;
  if (rawReviewText) {
    const lines = rawReviewText.split(/\r?\n/);
    const headingPattern = /^\s*[^\n]{0,80}:\s*$/; // generic heading ending with ':' on its own line
    const securityIdx = lines.findIndex(l => /security check\s*:/i.test(l));
    if (securityIdx !== -1) {
      // collect lines for security section
      const collected = [];
      for (let i = securityIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        // stop if we hit a new heading (but allow bullet lines starting with * or dash)
        if (headingPattern.test(line) && !/^\s*[*-]/.test(line)) {
          break;
        }
        collected.push(line);
      }
      securityCheckContent = collected.join('\n').trim();
      // Remove the security lines (including heading) from main review text
      if (securityCheckContent) {
        const before = lines.slice(0, securityIdx); 
        // determine end index of collected segment
        let endIdx = securityIdx + 1 + collected.length;
        reviewWithoutSecurityCheck = [...before, ...lines.slice(endIdx)].join('\n').replace(/\n{3,}/g, '\n\n').trim();
      }
    }
  }

  const getSectionBorderClass = (sectionState) => {
    if (sectionState === 'accepted') return 'border-2 border-green-500';
    if (sectionState === 'rejected') return 'border-2 border-red-500';
    return '';
  };

  const getSectionHeaderClass = (sectionState) => {
    if (sectionState === 'accepted') return 'text-green-400';
    if (sectionState === 'rejected') return 'text-red-400';
    return 'text-gray-300';
  };

  const SectionButtons = ({ section }) => (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => handleSectionAction(section, 'accepted')}
        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
          sectionStates[section] === 'accepted' 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-600 hover:bg-green-500 text-gray-200 hover:text-white'
        }`}
      >
        ✓ Accept
      </button>
      <button
        onClick={() => handleSectionAction(section, 'rejected')}
        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
          sectionStates[section] === 'rejected' 
            ? 'bg-red-600 text-white' 
            : 'bg-gray-600 hover:bg-red-500 text-gray-200 hover:text-white'
        }`}
      >
        ✗ Reject
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
  <div className="card px-3 py-2 text-sm font-semibold text-gray-200 gradient-accent rounded-md shadow-md">{review.filename || review.title || 'Review'}</div>
      <div className="pt-2">
        {/* Main AI review text */}
        {rawReviewText ? (
          <div className={`card card-hover p-4 ${getSectionBorderClass(sectionStates.review)}`}>
            <div className={`text-base md:text-lg mb-2 font-semibold tracking-wide ${getSectionHeaderClass(sectionStates.review)}`}>
              Review
              {sectionStates.review === 'accepted' && <span className="ml-2">✓</span>}
              {sectionStates.review === 'rejected' && <span className="ml-2">✗</span>}
            </div>
            {formatReviewContent(reviewWithoutSecurityCheck)}
            <SectionButtons section="review" />
          </div>
        ) : null}

        {/* Original code / submitted content */}
        {codeContent ? (
          <div className={`card card-hover p-4 mt-2 overflow-hidden ${getSectionBorderClass(sectionStates.originalCode)}`}>
            <div className={`text-base md:text-lg mb-2 font-semibold tracking-wide ${getSectionHeaderClass(sectionStates.originalCode)}`}>
              Original Code
              {sectionStates.originalCode === 'accepted' && <span className="ml-2">✓</span>}
              {sectionStates.originalCode === 'rejected' && <span className="ml-2">✗</span>}
            </div>
            <pre className="text-white font-mono text-sm leading-relaxed" style={codeContainerStyles}>{codeContent}</pre>
            <SectionButtons section="originalCode" />
          </div>
        ) : null}

        {/* Optimized code */}
        {review.optimized_code && (
          <div className={`card card-hover p-6 overflow-hidden mt-2 ${getSectionBorderClass(sectionStates.optimizedCode)}`}>
            <div className={`text-base md:text-lg mb-2 font-semibold tracking-wide ${getSectionHeaderClass(sectionStates.optimizedCode)}`}>
              Optimized Code
              {sectionStates.optimizedCode === 'accepted' && <span className="ml-2">✓</span>}
              {sectionStates.optimizedCode === 'rejected' && <span className="ml-2">✗</span>}
            </div>
            <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap" style={codeContainerStyles}>{sanitizeContent(review.optimized_code)}</pre>
            <SectionButtons section="optimizedCode" />
          </div>
        )}

        {/* Explanation */}
        {review.explanation && (
          <div className={`card card-hover p-4 mt-2 ${getSectionBorderClass(sectionStates.explanation)}`}>
            <div className={`text-base md:text-lg mb-2 font-semibold tracking-wide ${getSectionHeaderClass(sectionStates.explanation)}`}>
              Explanation
              {sectionStates.explanation === 'accepted' && <span className="ml-2">✓</span>}
              {sectionStates.explanation === 'rejected' && <span className="ml-2">✗</span>}
            </div>
            <p className="text-white whitespace-pre-wrap text-sm leading-relaxed">{sanitizeContent(review.explanation)}</p>
            <SectionButtons section="explanation" />
          </div>
        )}

        {/* Security Check (extracted) OR fallback to security_issues */}
        {(securityCheckContent || review.security_issues) && (
          <div className={`card card-hover p-6 mt-2 ${getSectionBorderClass(sectionStates.securityAnalysis)}`}>
            <div className={`text-base md:text-lg mb-2 font-semibold tracking-wide ${getSectionHeaderClass(sectionStates.securityAnalysis)}`}>
              Security Check
              {sectionStates.securityAnalysis === 'accepted' && <span className="ml-2">✓</span>}
              {sectionStates.securityAnalysis === 'rejected' && <span className="ml-2">✗</span>}
            </div>
            {securityCheckContent ? (
              <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap">{sanitizeContent(securityCheckContent)}</pre>
            ) : (
              <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap">{sanitizeContent(review.security_issues)}</pre>
            )}
            <SectionButtons section="securityAnalysis" />
          </div>
        )}

        {/* Overall Actions */}
        {showActions && (
          <div className="pt-6 divider mt-6">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Overall Review Decision:</h4>
              <div className="text-xs text-gray-400">
                Based on your section-by-section feedback above
              </div>
            </div>
            <div className="flex items-start gap-4">
              <button
                onClick={() => {
                  if (onAccept) {
                    onAccept(review.id, sectionStates);
                  }
                }}
                className="flex-shrink-0 px-4 py-2 bg-[#10a37f] hover:bg-[#0d8c6b] rounded-lg transition-colors text-white font-medium"
              >
                ✓ Accept Overall Review
              </button>

              <button
                onClick={() => {
                  if (onReject) {
                    onReject(review, sectionStates);
                  }
                }}
                className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white font-medium"
              >
                ✗ Reject Overall Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
