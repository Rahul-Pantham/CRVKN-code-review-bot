import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { generateReview, fetchReviews } from "../api";
import RejectionReasonsModal from "./RejectionReasonsModal";

const uid = () => Math.random().toString(36).slice(2, 9);

// Utility function to parse and format AI response
const formatAIResponse = (text) => {
  if (!text) return [];
  
  const sections = [];
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let currentSection = null;
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check if it's a section header (contains ** or emojis)
    if (trimmed.includes('**') || /^[🔍📝⭐🛡️🎯🔧📚💡⚡]/u.test(trimmed)) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: trimmed.replace(/\*\*/g, '').trim(),
        content: [],
        type: 'section'
      };
    }
    // Check if it's a bullet point
    else if (trimmed.startsWith('•') || trimmed.startsWith('-') || /^\d+\./.test(trimmed)) {
      if (currentSection) {
        currentSection.content.push({
          type: 'bullet',
          text: trimmed.replace(/^[•-]|\d+\./, '').trim()
        });
      } else {
        // Create a default section for orphaned bullets
        sections.push({
          title: 'Details',
          content: [{
            type: 'bullet', 
            text: trimmed.replace(/^[•-]|\d+\./, '').trim()
          }],
          type: 'section'
        });
      }
    }
    // Regular content line
    else if (trimmed !== '') {
      if (currentSection) {
        currentSection.content.push({
          type: 'text',
          text: trimmed
        });
      } else {
        // Standalone text becomes its own section
        sections.push({
          title: '',
          content: [{ type: 'text', text: trimmed }],
          type: 'section'
        });
      }
    }
  });
  
  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
};

