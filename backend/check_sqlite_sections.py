import os, sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), 'code_review.db')
print('DB path:', DB_PATH)

if not os.path.exists(DB_PATH):
    print('SQLite DB not found')
    raise SystemExit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# list tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
print('Tables:', [r[0] for r in cur.fetchall()])

# pragma table_info
try:
    cur.execute("PRAGMA table_info(section_feedback)")
    cols = cur.fetchall()
    print('section_feedback columns:')
    for c in cols:
        print(' -', c)
except Exception as e:
    print('Error reading section_feedback schema:', e)

# count rows
try:
    cur.execute("SELECT COUNT(*) FROM section_feedback")
    print('section_feedback rows:', cur.fetchone()[0])
except Exception as e:
    print('Count error:', e)

# sample rows
try:
    cur.execute("SELECT id, review_id, user_id, key_findings_section, architecture_section, optimized_code_section, syntax_errors_section, semantic_errors_section, created_at FROM section_feedback ORDER BY created_at DESC LIMIT 5")
    for row in cur.fetchall():
        print('row:', row)
except Exception as e:
    print('Sample query error:', e)

conn.close()
