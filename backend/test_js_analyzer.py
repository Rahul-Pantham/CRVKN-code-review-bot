"""
Test JavaScript error detection
"""
import sys
sys.path.append('.')

from ast_analyzer import CodeAnalyzer

# The code from the screenshot
js_code = """
function calculateArea(radius {
  const pi = 3.14159;
  const area = pi * radius * radius;
  
  // Return the area
  return area;
}

// Example usage
const radius = prompt("Enter the radius:");
const result = calculateArea(radius);
console.log("The area is: " + result);
"""

analyzer = CodeAnalyzer()
result = analyzer.analyze_code(js_code, 'javascript')

print("="*60)
print("JAVASCRIPT CODE ANALYSIS")
print("="*60)
print(f"\nLanguage: {result.language}")
print(f"\nStructure: {result.structure}")
print(f"\nIssues ({len(result.issues)}):")
for issue in result.issues:
    print(f"  • {issue}")

print(f"\nSecurity Concerns ({len(result.security_concerns)}):")
for concern in result.security_concerns:
    print(f"  • {concern}")

print(f"\nPerformance Issues ({len(result.performance_issues)}):")
for perf in result.performance_issues:
    print(f"  • {perf}")

print(f"\nBest Practices ({len(result.best_practices)}):")
for bp in result.best_practices:
    print(f"  • {bp}")
