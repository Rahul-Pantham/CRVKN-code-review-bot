import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import API from "../api";

const uid = () => Math.random().toString(36).slice(2, 9);

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
  const displayRef = useRef(null);

  useEffect(() => {
    const sampleComment = "public class HelloWorld { ... }";
    const sampleFeedback = "Use .equals() for string comparison.";
    setReviews([
      {
        id: "r1",
        title: generateTitleFromCode(sampleComment, sampleFeedback),
        comment: sampleComment,
        ai_feedback: sampleFeedback,
        created_at: new Date().toISOString(),
      }
    ]);
  }, []);

  const generateMockFeedback = (code) => {
    if (code.includes("==") && code.includes('"')) {
      return "Use .equals() instead of == for string comparison.";
    }
    return "Looks good. Consider adding comments and unit tests.";
  };

  const handleSubmit = async () => {
    if (!codeInput.trim()) return;
    const feedback = generateMockFeedback(codeInput);
    const newReview = {
      id: uid(),
      title: generateTitleFromCode(codeInput, feedback),
      comment: codeInput,
      ai_feedback: feedback,
      created_at: new Date().toISOString(),
    };
    setReviews([newReview, ...reviews]);
    setSelected(newReview);
    setCodeInput("");
  };

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar reviews={reviews} onSelectReview={setSelected} username={username} />
      <div className="flex-1 p-8 text-white">
        <h1 className="text-xl font-bold mb-4">Code Review Dashboard</h1>

        {/* Selected Review Display */}
        <div ref={displayRef} className="mb-6 bg-[#0f0f10] p-4 rounded-md">
          {!selected ? (
            <div className="text-gray-400">Select a past review or submit new code.</div>
          ) : (
            <div className="space-y-4">
              <pre className="whitespace-pre-wrap text-sm">{selected.comment}</pre>
              <div className="bg-[#0b0b0b] p-3 rounded-md">
                <div className="text-xs text-gray-400">AI Review:</div>
                <div>{selected.ai_feedback}</div>
              </div>
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
          className="mt-4 px-6 py-2 rounded-md font-semibold bg-green-600 hover:bg-green-700"
        >
          Submit for Review
        </button>
      </div>
    </div>
  );
}
