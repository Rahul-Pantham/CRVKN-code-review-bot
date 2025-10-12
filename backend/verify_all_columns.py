import psycopg2

print("🔍 Verifying ALL expected columns in reviews table...")

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
    
    # Expected columns from the SQLAlchemy model
    expected_columns = [
        'id', 'user_id', 'code', 'language', 'review', 'title',
        'optimized_code', 'explanation', 'security_issues', 'rating',
        'is_repository_review', 'repository_url', 'repository_branch',
        'total_files', 'file_reviews', 'feedback', 'rejection_reasons',
        'custom_rejection_reason', 'improvement_suggestions', 'status',
        'created_at', 'updated_at'
    ]
    
    # Get actual columns
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='reviews' 
        ORDER BY ordinal_position;
    """)
    
    actual_columns = [row[0] for row in cur.fetchall()]
    
    print("\n✅ Columns that EXIST:")
    for col in expected_columns:
        if col in actual_columns:
            print(f"   ✓ {col}")
    
    print("\n❌ Columns that are MISSING:")
    missing = [col for col in expected_columns if col not in actual_columns]
    if missing:
        for col in missing:
            print(f"   ✗ {col}")
            
        # Add missing columns
        print("\n🔧 Adding missing columns...")
        for col in missing:
            try:
                cur.execute(f"ALTER TABLE reviews ADD COLUMN {col} TEXT;")
                print(f"   ✅ Added {col}")
            except Exception as e:
                print(f"   ❌ Failed to add {col}: {e}")
    else:
        print("   (None - all columns exist!)")
    
    print(f"\n📊 Total columns in database: {len(actual_columns)}")
    print(f"📊 Expected columns: {len(expected_columns)}")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
