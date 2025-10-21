"""
Direct AST analysis test to verify error detection
"""
import sys
sys.path.append('C:/Users/win11/OneDrive/Desktop/BOT/CODE-REVIEW-BOT/backend')

from ast_analyzer import CodeAnalyzer

# Test code with syntax error
code_with_syntax_error = """
def hello()
    print("missing colon")
"""

# Test code with semantic errors
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

def test_analyzer():
    analyzer = CodeAnalyzer()
    
    print("="*60)
    print("TEST 1: Code with SYNTAX ERROR")
    print("="*60)
    result1 = analyzer.analyze_code(code_with_syntax_error, 'python')
    print(f"Structure: {result1.structure}")
    print(f"Issues: {result1.issues}")
    print(f"Security: {result1.security_concerns}")
    print(f"Performance: {result1.performance_issues}")
    
    print("\n" + "="*60)
    print("TEST 2: Code with SEMANTIC ERRORS")
    print("="*60)
    result2 = analyzer.analyze_code(code_with_semantic_errors, 'python')
    print(f"Structure: {result2.structure}")
    print(f"Issues: {result2.issues}")
    print(f"Security: {result2.security_concerns}")
    print(f"Performance: {result2.performance_issues}")
    
    print("\n" + "="*60)
    print("TEST 3: GOOD CODE")
    print("="*60)
    result3 = analyzer.analyze_code(good_code, 'python')
    print(f"Structure: {result3.structure}")
    print(f"Issues: {result3.issues}")
    print(f"Security: {result3.security_concerns}")
    print(f"Performance: {result3.performance_issues}")

if __name__ == "__main__":
    test_analyzer()
