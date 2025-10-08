#!/usr/bin/env python3
"""
Direct database check to debug feedback storage issues
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = "./dev.db"

def check_database():
    """Check the database directly for feedback data"""
    
    print("🔍 Checking database directly for feedback issues...")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"📊 Tables in database: {[table[0] for table in tables]}")
        
        # Check reviews table
        cursor.execute("SELECT COUNT(*) FROM reviews;")
        review_count = cursor.fetchone()[0]
        print(f"📝 Total reviews: {review_count}")
        
        if review_count > 0:
            cursor.execute("SELECT id, feedback, status, rejection_reasons, created_at FROM reviews ORDER BY created_at DESC LIMIT 5;")
            recent_reviews = cursor.fetchall()
            print("\n🔍 Recent reviews:")
            for review in recent_reviews:
                print(f"  ID: {review[0]}, Feedback: {review[1]}, Status: {review[2]}, Rejection: {review[3]}, Created: {review[4]}")
        
        # Check section_feedback table
        try:
            cursor.execute("SELECT COUNT(*) FROM section_feedback;")
            section_count = cursor.fetchone()[0]
            print(f"📊 Section feedback records: {section_count}")
            
            if section_count > 0:
                cursor.execute("SELECT * FROM section_feedback ORDER BY created_at DESC LIMIT 3;")
                recent_sections = cursor.fetchall()
                print("\n📊 Recent section feedback:")
                for section in recent_sections:
                    print(f"  Review ID: {section[1]}, User ID: {section[2]}, Overall: {section[7]}")
        except sqlite3.OperationalError:
            print("⚠️ section_feedback table doesn't exist")
        
        # Check users table
        cursor.execute("SELECT COUNT(*) FROM users;")
        user_count = cursor.fetchone()[0]
        print(f"👥 Total users: {user_count}")
        
        # Check for feedback statistics
        cursor.execute("SELECT feedback, COUNT(*) FROM reviews WHERE feedback IS NOT NULL GROUP BY feedback;")
        feedback_stats = cursor.fetchall()
        print(f"📈 Feedback statistics: {dict(feedback_stats)}")
        
        cursor.execute("SELECT status, COUNT(*) FROM reviews GROUP BY status;")
        status_stats = cursor.fetchall()
        print(f"📊 Status statistics: {dict(status_stats)}")
        
        conn.close()
        
        print("\n🔧 Issues to check:")
        print("1. Are reviews being created with feedback?")
        print("2. Are section_feedback records being created?")
        print("3. Are admin endpoints using correct queries?")
        print("4. Is frontend properly authenticated to access admin endpoints?")
        
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")

if __name__ == "__main__":
    check_database()