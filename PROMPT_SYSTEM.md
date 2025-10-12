# 🤖 Advanced Code Review System - Prompt Architecture

## Overview
The system uses a **dynamic, preference-driven prompt generation** that adapts to user needs, combining professional-grade analysis with beginner-friendly explanations.

---

## 🎯 Key Features

### 1. **Two Review Modes**

#### 🌟 Simple Mode (Default)
- Beginner-friendly language
- Concise explanations (2-3 sentences)
- Emoji-based severity indicators
- Quick assessment focus

**When Used:**
- `detailed_explanations = False` (default)
- New users or quick reviews

**Output Format:**
```
🔍 General Review:
- Simple assessment with ✅ ⚠️ ❌ emojis
- 2-3 sentences

🚨 Issues Found:
• 🟢 LOW: Minor issues
• 🟡 MEDIUM: Important fixes
• 🟠 HIGH: Serious problems
• 🔴 CRITICAL: Breaking issues
```

#### 🔬 Detailed Mode (Professional)
- Comprehensive multi-level analysis
- Technical depth across 7+ dimensions
- Specific recommendations with impact analysis
- Quality scoring (X/10)

**When Used:**
- `detailed_explanations = True`
- Experienced developers
- Production code reviews

**Output Format:**
```
📋 Code Quality Summary:
- Overall assessment
- Quality score: X/10

🔍 Key Findings by Category:
For each issue:
  • Category (Syntax/Logic/Architecture/Performance/Security)
  • Severity: 🟢 LOW | 🟡 MEDIUM | 🟠 HIGH | 🔴 CRITICAL
  • Location: file/function/line
  • Description: clear explanation
  • Recommendation: specific fix

🛡️ Security Analysis:
- Detailed security concerns
- Injection risks, secrets, authentication

⚡ Performance Issues:
- Inefficient operations
- Memory concerns
- Blocking code

🏗️ Architecture & Design:
- Design pattern violations
- SOLID principles
- Modularity issues

🎯 Top 3 Improvement Priorities

📊 Overall Assessment:
- Maintainability score
- Architecture quality paragraph
```

---

## 📊 Analysis Dimensions

### Both Modes Cover:

1. **Syntax & Language Rules**
   - Syntax errors, deprecated APIs, formatting

2. **Logic & Semantics**
   - Logical errors, edge cases, control flow

3. **Issues with Severity Levels**
   - 🟢 LOW: Style, comments
   - 🟡 MEDIUM: Error handling, validation  
   - 🟠 HIGH: Logic errors, security gaps
   - 🔴 CRITICAL: Crashes, data loss risks

### Detailed Mode Adds:

4. **Architecture & Design**
   - SOLID principles (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)
   - Design patterns (Factory, Singleton, Repository, Observer, etc.)
   - Modularity, coupling, cohesion

5. **Performance & Efficiency**
   - Inefficient loops, unnecessary computations
   - Memory leaks, resource management
   - Blocking I/O, missing caching

6. **Security & Compliance**
   - Hardcoded secrets/credentials
   - Injection vulnerabilities (SQL, command, XSS)
   - Weak cryptography
   - Missing authentication/authorization

7. **Maintainability & Scalability**
   - Cyclomatic complexity
   - Technical debt
   - Refactoring opportunities
   - Configuration management

8. **Testing & Quality**
   - Missing test coverage
   - Untested critical paths
   - Test quality issues

9. **Documentation & Standards**
   - Missing docstrings/comments
   - Code standard violations (PEP8, ESLint, etc.)

10. **DevOps & Configuration**
    - Environment configuration issues
    - Missing logging/monitoring
    - CI/CD improvements

---

## 🎛️ User Preferences

### Toggleable Sections:

