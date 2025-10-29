"""
Update review statuses on Render database based on section acceptance rate.
Run this via Render Shell to update the production database.

Usage in Render Shell:
python backend/update_render_db.py
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Get database URI from environment
POSTGRES_URI = os.getenv("POSTGRES_URI")

if not POSTGRES_URI:
    print("❌ ERROR: POSTGRES_URI environment variable not set")
    sys.exit(1)

print(f"🔗 Connecting to database...")

engine = create_engine(POSTGRES_URI)
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
        print("="*80)
        
        updated_count = 0
        
        for review in reviews:
            review_id = review[0]
            current_status = review[1]
            rejection_reasons = review[2]
            custom_rejection = review[3]
            
            # Collect all section feedback values
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
            
            # Filter to only reviewed sections
            reviewed_sections = {k: v for k, v in sections.items() if v in ['accepted', 'rejected']}
            
            # Determine correct status
            if rejection_reasons or custom_rejection:
                correct_status = "rejected"
                reason = "explicit rejection"
            elif len(reviewed_sections) > 0:
                accepted_count = sum(1 for v in reviewed_sections.values() if v == 'accepted')
                total = len(reviewed_sections)
                acceptance_rate = (accepted_count / total) * 100
                
                if acceptance_rate > 50:
                    correct_status = "reviewed"
                    reason = f"{acceptance_rate:.1f}% accepted ({accepted_count}/{total})"
                else:
                    correct_status = "rejected"
                    reason = f"{acceptance_rate:.1f}% accepted ({accepted_count}/{total})"
            else:
                correct_status = current_status
                reason = "no section feedback"
            
            # Update if needed
            if current_status != correct_status and len(reviewed_sections) > 0:
                print(f"🔄 Review {review_id}: {current_status} → {correct_status} ({reason})")
                
                db.execute(text("""
                    UPDATE reviews 
                    SET status = :new_status 
                    WHERE id = :review_id
                """), {"new_status": correct_status, "review_id": review_id})
                
                updated_count += 1
        
        db.commit()
        
        print("\n" + "="*80)
        print(f"✅ Updated {updated_count} reviews")
        
        # Show final stats
        stats = db.execute(text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as pending
            FROM reviews
        """)).fetchone()
        
        print(f"\n📈 Final Statistics:")
        print(f"   Total: {stats[0]}")
        print(f"   ✅ Accepted (>50%): {stats[1]}")
        print(f"   ❌ Rejected (≤50%): {stats[2]}")
        print(f"   ⏳ Pending: {stats[3]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Render Database Update Script")
    print("Applying >50% acceptance rule to existing reviews\n")
    recalculate_statuses()
    print("\n✅ Done! Database updated.")
