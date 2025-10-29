#!/usr/bin/env python3
"""
Test the complete flow: Register → Login → Submit Code → Get Review
"""
import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
TEST_USERNAME = "testuser123"
TEST_EMAIL = "testuser123@example.com"
TEST_PASSWORD = "TestPassword123!"

def test_register():
    """Test user registration"""
    print("\n" + "="*60)
    print("TEST 1: REGISTRATION")
    print("="*60)
    
    data = {
        "username": TEST_USERNAME,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ REGISTRATION SUCCESSFUL")
            return True
        else:
            print(f"❌ REGISTRATION FAILED")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_login():
    """Test user login"""
    print("\n" + "="*60)
    print("TEST 2: LOGIN")
    print("="*60)
    
    from fastapi.security import OAuth2PasswordRequestForm
    
    data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data=data,  # Form data, not JSON
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✅ LOGIN SUCCESSFUL")
            print(f"Token: {token[:50]}...")
            return token
        else:
            print(f"❌ LOGIN FAILED")
            return None
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None

def test_code_review(token):
    """Test code review submission"""
    print("\n" + "="*60)
    print("TEST 3: CODE REVIEW")
    print("="*60)
    
    test_code = """
def hello_world():
    print("Hello World")
    
hello_world()
"""
    
    data = {
        "code": test_code,
        "filename": "test.py"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-review",
            json=data,
            headers=headers
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ CODE REVIEW SUCCESSFUL")
            print(f"Review ID: {result.get('id')}")
            print(f"Title: {result.get('title')}")
            print(f"Review (first 200 chars): {str(result.get('review', ''))[:200]}...")
            return True
        else:
            print(f"Response: {response.text}")
            print(f"❌ CODE REVIEW FAILED")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_past_reviews(token):
    """Test fetching past reviews"""
    print("\n" + "="*60)
    print("TEST 4: FETCH PAST REVIEWS")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {token}",
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/past-reviews",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            reviews = response.json()
            print(f"✅ FETCH SUCCESSFUL")
            print(f"Total reviews: {len(reviews)}")
            if reviews:
                print(f"First review: {json.dumps(reviews[0], indent=2, default=str)}")
            return True
        else:
            print(f"Response: {response.text}")
            print(f"❌ FETCH FAILED")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("\n" + "🚀 "*30)
    print("COMPLETE FLOW TEST: Register → Login → Review → Fetch")
    print("🚀 "*30)
    
    # Test 1: Register
    if not test_register():
        print("\n❌ Registration failed. Stopping tests.")
        return False
    
    # Test 2: Login
    token = test_login()
    if not token:
        print("\n❌ Login failed. Stopping tests.")
        return False
    
    # Test 3: Code Review
    if not test_code_review(token):
        print("\n⚠️  Code review failed. This may be expected if GOOGLE_API_KEY is not set.")
        print("   Backend should return mock review if API key is not available.")
    
    # Test 4: Fetch Reviews
    if not test_past_reviews(token):
        print("\n❌ Fetch reviews failed.")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS COMPLETED")
    print("="*60)
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
