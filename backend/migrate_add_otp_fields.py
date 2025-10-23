#!/usr/bin/env python3
"""
Database migration script to add OTP fields to users table.
Run this script on Render to ensure the database schema has the required columns.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
POSTGRES_URI = os.getenv("POSTGRES_URI")

# Database setup
if POSTGRES_URI:
    db_uri = POSTGRES_URI
    engine = create_engine(db_uri, future=True)
else:
    db_uri = "sqlite:///./dev.db"
    engine = create_engine(db_uri, future=True, connect_args={"check_same_thread": False})

def migrate_database():
    """Add OTP columns to the users table if they don't exist."""
    print("Starting OTP fields database migration...")
    
    try:
        with engine.connect() as conn:
            # Check if database is PostgreSQL or SQLite
            is_postgres = "postgresql" in str(engine.url)
            
            if is_postgres:
                # PostgreSQL migration
                print("Detected PostgreSQL database")
                
                # Add OTP columns if they don't exist
                migrations = [
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;",
                ]
                
            else:
                # SQLite migration
                print("Detected SQLite database")
                
                # Check if columns exist first (SQLite doesn't have IF NOT EXISTS for ALTER TABLE)
                result = conn.execute(text("PRAGMA table_info(users)"))
                existing_columns = {row[1] for row in result.fetchall()}
                
                migrations = []
                
                if 'otp_code' not in existing_columns:
                    migrations.append("ALTER TABLE users ADD COLUMN otp_code VARCHAR(6);")
                
                if 'otp_expires_at' not in existing_columns:
                    migrations.append("ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMP;")
            
            # Execute migrations
            for migration in migrations:
                print(f"Executing: {migration}")
                conn.execute(text(migration))
            
            conn.commit()
            print("✅ Migration applied successfully!")
            
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
                    WHERE table_name = 'users' 
                    AND column_name IN ('otp_code', 'otp_expires_at')
                """))
                columns = {row[0] for row in result.fetchall()}
            else:
                result = conn.execute(text("PRAGMA table_info(users)"))
                columns = {row[1] for row in result.fetchall()}
            
            required_columns = {'otp_code', 'otp_expires_at'}
            missing_columns = required_columns - columns
            
            if missing_columns:
                print(f"⚠️ Missing columns: {missing_columns}")
                return False
            else:
                print("✅ All required OTP columns are present")
                return True
                
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    print("🔄 OTP Fields Database Migration")
    print("=" * 50)
    
    migrate_database()
    
    if verify_migration():
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n⚠️ Migration verification failed. Please check the database manually.")
