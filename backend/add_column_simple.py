"""
Simple script to add improvement_suggestions column to PostgreSQL reviews table
Edit the password below and run: python add_column_simple.py
"""
import psycopg2

# ⚠️ EDIT THIS - Replace with your PostgreSQL password
POSTGRES_PASSWORD = "your_password_here"  # ← CHANGE THIS

# Connection details
HOST = "localhost"
PORT = "5432"
USER = "postgres"
DATABASE = "code_review_db"

# Build connection string
POSTGRES_URI = f"postgresql://{USER}:{POSTGRES_PASSWORD}@{HOST}:{PORT}/{DATABASE}"

def add_column():
    try:
        print(f"Connecting to PostgreSQL at {HOST}:{PORT}/{DATABASE}...")
        conn = psycopg2.connect(POSTGRES_URI)
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='reviews' AND column_name='improvement_suggestions'
        """)
        
        if cursor.fetchone() is None:
            print("Adding improvement_suggestions column...")
            cursor.execute("""
                ALTER TABLE reviews 
                ADD COLUMN improvement_suggestions TEXT
            """)
            conn.commit()
            print("✅ SUCCESS! Column 'improvement_suggestions' added to reviews table")
        else:
            print("ℹ️  Column 'improvement_suggestions' already exists")
        
        cursor.close()
        conn.close()
        print("\n🎉 Done! You can now restart your backend server.")
        
    except psycopg2.OperationalError as e:
        print(f"\n❌ Connection Error: {e}")
        print("\n💡 Please check:")
        print("   1. PostgreSQL is running")
        print("   2. Password is correct in this script")
        print("   3. Database 'code_review_db' exists")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    if POSTGRES_PASSWORD == "your_password_here":
        print("⚠️  WARNING: Please edit this script and set your PostgreSQL password first!")
        print("   Open add_column_simple.py and change POSTGRES_PASSWORD on line 7")
    else:
        add_column()
