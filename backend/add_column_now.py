import psycopg2

print("🔧 Adding 'improvement_suggestions' column to reviews table...")

try:
    # Connect to PostgreSQL with correct database name
    conn = psycopg2.connect(
        host='localhost',
        port='5432',
        database='codereviewBot',
        user='postgres',
        password='horrid.henry'
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Add the column if it doesn't exist
    cursor.execute("""
        ALTER TABLE reviews 
        ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT;
    """)
    print("✅ Column added successfully!")
    
    # Verify the column was added
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='reviews' AND column_name='improvement_suggestions';
    """)
    result = cursor.fetchone()
    if result:
        print(f"✅ Verified: Column '{result[0]}' (type: {result[1]}) exists in reviews table")
    else:
        print("❌ Column verification failed")
    
    cursor.close()
    conn.close()
    print("\n✅ Migration completed successfully!")
    print("🔄 Now restart your backend server!")
    
except Exception as e:
    print(f"❌ Error: {e}")
