import psycopg2

print("🔧 Adding ALL missing columns to reviews table...")

try:
    conn = psycopg2.connect(
        host='localhost',
        port='5432',
        database='codereviewBot',
        user='postgres',
        password='horrid.henry'
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    # Add both missing columns
    print("\n1️⃣ Adding custom_rejection_reason column...")
    cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS custom_rejection_reason TEXT;")
    print("   ✅ custom_rejection_reason added!")
    
    print("\n2️⃣ Adding improvement_suggestions column...")
    cur.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT;")
    print("   ✅ improvement_suggestions added!")
    
    # Verify both columns exist
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='reviews' 
        AND column_name IN ('custom_rejection_reason', 'improvement_suggestions')
        ORDER BY column_name;
    """)
    
    print("\n✅ Verification:")
    for col in cur.fetchall():
        print(f"   ✓ {col[0]} ({col[1]})")
    
    conn.close()
    print("\n🎉 All columns added successfully!")
    print("🔄 Now restart your backend server!")
    
except Exception as e:
    print(f"❌ Error: {e}")
