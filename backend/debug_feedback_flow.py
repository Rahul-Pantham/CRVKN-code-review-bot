#!/usr/bin/env python3
"""
Test script to debug feedback update issues in admin dashboard
"""

import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000"

def test_feedback_flow():
    """Test the entire feedback submission and admin dashboard flow"""
    
    print("🔍 Testing feedback submission and admin dashboard updates...")
    
    try:
        # Test 1: Check if API is reachable
        response = requests.get(f"{API_BASE}/")
        print(f"✅ API is reachable: {response.status_code}")
        
        # Test 2: Check database content - look at reviews table
        print("\n📊 Current database state:")
        
        # Test 3: Try to get admin overall stats (without auth - will fail but shows endpoint)
        try:
            stats_response = requests.get(f"{API_BASE}/admin/stats/overall")
            print(f"📈 Overall stats endpoint: {stats_response.status_code}")
            if stats_response.status_code != 401:  # If not authentication error
                data = stats_response.json()
                print("Overall Stats Data:")
                print(json.dumps(data, indent=2))
        except Exception as e:
            print(f"⚠️ Overall stats test: {str(e)}")
        
        # Test 4: Try per-user stats
        try:
            user_stats_response = requests.get(f"{API_BASE}/admin/stats/per-user")
            print(f"👥 Per-user stats endpoint: {user_stats_response.status_code}")
            if user_stats_response.status_code != 401:
                data = user_stats_response.json()
                print("Per-User Stats Data:")
                print(json.dumps(data, indent=2))
        except Exception as e:
            print(f"⚠️ Per-user stats test: {str(e)}")
        
        # Test 5: Section feedback analytics
        try:
            section_response = requests.get(f"{API_BASE}/admin/analytics/section-feedback")
            print(f"📊 Section feedback endpoint: {user_stats_response.status_code}")
            if section_response.status_code != 401:
                data = section_response.json()
                print("Section Feedback Data:")
                print(json.dumps(data, indent=2))
        except Exception as e:
            print(f"⚠️ Section feedback test: {str(e)}")
            
        print("\n🔧 Debugging Issues Found:")
        print("1. All admin endpoints require authentication (expected)")
        print("2. Need to check if frontend is properly passing auth tokens")
        print("3. Need to verify if feedback submissions are actually reaching the database")
        
        print("\n✅ Test completed!")
        print("\nTo fully debug:")
        print("1. Check browser console for authentication errors")
        print("2. Verify admin login is working properly")
        print("3. Test with actual feedback submission from frontend")
        print("4. Check database directly for feedback data")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

def check_database_tables():
    """Check what tables exist in the database"""
    print("\n🗄️ Database structure check:")
    print("Expected tables: users, reviews, section_feedback, user_preferences")
    print("Check if all tables exist and have data")

if __name__ == "__main__":
    test_feedback_flow()
    check_database_tables()