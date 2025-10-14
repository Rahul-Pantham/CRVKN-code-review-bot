# User Feedback Incorporation Feature

## Overview
This feature automatically incorporates user feedback from previous code reviews into future review prompts, creating a personalized and iterative improvement cycle.

## How It Works

### 1. **Feedback Storage**
When users complete a code review and provide feedback:
- Users can provide improvement suggestions after accepting/rejecting the review
- This feedback is stored in the `improvement_suggestions` column of the `reviews` table
- The column accepts TEXT data and is nullable

### 2. **Feedback Retrieval**
When generating a new code review:
- The system queries the database for the **latest non-null `improvement_suggestions`** from the current user
- Query: `SELECT improvement_suggestions FROM reviews WHERE user_id = ? AND improvement_suggestions IS NOT NULL ORDER BY created_at DESC LIMIT 1`
- Only the most recent feedback is used to keep prompts concise

### 3. **Prompt Enhancement**
The retrieved feedback is automatically incorporated into the AI model prompt:
```
📝 **IMPORTANT - User Feedback from Previous Review:**
The user previously provided this feedback to improve future code reviews:
"{improvement_suggestions}"

Please incorporate this feedback and adjust your review approach accordingly. 
Pay special attention to the points mentioned above.
---
```

### 4. **Review Generation**
The enhanced prompt guides the AI to:
- Consider the user's specific preferences and concerns
- Address areas the user wants more focus on
- Adapt the review style based on previous feedback
- Maintain consistency with user expectations

## Implementation Details

### Database Schema
```sql
-- reviews table
improvement_suggestions TEXT NULL  -- Stores user feedback for future reviews
```

### Key Functions

#### `get_latest_improvement_suggestion(db, user_id: int) -> str`
- **Purpose**: Fetch the most recent non-null improvement suggestion
- **Parameters**: 
  - `db`: SQLAlchemy database session
  - `user_id`: ID of the current user
- **Returns**: Latest improvement suggestion text or None
- **Location**: `backend/main.py`

#### `generate_custom_prompt(preferences, is_repository_review, detailed_mode, user_feedback)`
- **Purpose**: Generate the AI review prompt
- **New Parameter**: `user_feedback` (optional) - Latest user feedback to incorporate
- **Location**: `backend/main.py`

### API Endpoints Modified

#### POST `/generate-review`
1. Fetches user preferences
2. **NEW**: Fetches latest improvement suggestion using `get_latest_improvement_suggestion()`
3. Generates custom prompt with feedback parameter
4. Sends enhanced prompt to AI model
5. Returns structured review response

#### POST `/generate-repo-review`
1. Fetches user preferences
2. **NEW**: Fetches latest improvement suggestion using `get_latest_improvement_suggestion()`
3. For each file in repository:
   - Generates custom prompt with feedback parameter
   - Sends enhanced prompt to AI model
4. Returns combined repository review

#### POST `/submit-improvement-suggestion`
- Stores user feedback in `improvement_suggestions` column
- Feedback is automatically used for next review

## Example User Flow

### Step 1: First Code Review
User submits code:
```python
def calculate_sum(a, b):
    return a + b
```

AI generates standard review based on preferences.

### Step 2: User Provides Feedback
After reviewing, user provides improvement suggestion:
```
"Focus more on security vulnerabilities and performance optimization. 
I want detailed explanations of any issues found."
```

This feedback is stored in `reviews.improvement_suggestions`.

### Step 3: Next Code Review
User submits new code:
```python
def process_user_input(user_data):
    return eval(user_data)
```

**Backend Processing:**
1. System retrieves latest feedback: "Focus more on security vulnerabilities..."
2. Prompt is enhanced with this feedback
3. AI model receives instruction to focus on security and performance
4. Review emphasizes the security issue with `eval()` function

**Enhanced Review Output:**
```
🔍 **CODE_QUALITY**
⚠️ Quality Score: 3/10 - Critical security vulnerability detected

🔍 **KEY_FINDINGS**
🔴 CRITICAL - Security: Using eval() creates code injection vulnerability
  Fix: Use json.loads() or ast.literal_eval() instead

🛡️ **SECURITY** (Enhanced per your feedback)
🔴 CRITICAL: eval() function executes arbitrary code
  - Attack vector: Malicious input can execute system commands
  - Data exposure risk: High
  - Recommendation: NEVER use eval() with user input
  - Secure alternative: ast.literal_eval() or json.loads()

⚡ **PERFORMANCE** (Enhanced per your feedback)
🟡 MEDIUM: eval() has significant performance overhead
  - Parsing and compilation on every call
  - Alternative solutions are 10-100x faster

🎯 **RECOMMENDATIONS**
1. CRITICAL: Replace eval() with ast.literal_eval()
2. Add input validation before processing
3. Implement error handling for malformed input
```

