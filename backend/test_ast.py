from ast_analyzer import CodeAnalyzer

# Test with sample Python code
test_code = '''
def calculate_average(numbers):
    if len(numbers) == 0:
        return 0
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

class DataProcessor:
    def __init__(self):
        self.data = []
    
    def add_data(self, item):
        self.data.append(item)
    
    def process(self):
        # This is a complex function with multiple branches
        result = []
        for item in self.data:
            if isinstance(item, str):
                if len(item) > 10:
                    result.append(item.upper())
                else:
                    result.append(item.lower())
            elif isinstance(item, int):
                if item > 100:
                    result.append(item * 2)
                elif item > 50:
                    result.append(item * 1.5)
                else:
                    result.append(item)
        return result
'''

analyzer = CodeAnalyzer()
result = analyzer.analyze_code(test_code, 'python')

print('AST Analysis Test Results:')
print(f'Structure: {result.structure}')
print(f'Complexity: {result.complexity}')
print(f'Issues: {result.issues}')
print(f'Security concerns: {result.security_concerns}')
print(f'Performance issues: {result.performance_issues}')
print(f'Best practices: {result.best_practices}')