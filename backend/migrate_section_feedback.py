#!/usr/bin/env python3
"""
Migration script to create SectionFeedback table
Run this script to add the section feedback table to your existing database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from main import db_uri, Base, SectionFeedback
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_database():
    """Create the SectionFeedback table"""
    try:
        # Create engine
        engine = create_engine(db_uri)
        
        # Create the SectionFeedback table
        logger.info("Creating SectionFeedback table...")
        SectionFeedback.__table__.create(engine, checkfirst=True)
        
        # Verify table was created
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'section_feedback'
            """))
            
            if result.fetchone():
                logger.info("✅ SectionFeedback table created successfully!")
                
                # Show table structure
                logger.info("Table structure:")
                result = connection.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'section_feedback'
                    ORDER BY ordinal_position
                """))
                
                for row in result:
                    logger.info(f"  {row[0]}: {row[1]} ({'NULL' if row[2] == 'YES' else 'NOT NULL'})")
                    
            else:
                logger.error("❌ Failed to create SectionFeedback table")
                return False
                
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting database migration for SectionFeedback table...")
    
    success = migrate_database()
    
    if success:
        print("✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your FastAPI server")
        print("2. Test the section feedback functionality")
        print("3. Check the admin analytics endpoint: /admin/analytics/section-feedback")
    else:
        print("❌ Migration failed! Please check the logs above.")
        sys.exit(1)