## Benefits

### For Users
- ✅ Personalized reviews that adapt to their needs
- ✅ Consistent focus on areas they care about
- ✅ Progressive improvement of review quality
- ✅ No need to repeat preferences for each submission

### For the System
- ✅ Automatic learning from user preferences
- ✅ Improved user satisfaction
- ✅ Reduced need for manual configuration
- ✅ Better alignment with user expectations

## Testing the Feature

### 1. Check for Existing Feedback
```bash
python backend/test_feedback_flow.py
```

### 2. Submit Code with Feedback
1. Navigate to the application: `http://localhost:3000`
2. Submit any code for review
3. Complete the review process
4. Provide improvement suggestions (e.g., "Focus more on security")
5. Submit the feedback

### 3. Verify Feedback Incorporation
1. Submit new code for review
2. Check backend logs for:
   ```
   📝 Incorporating user feedback into review prompt: 'Focus more on security...'
   ```
3. Review the generated output - it should reflect your feedback

### 4. Database Verification
```sql
-- Check stored feedback
SELECT id, improvement_suggestions, created_at 
FROM reviews 
WHERE improvement_suggestions IS NOT NULL 
ORDER BY created_at DESC;

-- Check latest feedback for a specific user
SELECT improvement_suggestions 
FROM reviews 
WHERE user_id = 1 
AND improvement_suggestions IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```

## Console Output

When feedback is found and used:
```
✅ Found latest improvement suggestion for user 1: 'Focus more on security vulnerabilities and performance...'
📝 Incorporating user feedback into review prompt: 'Focus more on security vulnerabilities and...'
```

When no feedback exists:
```
ℹ️ No improvement suggestions found for user 1
ℹ️ No previous feedback to incorporate
```

## Configuration

No configuration needed! The feature works automatically:
- ✅ Enabled by default for all users
- ✅ Applies to both single file and repository reviews
- ✅ Uses the latest feedback only (not cumulative)
- ✅ Gracefully handles cases with no feedback

## Error Handling

The system gracefully handles:
- ❌ No feedback available → Proceeds with standard prompt
- ❌ Database connection issues → Logs warning, continues without feedback
- ❌ Null/empty feedback → Treated as no feedback available

## Future Enhancements

Potential improvements:
1. **Feedback History**: Allow users to view past feedback they've provided
2. **Feedback Weighting**: Give more weight to recent feedback
3. **Category-Specific Feedback**: Store feedback per review category (security, performance, etc.)
4. **Feedback Analytics**: Show users how their feedback improved reviews
5. **Feedback Templates**: Suggest common feedback patterns

## Technical Notes

### Performance Impact
- **Minimal**: Single indexed database query per review
- **Query Time**: ~1-5ms for indexed user_id lookup
- **Memory**: Negligible (single text field)

### Security Considerations
- ✅ User feedback is only visible to that user
- ✅ No cross-user feedback contamination
- ✅ SQL injection protected (parameterized queries)
- ✅ Input sanitization applied

### Scalability
- ✅ Indexed queries scale to millions of reviews
- ✅ Only latest feedback retrieved (not full history)
- ✅ Minimal impact on prompt token count

## Troubleshooting

### Issue: Feedback not being used
**Solution**: 
1. Check if `improvement_suggestions` column exists:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'reviews' 
   AND column_name = 'improvement_suggestions';
   ```
2. Verify feedback is stored:
   ```sql
   SELECT id, improvement_suggestions FROM reviews 
   WHERE improvement_suggestions IS NOT NULL;
   ```
3. Check backend logs for "Incorporating user feedback" message

### Issue: Old feedback being used
**Solution**: The system uses the latest feedback by `created_at DESC`. 
Submit new feedback to override old suggestions.

### Issue: Feedback too long
**Solution**: Frontend should limit improvement_suggestions to ~500 characters to avoid token limits.

## Code Location

All modifications in: `backend/main.py`
- Line ~365: `get_latest_improvement_suggestion()` function
- Line ~390: `generate_custom_prompt()` enhanced with `user_feedback` parameter
- Line ~1045: `/generate-review` endpoint - feedback retrieval
- Line ~1435: `/generate-repo-review` endpoint - feedback retrieval

## Questions or Issues?

If you have questions about this feature:
1. Check backend logs for feedback incorporation messages
2. Verify database connection and column existence
3. Test with the provided `test_feedback_flow.py` script
4. Review this documentation for configuration details
