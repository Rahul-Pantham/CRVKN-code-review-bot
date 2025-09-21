import os
import psycopg2
from urllib.parse import urlparse

from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.getcwd(), '.env_sep', 'creds.env'))
POSTGRES_URI = os.getenv('POSTGRES_URI')
if not POSTGRES_URI:
    print('POSTGRES_URI not set; cannot modify schema')
    raise SystemExit(1)

# psycopg2 can accept full URI
try:
    conn = psycopg2.connect(POSTGRES_URI)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Add user_id
    try:
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER;")
        print('Ensured user_id column')
    except Exception as e:
        print('Could not add user_id:', e)
    
    # Add created_at
    try:
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();")
        print('Ensured created_at column with default now()')
    except Exception as e:
        print('Could not add created_at:', e)
    
    # Add optimized fields
    try:
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS optimized_code TEXT;")
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS explanation TEXT;")
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS security_issues TEXT;")
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS title VARCHAR(200);")
        print('Ensured optimized_code, explanation, security_issues, title columns')
    except Exception as e:
        print('Could not add optimized fields:', e)
    
    # Add new fields for enhanced schema
    try:
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS language VARCHAR(50);")
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating INTEGER;")
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';")
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();")
        print('Ensured language, rating, status, updated_at columns')
    except Exception as e:
        print('Could not add new fields:', e)
    
    # Update rejection reason fields
    try:
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rejection_reasons TEXT;")
        cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS custom_rejection_reason TEXT;")
        print('Ensured multiple rejection reason columns')
    except Exception as e:
        print('Could not add rejection reason fields:', e)
        
    # Add user table enhancements
    try:
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();")
        print('Ensured user timestamp columns')
    except Exception as e:
        print('Could not add user timestamps:', e)
    
    # Create indexes for better performance
    try:
        cur.execute("CREATE INDEX IF NOT EXISTS ix_reviews_user_created ON reviews(user_id, created_at);")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_reviews_language_created ON reviews(language, created_at);")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_reviews_status_created ON reviews(status, created_at);")
        print('Ensured performance indexes')
    except Exception as e:
        print('Could not create indexes:', e)
    
    print('Schema update complete')
    cur.close()
    conn.close()
except Exception as e:
    print('ERROR updating schema:', e)
    raise
