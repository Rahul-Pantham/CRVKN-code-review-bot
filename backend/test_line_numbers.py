"""
Test script to verify that line numbers are included in error detection
"""

from ast_analyzer import CodeAnalyzer

# Test code with errors
test_code_python = """
def calculate_sum(a, b):
    result = a + b
    print(result
    return result

x = 10
y = 20
z = calculate_sum(x, y)
"""

test_code_javascript = """
function calculateSum(a, b) {
    let result = a + b
    console.log(result
    return result;
}

const x = 10;
const y = 20;
const z = calculateSum(x, y);
"""

def test_python_errors():
    print("=" * 60)
    print("Testing Python Error Detection with Line Numbers")
    print("=" * 60)
    
    analyzer = CodeAnalyzer()
    result = analyzer.analyze_code(test_code_python, 'python')
    
    print(f"\nLanguage: {result.language}")
    print(f"\nSyntax Errors Found: {len(result.issues)}")
    for issue in result.issues:
        print(f"  - {issue}")
    
    print(f"\nSemantic/Logic Issues: {len(result.security_concerns) + len(result.performance_issues)}")
    for issue in result.security_concerns:
        print(f"  - {issue}")
    for issue in result.performance_issues:
        print(f"  - {issue}")
    
    print("\n")

def test_javascript_errors():
    print("=" * 60)
    print("Testing JavaScript Error Detection with Line Numbers")
    print("=" * 60)
    
    analyzer = CodeAnalyzer()
    result = analyzer.analyze_code(test_code_javascript, 'javascript')
    
    print(f"\nLanguage: {result.language}")
    print(f"\nSyntax/Semantic Errors Found: {len(result.issues)}")
    for issue in result.issues:
        print(f"  - {issue}")
    
    print(f"\nSecurity Concerns: {len(result.security_concerns)}")
    for issue in result.security_concerns:
        print(f"  - {issue}")
    
    print(f"\nPerformance Issues: {len(result.performance_issues)}")
    for issue in result.performance_issues:
        print(f"  - {issue}")
    
    print("\n")

if __name__ == "__main__":
    test_python_errors()
    test_javascript_errors()
    
    print("=" * 60)
    print("✅ Line number detection test completed!")
    print("=" * 60)
