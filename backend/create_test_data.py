#!/usr/bin/env python3
"""
Create test data to simulate feedback submissions
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from init_db_direct import SessionLocal, User, Review, SectionFeedback
import json
from datetime import datetime, timedelta

def create_test_data():
    """Create test reviews and feedback data"""
    
    print("🧪 Creating test data...")
    
    db = SessionLocal()
    
    try:
        # Get test user
        user = db.query(User).filter(User.username == "testuser").first()
        if not user:
            print("❌ Test user not found!")
            return
            
        # Create test reviews with feedback
        test_reviews = [
            {
                "title": "Python Function Optimization",
                "code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)",
                "review": "Good recursive approach but could be optimized",
                "optimized_code": "def factorial(n):\n    result = 1\n    for i in range(2, n+1):\n        result *= i\n    return result",
                "explanation": "Iterative approach is more efficient for large numbers",
                "security_issues": "No security issues found",
                "language": "python",
                "rating": 8.5,
                "feedback": "positive",
                "status": "reviewed"
            },
            {
                "title": "JavaScript Array Processing",
                "code": "function processArray(arr) {\n    let result = [];\n    for(let i = 0; i < arr.length; i++) {\n        result.push(arr[i] * 2);\n    }\n    return result;\n}",
                "review": "Function works but can be simplified",
                "optimized_code": "const processArray = arr => arr.map(x => x * 2);",
                "explanation": "Using map() makes the code more functional and concise",
                "security_issues": "No input validation",
                "language": "javascript",
                "rating": 7.0,
                "feedback": "negative",
                "status": "rejected",
                "rejection_reasons": json.dumps(["Code not optimized", "Missing error handling"])
            },
            {
                "title": "Java Class Implementation",
                "code": "public class Calculator {\n    public int add(int a, int b) {\n        return a + b;\n    }\n}",
                "review": "Basic implementation, needs improvement",
                "optimized_code": "public class Calculator {\n    public static int add(int a, int b) {\n        return Math.addExact(a, b);\n    }\n}",
                "explanation": "Use Math.addExact to prevent overflow",
                "security_issues": "Potential integer overflow",
                "language": "java",
                "rating": 6.5,
                "feedback": "positive",
                "status": "reviewed"
            }
        ]
        
        created_reviews = []
        for i, review_data in enumerate(test_reviews):
            review = Review(
                user_id=user.id,
                title=review_data["title"],
                code=review_data["code"],
                review=review_data["review"],
                optimized_code=review_data["optimized_code"],
                explanation=review_data["explanation"],
                security_issues=review_data["security_issues"],
                language=review_data["language"],
                rating=review_data["rating"],
                feedback=review_data["feedback"],
                status=review_data["status"],
                rejection_reasons=review_data.get("rejection_reasons"),
                created_at=datetime.utcnow() - timedelta(days=i)  # Spread across different days
            )
            db.add(review)
            created_reviews.append(review)
            
        db.commit()
        
        # Create section feedback for each review
        section_feedback_data = [
            {
                "review_section": "accepted",
                "original_code_section": "accepted", 
                "optimized_code_section": "accepted",
                "explanation_section": "accepted",
                "security_analysis_section": "accepted"
            },
            {
                "review_section": "rejected",
                "original_code_section": "accepted",
                "optimized_code_section": "rejected", 
                "explanation_section": "rejected",
                "security_analysis_section": "accepted"
            },
            {
                "review_section": "accepted",
                "original_code_section": "rejected",
                "optimized_code_section": "accepted",
                "explanation_section": "accepted", 
                "security_analysis_section": "rejected"
            }
        ]
        
        for i, review in enumerate(created_reviews):
            section_data = section_feedback_data[i]
            section_feedback = SectionFeedback(
                review_id=review.id,
                user_id=user.id,
                review_section=section_data["review_section"],
                original_code_section=section_data["original_code_section"],
                optimized_code_section=section_data["optimized_code_section"],
                explanation_section=section_data["explanation_section"],
                security_analysis_section=section_data["security_analysis_section"],
                overall_feedback=review.feedback,
                created_at=datetime.utcnow() - timedelta(days=i)
            )
            db.add(section_feedback)
            
        db.commit()
        
        print("✅ Test data created successfully!")
        
        # Verify creation
        review_count = db.query(Review).count()
        section_count = db.query(SectionFeedback).count()
        print(f"📝 Total reviews: {review_count}")
        print(f"📊 Section feedback records: {section_count}")
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()