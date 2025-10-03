import React from 'react';

const ReviewCard = ({ review, onAccept, onReject, codeContainerStyles, showActions = true }) => {
  if (!review) return null;

  const codeContent = review.code || review.comment || '';

  return (
    <div className="space-y-4">
      <div className="bg-[#2b2b2b] rounded-md px-3 py-2 text-sm font-semibold text-gray-200">{review.filename || review.title || 'Review'}</div>
      <div className="pt-2">
        {/* Main AI review text */}
        {review.ai_feedback || review.review ? (
          <div className="bg-[#40414f] rounded-xl p-4">
            <div className="text-sm text-gray-300 mb-2">Review</div>
            <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap">{review.ai_feedback || review.review}</pre>
          </div>
        ) : null}

        {/* Original code / submitted content */}
        {codeContent ? (
          <div className="bg-[#40414f] rounded-xl p-4 mt-2 overflow-hidden">
            <div className="text-sm text-gray-300 mb-2">Original Code</div>
            <pre className="text-white font-mono text-sm leading-relaxed" style={codeContainerStyles}>{codeContent}</pre>
          </div>
        ) : null}

        {/* Optimized code */}
        {review.optimized_code && (
          <div className="bg-[#40414f] rounded-xl p-6 overflow-hidden mt-2">
            <div className="text-sm text-gray-300 mb-2">Optimized code</div>
            <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap" style={codeContainerStyles}>{review.optimized_code}</pre>
          </div>
        )}

        {/* Explanation */}
        {review.explanation && (
          <div className="bg-[#40414f] rounded-xl p-4 mt-2">
            <div className="text-sm text-gray-300 mb-2">Explanation</div>
            <p className="text-white whitespace-pre-wrap">{review.explanation}</p>
          </div>
        )}

        {/* Security issues */}
        {review.security_issues && (
          <div className="bg-[#40414f] rounded-xl p-6 mt-2">
            <div className="text-sm text-gray-300 mb-2">Security Analysis</div>
            <pre className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap">{review.security_issues}</pre>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-start gap-4 pt-4">
            <button
              onClick={() => onAccept && onAccept(review.id)}
              className="flex-shrink-0 p-2 bg-[#10a37f] hover:bg-[#0d8c6b] rounded-lg transition-colors text-white"
            >
              ✓ Accept
            </button>

            <button
              onClick={() => onReject && onReject(review)}
              className="flex-shrink-0 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white"
            >
              ✗ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
