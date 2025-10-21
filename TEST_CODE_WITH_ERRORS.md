# Test Code with Multiple Issues - Python

## Copy and paste this code into your bot:

```python
def calculate_area(radius, width, height, depth, color, size, type, format)
    # Missing colon above - SYNTAX ERROR
    
    unused_variable = 100  # SEMANTIC: Unused variable
    another_unused = "test"  # SEMANTIC: Another unused variable
    
    # SEMANTIC: Using eval() - SECURITY RISK
    result = eval("radius * 3.14159")
    
    # SEMANTIC: Variable naming not following convention
    MyBadVariable = 50
    
    # SEMANTIC: Too nested - readability issue
    for i in range(10):
        for j in range(10):
            for k in range(10):
                print(i * j * k)
    
    return result

# Missing function definition here
def incomplete_func(
    # SYNTAX ERROR: Incomplete function

# SEMANTIC: No error handling
def risky_operation():
    file = open("data.txt")
    data = file.read()
    return data

# SEMANTIC: Function too long (more than 50 lines)
def very_long_function():
    line1 = 1
    line2 = 2
    line3 = 3
    line4 = 4
    line5 = 5
    line6 = 6
    line7 = 7
    line8 = 8
    line9 = 9
    line10 = 10
    line11 = 11
    line12 = 12
    line13 = 13
    line14 = 14
    line15 = 15
    line16 = 16
    line17 = 17
    line18 = 18
    line19 = 19
    line20 = 20
    line21 = 21
    line22 = 22
    line23 = 23
    line24 = 24
    line25 = 25
    line26 = 26
    line27 = 27
    line28 = 28
    line29 = 29
    line30 = 30
    line31 = 31
    line32 = 32
    line33 = 33
    line34 = 34
    line35 = 35
    line36 = 36
    line37 = 37
    line38 = 38
    line39 = 39
    line40 = 40
    line41 = 41
    line42 = 42
    line43 = 43
    line44 = 44
    line45 = 45
    line46 = 46
    line47 = 47
    line48 = 48
    line49 = 49
    line50 = 50
    line51 = 51
    line52 = 52
    return line52
```

---

# Test Code with Multiple Issues - JavaScript

## Copy and paste this code into your bot:

```javascript
function processUserData(username, password, email, address, phone, age, gender, country {
    // SYNTAX ERROR: Missing closing parenthesis above
    
    var oldStyle = "bad";  // SEMANTIC: Using var instead of let/const
    
    unused_var = 100;  // SEMANTIC: Unused variable
    
    // SECURITY: Using eval()
    const result = eval("2 + 2");
    
    // SECURITY: Using innerHTML (XSS risk)
    document.getElementById("output").innerHTML = username;
    
    // SEMANTIC: Loose equality
    if (age == "25") {
        console.log("Age matches");  // SEMANTIC: console.log in production
    }
    
    // SEMANTIC: No error handling for async
    fetch("https://api.example.com/data")
        .then(response => response.json())
        .then(data => console.log(data));
    
    // PERFORMANCE: DOM manipulation in loop
    for (let i = 0; i < 100; i++) {
        document.getElementById("list").innerHTML += "<li>" + i + "</li>";
    }
    
    // SEMANTIC: Missing 'use strict'
    
    return result
    // SEMANTIC: Missing semicolon above

function incompleteFunction(
    // SYNTAX ERROR: Incomplete function declaration
```

---

# Expected Errors to be Detected:

## Python Code:
**Syntax Errors:**
- Line 1: Missing colon after function definition
- Line 28: Incomplete function declaration

**Semantic Errors:**
- Line 4: Potentially unused variable: unused_variable
- Line 5: Potentially unused variable: another_unused
- Line 1: Function has too many parameters (8)
- Line 8: Variable naming: MyBadVariable should use snake_case
- Line 49: Function very_long_function is too long (>50 lines)
- Missing docstrings

**Security Concerns:**
- Line 7: Dangerous function 'eval' used

**Performance Issues:**
- Line 11-14: Deeply nested loops detected (depth: 3)

---

## JavaScript Code:
**Syntax Errors:**
- Line 1: Unmatched parentheses - missing ')' before '{'
- Line 31: Incomplete function declaration

**Semantic Errors:**
- Line 4: Consider using 'let' or 'const' instead of 'var'
- Line 6: Potentially unused variables: unused_var
- Line 15: Consider using strict equality (===) instead of (==)
- Line 16: Remove console.log statements
- Line 20: Missing error handling for async operations
- Line 28: Missing semicolon
- Missing 'use strict' at top

**Security Concerns:**
- Line 9: Use of eval() is dangerous
- Line 12: Using innerHTML can lead to XSS vulnerabilities

**Performance Issues:**
- Line 23: Modifying innerHTML inside loops causes performance issues

---

# How to Test:

1. **Start your backend and frontend**
2. **Copy the Python code** and submit it to your bot
3. **Check the review** - you should see:
   - 📝 Syntax Errors section with detected syntax issues
   - 🧠 Semantic Errors section with code quality issues
4. **Copy the JavaScript code** and submit it
5. **Verify** both sections show the detected errors

The bot should now detect and display all these issues! ✨
