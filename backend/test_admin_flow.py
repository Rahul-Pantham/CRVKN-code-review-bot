#!/usr/bin/env python3
"""
Comprehensive test script to debug admin dashboard issues
"""

import requests
import json

API_BASE = "http://localhost:8000"

def test_admin_flow():
    """Test the complete admin authentication and data flow"""
    
    print("🔍 Testing Admin Dashboard Issues...")
    
    try:
        # Step 1: Test admin login
        print("\n1️⃣ Testing Admin Login...")
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        login_response = requests.post(
            f"{API_BASE}/admin/login",
            data=login_data,  # Use form data for OAuth2
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"Login Status: {login_response.status_code}")
        if login_response.status_code == 200:
            login_result = login_response.json()
            admin_token = login_result.get('access_token')
            print(f"✅ Admin login successful! Token: {admin_token[:20]}...")
            
            # Step 2: Test admin endpoints with token
            headers = {
                'Authorization': f'Bearer {admin_token}',
                'Content-Type': 'application/json'
            }
            
            print("\n2️⃣ Testing Overall Stats...")
            stats_response = requests.get(f"{API_BASE}/admin/stats/overall", headers=headers)
            print(f"Overall Stats Status: {stats_response.status_code}")
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                print("Overall Stats Data:")
                print(json.dumps(stats_data, indent=2))
            else:
                print(f"❌ Overall stats failed: {stats_response.text}")
            
            print("\n3️⃣ Testing Per-User Stats...")
            user_stats_response = requests.get(f"{API_BASE}/admin/stats/per-user", headers=headers)
            print(f"User Stats Status: {user_stats_response.status_code}")
            if user_stats_response.status_code == 200:
                user_stats_data = user_stats_response.json()
                print("Per-User Stats Data:")
                print(json.dumps(user_stats_data, indent=2))
            else:
                print(f"❌ User stats failed: {user_stats_response.text}")
            
            print("\n4️⃣ Testing Section Feedback Analytics...")
            section_response = requests.get(f"{API_BASE}/admin/analytics/section-feedback", headers=headers)
            print(f"Section Analytics Status: {section_response.status_code}")
            if section_response.status_code == 200:
                section_data = section_response.json()
                print("Section Feedback Data:")
                print(json.dumps(section_data, indent=2))
            else:
                print(f"❌ Section analytics failed: {section_response.text}")
                
        else:
            print(f"❌ Admin login failed: {login_response.text}")
            
        # Step 3: Test regular user login and feedback submission
        print("\n5️⃣ Testing Regular User Login...")
        user_login_data = {
            "username": "testuser",
            "password": "testpass"
        }
        
        user_login_response = requests.post(
            f"{API_BASE}/token",
            data=user_login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"User Login Status: {user_login_response.status_code}")
        if user_login_response.status_code == 200:
            user_result = user_login_response.json()
            user_token = user_result.get('access_token')
            print(f"✅ User login successful! Token: {user_token[:20]}...")
            
            # Test feedback submission
            print("\n6️⃣ Testing Feedback Submission...")
            user_headers = {
                'Authorization': f'Bearer {user_token}',
                'Content-Type': 'application/json'
            }
            
            # Get user's reviews first
            past_reviews_response = requests.get(f"{API_BASE}/past-reviews", headers=user_headers)
            if past_reviews_response.status_code == 200:
                reviews = past_reviews_response.json()
                print(f"Found {len(reviews)} reviews for user")
                
                if reviews:
                    # Submit feedback for the first review
                    review_id = reviews[0]['id']
                    feedback_data = {
                        "review_id": review_id,
                        "feedback": "positive",
                        "rejection_reasons": [],
                        "custom_rejection_reason": None,
                        "section_feedback": {
                            "ai_review": "accepted",
                            "original_code": "accepted",
                            "optimized_code": "rejected",
                            "explanation": "accepted",
                            "security_analysis": "accepted"
                        }
                    }
                    
                    feedback_response = requests.post(
                        f"{API_BASE}/submit-feedback",
                        json=feedback_data,
                        headers=user_headers
                    )
                    
                    print(f"Feedback Submission Status: {feedback_response.status_code}")
                    if feedback_response.status_code == 200:
                        print("✅ Feedback submitted successfully!")
                        print(feedback_response.json())
                    else:
                        print(f"❌ Feedback submission failed: {feedback_response.text}")
            
        else:
            print(f"❌ User login failed: {user_login_response.text}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        
    print("\n🔧 Summary of Issues to Check:")
    print("1. Admin login endpoint working?")
    print("2. Admin token authentication working?") 
    print("3. Database has data?")
    print("4. Admin endpoints returning correct data?")
    print("5. Frontend properly calling admin endpoints?")
    print("6. Frontend properly storing/using admin token?")

if __name__ == "__main__":
    test_admin_flow()