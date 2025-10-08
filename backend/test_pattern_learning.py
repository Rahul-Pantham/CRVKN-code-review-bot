import requests
import json

# Test Pattern Learning Implementation
API_BASE = "http://localhost:8000"

def test_pattern_learning():
    print("🧪 Testing Pattern Learning Implementation")
    print("=" * 50)
    
    # First, register a test user
    print("1. Registering test user...")
    register_data = {
        "username": "testuser_pattern",
        "password": "test123"
    }
    
    response = requests.post(f"{API_BASE}/register", json=register_data)
    if response.status_code == 200:
        print("✅ User registered successfully")
    elif "already registered" in response.text:
        print("ℹ️ User already exists")
    else:
        print(f"❌ Registration failed: {response.text}")
        return
    
    # Login to get token
    print("\n2. Logging in...")
    login_data = {
        "username": "testuser_pattern",
        "password": "test123"
    }
    
    response = requests.post(f"{API_BASE}/token", data=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login successful")
    else:
        print(f"❌ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get initial preferences
    print("\n3. Getting initial preferences...")
    response = requests.get(f"{API_BASE}/preferences/", headers=headers)
    if response.status_code == 200:
        initial_prefs = response.json()
        print("✅ Initial preferences:")
        for key, value in initial_prefs.items():
            print(f"   • {key}: {value}")
    else:
        print(f"❌ Failed to get preferences: {response.text}")
        return
    
    # Test feedback - disable security analysis
    print("\n4. Submitting feedback to disable security analysis...")
    feedback_data = {
        "feedback_text": "Security analysis is not required for my projects"
    }
    
    response = requests.post(f"{API_BASE}/feedback/", json=feedback_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print("✅ Feedback submitted successfully:")
        print(f"   Message: {result['message']}")
        if result.get('changes'):
            print(f"   Changes: {result['changes']}")
    else:
        print(f"❌ Feedback submission failed: {response.text}")
        return
    
    # Get updated preferences
    print("\n5. Getting updated preferences...")
    response = requests.get(f"{API_BASE}/preferences/", headers=headers)
    if response.status_code == 200:
        updated_prefs = response.json()
        print("✅ Updated preferences:")
        for key, value in updated_prefs.items():
            print(f"   • {key}: {value}")
            
        # Check if security analysis was disabled
        if not updated_prefs.get('security_analysis', True):
            print("🎉 SUCCESS: Security analysis was disabled based on feedback!")
        else:
            print("⚠️ Security analysis is still enabled")
    else:
        print(f"❌ Failed to get updated preferences: {response.text}")
        return
    
    # Test another feedback - enable performance analysis
    print("\n6. Submitting feedback to focus on performance...")
    feedback_data = {
        "feedback_text": "I want to focus more on performance optimization in my code reviews"
    }
    
    response = requests.post(f"{API_BASE}/feedback/", json=feedback_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print("✅ Second feedback submitted successfully:")
        print(f"   Message: {result['message']}")
        if result.get('changes'):
            print(f"   Changes: {result['changes']}")
    else:
        print(f"❌ Second feedback submission failed: {response.text}")
    
    # Get final preferences
    print("\n7. Getting final preferences...")
    response = requests.get(f"{API_BASE}/preferences/", headers=headers)
    if response.status_code == 200:
        final_prefs = response.json()
        print("✅ Final preferences:")
        for key, value in final_prefs.items():
            print(f"   • {key}: {value}")
        
        print(f"\n📊 Feedback History: {final_prefs.get('feedback_count', 0)} entries")
    else:
        print(f"❌ Failed to get final preferences: {response.text}")
    
    print("\n" + "=" * 50) 
    print("🎉 Pattern Learning Test Complete!")
    print("The system can now customize reviews based on user feedback!")

if __name__ == "__main__":
    test_pattern_learning()