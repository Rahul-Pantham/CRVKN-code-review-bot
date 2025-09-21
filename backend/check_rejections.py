import sqlite3
import json
from datetime import datetime

def check_rejection_reasons():
    try:
        # Connect to SQLite database
        conn = sqlite3.connect('./dev.db')
        cur = conn.cursor()
        
        # Query recent reviews with rejection reasons
        cur.execute("""
            SELECT id, feedback, rejection_reasons, custom_rejection_reason, status, created_at
            FROM reviews 
            WHERE rejection_reasons IS NOT NULL OR custom_rejection_reason IS NOT NULL
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        
        results = cur.fetchall()
        
        print("=== RECENT REJECTIONS IN DATABASE ===")
        for row in results:
            review_id, feedback, rejection_reasons, custom_reason, status, created_at = row
            print(f"\nReview ID: {review_id}")
            print(f"Status: {status}")
            print(f"Feedback: {feedback}")
            print(f"Created: {created_at}")
            
            if rejection_reasons:
                try:
                    reasons = json.loads(rejection_reasons)
                    print(f"Rejection Reasons: {reasons}")
                except json.JSONDecodeError:
                    print(f"Rejection Reasons (raw): {rejection_reasons}")
            
            if custom_reason:
                print(f"Custom Reason: {custom_reason}")
            print("-" * 50)
        
        if not results:
            print("No rejections found in database yet.")
            print("\nTip: Submit a rejection through the web interface first!")
            
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    check_rejection_reasons()