"""
Quick test to check if syntax/semantic errors are detected
"""
import requests
import json

API_BASE = "http://localhost:8000"

# Code with syntax error (missing colon)
code_with_syntax_error = """
def hello()
    print("missing colon")
"""

# Code with semantic errors
code_with_semantic_errors = """
def calculate(a, b, c, d, e, f, g, h):
    unused_variable = 100
    result = a + b
    return result
"""

# Good code
good_code = """
def hello():
    print("Hello world")
"""

def test_code(code, description):
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"{'='*60}")
    
    # You need to provide your token
    token = input("Enter your auth token: ").strip()
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{API_BASE}/generate-review",
        headers=headers,
        json={"code": code}
    )
    
    if response.status_code == 200:
        data = response.json()
        review_text = data.get("review", "")
        
        # Extract sections
        if "###SYNTAX_ERRORS###" in review_text:
            start = review_text.find("###SYNTAX_ERRORS###") + len("###SYNTAX_ERRORS###")
            end = review_text.find("###", start)
            syntax_section = review_text[start:end].strip() if end > start else review_text[start:].strip()
            print(f"\n📝 SYNTAX ERRORS:\n{syntax_section}")
        
        if "###SEMANTIC_ERRORS###" in review_text:
            start = review_text.find("###SEMANTIC_ERRORS###") + len("###SEMANTIC_ERRORS###")
            end = review_text.find("###", start)
            semantic_section = review_text[start:end].strip() if end > start else review_text[start:].strip()
            print(f"\n🧠 SEMANTIC ERRORS:\n{semantic_section}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    print("🧪 Testing Syntax & Semantic Error Detection")
    
    choice = input("\nSelect test:\n1. Syntax error\n2. Semantic errors\n3. Good code\nChoice: ").strip()
    
    if choice == "1":
        test_code(code_with_syntax_error, "Code with syntax error (missing colon)")
    elif choice == "2":
        test_code(code_with_semantic_errors, "Code with semantic errors (unused var, too many params)")
    elif choice == "3":
        test_code(good_code, "Good code (no errors)")
    else:
        print("Invalid choice")
