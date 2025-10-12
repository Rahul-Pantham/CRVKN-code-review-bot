# Updated prompt generation function with separate sections for better UX

def generate_custom_prompt_v2(preferences, is_repository_review=False, detailed_mode=False):
    """Generate a comprehensive code review prompt with SEPARATE sections for accept/reject buttons"""
    
    if detailed_mode or preferences.detailed_explanations:
        # Professional mode
        analysis_depth = """You are an advanced Code Review Engine. Analyze code across multiple dimensions:
1️⃣ Syntax & Language Rules  2️⃣ Logic & Semantics  3️⃣ Architecture & Design
4️⃣ Performance  5️⃣ Security  6️⃣ Best Practices  7️⃣ Maintainability"""
    else:
        analysis_depth = "You are an advanced Code Review Engine that provides clear, structured feedback."
    
    # Build structured output with SEPARATE sections
    prompt_parts = [
        analysis_depth,
        "",
        "Analyze this code and return SEPARATE sections with exact markers:",
        "",
        "###REVIEW###",
        "📋 **Code Quality Overview:**",
        "- Overall assessment in 2-3 sentences (max 60 words)",
        "- Quality score: X/10",
        "- Use emojis: ✅ ⚠️ ❌",
        "",
        "###ISSUES###",
        "🚨 **Issues Found:**",
        "List each issue with:",
        "  • Severity: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW",
        "  • Category: Syntax/Logic/Architecture/Performance/Security",
        "  • Brief description + specific fix",
        "Group by severity. If no issues: 'No critical issues ✅'",
        "Keep under 150 words total.",
        "",
    ]
    
    # Security as SEPARATE section
    if preferences.security_analysis:
        prompt_parts.extend([
            "###SECURITY###",
            "🛡️ **Security Analysis:**",
            "- Check: secrets, injection risks, validation, auth gaps, data exposure",
            "- List findings with severity OR 'No security concerns ✅'",
            "- Max 100 words",
            "",
        ])
    
    # Performance as SEPARATE section
    if preferences.performance_analysis:
        prompt_parts.extend([
            "###PERFORMANCE###",
            "⚡ **Performance Analysis:**",
            "- Inefficient operations, memory issues, blocking code",
            "- Optimization opportunities",
            "- Max 80 words OR 'Performance looks good ✅'",
            "",
        ])
    
    # Architecture SEPARATE (detailed mode)
    if detailed_mode:
        prompt_parts.extend([
            "###ARCHITECTURE###",
            "🏗️ **Architecture & Design:**",
            "- Design patterns, SOLID principles, modularity, scalability",
            "- Max 100 words",
            "",
        ])
    
    # Optimized code SEPARATE
    if preferences.code_optimization:
        prompt_parts.extend([
            "###OPTIMIZED_CODE###",
            "✨ **Refactored Version:**",
            "- Improved code with inline comments",
            "- Same functionality, better implementation",
            ""
        ])
    
    # Explanation - MUCH SHORTER
    prompt_parts.extend([
        "###EXPLANATION###",
        "📚 **Quick Summary:**",
        "- What the code does in 1-2 sentences (MAX 40 words)",
        "- Keep it concise and clear",
        ""
    ])
    
    # Best practices SEPARATE
    if preferences.best_practices:
        prompt_parts.extend([
            "###BEST_PRACTICES###",
            "📖 **Best Practices:**",
            "- Standards compliance, naming, documentation",
            "- Max 60 words OR 'Follows best practices ✅'",
            ""
        ])
    
    # Recommendations (detailed only)
    if detailed_mode:
        prompt_parts.extend([
            "###RECOMMENDATIONS###",
            "🎯 **Top 3 Priorities (one line each):**",
            "1. [Most critical]",
            "2. [Second]",
            "3. [Third]",
            ""
        ])
    
    if is_repository_review:
        prompt_parts.append("\n💡 Note: Part of larger project - focus on integration.")
    
    return "\n".join(prompt_parts)