| Preference | Effect | Trigger Words |
|------------|--------|---------------|
| **code_optimization** | Include/skip optimized code section | "give optimized code", "skip optimization" |
| **security_analysis** | Deep/skip security checks | "focus on security", "skip security" |
| **detailed_explanations** | Detailed/simple mode | "detailed explanation", "brief explanation" |
| **best_practices** | Include/skip best practices | "include best practices", "no best practices" |
| **ast_analysis** | Use AST parsing | "with ast", "skip ast" |
| **performance_analysis** | Performance focus | "focus on performance", "skip performance" |

### Setting Preferences:
```javascript
// In UI: Click + → Preferences → Type:
"give 2 optimized codes"          // Enables code_optimization
"detailed explanation"             // Enables detailed mode
"focus on security and performance" // Enables both
```

---

## 📝 Output Structure

All reviews use **section markers** for parsing:

```
###REVIEW###
[Main analysis content]

###OPTIMIZED_CODE###    (if code_optimization = true)
[Improved code with comments]

###EXPLANATION###
[What the code does]

###RECOMMENDATIONS###    (detailed mode only)
[Top 3 priorities + overall assessment]
```

---

## 🔄 Workflow

1. **User sets preferences** via Preferences modal
2. **Backend loads preferences** from database
3. **Prompt is dynamically generated** based on:
   - Review mode (simple vs detailed)
   - Enabled features (optimization, security, etc.)
   - Repository vs single-file context
4. **AI generates structured response** with section markers
5. **Backend parses sections** using regex
6. **Frontend displays** in ReviewCard component

---

## 🚀 Usage Examples

### Example 1: Quick Review (Simple Mode)
```python
# User preferences:
detailed_explanations = False
code_optimization = True

# Result: Short, emoji-rich review with optimized code
```

### Example 2: Production Review (Detailed Mode)
```python
# User preferences:  
detailed_explanations = True
security_analysis = True
best_practices = True

# Result: Comprehensive analysis with:
# - Security deep-dive
# - Architecture assessment
# - Performance issues
# - Top 3 priorities
# - Quality score
```

### Example 3: Learning Mode
```python
# User preferences:
detailed_explanations = False
code_optimization = True
best_practices = True

# Result: Beginner-friendly with:
# - Simple explanations
# - Best practice tips
# - Improved code examples
```

---

## 🔧 Technical Implementation

### Prompt Generation Function:
```python
def generate_custom_prompt(
    preferences: UserPreferences, 
    is_repository_review: bool = False, 
    detailed_mode: bool = False
) -> str:
    # Dynamically builds prompt based on preferences
    # Returns structured template with section markers
```

### Key Components:
1. **Mode Detection:** Uses `detailed_explanations` preference
2. **Section Building:** Conditionally adds analysis dimensions
3. **Context Awareness:** Adjusts for repository vs single-file
4. **Marker System:** Uses `###SECTION###` for reliable parsing

---

## 📈 Benefits

✅ **Adaptive:** Matches user skill level
✅ **Comprehensive:** Covers 10+ analysis dimensions
✅ **Actionable:** Specific recommendations with priority
✅ **Parseable:** Structured output for UI display
✅ **Scalable:** Works for single files and entire repos
✅ **Learnable:** System improves via feedback patterns

---

## 🎓 Comparison to Original Prompt

| Aspect | Original Prompt | New System |
|--------|----------------|------------|
| **Format** | JSON output | Section markers |
| **Modes** | One-size-fits-all | Simple + Detailed |
| **Parsing** | JSON parsing | Regex section extraction |
| **User Control** | None | 6 preference toggles |
| **Brevity** | Fixed | Adaptive (brief/verbose) |
| **Integration** | ❌ Incompatible | ✅ Fully integrated |

---

## 🔮 Future Enhancements

- [ ] Custom severity thresholds per user
- [ ] Industry-specific analysis (finance, healthcare, etc.)
- [ ] Language-specific deep dives (Python: PEP compliance, JS: React patterns)
- [ ] AI learning from accepted/rejected reviews
- [ ] Team-wide preference templates
- [ ] Export reports (PDF, Markdown)

---

*Generated: October 2025 | CRVKN Code Review Bot*
