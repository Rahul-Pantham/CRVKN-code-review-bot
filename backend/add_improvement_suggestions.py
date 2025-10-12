"""
Migration script to add improvement_suggestions column to reviews table
"""
import sqlite3
import os

# Database file path - dev.db is in the parent directory of CODE-REVIEW-BOT
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "dev.db")
print(f"Using database at: {DB_PATH}")

def add_improvement_suggestions_column():
    """Add improvement_suggestions column to reviews table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(reviews)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'improvement_suggestions' not in columns:
            # Column doesn't exist, add it
            cursor.execute("""
                ALTER TABLE reviews 
                ADD COLUMN improvement_suggestions TEXT
            """)
            conn.commit()
            print("✅ Successfully added improvement_suggestions column to reviews table")
        else:
            print("ℹ️  improvement_suggestions column already exists")
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_improvement_suggestions_column()
