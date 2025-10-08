import React, { useState, useEffect } from 'react';
import { getRejectionReasons, submitFeedback } from '../api';

const RejectionReasonsModal = ({ 
  isOpen, 
  onClose, 
  reviewId, 
  sectionStates,
  onSubmitSuccess 
}) => {
  console.log('RejectionReasonsModal rendered with:', { isOpen, reviewId, onSubmitSuccess: !!onSubmitSuccess });
  
  const [predefinedReasons, setPredefinedReasons] = useState([]);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [customReason, setCustomReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchRejectionReasons();
    }
  }, [isOpen]);

  const fetchRejectionReasons = async () => {
    try {
      const response = await getRejectionReasons();
      setPredefinedReasons(response.predefined_reasons || []);
    } catch (err) {
      setError('Failed to load rejection reasons');
      console.error(err);
    }
  };

  const handleReasonToggle = (reason) => {
    console.log('Toggling reason:', reason);
    console.log('Current selected reasons:', selectedReasons);
    
    setSelectedReasons(prev => {
      const isSelected = prev.includes(reason);
      console.log('Is selected:', isSelected);
      
      if (isSelected) {
        // Remove the reason
        const newReasons = prev.filter(r => r !== reason);
        console.log('Removing reason, new list:', newReasons);
        // If "Other" is being removed, hide custom input and clear custom reason
        if (reason.includes('Other')) {
          setShowCustomInput(false);
          setCustomReason('');
        }
        return newReasons;
      } else {
        // Add the reason
        const newReasons = [...prev, reason];
        console.log('Adding reason, new list:', newReasons);
        // If "Other" is being selected, show custom input
        if (reason.includes('Other')) {
          setShowCustomInput(true);
        }
        return newReasons;
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Submitting feedback with:');
    console.log('Selected reasons:', selectedReasons);
    console.log('Custom reason:', customReason);
    console.log('Feedback:', feedback);
    
    if (selectedReasons.length === 0 && !customReason.trim() && !feedback.trim()) {
      setError('Please select at least one rejection reason or provide feedback');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await submitFeedback(
        reviewId,
        feedback,
        selectedReasons,
        customReason.trim() || null,
        sectionStates
      );
      
      console.log('Feedback submitted successfully:', response);
      onSubmitSuccess && onSubmitSuccess(response);
      handleClose();
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit feedback: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReasons([]);
    setCustomReason('');
    setFeedback('');
    setShowCustomInput(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Provide Feedback & Rejection Reasons</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Section-Level Feedback Summary */}
          {sectionStates && (
            <div className="mb-6 p-4 bg-[#2a2a2a] border border-gray-600 rounded">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Your Section-by-Section Feedback:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(sectionStates).map(([section, state]) => {
                  if (state === null) return null;
                  const sectionNames = {
                    review: 'AI Review',
                    originalCode: 'Original Code',
                    optimizedCode: 'Optimized Code',
                    explanation: 'Explanation',
                    securityAnalysis: 'Security Analysis'
                  };
                  return (
                    <div key={section} className={`flex items-center gap-2 p-2 rounded ${
                      state === 'accepted' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                    }`}>
                      <span>{state === 'accepted' ? '✓' : '✗'}</span>
                      <span>{sectionNames[section]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* General Feedback */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                General Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide any additional feedback about the code review..."
                rows={3}
                className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Rejection Reasons */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Rejection Reasons (Multiple Selection Allowed)
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-600 rounded p-3 bg-[#2a2a2a]">
                {predefinedReasons.map((reason, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 p-2 rounded hover:bg-[#3a3a3a] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedReasons.includes(reason)}
                      onChange={() => handleReasonToggle(reason)}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-300 text-sm leading-relaxed flex-1">
                      {reason}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            {showCustomInput && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom Rejection Reason
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please specify your custom rejection reason..."
                  rows={2}
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            )}

            {/* Selected Reasons Summary */}
            {selectedReasons.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Selected Reasons ({selectedReasons.length}):
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedReasons.map((reason, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-900 text-red-200 text-xs rounded-full"
                    >
                      {reason.length > 30 ? reason.substring(0, 30) + '...' : reason}
                      <button
                        type="button"
                        onClick={() => handleReasonToggle(reason)}
                        className="ml-1 text-red-300 hover:text-red-100"
                        aria-label="Remove reason"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-[#2a2a2a] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded font-medium transition-colors ${
                  loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RejectionReasonsModal;