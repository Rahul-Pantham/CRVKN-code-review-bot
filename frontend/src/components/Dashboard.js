import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { generateReview, fetchReviews } from "../api";
import RejectionReasonsModal from "./RejectionReasonsModal";
import { ChevronDownIcon, BoltIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

// Simple id helper (single definition)
const uid = () => Math.random().toString(36).slice(2, 9);

export default function Dashboard() {
  const [username] = useState(localStorage.getItem("username") || "Alice");
  const [reviews, setReviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [inputType, setInputType] = useState("Upload URL");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayRef = useRef(null);

  useEffect(() => {
    loadPastReviews();
  }, []);

  const loadPastReviews = async () => {
    try {
      const pastReviews = await fetchReviews();
      setReviews(pastReviews || []);
    } catch (err) {
      console.error("Failed to load past reviews:", err);
      setReviews([]);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    setLoading(true);

    try {
      // Call the actual backend API
      const response = await generateReview(inputValue);

      const newReview = {
        id: response.id || uid(),
        title: response.title || "Review",
        comment: inputValue,
        ai_feedback: response.review || "Review completed successfully",
        optimized_code: response.optimized_code,
        explanation: response.explanation,
        security_issues: response.security_issues,
        created_at: new Date().toISOString(),
      };

      setReviews([newReview, ...reviews]);
      setSelected(newReview);
      setInputValue("");
    } catch (err) {
      console.error("Failed to generate review:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar reviews={reviews} onSelectReview={setSelected} username={username} />
      <div className="flex-1 p-8 text-white overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            <button className="bg-gray-600 px-4 py-2 rounded-md font-semibold hover:bg-gray-700 transition-colors">
              Admin
            </button>
            <button className="bg-transparent border border-white px-4 py-2 rounded-md font-semibold hover:bg-white transition-colors">
              Login
            </button>
          </div>
        </div>

        <div className="flex gap-3 mb-6 max-w-3xl">
          <div className="relative">
            <button
              onClick={() => {
                // Toggle dropdown
                setInputType(inputType === "Upload URL" ? "Other" : "Upload URL");
              }}
              className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-l-md font-semibold"
            >
              {inputType} <ChevronDownIcon className="w-4 h-4" />
            </button>
            {/* Dropdown menu could be added here if needed */}
          </div>
          <input
            type="text"
            placeholder="Enter URL or other input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 px-4 py-2 rounded-r-md bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !inputValue.trim()}
            className={`bg-green-600 px-6 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? "Processing..." : "Submit"}
          </button>
        </div>

        {!selected && (
          <div className="max-w-3xl bg-gray-900 rounded-md p-8 flex flex-col items-center gap-4 text-gray-400">
            <BoltIcon className="w-12 h-12 text-green-500" />
            <h2 className="text-xl font-semibold">Ready to Get Started</h2>
            <p className="text-center max-w-md">
              Paste your code or upload a URL above to get a detailed code review with AI-powered insights.
            </p>
          </div>
        )}

        {selected && (
          <div ref={displayRef} className="space-y-6 max-w-3xl">
            <div className="bg-gray-800 p-4 rounded-md border-l-4 border-blue-500">
              <div className="text-sm font-semibold text-blue-300 mb-2">📝 Original Code</div>
              <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">{selected.comment}</pre>
            </div>

            <div className="bg-gray-800 p-4 rounded-md border-l-4 border-green-500">
              <div className="text-sm font-semibold text-green-300 mb-2">🤖 AI Code Review</div>
              <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">{selected.ai_feedback}</pre>
            </div>

            {selected.optimized_code && (
              <div className="bg-gray-800 p-4 rounded-md border-l-4 border-purple-500 relative">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-semibold text-purple-300">⚡ Optimized Code</div>
                  <button
                    onClick={() => handleCopy(selected.optimized_code)}
                    className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 relative"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="w-5 h-5" />
                    {copied && (
                      <span className="absolute -top-7 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">{selected.optimized_code}</pre>
              </div>
            )}

            {selected.explanation && (
              <div className="bg-gray-800 p-4 rounded-md border-l-4 border-cyan-500">
                <div className="text-sm font-semibold text-cyan-300 mb-2">💡 Explanation</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">{selected.explanation}</pre>
              </div>
            )}

            {selected.security_issues && (
              <div className="bg-gray-800 p-4 rounded-md border-l-4 border-red-500">
                <div className="text-sm font-semibold text-red-300 mb-2">🛡️ Security Analysis</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">{selected.security_issues}</pre>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowRejectionModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                📝 Provide Feedback & Report Issues
              </button>
            </div>
          </div>
        )}

        <RejectionReasonsModal
          isOpen={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          reviewId={selected?.id}
          onSubmitSuccess={() => {
            loadPastReviews();
            setSelected(null);
          }}
        />
      </div>
    </div>
  );
}
