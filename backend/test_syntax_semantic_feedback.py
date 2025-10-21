"""
Test script to verify syntax and semantic error sections with accept/reject functionality
"""
import requests
import json

API_BASE = "http://localhost:8000"

def test_syntax_semantic_sections():
    """Test the new syntax and semantic error sections"""
    
    print("🧪 Testing Syntax & Semantic Error Sections with Accept/Reject")
    print("=" * 60)
    
    # First, register or login to get a token
    # For testing, we'll assume you already have a token
    token = input("Enter your auth token (or press Enter to login): ").strip()
    
    if not token:
        print("\n📝 Login to get token...")
        username = input("Username: ")
        password = input("Password: ")
        
        login_response = requests.post(f"{API_BASE}/login", json={
            "username": username,
            "password": password
        })
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            print(f"✅ Logged in successfully!")
        else:
            print(f"❌ Login failed: {login_response.text}")
            return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test code with intentional syntax and semantic errors
    test_code = """
def calculate_sum(a, b)
    # Missing colon - syntax error
    result = a + b
    unused_variable = 100  # Semantic error - unused variable
    return result

# Function with too many parameters - semantic error
def complex_function(param1, param2, param3, param4, param5, param6, param7, param8):
    return param1 + param2
"""
    
    print("\n📤 Submitting code for review...")
    print(f"Code:\n{test_code}\n")
    
    review_response = requests.post(
        f"{API_BASE}/generate-review",
        headers=headers,
        json={"code": test_code}
    )
    
    if review_response.status_code != 200:
        print(f"❌ Review generation failed: {review_response.text}")
        return
    
    review_data = review_response.json()
    review_id = review_data["id"]
    review_text = review_data["review"]
    
    print(f"✅ Review generated! (ID: {review_id})")
    print("\n" + "=" * 60)
    print("📋 REVIEW SECTIONS:")
    print("=" * 60)
    
    # Parse and display sections
    sections = {
        "SYNTAX_ERRORS": "",
        "SEMANTIC_ERRORS": ""
    }
    
    for section_name in sections.keys():
        marker = f"###{section_name}###"
        if marker in review_text:
            start = review_text.find(marker) + len(marker)
            end = review_text.find("###", start)
            if end == -1:
                end = len(review_text)
            sections[section_name] = review_text[start:end].strip()
    
    print(f"\n📝 SYNTAX ERRORS:")
    print(sections["SYNTAX_ERRORS"] or "Not found in review")
    
    print(f"\n🧠 SEMANTIC ERRORS:")
    print(sections["SEMANTIC_ERRORS"] or "Not found in review")
    
    # Test accepting syntax errors section
    print("\n" + "=" * 60)
    print("🧪 Testing Accept/Reject Functionality")
    print("=" * 60)
    
    print("\n✅ Accepting Syntax Errors section...")
    feedback_response = requests.post(
        f"{API_BASE}/submit-feedback",
        headers=headers,
        json={
            "review_id": review_id,
            "feedback": "accepted",
            "section_feedback": {
                "syntaxErrors": "accepted",
                "semanticErrors": "rejected"
            }
        }
    )
    
    if feedback_response.status_code == 200:
        print("✅ Feedback submitted successfully!")
        print(f"Response: {json.dumps(feedback_response.json(), indent=2)}")
    else:
        print(f"❌ Feedback submission failed: {feedback_response.text}")
    
    # Verify feedback was saved
    print("\n🔍 Verifying feedback in database...")
    # Note: You would need an admin endpoint to verify this
    # For now, we'll just confirm the API call succeeded
    
    print("\n" + "=" * 60)
    print("✅ Test completed!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Check the frontend to see syntax/semantic error sections")
    print("2. Verify Accept/Reject buttons are working")
    print("3. Check database to confirm feedback is saved")

if __name__ == "__main__":
    test_syntax_semantic_sections()
