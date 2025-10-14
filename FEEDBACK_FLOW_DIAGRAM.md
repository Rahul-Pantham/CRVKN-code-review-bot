# Feedback Incorporation Flow Diagram

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIRST CODE REVIEW CYCLE                      │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   User       │
    │  Submits     │───────┐
    │   Code       │       │
    └──────────────┘       │
                           ▼
                  ┌─────────────────┐
                  │  Backend API    │
                  │ /generate-review│
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Query Database  │
                  │ for user prefs  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Check for       │
                  │ latest feedback │◄─── improvement_suggestions = NULL
                  └────────┬────────┘     (First time)
                           │
                           ▼
                  ┌─────────────────┐
                  │ Generate Prompt │
                  │ (Standard)      │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Gemini AI      │
                  │  Generates      │
                  │  Review         │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Return Review  │
                  │  to Frontend    │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  User Reviews   │
                  │  Accept/Reject  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  User Provides  │
                  │  Improvement    │
                  │  Suggestions    │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  POST           │
                  │  /submit-       │
                  │  improvement-   │
                  │  suggestion     │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Store in DB:   │
                  │  reviews.       │
                  │  improvement_   │
                  │  suggestions    │─────► "Focus more on security
                  └─────────────────┘       and performance..."


┌─────────────────────────────────────────────────────────────────┐
│                   SUBSEQUENT CODE REVIEW CYCLE                  │
│                   (Feedback Incorporated)                        │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   User       │
    │  Submits     │───────┐
    │  New Code    │       │
    └──────────────┘       │
                           ▼
                  ┌─────────────────┐
                  │  Backend API    │
                  │ /generate-review│
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Query Database  │
                  │ for user prefs  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ get_latest_     │
                  │ improvement_    │
                  │ suggestion()    │◄──────┐
                  └────────┬────────┘       │
                           │                │
                           ▼                │
                  ┌─────────────────┐       │
                  │ SELECT          │       │
                  │ improvement_    │       │
                  │ suggestions     │       │
                  │ FROM reviews    │       │
                  │ WHERE user_id=? │       │
                  │ AND IS NOT NULL │       │
                  │ ORDER BY        │       │
                  │ created_at DESC │       │
                  │ LIMIT 1         │       │
                  └────────┬────────┘       │
                           │                │
                           ▼                │
                  ┌─────────────────┐       │
                  │ Returns:        │       │
                  │ "Focus more on  │       │
                  │ security and    │       │
                  │ performance..." │───────┘
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ generate_custom_│
                  │ prompt()        │
                  │ with feedback   │
                  │ parameter       │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────────────────────────────────┐
                  │ ENHANCED PROMPT:                            │
                  │                                             │
                  │ 📝 IMPORTANT - User Feedback:               │
                  │ "Focus more on security and performance..." │
                  │                                             │
                  │ [Rest of standard prompt...]                │
                  │ - Code Quality                              │
                  │ - Key Findings                              │
                  │ - SECURITY (emphasized per feedback)        │
                  │ - PERFORMANCE (emphasized per feedback)     │
                  │ - Architecture                              │
                  │ - Best Practices                            │
                  │ - Recommendations                           │
                  └────────┬────────────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Gemini AI      │
                  │  Generates      │
                  │  PERSONALIZED   │
                  │  Review         │
                  │  (with focus on │
                  │  security &     │
                  │  performance)   │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Return         │
                  │  Enhanced       │
                  │  Review         │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  User Sees      │
                  │  Review         │
                  │  Aligned with   │
                  │  Their Feedback │
                  └─────────────────┘
