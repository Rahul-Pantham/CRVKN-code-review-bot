"""
Migration script to add syntax_errors_section and semantic_errors_section columns
to the section_feedback table.
"""
import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('.env_sep/creds.env')

# Get database URI
POSTGRES_URI = os.getenv('POSTGRES_URI')

def migrate():
    """Add new columns for syntax and semantic error section feedback"""
    try:
        # Parse the PostgreSQL URI
        # Format: postgresql://user:password@host:port/database
        conn = psycopg2.connect(POSTGRES_URI)
        cur = conn.cursor()
        
        print("🔄 Starting migration: Adding syntax and semantic error feedback columns...")
        
        # Add syntax_errors_section column
        try:
            cur.execute("""
                ALTER TABLE section_feedback 
                ADD COLUMN IF NOT EXISTS syntax_errors_section VARCHAR(20);
            """)
            print("✅ Added syntax_errors_section column")
        except Exception as e:
            print(f"⚠️  syntax_errors_section column: {e}")
        
        # Add semantic_errors_section column
        try:
            cur.execute("""
                ALTER TABLE section_feedback 
                ADD COLUMN IF NOT EXISTS semantic_errors_section VARCHAR(20);
            """)
            print("✅ Added semantic_errors_section column")
        except Exception as e:
            print(f"⚠️  semantic_errors_section column: {e}")
        
        # Commit changes
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Verify columns exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'section_feedback' 
            AND column_name IN ('syntax_errors_section', 'semantic_errors_section');
        """)
        columns = cur.fetchall()
        print(f"📋 Verified columns: {[col[0] for col in columns]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
