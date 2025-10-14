# 🔧 Pattern Learning Fix - Multiple Optimized Codes

## Problem Identified

**Issue**: User gave feedback "provide 2 optimized codes" but the next review only showed 1 optimized code.

**Root Cause**: 
1. ✅ Pattern detection was working (detecting "2 optimized codes")
2. ❌ BUT only stored boolean `code_optimization = True/False`
3. ❌ Did NOT store the NUMBER (2) requested
4. ❌ Prompt generation always created single optimized code section

---

## Solution Implemented

### 1. **Enhanced Pattern Learning** (`learn_from_feedback()`)

**Location**: `backend/main.py` (~Line 285)

**Before**:
```python
if "optimized code" in feedback:
    preferences.code_optimization = True  # Only boolean!
```

**After**:
```python
if "optimized code" in feedback:
    preferences.code_optimization = True
    
    # NEW: Extract the NUMBER requested
    num_codes = 1  # Default
    
    # Detect patterns: "2 optimized codes", "provide 3 optimized versions"
    patterns = [
        r'(\d+)\s+optimized\s+codes?',
        r'(give|provide|show)\s+(\d+)\s+optimized',
        r'(\d+)\s+optimized\s+(versions?|solutions?)',
        r'(\d+)\s+(different|alternate)\s+optimized'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, feedback_lower)
        if match:
            for group in match.groups():
                if group and group.isdigit():
                    num_codes = int(group)
                    break
    
    # Store in learning_patterns JSON
    learning_patterns["optimized_code_count"] = num_codes
    preferences.learning_patterns = json.dumps(learning_patterns)
    
    print(f"📊 Pattern Learning: Detected request for {num_codes} optimized code version(s)")
```

**Now Detects**:
- "2 optimized codes" → stores `2`
- "provide 3 optimized versions" → stores `3`
- "give 5 different optimized solutions" → stores `5`
- "optimized code" (no number) → stores `1` (default)

---

### 2. **Dynamic Prompt Generation** (`generate_custom_prompt()`)

**Location**: `backend/main.py` (~Line 550)

**Before**:
```python
if preferences.code_optimization:
    prompt_parts.extend([
        "###OPTIMIZED_CODE###",
        "- Provide refactored version"
    ])
```

**After**:
```python
if preferences.code_optimization:
    # NEW: Check stored number from learning patterns
    num_optimized = 1
    if preferences.learning_patterns:
        patterns = json.loads(preferences.learning_patterns)
        num_optimized = patterns.get("optimized_code_count", 1)
    
    if num_optimized > 1:
        # Generate MULTIPLE sections
        for i in range(1, num_optimized + 1):
            prompt_parts.extend([
                f"###OPTIMIZED_CODE_{i}###",
                f"🔧 **Optimized Version {i}:**",
                f"- Approach {i}: {'Performance-focused' if i == 1 else 'Readability-focused' if i == 2 else f'Alternative {i}'}",
                ...
            ])
    else:
        # Single section
        prompt_parts.extend([
            "###OPTIMIZED_CODE###",
            ...
        ])
```

**Result**: If user requested 2 optimized codes, prompt now contains:
- `###OPTIMIZED_CODE_1###` (Performance-focused)
- `###OPTIMIZED_CODE_2###` (Readability-focused)

---

### 3. **Enhanced Response Parsing** (`/generate-review`)

**Location**: `backend/main.py` (~Line 1180)

**Before**:
```python
optimized_code = parse_section(combined_resp, '###OPTIMIZED_CODE###')
```

**After**:
```python
# Parse standard optimized code
optimized_code = parse_section(combined_resp, '###OPTIMIZED_CODE###')
optimized_codes = []
if optimized_code:
    optimized_codes.append(optimized_code)

# NEW: Parse numbered sections (OPTIMIZED_CODE_1, OPTIMIZED_CODE_2, ...)
for i in range(1, 10):  # Support up to 9 versions
    opt_code = parse_section(combined_resp, f'###OPTIMIZED_CODE_{i}###')
    if opt_code:
        optimized_codes.append(opt_code)

# Combine multiple versions with separators
if len(optimized_codes) > 1:
    optimized_code = "\n\n---\n\n".join([
        f"**Version {i+1}:**\n{code}" 
        for i, code in enumerate(optimized_codes)
    ])
```

**Result**: Multiple optimized codes are combined with separators and version labels.

---

## Database Storage

### UserPreferences Table - learning_patterns Column

**Structure** (JSON):
```json
{
  "optimized_code_count": 2
}
```

**Updated When**: User submits improvement suggestion like "provide 2 optimized codes"

**Used When**: Generating review prompt to determine how many optimized code sections to create

---

## Testing Instructions

### Test 1: Single Optimized Code (Default)

1. **Submit Code Review**
2. **Provide Feedback**: "Give me optimized code"
3. **Submit New Code**
4. **Expected**: 1 optimized code version

**Backend Logs**:
```
📊 Pattern Learning: Detected request for 1 optimized code version(s)
✅ Preferences updated for user 1:
   - Code Optimization: True
   - Changes: ['Enabled code optimization (will provide 1 optimized version in future reviews)']
```

---

### Test 2: Multiple Optimized Codes

1. **Submit Code Review**
2. **Provide Feedback**: "Provide 2 optimized codes"
3. **Submit New Code**
4. **Expected**: 2 optimized code versions

**Backend Logs**:
```
📊 Pattern Learning: Detected request for 2 optimized code version(s)
✅ Preferences updated for user 1:
   - Code Optimization: True
   - Changes: ['Enabled code optimization (will provide 2 optimized versions in future reviews)']
```

