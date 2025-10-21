"""
Quick test to verify error detection is working
"""
import sys
sys.path.append('.')

from ast_analyzer import CodeAnalyzer

# Python code with obvious errors
python_code_with_errors = """
def calculate_area(radius)
    unused = 100
    result = eval("3.14 * radius")
    return result
"""

# Good Python code
python_code_good = """
def calculate_area(radius):
    pi = 3.14159
    return pi * radius * radius
"""

print("="*70)
print("TEST 1: Python code WITH ERRORS")
print("="*70)
analyzer = CodeAnalyzer()
result1 = analyzer.analyze_code(python_code_with_errors, 'python')
print(f"Language: {result1.language}")
print(f"\nStructure: {result1.structure}")
print(f"\nIssues found: {len(result1.issues)}")
for issue in result1.issues:
    print(f"  • {issue}")
print(f"\nSecurity concerns: {len(result1.security_concerns)}")
for concern in result1.security_concerns:
    print(f"  • {concern}")

print("\n" + "="*70)
print("TEST 2: Python code WITHOUT ERRORS")
print("="*70)
result2 = analyzer.analyze_code(python_code_good, 'python')
print(f"Language: {result2.language}")
print(f"\nIssues found: {len(result2.issues)}")
if result2.issues:
    for issue in result2.issues:
        print(f"  • {issue}")
else:
    print("  ✅ No issues found (as expected)")
