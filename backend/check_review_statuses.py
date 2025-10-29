"""
Check current review statuses in the database.
This helps diagnose why rejected reviews might show as accepted.
"""
import os
import sys
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Load environment
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))
load_dotenv()

POSTGRES_URI = os.getenv("POSTGRES_URI")

# Database setup
if POSTGRES_URI:
    db_uri = POSTGRES_URI
    print(f"🔗 Using PostgreSQL")
else:
    db_filename = "code_review.db"
    db_path = os.path.join(os.path.dirname(__file__), db_filename)
    db_path = db_path.replace("\\", "/")
    db_uri = f"sqlite:///{db_path}"
    print(f"💾 Using SQLite at: {db_path}")

engine = create_engine(db_uri)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_statuses():
    """Check and display review statuses"""
    db = SessionLocal()
    
    try:
        # Get all reviews with key info
        result = db.execute(text("""
            SELECT id, status, rejection_reasons, custom_rejection_reason, feedback, created_at 
            FROM reviews
            ORDER BY created_at DESC
            LIMIT 20
        """))
        
        reviews = result.fetchall()
        
        print(f"\n📊 Recent Reviews (Last 20)")
        print("="*100)
        print(f"{'ID':<5} {'Status':<12} {'Has Rejection?':<15} {'Feedback':<30} {'Created':<20}")
        print("="*100)
        
        for review in reviews:
            review_id = review[0]
            status = review[1]
            rejection_reasons = review[2]
            custom_rejection = review[3]
            feedback = review[4]
            created = review[5]
            
            has_rejection = "YES ❌" if (rejection_reasons or custom_rejection) else "NO"
            feedback_short = (feedback[:27] + "...") if feedback and len(feedback) > 30 else (feedback or "None")
            created_short = str(created)[:19] if created else "Unknown"
            
            # Color code based on mismatch
            mismatch = ""
            if (rejection_reasons or custom_rejection) and status != "rejected":
                mismatch = " ⚠️ MISMATCH!"
            
            print(f"{review_id:<5} {status:<12} {has_rejection:<15} {feedback_short:<30} {created_short:<20}{mismatch}")
        
        print("="*100)
        
        # Show overall stats
        print("\n📈 Overall Statistics:")
        stats = db.execute(text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as pending
            FROM reviews
        """)).fetchone()
        
        print(f"   Total Reviews: {stats[0]}")
        print(f"   ✅ Accepted (status='reviewed'): {stats[1]}")
        print(f"   ❌ Rejected (status='rejected'): {stats[2]}")
        print(f"   ⏳ Pending (status='completed'): {stats[3]}")
        
        # Check for mismatches
        print("\n🔍 Checking for Status Mismatches:")
        mismatches = db.execute(text("""
            SELECT COUNT(*) 
            FROM reviews 
            WHERE (rejection_reasons IS NOT NULL OR custom_rejection_reason IS NOT NULL) 
            AND status != 'rejected'
        """)).fetchone()[0]
        
        if mismatches > 0:
            print(f"   ⚠️  Found {mismatches} reviews with rejection reasons but status != 'rejected'")
            print(f"   💡 Run fix_review_statuses.py to fix these!")
        else:
            print(f"   ✅ No mismatches found!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 Review Status Checker")
    print()
    check_statuses()
