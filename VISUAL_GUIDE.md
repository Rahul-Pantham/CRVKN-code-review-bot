# Visual Guide: Syntax & Semantic Error Sections

## What You'll See in the Frontend

### Before User Interaction
```
┌─────────────────────────────────────────────────────┐
│ 📝 Syntax Errors                                    │
│ ─────────────────────────────────────────────────── │
│ Syntax Error: invalid syntax (line 2)              │
│   - Missing colon after function definition         │
│                                                      │
│ [✓ Accept]  [✗ Reject]                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🧠 Semantic Errors                                  │
│ ─────────────────────────────────────────────────── │
│ - Potentially unused variables: unused_variable     │
│ - Function 'complex_function' has too many          │
│   parameters (8)                                    │
│                                                      │
│ [✓ Accept]  [✗ Reject]                             │
└─────────────────────────────────────────────────────┘
```

### After Accepting Syntax Errors
```
┌═════════════════════════════════════════════════════┐
║ 📝 Syntax Errors ✓                                  ║  ← GREEN TITLE
║ ═════════════════════════════════════════════════   ║  ← GREEN BORDER
║ Syntax Error: invalid syntax (line 2)              ║
║   - Missing colon after function definition         ║
║                                                      ║
║ [✓ Accept]  [✗ Reject]                             ║  ← Accept highlighted
└═════════════════════════════════════════════════════┘
```

### After Rejecting Semantic Errors
```
┌═════════════════════════════════════════════════════┐
║ 🧠 Semantic Errors ✗                                ║  ← RED TITLE
║ ═════════════════════════════════════════════════   ║  ← RED BORDER
║ - Potentially unused variables: unused_variable     ║
║ - Function 'complex_function' has too many          ║
║   parameters (8)                                    ║
║                                                      ║
║ [✓ Accept]  [✗ Reject]                             ║  ← Reject highlighted
└═════════════════════════════════════════════════════┘
```

### When No Errors Detected
```
┌─────────────────────────────────────────────────────┐
│ 📝 Syntax Errors                                    │
│ ─────────────────────────────────────────────────── │
│ No syntax errors detected.                          │
│                                                      │
│ [✓ Accept]  [✗ Reject]                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🧠 Semantic Errors                                  │
│ ─────────────────────────────────────────────────── │
│ No semantic errors detected.                        │
│                                                      │
│ [✓ Accept]  [✗ Reject]                             │
└─────────────────────────────────────────────────────┘
```

## Section Order in Review

The sections now appear in this order:
1. 📋 Code Quality (read-only)
2. 🔍 Key Findings (Accept/Reject)
3. 🛡️ Security Analysis (Accept/Reject)
4. ⚡ Performance Analysis (read-only)
5. 🏗️ Architecture & Design (Accept/Reject)
6. 📖 Best Practices (read-only)
7. 💡 Recommendations (Accept/Reject)
8. **📝 Syntax Errors (Accept/Reject)** ← NEW
9. **🧠 Semantic Errors (Accept/Reject)** ← NEW
10. 📄 Original Code (read-only)
11. ✨ Optimized Code (Accept/Reject)
12. 📚 Explanation (read-only)

## Color Coding

- **Yellow Title (📝)**: Syntax Errors section default
- **Orange Title (🧠)**: Semantic Errors section default
- **Green Border + Green Title**: Section accepted
- **Red Border + Red Title**: Section rejected
- **Gray Background**: Read-only sections (no buttons)

## Button States

### Default
```
[✓ Accept]  [✗ Reject]
 Gray BG     Gray BG
```

### After Accepting
```
[✓ Accept]  [✗ Reject]
 Green BG    Gray BG
 Glowing     Normal
```

### After Rejecting
```
[✓ Accept]  [✗ Reject]
 Gray BG     Red BG
 Normal      Glowing
```

## What Gets Saved to Database

When you click Accept or Reject, this data is saved:

```json
{
  "review_id": 123,
  "user_id": 456,
  "syntax_errors_section": "accepted",
  "semantic_errors_section": "rejected",
  "created_at": "2025-10-21T10:30:00",
  "updated_at": "2025-10-21T10:30:00"
}
```

## Testing Tips

1. **Test with Python code:**
   ```python
   # This will trigger syntax error
   def hello()
       print("missing colon")
   
   # This will trigger semantic errors
   unused = 100
   ```

2. **Check the sections appear:**
   - Syntax Errors should show the missing colon
   - Semantic Errors should show unused variable

3. **Test Accept/Reject:**
   - Click Accept on Syntax Errors → border turns green
   - Click Reject on Semantic Errors → border turns red
   - Check browser console for API call confirmation

4. **Verify in Database:**
   ```sql
   SELECT * FROM section_feedback 
   WHERE review_id = YOUR_REVIEW_ID;
   ```

You should see `syntax_errors_section` and `semantic_errors_section` columns populated with your feedback!
