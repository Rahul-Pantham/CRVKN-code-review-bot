#!/usr/bin/env python3
"""
Test script to debug language detection and per-user statistics issues  
"""

import requests
import json

API_BASE = "http://localhost:8000"

def test_language_detection():
    """Test if language detection is working properly"""
    print("🔍 Testing Language Detection...")
    
    # Test different code samples
    test_codes = [
        {
            "name": "python_test.py",
            "code": """
def hello_world():
    print("Hello, World!")
    return True

if __name__ == "__main__":
    hello_world()
""",
            "expected": "Python"
        },
        {
            "name": "javascript_test.js", 
            "code": """
function greetUser(name) {
    console.log(`Hello, ${name}!`);
    return true;
}

const userName = "John";
greetUser(userName);
""",
            "expected": "JavaScript"
        },
        {
            "name": "java_test.java",
            "code": """
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
""",
            "expected": "Java"
        }
    ]
    
    for test in test_codes:
        print(f"\n📄 Testing {test['name']} (expected: {test['expected']})")
        
        # First, let's register and login a test user
        try:
            # Register test user
            register_response = requests.post(f"{API_BASE}/register", 
                json={"username": "testuser123", "password": "testpass123"})
            
            # Login to get token
            login_response = requests.post(f"{API_BASE}/token",
                data={"username": "testuser123", "password": "testpass123"},
                headers={"Content-Type": "application/x-www-form-urlencoded"})
            
            if login_response.status_code == 200:
                token = login_response.json().get("access_token")
                
                # Submit code for review
                review_response = requests.post(f"{API_BASE}/generate-review",
                    json={"code": test["code"], "filename": test["name"]},
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
                
                if review_response.status_code == 200:
                    result = review_response.json()
                    detected_language = result.get("language", "Unknown")
                    print(f"✅ Detected language: {detected_language}")
                    
                    if test["expected"].lower() in detected_language.lower():
                        print(f"✅ Language detection working correctly!")
                    else:
                        print(f"⚠️ Expected {test['expected']}, got {detected_language}")
                        
                    print(f"📝 Review ID: {result.get('id')}")
                    print(f"📊 Rating: {result.get('rating')}")
                else:
                    print(f"❌ Review generation failed: {review_response.status_code}")
                    print(f"Error: {review_response.text}")
            else:
                print(f"❌ Login failed: {login_response.status_code}")
                
        except Exception as e:
            print(f"❌ Test failed: {str(e)}")

def test_per_user_stats():
    """Test the per-user statistics endpoint"""
    print("\n\n📊 Testing Per-User Statistics...")
    
    try:
        # Try to access admin stats (will fail without auth, but we can see the structure)
        stats_response = requests.get(f"{API_BASE}/admin/stats/per-user")
        print(f"📊 Per-user stats response: {stats_response.status_code}")
        
        if stats_response.status_code == 401:
            print("✅ Admin authentication working (401 as expected)")
        elif stats_response.status_code == 200:
            data = stats_response.json()
            print("📈 Per-user statistics data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"⚠️ Unexpected response: {stats_response.status_code}")
            print(stats_response.text)
            
        # Test overall stats too
        overall_response = requests.get(f"{API_BASE}/admin/stats/overall")
        print(f"📊 Overall stats response: {overall_response.status_code}")
        
    except Exception as e:
        print(f"❌ Stats test failed: {str(e)}")

def check_database_data():
    """Check if we have any existing data"""
    print("\n\n🗄️ Checking Database Data...")
    
    try:
        # Check root endpoint
        root_response = requests.get(f"{API_BASE}/")
        print(f"🌐 API Status: {root_response.status_code}")
        
        if root_response.status_code == 200:
            print("✅ Backend API is running correctly")
        
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")

if __name__ == "__main__":
    print("🧪 Starting Language Detection and Per-User Stats Debug...")
    print("=" * 60)
    
    check_database_data()
    test_language_detection() 
    test_per_user_stats()
    
    print("\n" + "=" * 60)
    print("🏁 Debug test completed!")
    print("\nIssues to check:")
    print("1. ✅ Language detection in backend")
    print("2. ✅ Per-user statistics endpoint structure")
    print("3. 🔍 Admin authentication required for stats")
    print("4. 🔍 Data population in frontend")