```

## Database Flow

```
┌────────────────────────────────────────────────────┐
│              PostgreSQL Database                   │
│                codereviewBot                       │
└────────────────────────────────────────────────────┘

     ┌─────────────────────────────────┐
     │         users table             │
     ├─────────────────────────────────┤
     │ id (PK)      │ username         │
     │ 1            │ vyshu            │
     └──────┬───────────────────────────┘
            │
            │ Foreign Key: user_id
            │
            ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                   reviews table                              │
     ├─────────────────────────────────────────────────────────────┤
     │ id  │user_id│ code │ review │ improvement_suggestions       │
     ├─────────────────────────────────────────────────────────────┤
     │ 183 │   1   │ ... │ ...    │ NULL                          │
     │ 184 │   1   │ ... │ ...    │ NULL                          │
     │ 185 │   1   │ ... │ ...    │ "Focus more on security..."   │◄─┐
     │ 186 │   1   │ ... │ ...    │ NULL                          │  │
     │ 187 │   1   │ ... │ ...    │ "Add more performance tips"   │  │
     └─────────────────────────────────────────────────────────────┘  │
                                                                       │
     Query executed during review generation:                         │
     ┌─────────────────────────────────────────────────────────┐     │
     │ SELECT improvement_suggestions                          │     │
     │ FROM reviews                                            │     │
     │ WHERE user_id = 1                                       │     │
     │   AND improvement_suggestions IS NOT NULL               │     │
     │   AND improvement_suggestions != ''                     │     │
     │ ORDER BY created_at DESC                                │     │
     │ LIMIT 1                                                 │     │
     └─────────────────────────────────────────────────────────┘     │
                            │                                         │
                            └─── Returns: "Add more performance tips" │
                                 (ID 187, most recent)                │
                                                                      │
     This feedback is then injected into the prompt ─────────────────┘
```

## Code Structure

```
backend/main.py
│
├── Line ~365: get_latest_improvement_suggestion()
│   │
│   ├── Input: db session, user_id
│   ├── Query: Latest non-null improvement_suggestions
│   └── Output: feedback text or None
│
├── Line ~390: generate_custom_prompt()
│   │
│   ├── Input: preferences, is_repo, detailed_mode, user_feedback
│   ├── Process: 
│   │   ├── If user_feedback exists:
│   │   │   └── Prepend feedback section to prompt
│   │   ├── Build analysis sections based on preferences
│   │   └── Return complete prompt
│   └── Output: Enhanced prompt string
│
├── Line ~1045: POST /generate-review
│   │
│   ├── 1. Get user preferences
│   ├── 2. Call get_latest_improvement_suggestion()  ← NEW
│   ├── 3. Log feedback retrieval
│   ├── 4. Call generate_custom_prompt() with feedback ← UPDATED
│   ├── 5. Send to Gemini AI
│   └── 6. Return structured review
│
└── Line ~1435: POST /generate-repo-review
    │
    ├── 1. Get user preferences
    ├── 2. Call get_latest_improvement_suggestion()  ← NEW
    ├── 3. Log feedback retrieval
    ├── For each file:
    │   ├── Call generate_custom_prompt() with feedback ← UPDATED
    │   ├── Send to Gemini AI
    │   └── Collect review
    └── Return combined repo review
```

## Prompt Enhancement Example

### WITHOUT Feedback
```
You are an advanced Code Review Engine. Analyze the code across multiple dimensions:

1️⃣ Syntax & Language Rules
2️⃣ Logic & Semantics
3️⃣ Architecture & Design
4️⃣ Performance
5️⃣ Security
...
```

### WITH Feedback
```
📝 **IMPORTANT - User Feedback from Previous Review:**
The user previously provided this feedback to improve future code reviews:
"Focus more on security vulnerabilities and performance optimization. 
I want detailed explanations of any issues found."

Please incorporate this feedback and adjust your review approach accordingly. 
Pay special attention to the points mentioned above.
---

You are an advanced Code Review Engine. Analyze the code across multiple dimensions:

1️⃣ Syntax & Language Rules
2️⃣ Logic & Semantics
3️⃣ Architecture & Design
4️⃣ Performance ◄─── AI will emphasize this
5️⃣ Security ◄───── AI will emphasize this
...
```

## Result: Personalized Review Output

The AI model, seeing the feedback context, will:
- ✅ Provide more detailed security analysis
- ✅ Focus on performance optimization opportunities
- ✅ Give thorough explanations of issues
- ✅ Prioritize these aspects in recommendations
- ✅ Adapt tone and depth to user preferences
