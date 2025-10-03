/*import React, { useState } from "react";

export default function Sidebar({ reviews = [], onSelectReview, username = "User", onLogout }) {
  const [expanded, setExpanded] = useState(false);

  const truncate = (s, n = 36) => (s?.length > n ? s.slice(0, n - 1) + "…" : s);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="flex flex-col justify-between text-white transition-all duration-200"
      style={{
        width: expanded ? 260 : 64,
        minWidth: expanded ? 260 : 64,
        background: "#343541",
        height: "100vh",
        borderRight: "1px solid rgba(255,255,255,0.03)"
      }}
    >
      {/* Logo *//*}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="1" width="22" height="22" rx="3" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
            <path d="M6 12l3 3 8-8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {expanded && <div className="font-semibold text-lg">CRVKN</div>}
      </div>

      {/* Past Reviews *//*}
      <div style={{ overflowY: "auto", padding: 12 }}>
        {expanded && <div className="text-gray-300 mb-3 px-1">Past reviews</div>}
        <ul className="space-y-3">
          {reviews.length === 0 && expanded && (
            <li className="text-gray-500 px-1">No past reviews yet</li>
          )}
          {reviews.map((r) => (
            <li
              key={r.id}
              onClick={() => onSelectReview?.(r)}
              className="cursor-pointer"
              title={r.title || "Review"}
              style={{
                padding: expanded ? "10px 12px" : 8,
                background: expanded ? "#40414f" : "transparent",
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: expanded ? 14 : 12, color: "#fff" }}>
                {expanded ? truncate(r.title || r.comment, 52) : truncate(r.title || r.comment, 18)}
              </div>
              {expanded && r.created_at && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* User info *//*}
      <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.03)" }}>
        {expanded ? (
          <div>
            <div className="text-xs text-gray-400">Logged in as</div>
            <div className="font-semibold">{username}</div>
            <button onClick={() => onLogout && onLogout()} className="mt-3 w-full bg-[#10a37f] text-white py-2 rounded-md text-sm">Logout</button>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>👤</div>
        )}
      </div>
    </aside>
  );
}*/

import React, { useState } from "react";

export default function Sidebar({ reviews = [], onSelectReview, username = null, onLogin, onLogout }) {
  const [expanded, setExpanded] = useState(false);

  const truncate = (s, n = 36) => (s?.length > n ? s.slice(0, n - 1) + "…" : s);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="flex flex-col justify-between text-white transition-all duration-200"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 20,
        width: expanded ? 260 : 64,
        minWidth: expanded ? 260 : 64,
        background: "#343541", // ChatGPT-like dark background
        height: "100vh",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect
              x="1"
              y="1"
              width="22"
              height="22"
              rx="3"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.5"
            />
            <path
              d="M6 12l3 3 8-8"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {expanded && <div className="font-semibold text-lg">CRVKN</div>}
      </div>

      {/* Past Reviews */}
      <div style={{ overflowY: "auto", padding: 12, flex: 1 }}>
        {expanded && <div className="text-gray-300 mb-3 px-1">Past reviews</div>}
        <ul className="space-y-3">
          {reviews.length === 0 && expanded && (
            <li className="text-gray-500 px-1">No past reviews yet</li>
          )}
          {reviews.map((r) => (
            <li
              key={r.id}
              onClick={() => onSelectReview?.(r)}
              className="cursor-pointer hover:bg-[#40414f] rounded-md"
              style={{
                padding: expanded ? "10px 12px" : 8,
              }}
              title={r.title || r.comment || "Review"}
            >
              <div style={{ fontSize: expanded ? 14 : 12, color: "#fff" }}>
                {expanded
                  ? truncate(r.title || r.comment, 52)
                  : truncate(r.title || r.comment, 18)}
              </div>
              {expanded && r.created_at && (
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.35)",
                    marginTop: 6,
                  }}
                >
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* User info / Login-Logout Section */}
      <div
        style={{
          padding: 16,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {username ? (
          // ✅ Logged-in view
          expanded ? (
            <div>
              <div className="text-xs text-gray-400">Logged in as</div>
              <div className="font-semibold">{username}</div>
              <button
                onClick={() => onLogout && onLogout()}
                className="mt-3 w-full bg-[#10a37f] text-white py-2 rounded-md text-sm hover:bg-[#0e906f]"
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)" }}>👤</div>
          )
        ) : (
          // ❌ Logged-out view
          <button
            onClick={() => onLogin && onLogin()}
            className="w-full bg-[#10a37f] text-white py-2 rounded-md text-sm hover:bg-[#0e906f]"
          >
            {expanded ? "Login" : "🔑"}
          </button>
        )}
      </div>
    </aside>
  );
}
