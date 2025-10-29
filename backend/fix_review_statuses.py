"""
Fix existing review statuses in the database.

This script updates old reviews that have rejection_reasons but wrong status.
Run this once to fix existing data after the status logic was corrected.
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

def fix_statuses():
    """Fix review statuses based on rejection_reasons field"""
    db = SessionLocal()
    
    try:
        # Get all reviews
        result = db.execute(text("""
            SELECT id, status, rejection_reasons, custom_rejection_reason, feedback 
            FROM reviews
        """))
        
        reviews = result.fetchall()
        
        print(f"\n📊 Found {len(reviews)} total reviews")
        print("="*70)
        
        fixed_count = 0
        already_correct = 0
        
        for review in reviews:
            review_id = review[0]
            current_status = review[1]
            rejection_reasons = review[2]
            custom_rejection_reason = review[3]
            feedback = review[4]
            
            # Determine what the status SHOULD be
            has_rejection = rejection_reasons is not None or custom_rejection_reason is not None
            
            if has_rejection:
                # Should be "rejected"
                correct_status = "rejected"
            elif feedback is not None:
                # Has feedback but no rejection = accepted
                correct_status = "reviewed"
            else:
                # No feedback yet = pending
                correct_status = "completed"
            
            # Check if status needs fixing
            if current_status != correct_status:
                print(f"\n🔧 Fixing Review ID {review_id}:")
                print(f"   Current status: {current_status}")
                print(f"   Should be: {correct_status}")
                print(f"   Rejection reasons: {rejection_reasons}")
                print(f"   Feedback: {feedback[:50] if feedback else 'None'}...")
                
                # Update the status
                db.execute(text("""
                    UPDATE reviews 
                    SET status = :new_status 
                    WHERE id = :review_id
                """), {"new_status": correct_status, "review_id": review_id})
                
                fixed_count += 1
            else:
                already_correct += 1
        
        # Commit all changes
        db.commit()
        
        print("\n" + "="*70)
        print(f"✅ Fixed {fixed_count} reviews")
        print(f"✓  {already_correct} reviews were already correct")
        print(f"📊 Total processed: {len(reviews)}")
        
        # Show current stats
        print("\n📈 Current Statistics:")
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
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Review Status Fixer")
    print("This script will update review statuses based on rejection_reasons")
    print()
    
    response = input("Do you want to continue? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        fix_statuses()
        print("\n✅ Done!")
    else:
        print("❌ Cancelled")
