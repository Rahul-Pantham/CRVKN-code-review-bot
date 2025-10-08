#!/usr/bin/env python3
"""
Database migration script to add repository review fields to existing database.
Run this script after updating the Review model to add the new columns.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))
POSTGRES_URI = os.getenv("POSTGRES_URI")

# Database setup
if POSTGRES_URI:
    db_uri = POSTGRES_URI
    engine = create_engine(db_uri, future=True)
else:
    db_uri = "sqlite:///./dev.db"
    engine = create_engine(db_uri, future=True, connect_args={"check_same_thread": False})

def migrate_database():
    """Add new columns to the reviews table for repository review support."""
    print("Starting database migration...")
    
    try:
        with engine.connect() as conn:
            # Check if database is PostgreSQL or SQLite
            is_postgres = "postgresql" in str(engine.url)
            
            if is_postgres:
                # PostgreSQL migration
                print("Detected PostgreSQL database")
                
                # Add new columns for repository reviews
                migrations = [
                    "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_repository_review VARCHAR(10) DEFAULT 'false' NOT NULL;",
                    "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS repository_url VARCHAR(500);",
                    "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS repository_branch VARCHAR(100);",
                    "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS total_files INTEGER;",
                    "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS file_reviews TEXT;",
                ]
                
            else:
                # SQLite migration
                print("Detected SQLite database")
                
                # Check if columns exist first (SQLite doesn't have IF NOT EXISTS for ALTER TABLE)
                result = conn.execute(text("PRAGMA table_info(reviews)"))
                existing_columns = {row[1] for row in result.fetchall()}
                
                migrations = []
                
                if 'is_repository_review' not in existing_columns:
                    migrations.append("ALTER TABLE reviews ADD COLUMN is_repository_review VARCHAR(10) DEFAULT 'false' NOT NULL;")
                
                if 'repository_url' not in existing_columns:
                    migrations.append("ALTER TABLE reviews ADD COLUMN repository_url VARCHAR(500);")
                
                if 'repository_branch' not in existing_columns:
                    migrations.append("ALTER TABLE reviews ADD COLUMN repository_branch VARCHAR(100);")
                    
                if 'total_files' not in existing_columns:
                    migrations.append("ALTER TABLE reviews ADD COLUMN total_files INTEGER;")
                    
                if 'file_reviews' not in existing_columns:
                    migrations.append("ALTER TABLE reviews ADD COLUMN file_reviews TEXT;")
            
            # Execute migrations
            for migration in migrations:
                print(f"Executing: {migration}")
                conn.execute(text(migration))
            
            # Create new index
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reviews_repo_type ON reviews (is_repository_review, created_at);"))
                print("Created index: ix_reviews_repo_type")
            except Exception as e:
                print(f"Index creation skipped (may already exist): {e}")
            
            conn.commit()
            print("✅ Database migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

def verify_migration():
    """Verify that the migration was successful."""
    print("\nVerifying migration...")
    
    try:
        with engine.connect() as conn:
            # Check if new columns exist
            if "postgresql" in str(engine.url):
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'reviews' 
                    AND column_name IN ('is_repository_review', 'repository_url', 'repository_branch', 'total_files', 'file_reviews')
                """))
            else:
                result = conn.execute(text("PRAGMA table_info(reviews)"))
            
            columns = {row[0] if "postgresql" in str(engine.url) else row[1] for row in result.fetchall()}
            
            required_columns = {'is_repository_review', 'repository_url', 'repository_branch', 'total_files', 'file_reviews'}
            missing_columns = required_columns - columns
            
            if missing_columns:
                print(f"❌ Missing columns: {missing_columns}")
                return False
            else:
                print("✅ All required columns are present")
                return True
                
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Repository Review Database Migration")
    print("=" * 50)
    
    migrate_database()
    
    if verify_migration():
        print("\n🎉 Migration completed successfully!")
        print("Your database now supports repository reviews with file navigation.")
    else:
        print("\n⚠️ Migration verification failed. Please check the database manually.")
        sys.exit(1)