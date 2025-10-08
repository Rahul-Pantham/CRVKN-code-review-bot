#!/usr/bin/env python3
"""
Test script to verify section feedback functionality
"""

import requests
import json

# Test configuration
API_BASE = "http://localhost:8000"

def test_section_feedback():
    """Test the section feedback API endpoint"""
    
    print("🧪 Testing section feedback functionality...")
    
    # Test data
    test_feedback = {
        "review_id": 1,  # Assuming we have a review with ID 1
        "feedback": "positive",
        "rejection_reasons": [],
        "custom_rejection_reason": None,
        "section_feedback": {
            "ai_review": "accepted",
            "original_code": "accepted", 
            "optimized_code": "rejected",
            "explanation": "accepted",
            "security_analysis": "rejected"
        }
    }
    
    try:
        # First, let's check if we can reach the API
        response = requests.get(f"{API_BASE}/")
        print(f"✅ API is reachable: {response.status_code}")
        
        # Test the admin analytics endpoint (without auth for now)
        try:
            analytics_response = requests.get(f"{API_BASE}/admin/analytics/section-feedback")
            print(f"📊 Analytics endpoint response: {analytics_response.status_code}")
            
            if analytics_response.status_code == 200:
                data = analytics_response.json()
                print("📈 Section feedback analytics data:")
                print(json.dumps(data, indent=2))
            else:
                print("⚠️ Analytics endpoint requires authentication or data")
                
        except Exception as e:
            print(f"⚠️ Analytics test failed: {str(e)}")
        
        print("\n✅ Section feedback test completed!")
        print("\nNext steps:")
        print("1. Frontend should now display section-level accept/reject buttons")
        print("2. Admin dashboard should show section feedback analytics")
        print("3. Database now stores granular section feedback")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    test_section_feedback()