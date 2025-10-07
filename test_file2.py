class Calculator:
    """A simple calculator class"""
    
    def __init__(self):
        self.result = 0
    
    def add(self, x, y):
        """Add two numbers"""
        return x + y
    
    def subtract(self, x, y):
        """Subtract y from x"""
        return x - y
    
    def multiply(self, x, y):
        """Multiply two numbers"""
        return x * y
    
    def divide(self, x, y):
        """Divide x by y"""
        if y == 0:
            raise ValueError("Cannot divide by zero")
        return x / y

# Example usage
calc = Calculator()
print(calc.add(5, 3))
print(calc.multiply(4, 6))