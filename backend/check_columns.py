import psycopg2

print("🔍 Checking reviews table columns...")

try:
    conn = psycopg2.connect(
        host='localhost',
        port='5432',
        database='codereviewBot',
        user='postgres',
        password='horrid.henry'
    )
    cur = conn.cursor()
    
    # Get all columns
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='reviews' 
        ORDER BY ordinal_position;
    """)
    
    print("\n📋 All columns in 'reviews' table:")
    print("-" * 50)
    columns = cur.fetchall()
    for i, col in enumerate(columns, 1):
        print(f"{i:2d}. {col[0]:30s} ({col[1]})")
    
    print(f"\n✅ Total columns: {len(columns)}")
    
    # Check specifically for improvement_suggestions
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='reviews' AND column_name='improvement_suggestions';
    """)
    
    result = cur.fetchone()
    if result:
        print("\n✅ 'improvement_suggestions' column EXISTS")
    else:
        print("\n❌ 'improvement_suggestions' column DOES NOT EXIST")
        print("\nAdding the column now...")
        cur.execute("ALTER TABLE reviews ADD COLUMN improvement_suggestions TEXT;")
        conn.commit()
        print("✅ Column added successfully!")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
