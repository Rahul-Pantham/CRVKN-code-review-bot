"""
Test script to verify the feedback incorporation flow
"""
import psycopg2
from datetime import datetime

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="codereviewBot",
    user="postgres",
    password="horrid.henry"
)

def test_latest_feedback():
    """Test fetching the latest improvement suggestion"""
    cursor = conn.cursor()
    
    # Get user ID for testing (assumes user exists)
    cursor.execute("SELECT id, username FROM users LIMIT 1")
    result = cursor.fetchone()
    
    if not result:
        print("❌ No users found in database")
        return
    
    user_id, username = result
    print(f"✅ Testing with user: {username} (ID: {user_id})")
    
    # Check for latest improvement suggestion
    cursor.execute("""
        SELECT id, improvement_suggestions, created_at 
        FROM reviews 
        WHERE user_id = %s 
        AND improvement_suggestions IS NOT NULL 
        AND improvement_suggestions != ''
        ORDER BY created_at DESC 
        LIMIT 1
    """, (user_id,))
    
    feedback = cursor.fetchone()
    
    if feedback:
        review_id, suggestion, created_at = feedback
        print(f"\n✅ Found latest feedback:")
        print(f"   Review ID: {review_id}")
        print(f"   Created: {created_at}")
        print(f"   Suggestion: {suggestion[:200]}...")
    else:
        print(f"\n⚠️ No improvement suggestions found for user {username}")
        print("   To test the feature:")
        print("   1. Submit a code review")
        print("   2. Provide feedback with improvement suggestions")
        print("   3. Submit new code - the previous feedback will be used!")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    test_latest_feedback()