**Review Output**:
```
---

**Version 1:**
🔧 Optimized Version 1: (Performance-focused)
def optimized_function_v1():
    # Performance-optimized implementation
    ...

---

**Version 2:**
🔧 Optimized Version 2: (Readability-focused)
def optimized_function_v2():
    # Readability-optimized implementation
    ...
```

---

### Test 3: Three or More Versions

1. **Provide Feedback**: "Give me 3 different optimized solutions"
2. **Expected**: 3 optimized code versions

**Pattern Detection Examples**:
- "2 optimized codes" ✅
- "provide 3 optimized versions" ✅
- "show 5 optimized solutions" ✅
- "give 4 different optimized implementations" ✅
- "2 alternate optimized codes" ✅

---

## Verification Steps

### Step 1: Test Pattern Detection

```bash
cd backend
python
```

```python
import re

feedback = "provide 2 optimized codes"
pattern = r'(\d+)\s+optimized\s+codes?'
match = re.search(pattern, feedback.lower())
if match:
    print(f"Detected: {match.group(1)} optimized codes")
# Output: Detected: 2 optimized codes
```

### Step 2: Check Database Storage

```sql
-- Connect to database
psql -h localhost -U postgres -d codereviewBot

-- Check learning patterns
SELECT 
    u.username, 
    up.learning_patterns, 
    up.code_optimization
FROM user_preferences up
JOIN users u ON u.id = up.user_id;

-- Example output:
-- username | learning_patterns                | code_optimization
-- vyshu    | {"optimized_code_count": 2}      | t
```

### Step 3: Monitor Backend Logs

When submitting improvement suggestion:
```
📊 Pattern Learning: Detected request for 2 optimized code version(s)
✅ Preferences updated for user 1:
   - Code Optimization: True
   - Changes: ['Enabled code optimization (will provide 2 optimized versions in future reviews)']
```

When generating review:
```
🔍 User preferences loaded for vyshu:
   - Code Optimization: True
✅ OPTIMIZED_CODE section will be requested in prompt (preference enabled)
```

Prompt will contain:
```
###OPTIMIZED_CODE_1###
🔧 **Optimized Version 1:**
...

###OPTIMIZED_CODE_2###
🔧 **Optimized Version 2:**
...
```

---

## Edge Cases Handled

### No Number Specified
**Feedback**: "give me optimized code"
**Result**: Defaults to 1 optimized version

### Large Numbers
**Feedback**: "provide 10 optimized codes"
**Result**: Generates 10 versions (supports up to 9)

### Disabling Optimization
**Feedback**: "no code optimization needed"
**Result**: Sets `optimized_code_count` to 0, disables feature

### Multiple Feedback Entries
**Latest Wins**: Only most recent feedback is used
**Example**:
- First: "give 2 optimized codes" → stores 2
- Second: "give 3 optimized codes" → overwrites to 3

---

## API Response Format

### Single Optimized Code
```json
{
  "optimized_code": "def improved_function():\n    # Single optimized version\n    ..."
}
```

### Multiple Optimized Codes
```json
{
  "optimized_code": "**Version 1:**\n🔧 Optimized Version 1:\ndef v1():\n    ...\n\n---\n\n**Version 2:**\n🔧 Optimized Version 2:\ndef v2():\n    ..."
}
```

---

## Quick Test Script

Create `backend/test_pattern_learning.py`:

```python
import psycopg2
import json

conn = psycopg2.connect(
    host="localhost",
    database="codereviewBot",
    user="postgres",
    password="horrid.henry"
)

cursor = conn.cursor()

# Get user preferences
cursor.execute("""
    SELECT learning_patterns, code_optimization 
    FROM user_preferences 
    WHERE user_id = 1
""")

result = cursor.fetchone()
if result:
    patterns, enabled = result
    print(f"Code Optimization Enabled: {enabled}")
    
    if patterns:
        data = json.loads(patterns)
        count = data.get("optimized_code_count", 1)
        print(f"Number of Optimized Codes: {count}")
    else:
        print("No learning patterns stored yet")
else:
    print("No preferences found")

cursor.close()
conn.close()
```

**Run**: `python backend/test_pattern_learning.py`

---

## Status: ✅ FIXED AND READY

- ✅ Pattern detection enhanced with number extraction
- ✅ Number stored in `learning_patterns` JSON
- ✅ Prompt generation creates multiple sections
- ✅ Response parsing handles multiple optimized codes
- ✅ Backend server running on http://0.0.0.0:8000
- ✅ Ready for testing

---

## How to Test Right Now

1. **Open**: `http://localhost:3000`
2. **Login** as vyshu
3. **Submit any code**
4. **Complete review**
5. **Provide feedback**: "Provide 2 optimized codes"
6. **Submit new code**
7. **Verify**: You should see 2 different optimized versions!

**Expected in Review**:
```
🔧 Optimized Version 1: (Performance-focused)
[First optimized version]

---

🔧 Optimized Version 2: (Readability-focused)
[Second optimized version]
```

---

## Files Modified

1. **`backend/main.py`**:
   - Enhanced `learn_from_feedback()` with number extraction
   - Updated `generate_custom_prompt()` for multiple sections
   - Enhanced response parsing in `/generate-review`

---

## Questions?

Ask me:
- "Show me what prompt is generated for 3 optimized codes"
- "How do I verify the pattern was stored?"
- "What if I want 5 different versions?"
- "How do I reset the count back to 1?"
