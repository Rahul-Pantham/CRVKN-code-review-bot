"""
Interactive PostgreSQL Setup and Migration Script
This script will help you set up the PostgreSQL connection and run the migration
"""
import os
import sys
import psycopg2

def test_connection(postgres_uri):
    """Test PostgreSQL connection"""
    try:
        conn = psycopg2.connect(postgres_uri)
        conn.close()
        return True, "✅ Connection successful!"
    except psycopg2.OperationalError as e:
        return False, f"❌ Connection failed: {e}"

def create_database_if_not_exists(host, port, user, password, dbname):
    """Create database if it doesn't exist"""
    try:
        # Connect to postgres database first
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database='postgres'
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(f'CREATE DATABASE {dbname}')
            print(f"✅ Created database '{dbname}'")
        else:
            print(f"ℹ️  Database '{dbname}' already exists")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return False

def add_improvement_suggestions_column(postgres_uri):
    """Add improvement_suggestions column to reviews table"""
    try:
        conn = psycopg2.connect(postgres_uri)
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
        return True
        
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        return False

def main():
    print("=" * 60)
    print("PostgreSQL Setup and Migration Script")
    print("=" * 60)
    print()
    
    # Check if POSTGRES_URI is already set
    postgres_uri = os.getenv("POSTGRES_URI")
    
    if postgres_uri:
        print(f"📌 Found POSTGRES_URI in environment")
        print(f"   URI: {postgres_uri.replace(':' + postgres_uri.split(':')[2].split('@')[0] + '@', ':****@')}")
    else:
        print("⚠️  POSTGRES_URI not found in environment variables")
        print()
        print("Please enter your PostgreSQL credentials:")
        print()
        
        host = input("  Host [localhost]: ").strip() or "localhost"
        port = input("  Port [5432]: ").strip() or "5432"
        user = input("  Username [postgres]: ").strip() or "postgres"
        password = input("  Password: ").strip()
        dbname = input("  Database [code_review_db]: ").strip() or "code_review_db"
        
        postgres_uri = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"
        
        print()
        print("💡 To avoid entering credentials every time, set the environment variable:")
        print(f'   PowerShell: $env:POSTGRES_URI="{postgres_uri}"')
        print(f'   CMD: set POSTGRES_URI={postgres_uri}')
        print()
    
    # Test connection
    print("🔍 Testing PostgreSQL connection...")
    success, message = test_connection(postgres_uri)
    print(f"   {message}")
    
    if not success:
        print()
        print("❌ Cannot proceed with migration until connection is successful")
        print()
        print("Common issues:")
        print("  1. PostgreSQL service is not running")
        print("  2. Wrong username or password")
        print("  3. Database doesn't exist")
        print("  4. PostgreSQL is not listening on the specified host/port")
        print()
        sys.exit(1)
    
    # Try to add the column
    print()
    print("🔧 Running migration to add improvement_suggestions column...")
    if add_improvement_suggestions_column(postgres_uri):
        print()
        print("=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Restart your backend server: python main.py")
        print("  2. The improvement feedback feature is now ready to use")
    else:
        print()
        print("=" * 60)
        print("❌ Migration failed")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()
