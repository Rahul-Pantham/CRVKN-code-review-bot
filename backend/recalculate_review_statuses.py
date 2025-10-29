"""
Recalculate review statuses based on section-level feedback.

This applies the new >50% acceptance rule to existing reviews.
- If >50% of sections are accepted → status = "reviewed" (ACCEPTED)
- If ≤50% of sections are accepted → status = "rejected" (REJECTED)
- If explicit rejection reasons exist → status = "rejected"
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

def recalculate_statuses():
    """Recalculate review statuses based on section feedback"""
    db = SessionLocal()
    
    try:
        # Get all reviews with section feedback
        result = db.execute(text("""
            SELECT 
                r.id, 
                r.status, 
                r.rejection_reasons,
                r.custom_rejection_reason,
                sf.review_section,
                sf.original_code_section,
                sf.optimized_code_section,
                sf.explanation_section,
                sf.security_analysis_section,
                sf.code_quality_section,
                sf.key_findings_section,
                sf.security_section,
                sf.performance_section,
                sf.architecture_section,
                sf.best_practices_section,
                sf.recommendations_section,
                sf.syntax_errors_section,
                sf.semantic_errors_section
            FROM reviews r
            LEFT JOIN section_feedback sf ON r.id = sf.review_id
            WHERE sf.id IS NOT NULL
        """))
        
        reviews = result.fetchall()
        
        print(f"\n📊 Found {len(reviews)} reviews with section feedback")
        print("="*100)
        
        updated_count = 0
        already_correct = 0
        
        for review in reviews:
            review_id = review[0]
            current_status = review[1]
            rejection_reasons = review[2]
            custom_rejection = review[3]
            
            # Collect all section feedback values (excluding None)
            sections = {
                'review': review[4],
                'original_code': review[5],
                'optimized_code': review[6],
                'explanation': review[7],
                'security_analysis': review[8],
                'code_quality': review[9],
                'key_findings': review[10],
                'security': review[11],
                'performance': review[12],
                'architecture': review[13],
                'best_practices': review[14],
                'recommendations': review[15],
                'syntax_errors': review[16],
                'semantic_errors': review[17]
            }
            
            # Filter to only reviewed sections (accepted or rejected)
            reviewed_sections = {k: v for k, v in sections.items() if v in ['accepted', 'rejected']}
            
            # Determine correct status
            if rejection_reasons or custom_rejection:
                # Explicit rejection via modal
                correct_status = "rejected"
                reason = "explicit rejection reasons"
            elif len(reviewed_sections) > 0:
                # Calculate acceptance rate
                accepted_count = sum(1 for v in reviewed_sections.values() if v == 'accepted')
                rejected_count = sum(1 for v in reviewed_sections.values() if v == 'rejected')
                total = len(reviewed_sections)
                acceptance_rate = (accepted_count / total) * 100
                
                if acceptance_rate > 50:
                    correct_status = "reviewed"
                    reason = f"{acceptance_rate:.1f}% accepted ({accepted_count}/{total})"
                else:
                    correct_status = "rejected"
                    reason = f"{acceptance_rate:.1f}% accepted ({accepted_count}/{total})"
            else:
                # No section feedback yet
                correct_status = current_status  # Keep current
                reason = "no section feedback"
            
            # Check if update needed
            if current_status != correct_status and len(reviewed_sections) > 0:
                print(f"\n🔄 Updating Review ID {review_id}:")
                print(f"   Current status: {current_status}")
                print(f"   New status: {correct_status}")
                print(f"   Reason: {reason}")
                print(f"   Sections: {reviewed_sections}")
                
                # Update status
                db.execute(text("""
                    UPDATE reviews 
                    SET status = :new_status 
                    WHERE id = :review_id
                """), {"new_status": correct_status, "review_id": review_id})
                
                updated_count += 1
            else:
                already_correct += 1
        
        # Commit changes
        db.commit()
        
        print("\n" + "="*100)
        print(f"✅ Updated {updated_count} reviews")
        print(f"✓  {already_correct} reviews were already correct")
        print(f"📊 Total processed: {len(reviews)}")
        
        # Show updated stats
        print("\n📈 Updated Statistics:")
        stats = db.execute(text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as pending
            FROM reviews
        """)).fetchone()
        
        print(f"   Total Reviews: {stats[0]}")
        print(f"   ✅ Accepted (>50% sections accepted): {stats[1]}")
        print(f"   ❌ Rejected (≤50% sections accepted): {stats[2]}")
        print(f"   ⏳ Pending (no feedback yet): {stats[3]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Review Status Recalculator")
    print("This applies the new >50% acceptance rule to existing reviews")
    print()
    
    response = input("Do you want to recalculate all review statuses? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        recalculate_statuses()
        print("\n✅ Done! Refresh your admin dashboard to see the updated stats.")
    else:
        print("❌ Cancelled")
