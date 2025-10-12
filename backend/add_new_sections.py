"""
Database migration script to add new section feedback columns
Run this once to update the existing database schema
"""
import os
from sqlalchemy import create_engine, Column, String, text
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

def add_new_columns():
    """Add new section feedback columns to the database"""
    print("🔄 Adding new section feedback columns...")
    
    with engine.connect() as conn:
        try:
            # Add new columns for the new sections
            new_columns = [
                'code_quality_section',
                'key_findings_section',
                'security_section',
                'performance_section',
                'architecture_section',
                'best_practices_section',
                'recommendations_section'
            ]
            
            for column in new_columns:
                try:
                    if 'sqlite' in db_uri.lower():
                        conn.execute(text(f"ALTER TABLE section_feedback ADD COLUMN {column} VARCHAR(20)"))
                    else:
                        conn.execute(text(f"ALTER TABLE section_feedback ADD COLUMN {column} VARCHAR(20)"))
                    print(f"✅ Added column: {column}")
                except Exception as e:
                    if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                        print(f"⏭️  Column {column} already exists, skipping...")
                    else:
                        print(f"❌ Error adding column {column}: {e}")
            
            conn.commit()
            print("\n✅ Database migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration error: {e}")
            conn.rollback()

if __name__ == "__main__":
    print("=" * 60)
    print("DATABASE MIGRATION: Adding New Section Feedback Columns")
    print("=" * 60)
    print(f"Database URI: {db_uri}")
    print()
    
    add_new_columns()
    
    print()
    print("=" * 60)
    print("Migration Complete!")
    print("=" * 60)
