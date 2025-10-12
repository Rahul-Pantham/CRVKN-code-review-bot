"""
Migration script to add improvement_suggestions column to PostgreSQL reviews table
"""
import psycopg2
import os

# Get PostgreSQL connection details from environment or use defaults
POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@localhost:5432/code_review_db")

def add_improvement_suggestions_column():
    """Add improvement_suggestions column to reviews table in PostgreSQL"""
    try:
        # Parse the connection string
        conn = psycopg2.connect(POSTGRES_URI)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='reviews' AND column_name='improvement_suggestions'
        """)
        
        if cursor.fetchone() is None:
            # Column doesn't exist, add it
            cursor.execute("""
                ALTER TABLE reviews 
                ADD COLUMN improvement_suggestions TEXT
            """)
            conn.commit()
            print("✅ Successfully added improvement_suggestions column to reviews table")
        else:
            print("ℹ️  improvement_suggestions column already exists")
        
        cursor.close()
        conn.close()
        
    except psycopg2.OperationalError as e:
        print(f"❌ Connection Error: {e}")
        print(f"   Using connection string: {POSTGRES_URI}")
        print("\n💡 Please ensure:")
        print("   1. PostgreSQL server is running")
        print("   2. Database 'code_review_db' exists")
        print("   3. Credentials in POSTGRES_URI are correct")
        print("   4. Or set POSTGRES_URI environment variable with correct connection string")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print(f"Connecting to PostgreSQL database...")
    print(f"Connection URI: {POSTGRES_URI.replace(':postgres@', ':****@')}")  # Hide password
    add_improvement_suggestions_column()
