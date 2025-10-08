import React from "react"; // simplified, no local state needed now

// Lightweight relative time formatter (avoids date-fns dependency)
const timeAgo = (inputDate) => {
  try {
    const date = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
    const diffMs = Date.now() - date.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return sec <= 1 ? 'just now' : sec + 's ago';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const day = Math.floor(hr / 24);
    if (day < 30) return day + 'd ago';
    const mon = Math.floor(day / 30);
    if (mon < 12) return mon + 'mo ago';
    const yr = Math.floor(mon / 12);
    return yr + 'y ago';
  } catch (e) {
    return '';
  }
};

export default function Sidebar({ reviews = [], onSelectReview, username = null, onLogin, onLogout }) {
  const truncate = (s, n = 36) => (s?.length > n ? s.slice(0, n - 1) + "…" : s);

  // Function to get initials from username
  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  return (
    <aside
      className="flex flex-col justify-between text-white surface-alt backdrop-blur-md shadow-lg card"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 20,
        width: 280,
        minWidth: 280,
        height: "100vh",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        padding: 16,
      }}
    >
      {/* Past History Title */}
  <div className="text-lg font-semibold mb-4 tracking-wide">Past History</div>

      {/* Reviews List */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        <ul className="space-y-3">
          {reviews.length === 0 && (
            <li className="text-gray-500 px-2 py-3 rounded bg-white/10">No past history yet</li>
          )}
          {reviews.map((r) => (
            <li
              key={r.id}
              onClick={() => onSelectReview?.(r)}
              className="cursor-pointer px-4 py-3 rounded card card-hover transition-base"
              title={r.title || r.comment || "Review"}
            >
              <div className="font-semibold text-gray-900 dark:text-white">
                {truncate(r.title || r.comment, 40)}
              </div>
              {r.created_at && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {timeAgo(r.created_at)}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* User Info at Bottom Left */}
      {username && (
  <div className="mt-6 flex items-center gap-3 divider pt-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg select-none">
            {getInitials(username)}
          </div>
          <div className="flex flex-col">
            <div className="font-semibold text-gray-900 dark:text-white">{username}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">john.doe@email.com</div>
          </div>
        </div>
      )}

      {/* Login/Logout Button */}
      {!username && (
        <button onClick={() => onLogin && onLogin()} className="mt-6 w-full btn btn-primary gradient-accent shadow-md hover:opacity-95">
          Login
        </button>
      )}
      {username && (
        <button onClick={() => onLogout && onLogout()} className="mt-6 w-full btn btn-outline">
          Logout
        </button>
      )}
    </aside>
  );
}
