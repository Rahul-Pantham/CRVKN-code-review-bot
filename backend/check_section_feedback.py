"""
Check if section feedback data is in the database
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/crvkn")

# Create engine and session
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

try:
    print("\n=== Checking SectionFeedback Table ===\n")
    
    # Count total section feedback records
    result = db.execute(text("SELECT COUNT(*) FROM section_feedback"))
    total_count = result.scalar()
    print(f"Total section feedback records: {total_count}")
    
    # Check for non-null section feedback
    print("\n--- Checking Section Columns ---")
    
    sections = [
        'code_quality_section',
        'key_findings_section',
        'security_section',
        'performance_section',
        'architecture_section',
        'best_practices_section',
        'recommendations_section',
        'syntax_errors_section',
        'semantic_errors_section',
        'optimized_code_section'
    ]
    
    for section in sections:
        # Count accepted
        result = db.execute(text(f"SELECT COUNT(*) FROM section_feedback WHERE {section} = 'accepted'"))
        accepted = result.scalar()
        
        # Count rejected
        result = db.execute(text(f"SELECT COUNT(*) FROM section_feedback WHERE {section} = 'rejected'"))
        rejected = result.scalar()
        
        # Count pending
        result = db.execute(text(f"SELECT COUNT(*) FROM section_feedback WHERE {section} = 'pending'"))
        pending = result.scalar()
        
        # Count null
        result = db.execute(text(f"SELECT COUNT(*) FROM section_feedback WHERE {section} IS NULL"))
        null_count = result.scalar()
        
        print(f"\n{section}:")
        print(f"  Accepted: {accepted}")
        print(f"  Rejected: {rejected}")
        print(f"  Pending: {pending}")
        print(f"  NULL: {null_count}")
    
    # Show sample records
    print("\n--- Sample Records (last 5) ---")
    result = db.execute(text("""
        SELECT id, review_id, user_id, 
               key_findings_section, 
               architecture_section,
               syntax_errors_section,
               semantic_errors_section,
               created_at
        FROM section_feedback 
        ORDER BY created_at DESC 
        LIMIT 5
    """))
    
    for row in result:
        print(f"\nID: {row[0]}, Review ID: {row[1]}, User ID: {row[2]}")
        print(f"  Key Findings: {row[3]}")
        print(f"  Architecture: {row[4]}")
        print(f"  Syntax Errors: {row[5]}")
        print(f"  Semantic Errors: {row[6]}")
        print(f"  Created: {row[7]}")
    
    print("\n=== Check Complete ===\n")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