// Component to render formatted sections
const FormattedAIResponse = ({ text, title, borderColor, titleColor }) => {
  const sections = formatAIResponse(text);
  
  return (
    <div className={`bg-[#1a1a1a] p-4 rounded-md border-l-4 ${borderColor}`}>
      <div className={`text-sm font-semibold ${titleColor} mb-3`}>{title}</div>
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-2">
            {section.title && (
              <div className="font-semibold text-yellow-300 text-base">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.content.map((item, itemIndex) => (
                <div key={itemIndex} className="text-gray-300">
                  {item.type === 'bullet' ? (
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span className="flex-1">{item.text}</span>
                    </div>
                  ) : (
                    <div className={item.text.includes(':') && item.text.length < 50 ? 'font-medium text-cyan-300' : ''}>
                      {item.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const generateTitleFromCode = (code = "", feedback = "") => {
  const text = (code || "").toString();
  const lower = text.toLowerCase();

  const lang = (() => {
    if (/\bimport\s+react\b|jsx|useState\(|useEffect\(/i.test(text)) return "React";
    if (/\bconsole\.log\(|\bfunction\s+|=>|\bimport\s+|\bexport\s+/i.test(text)) return "JavaScript";
    if (/\bdef\s+\w+\s*\(|\bprint\(|\bimport\s+\w+/i.test(text)) return "Python";
    if (/\bpublic\s+class\b|\bSystem\.out\.println\(|\bvoid\s+main\s*\(/i.test(text)) return "Java";
    if (/#include\s+<|\bint\s+main\s*\(/i.test(text)) return "C/C++";
    if (/(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text)) return "SQL";
    if (/<html|<!DOCTYPE|<div|<span/i.test(text)) return "HTML";
    return "General";
  })();

  const extract = () => {
    // Function names
    let m = text.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (m) return { kind: "Function", name: m[1] };
    m = text.match(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\(.*?\)\s*=>/);
    if (m) return { kind: "Function", name: m[1] };
    m = text.match(/\bclass\s+([A-Za-z_$][\w$]*)\b/);
    if (m) return { kind: "Class", name: m[1] };
    m = text.match(/\bdef\s+([A-Za-z_][\w]*)\s*\(/);
    if (m) return { kind: "Function", name: m[1] };
    // React component heuristic
    m = text.match(/\bconst\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/);
    if (m) return { kind: "Component", name: m[1] };
    m = text.match(/\bfunction\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
    if (m) return { kind: "Component", name: m[1] };
    return null;
  };

  const topic = (() => {
    if (/console\.log\(|\bprint\(/i.test(text)) return "Printing Output";
    if (/\b(fetch|axios|request|get|post|put|delete)\b/i.test(text)) return "HTTP Request";
    if (/\b(auth|login|token|jwt)\b/i.test(text)) return "Authentication";
    if (/\b(sort|sorted)\b/i.test(text)) return "Sorting Logic";
    if (/\b(filter|map|reduce)\b/i.test(text)) return "Collection Processing";
    if (/\b(file|fs|readFile|writeFile|open)\b/i.test(text)) return "File I/O";
    if (/(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text)) return "Database Query";
    if (/\b(regex|RegExp)\b/i.test(text)) return "Regex Handling";
    if (/\b(error|exception|try\s*\{|try:\s*)\b/i.test(text)) return "Error Handling";
    if (/\b(int\s+main\s*\(|void\s+main\s*\()\b/i.test(text)) return "Main Program";
    return "Code Review";
  })();

  const id = extract();
  if (id && id.name) {
    return `${id.kind} ${id.name} – ${topic}`.slice(0, 80);
  }

  // Fallback: use first meaningful line
  const firstLine = text.split(/\r?\n/).map(s => s.trim()).find(s => s.length > 0) || topic;
  const cleaned = firstLine
    .replace(/^\/\/+/,'')
    .replace(/^#\s*/,'')
    .replace(/<[^>]+>/g,'')
    .replace(/\s+/g,' ')
    .trim();

  const base = cleaned.length > 6 ? cleaned : topic;
  return `${base} – ${lang}`.slice(0, 80);
};

export default function Dashboard() {
  const [username] = useState(localStorage.getItem("username") || "Alice");
  const [reviews, setReviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
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
      // If user is not authenticated, set empty reviews
      setReviews([]);
    }
  };

  const handleFeedbackSuccess = (response) => {
    console.log('Feedback submitted successfully:', response);
    // Refresh the reviews to get updated status
    loadPastReviews();
    // Optionally show a success message
    setError(null);
  };

  const generateMockFeedback = (code) => {
    if (code.includes("==") && code.includes('"')) {
      return `🔍 **General Review:**
⚠️ Good code! But use .equals() instead of == for comparing text. 😊

🛡️ **Security Check:**
Safe ✅ No security problems found.

🚨 **Issues Found:**
🟡 MEDIUM: String comparison issue - use .equals() method`;
    }
    return `🔍 **General Review:**
✅ Nice work! Add some comments to make it even better! 🚀

🛡️ **Security Check:**
Safe ✅ No security problems found.

🚨 **Issues Found:**
🟢 LOW: Missing comments for better readability`;
  };

  const handleSubmit = async () => {
    if (!codeInput.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Call the actual backend API
      const response = await generateReview(codeInput);
      
      const newReview = {
        id: response.id || uid(),
        title: response.title || generateTitleFromCode(codeInput, response.review),
        comment: codeInput,
        ai_feedback: response.review || "Review completed successfully",
        optimized_code: response.optimized_code,
        explanation: response.explanation,
        security_issues: response.security_issues,
        created_at: new Date().toISOString(),
      };
      
      setReviews([newReview, ...reviews]);
      setSelected(newReview);
      setCodeInput("");
    } catch (err) {
      console.error("Failed to generate review:", err);
      setError("Failed to connect to backend: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar reviews={reviews} onSelectReview={setSelected} username={username} />
      <div className="flex-1 p-8 text-white">
        <h1 className="text-xl font-bold mb-4">Code Review Dashboard</h1>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-md text-red-200">
            {error}
          </div>
        )}

        {/* Selected Review Display */}
        <div ref={displayRef} className="mb-6 bg-[#0f0f10] p-4 rounded-md">
          {!selected ? (
            <div className="text-gray-400">Select a past review or submit new code.</div>
          ) : (
            <div className="space-y-6">
              {/* Original Code Section */}
              <div className="bg-[#1a1a1a] p-4 rounded-md border-l-4 border-blue-500">
                <div className="text-sm font-semibold text-blue-300 mb-2">📝 Original Code</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-[#0f0f10] p-3 rounded overflow-x-auto">{selected.comment}</pre>
              </div>

              {/* AI Review Section */}
              <FormattedAIResponse 
                text={selected.ai_feedback} 
                title="🤖 AI Code Review"
                borderColor="border-green-500"
                titleColor="text-green-300"
              />

              {/* Optimized Code Section */}
              {selected.optimized_code && (
                <div className="bg-[#1a1a1a] p-4 rounded-md border-l-4 border-purple-500">
                  <div className="text-sm font-semibold text-purple-300 mb-3">⚡ Optimized Code</div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-[#0f0f10] p-3 rounded overflow-x-auto">{selected.optimized_code}</pre>
                </div>
              )}

              {/* Explanation Section */}
              {selected.explanation && (
                <FormattedAIResponse 
                  text={selected.explanation} 
                  title="💡 Explanation"
                  borderColor="border-cyan-500"
                  titleColor="text-cyan-300"
                />
              )}

              {/* Security Analysis Section */}
              {selected.security_issues && (
                <FormattedAIResponse 
                  text={selected.security_issues} 
                  title="🛡️ Security Analysis"
                  borderColor="border-red-500"
                  titleColor="text-red-300"
                />
              )}
            </div>
          )}

          {/* Feedback Actions */}
          {selected && (
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectionModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                📝 Provide Feedback & Report Issues
              </button>
            </div>
          )}
        </div>

        {/* Code Input Box */}
        <textarea
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="Paste your code here..."
          rows={8}
          className="w-full p-4 rounded-md bg-[#0f0f10] border border-white/5 text-sm font-mono"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !codeInput.trim()}
          className={`mt-4 px-6 py-2 rounded-md font-semibold ${
            loading || !codeInput.trim()
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? "Processing..." : "Submit for Review"}
        </button>
      </div>

      {/* Rejection Reasons Modal */}
      <RejectionReasonsModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        reviewId={selected?.id}
        onSubmitSuccess={handleFeedbackSuccess}
      />
    </div>
  );
}
