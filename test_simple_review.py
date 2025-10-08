"""
Test script to demonstrate the new simple, kid-friendly review prompts
"""

def test_function():
    x = 5
    y = 10
    if x == y:
        print("equal")
    else:
        print("not equal")
    return x + y

# Test code with potential issues
def bad_function(data):
    result = []
    for i in range(len(data)):
        if data[i] == "target":
            result.append(i)
    return result

# Good code example
def good_function(numbers):
    """Calculate the sum of positive numbers"""
    total = 0
    for num in numbers:
        if num > 0:
            total += num
    return total