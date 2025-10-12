import psycopg2
import os

# Get database connection details from environment or use defaults
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
POSTGRES_DB = os.getenv('POSTGRES_DB', 'code_review_db')
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'postgres')

print("🔧 Adding missing 'improvement_suggestions' column to reviews table...")
print(f"Connecting to: {POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")

try:
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        database=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='reviews' AND column_name='improvement_suggestions';
    """)
    
    if cursor.fetchone():
        print("✅ Column 'improvement_suggestions' already exists!")
    else:
        # Add the column
        cursor.execute("""
            ALTER TABLE reviews 
            ADD COLUMN improvement_suggestions TEXT;
        """)
        print("✅ Successfully added 'improvement_suggestions' column to reviews table!")
    
    # Verify the column was added
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='reviews' AND column_name='improvement_suggestions';
    """)
    result = cursor.fetchone()
    if result:
        print(f"✅ Verified: Column '{result[0]}' (type: {result[1]}) exists in reviews table")
    
    cursor.close()
    conn.close()
    print("\n✅ Migration completed successfully!")
    print("🔄 Please restart your backend server (python main.py)")
    
except psycopg2.OperationalError as e:
    print(f"\n❌ Connection Error: {e}")
    print("\n💡 Troubleshooting:")
    print("1. Make sure PostgreSQL is running")
    print("2. Check if the password is correct")
    print("3. Verify database 'code_review_db' exists")
    print("\n📝 To set custom credentials, use environment variables:")
    print("   set POSTGRES_PASSWORD=your_password")
    print("   python add_missing_column.py")
except Exception as e:
    print(f"\n❌ Error: {e}")
