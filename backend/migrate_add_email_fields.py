#!/usr/bin/env python3

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))
POSTGRES_URI = os.getenv("POSTGRES_URI")

def run_migration():
    """Add email authentication fields to users table"""
    
    if POSTGRES_URI:
        engine = create_engine(POSTGRES_URI)
        print("Using PostgreSQL database")
    else:
        engine = create_engine("sqlite:///./dev.db", connect_args={"check_same_thread": False})
        print("Using SQLite database")
    
    try:
        with engine.connect() as conn:
            # Check if email column exists
            if POSTGRES_URI:
                # PostgreSQL
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='email'
                """))
            else:
                # SQLite
                result = conn.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
                email_exists = 'email' in columns
            
            if POSTGRES_URI:
                email_exists = result.fetchone() is not None
            
            if not email_exists:
                print("Adding new email authentication columns...")
                
                if POSTGRES_URI:
                    # PostgreSQL migration
                    conn.execute(text("""
                        ALTER TABLE users 
                        ADD COLUMN email VARCHAR(255),
                        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL,
                        ADD COLUMN otp_code VARCHAR(6),
                        ADD COLUMN otp_expires_at TIMESTAMP
                    """))
                    
                    # Create unique index on email
                    conn.execute(text("CREATE UNIQUE INDEX ix_users_email ON users (email)"))
                    
                else:
                    # SQLite migration (add columns one by one)
                    conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0 NOT NULL"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN otp_code VARCHAR(6)"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME"))
                    
                    # Create unique index on email
                    conn.execute(text("CREATE UNIQUE INDEX ix_users_email ON users (email)"))
                
                conn.commit()
                print("✅ Migration completed successfully!")
                print("New columns added:")
                print("  - email (VARCHAR, UNIQUE)")
                print("  - is_verified (BOOLEAN, DEFAULT FALSE)")
                print("  - otp_code (VARCHAR)")
                print("  - otp_expires_at (DATETIME)")
                
            else:
                print("✅ Email columns already exist, no migration needed.")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔄 Running database migration for email authentication...")
    run_migration()