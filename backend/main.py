from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import uuid
import traceback
import json
import subprocess
import tempfile
import shutil
import smtplib
import secrets
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict
from ast_analyzer import CodeAnalyzer, format_ast_analysis_for_gemini

# ------------------ Constants ------------------
PREDEFINED_REJECTION_REASONS = [
    "Code has syntax errors",
    "Performance issues identified", 
    "Security vulnerabilities found",
    "Poor code readability/structure",
    "Missing error handling",
    "Not following best practices",
    "Incomplete implementation",
    "Logic errors detected",
    "Code is too complex/needs refactoring",
    "Documentation/comments missing",
    "Potential null pointer exceptions",
    "Memory leaks or resource management issues",
    "Incorrect algorithm implementation",
    "Hard-coded values should be configurable",
    "Threading/concurrency issues",
    "Other (specify in custom reason)"
]

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD_HASH = "$2b$12$DlvXYnlNYpbq.zEgdnLhK.rFNNtJC5FzsbvbvIiZKyqnckQKsqLcm"  # "admin123"

# ------------------ Load Environment ------------------
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
POSTGRES_URI = os.getenv("POSTGRES_URI")
SECRET_KEY = os.getenv("SECRET_KEY", str(uuid.uuid4()))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

if not GOOGLE_API_KEY:
    print("⚠️ WARNING: GOOGLE_API_KEY not found in environment variables")

# ------------------ Database Setup ------------------
SessionLocal = None
Base = declarative_base()

if POSTGRES_URI:
    db_uri = POSTGRES_URI
    engine = create_engine(db_uri, future=True)
else:
    db_uri = "sqlite:///./dev.db"
    engine = create_engine(db_uri, future=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to reviews
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")

def generate_otp():
    """Generate a 6-digit OTP"""
    import random
    return str(random.randint(100000, 999999))

def send_otp_email(email: str, otp: str):
    """Send OTP to user's email"""
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print(f"⚠️  Email credentials not configured - OTP email not sent")
            print(f"🔢 DEBUG OTP for {email}: {otp}")
            print(f"   Use this OTP to complete verification: {otp}")
            return False
        
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        msg['Subject'] = "CRVKN - Email Verification Code"
        
        body = f"""
        Welcome to CRVKN Code Review Bot!
        
        Your email verification code is: {otp}
        
        Please enter this code to complete your registration.
        This code will expire in 10 minutes.
        
        If you didn't create an account, please ignore this email.
        
        Best regards,
        CRVKN Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, email, text)
        server.quit()
        
        print(f"OTP email sent to {email}")
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {str(e)}")
        return False

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Original submission data
    code = Column(Text, nullable=False)
    language = Column(String(50), nullable=True, index=True)
    
    # AI-generated review content
    review = Column(Text, nullable=True)
    title = Column(String(200), nullable=True)
    optimized_code = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    security_issues = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-10 rating extracted from review
    
    # Repository-specific fields
    is_repository_review = Column(String(10), default="false", nullable=False)  # "true" for repo reviews
    repository_url = Column(String(500), nullable=True)  # Git repository URL
    repository_branch = Column(String(100), nullable=True)  # Git branch name
    total_files = Column(Integer, nullable=True)  # Total number of files in repo review
    file_reviews = Column(Text, nullable=True)  # JSON structure containing individual file reviews
    
    # User feedback
    feedback = Column(Text, nullable=True)
    rejection_reasons = Column(Text, nullable=True)  # JSON array of selected reasons
    custom_rejection_reason = Column(Text, nullable=True)  # Custom reason if "Other" selected
    improvement_suggestions = Column(Text, nullable=True)  # User suggestions for improving future reviews
    
    # Status tracking
    status = Column(String(20), default="completed", nullable=False)  # pending, completed, reviewed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", back_populates="reviews")
    
    # Add indexes for common queries
    __table_args__ = (
        Index('ix_reviews_user_created', 'user_id', 'created_at'),
        Index('ix_reviews_language_created', 'language', 'created_at'),
        Index('ix_reviews_status_created', 'status', 'created_at'),
        Index('ix_reviews_repo_type', 'is_repository_review', 'created_at'),
    )

class SectionFeedback(Base):
    __tablename__ = "section_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Section-specific feedback - OLD (kept for backward compatibility)
    review_section = Column(String(20), nullable=True)  # 'accepted', 'rejected', or null
    original_code_section = Column(String(20), nullable=True)
    optimized_code_section = Column(String(20), nullable=True)
    explanation_section = Column(String(20), nullable=True)
    security_analysis_section = Column(String(20), nullable=True)
    
    # NEW Section-specific feedback
    code_quality_section = Column(String(20), nullable=True)
    key_findings_section = Column(String(20), nullable=True)
    security_section = Column(String(20), nullable=True)
    performance_section = Column(String(20), nullable=True)
    architecture_section = Column(String(20), nullable=True)
    best_practices_section = Column(String(20), nullable=True)
    recommendations_section = Column(String(20), nullable=True)
    syntax_errors_section = Column(String(20), nullable=True)      # NEW: syntax errors feedback
    semantic_errors_section = Column(String(20), nullable=True)    # NEW: semantic errors feedback
    
    # Overall feedback context
    overall_feedback = Column(String(20), nullable=True)  # 'positive', 'negative'
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    review = relationship("Review")
    user = relationship("User")
    
    # Add indexes for analytics queries
    __table_args__ = (
        Index('ix_section_feedback_review_user', 'review_id', 'user_id'),
        Index('ix_section_feedback_created', 'created_at'),
        Index('ix_section_feedback_sections', 'review_section', 'optimized_code_section', 'explanation_section', 'security_analysis_section'),
    )

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Review preferences (learned from feedback)
    security_analysis = Column(Boolean, default=True, nullable=False)
    performance_analysis = Column(Boolean, default=True, nullable=False)
    code_optimization = Column(Boolean, default=True, nullable=False)
    best_practices = Column(Boolean, default=True, nullable=False)
    detailed_explanations = Column(Boolean, default=True, nullable=False)
    ast_analysis = Column(Boolean, default=True, nullable=False)
    
    # Feedback learning history (JSON)
    feedback_history = Column(Text, nullable=True)  # JSON array of feedback entries
    learning_patterns = Column(Text, nullable=True)  # JSON object of detected patterns
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", back_populates="preferences")
    
    # Unique constraint - one preference record per user
    __table_args__ = (
        Index('ix_user_preferences_user_id', 'user_id'),
    )

# Update User model to include preferences relationship
User.preferences = relationship("UserPreferences", back_populates="user", uselist=False)

Base.metadata.create_all(bind=engine)

# ------------------ Gemini Setup ------------------
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# ------------------ Pattern Learning Functions ------------------
import json
import re

def get_user_preferences(db, user_id: int) -> UserPreferences:
    """Get or create user preferences"""
    preferences = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not preferences:
        preferences = UserPreferences(user_id=user_id)
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    return preferences

def learn_from_feedback(db, user_id: int, feedback_text: str):
    """Analyze feedback and update user preferences"""
    preferences = get_user_preferences(db, user_id)
    
    # Get existing feedback history
    feedback_history = []
    if preferences.feedback_history:
        try:
            feedback_history = json.loads(preferences.feedback_history)
        except:
            feedback_history = []
    
    # Add new feedback
    new_feedback = {
        "timestamp": datetime.utcnow().isoformat(),
        "feedback": feedback_text,
        "changes_applied": []
    }
    
    feedback_lower = feedback_text.lower()
    
    # Pattern matching for different types of feedback
    changes_made = False
    
    # Security analysis patterns
    if any(phrase in feedback_lower for phrase in [
        "security analysis not required", "skip security", "no security needed",
        "security not important", "don't need security", "without security", "remove security"
    ]):
        preferences.security_analysis = False
        new_feedback["changes_applied"].append("Disabled security analysis")
        changes_made = True
    
    elif any(phrase in feedback_lower for phrase in [
        "need more security", "focus on security", "security is important",
        "add security analysis", "security analysis required", "with security", "include security"
    ]):
        preferences.security_analysis = True
        new_feedback["changes_applied"].append("Enabled security analysis")
        changes_made = True
    
    # Performance analysis patterns
    if any(phrase in feedback_lower for phrase in [
        "performance not needed", "skip performance", "no performance analysis",
        "performance not important", "without performance", "remove performance"
    ]):
        preferences.performance_analysis = False
        new_feedback["changes_applied"].append("Disabled performance analysis")
        changes_made = True
        
    elif any(phrase in feedback_lower for phrase in [
        "focus on performance", "need performance analysis", "performance is important",
        "more performance suggestions", "with performance", "include performance"
    ]):
        preferences.performance_analysis = True
        new_feedback["changes_applied"].append("Enabled performance analysis")
        changes_made = True
    
    # Code optimization patterns - Enhanced to catch more variations including numeric references
    import re
    if any(phrase in feedback_lower for phrase in [
        "no code optimization", "skip optimization", "don't optimize code",
        "optimization not needed", "without optimization", "remove optimization"
    ]):
        preferences.code_optimization = False
        new_feedback["changes_applied"].append("Disabled code optimization")
        changes_made = True
        
        # Clear optimized code count in learning patterns
        learning_patterns = {}
        if preferences.learning_patterns:
            try:
                learning_patterns = json.loads(preferences.learning_patterns)
            except:
                pass
        learning_patterns["optimized_code_count"] = 0
        preferences.learning_patterns = json.dumps(learning_patterns)
        
    elif any(phrase in feedback_lower for phrase in [
        "need optimization", "optimize code", "focus on optimization", "with optimization",
        "optimized code", "give optimization", "provide optimization", "show optimization",
        "include optimization", "add optimization"
    ]) or re.search(r'(give|provide|show|need|want)\s+\d*\s*optimized\s+codes?', feedback_lower) or re.search(r'\d+\s+optimized\s+codes?', feedback_lower):
        preferences.code_optimization = True
        
        # Extract number of optimized codes requested
        num_codes = 1  # Default to 1
        
        # Try to extract number from patterns like "2 optimized codes", "provide 3 optimized versions"
        number_patterns = [
            r'(\d+)\s+optimized\s+codes?',
            r'(give|provide|show|need|want)\s+(\d+)\s+optimized',
            r'(\d+)\s+optimized\s+(versions?|solutions?|implementations?)',
            r'(\d+)\s+(different|alternate|alternative)\s+optimized'
        ]
        
        for pattern in number_patterns:
            match = re.search(pattern, feedback_lower)
            if match:
                # Extract the number - it might be in different capture groups
                groups = match.groups()
                for group in groups:
                    if group and group.isdigit():
                        num_codes = int(group)
                        break
                break
        
        # Store in learning patterns
        learning_patterns = {}
        if preferences.learning_patterns:
            try:
                learning_patterns = json.loads(preferences.learning_patterns)
            except:
                pass
        
        learning_patterns["optimized_code_count"] = num_codes
        preferences.learning_patterns = json.dumps(learning_patterns)
        
        new_feedback["changes_applied"].append(f"Enabled code optimization (will provide {num_codes} optimized version{'s' if num_codes > 1 else ''} in future reviews)")
        changes_made = True
        
        print(f"📊 Pattern Learning: Detected request for {num_codes} optimized code version(s)")

    
    # Best practices patterns
    if any(phrase in feedback_lower for phrase in [
        "no best practices", "skip best practices", "best practices not needed",
        "without best practices", "remove best practices"
    ]):
        preferences.best_practices = False
        new_feedback["changes_applied"].append("Disabled best practices suggestions")
        changes_made = True
        
    elif any(phrase in feedback_lower for phrase in [
        "focus on best practices", "need best practices", "more best practices",
        "with best practices", "include best practices"
    ]):
        preferences.best_practices = True
        new_feedback["changes_applied"].append("Enabled best practices suggestions")
        changes_made = True
    
    # Explanation detail patterns
    if any(phrase in feedback_lower for phrase in [
        "too detailed", "brief explanation", "short explanation", "less detail",
        "concise", "simple explanation", "basic explanation"
    ]):
        preferences.detailed_explanations = False
        new_feedback["changes_applied"].append("Switched to brief explanations")
        changes_made = True
        
    elif any(phrase in feedback_lower for phrase in [
        "more detailed", "detailed explanation", "explain more", "need more detail",
        "comprehensive", "thorough explanation", "in-depth"
    ]):
        preferences.detailed_explanations = True
        new_feedback["changes_applied"].append("Switched to detailed explanations")
        changes_made = True
    
    # AST analysis patterns
    if any(phrase in feedback_lower for phrase in [
        "no ast analysis", "skip ast", "ast not needed", "without ast", "remove ast"
    ]):
        preferences.ast_analysis = False
        new_feedback["changes_applied"].append("Disabled AST analysis")
        changes_made = True
    elif any(phrase in feedback_lower for phrase in [
        "enable ast", "with ast", "include ast", "use ast"
    ]):
        preferences.ast_analysis = True
        new_feedback["changes_applied"].append("Enabled AST analysis")
        changes_made = True
    
    # Always store feedback for future learning, even if no immediate changes
    feedback_history.append(new_feedback)
    preferences.feedback_history = json.dumps(feedback_history[-10:])  # Keep last 10 feedback entries
    preferences.updated_at = datetime.utcnow()
    db.commit()
    
    if changes_made:
        print(f"✅ Preferences updated for user {user_id}:")
        print(f"   - Code Optimization: {preferences.code_optimization}")
        print(f"   - Security Analysis: {preferences.security_analysis}")
        print(f"   - Changes: {new_feedback['changes_applied']}")
        return {"message": "✅ Preferences updated successfully! They'll apply to your next review.", "changes": new_feedback["changes_applied"]}
    
    print(f"💡 No preference changes detected for user {user_id}. Feedback: '{feedback_text}'")
    return {"message": "💡 No preference changes detected. Try: 'give optimized code', 'skip security analysis', 'brief explanations'", "changes": []}

def get_latest_improvement_suggestion(db, user_id: int) -> str:
    """
    Fetch the latest non-null improvement_suggestions from the user's reviews.
    Returns the most recent feedback to incorporate into the prompt.
    """
    try:
        latest_review = db.query(Review).filter(
            Review.user_id == user_id,
            Review.improvement_suggestions.isnot(None),
            Review.improvement_suggestions != ""
        ).order_by(Review.created_at.desc()).first()
        
        if latest_review and latest_review.improvement_suggestions:
            print(f"✅ Found latest improvement suggestion for user {user_id}: '{latest_review.improvement_suggestions[:100]}...'")
            return latest_review.improvement_suggestions
        
        print(f"ℹ️ No improvement suggestions found for user {user_id}")
        return None
    except Exception as e:
        print(f"⚠️ Error fetching improvement suggestions: {e}")
        return None

def generate_custom_prompt(preferences: UserPreferences, is_repository_review: bool = False, detailed_mode: bool = False, user_feedback: str = None) -> str:
    """Generate a comprehensive code review prompt based on user preferences and previous feedback"""
    
    # Start with user feedback incorporation if available
    feedback_section = ""
    if user_feedback:
        feedback_section = f"""
📝 **IMPORTANT - User Feedback from Previous Review:**
The user previously provided this feedback to improve future code reviews:
"{user_feedback}"

Please incorporate this feedback and adjust your review approach accordingly. Pay special attention to the points mentioned above.
---

"""
    
    if detailed_mode or preferences.detailed_explanations:
        # Professional, comprehensive multi-level analysis mode
        analysis_depth = """
You are an advanced Code Review Engine. Analyze the code across multiple dimensions:

1️⃣ **Syntax & Language Rules** - syntax errors, deprecated APIs, formatting issues
2️⃣ **Logic & Semantics** - logical errors, edge cases, control flow problems
3️⃣ **Architecture & Design** - SOLID principles, design patterns, modularity
4️⃣ **Performance** - inefficient loops, memory issues, blocking operations
5️⃣ **Security** - hardcoded secrets, injection risks, weak crypto, missing validation"""
        
        if preferences.best_practices:
            analysis_depth += "\n6️⃣ **Best Practices** - code standards, naming conventions, documentation"
        
        analysis_depth += "\n7️⃣ **Maintainability** - complexity, coupling, scalability, technical debt"
        
    else:
        # Simple, beginner-friendly mode
        analysis_depth = "You are a friendly code teacher who explains things super simply! 😊"
    
    # Build structured output with SEPARATE markers for each subsection (Option 1)
    prompt_parts = [
        analysis_depth,
        "",
        "Analyze this code and return SEPARATE sections with exact markers. Each section will be independently reviewable:",
        "",
        "###CODE_QUALITY###",
        "📋 **Code Quality Summary:**",
        "- Overall assessment in 2-3 sentences",
        "- Quality score: X/10",
        "- Use emojis: ✅ (good), ⚠️ (needs improvement), ❌ (problems)",
        "- Keep under 60 words",
        "",
        "###KEY_FINDINGS###",
        "🔍 **Key Findings:**",
        "List each issue with:",
        "  • Severity: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW",
        "  • Category: Syntax/Logic/Architecture/Performance/Security/Style",
        "  • Brief description + specific fix",
        "Group by severity. If no issues: 'No critical issues found! ✅'",
        "Max 150 words.",
        ""
    ]
    
    # Now add conditional sections based on preferences
    
    # Security as SEPARATE section (conditional)
    if preferences.security_analysis:
        prompt_parts.extend([
            "###SECURITY###",
            "�️ **Security Analysis:**",
            "- Check: hardcoded secrets, injection risks, validation gaps, auth issues, data exposure",
            "- List findings with severity (🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW)",
            "- If no concerns: 'No security issues detected ✅'",
            "- Max 100 words",
            "",
        ])
    
    # Performance as SEPARATE section (conditional)
    if preferences.performance_analysis:
        prompt_parts.extend([
            "###PERFORMANCE###",
            "⚡ **Performance Analysis:**",
            "- Inefficient operations, algorithms, loops",
            "- Memory management concerns",
            "- Blocking or expensive operations",
            "- Optimization opportunities",
            "- If efficient: 'Performance looks good ✅'",
            "- Max 100 words",
            "",
        ])
    
    # Architecture as SEPARATE section (conditional - detailed mode)
    if detailed_mode:
        prompt_parts.extend([
            "###ARCHITECTURE###",
            "🏗️ **Architecture & Design:**",
            "- Design pattern usage/violations",
            "- SOLID principles assessment",
            "- Modularity, coupling, cohesion",
            "- Scalability concerns",
            "- Max 120 words",
            "",
        ])
    
    # Best practices as SEPARATE section (conditional)
    if preferences.best_practices:
        prompt_parts.extend([
            "###BEST_PRACTICES###",
            "📖 **Best Practices:**",
            "- Code standards compliance",
            "- Naming conventions",
            "- Documentation quality",
            "- Error handling patterns",
            "- If compliant: 'Follows best practices ✅'",
            "- Max 80 words",
            "",
        ])
    
    # Optimized code section (if user wants it)
    if preferences.code_optimization:
        # Check if user requested multiple optimized versions
        num_optimized = 1  # Default
        if preferences.learning_patterns:
            try:
                patterns = json.loads(preferences.learning_patterns)
                num_optimized = patterns.get("optimized_code_count", 1)
            except:
                pass
        
        if num_optimized > 1:
            # Generate multiple optimized code sections
            for i in range(1, num_optimized + 1):
                approach = 'performance-optimized' if i == 1 else 'readability-optimized' if i == 2 else f'alternative approach {i}'
                prompt_parts.extend([
                    f"###OPTIMIZED_CODE_{i}###",
                    f"CRITICAL: Provide ONLY the {approach} code. NO explanatory text. NO inline comments. NO docstrings. NO descriptions.",
                    f"Pure executable code ONLY. Start directly with the code syntax (def, class, function, import, etc.).",
                    f"Remove ALL comments and explanations. Code should be clean and ready to run as-is.",
                    ""
                ])
        else:
            # Single optimized code section
            prompt_parts.extend([
                "###OPTIMIZED_CODE###",
                "CRITICAL: Provide ONLY the optimized code. NO explanatory text. NO inline comments. NO docstrings. NO descriptions.",
                "Pure executable code ONLY. Start directly with the code syntax (def, class, function, import, etc.).",
                "Remove ALL comments and explanations. Code should be clean and ready to run as-is.",
                ""
            ])
    
    # Explanation section - MUCH SHORTER NOW
    prompt_parts.extend([
        "###EXPLANATION###",
        "📚 **Quick Summary:**",
        "- What the code does in 1-2 sentences (MAX 40 words total)",
        "- Keep it concise and clear",
    ])
    
    prompt_parts.append("")
    
    # Add priority recommendations as SEPARATE section
    prompt_parts.extend([
        "###RECOMMENDATIONS###",
        "🎯 **Top Priority Actions:**",
        "- List 2-3 most critical improvements",
        "- Focus on high-impact changes",
        "- If code is excellent: 'Code quality is excellent! Minor suggestions: [if any]'",
        "- Max 80 words",
        "",
    ])
    
    # Add Syntax Errors section (ALWAYS include - critical for error detection)
    prompt_parts.extend([
        "###SYNTAX_ERRORS###",
        "🔴 **Syntax Errors:**",
        "Analyze the code for ALL syntax errors including:",
        "- Missing colons, semicolons, brackets, parentheses, quotes",
        "- Invalid operators or syntax (e.g., ^ instead of ** in Python)",
        "- Malformed statements or declarations",
        "- Incorrect indentation (for Python)",
        "- Incomplete code blocks",
        "- Invalid keywords or language-specific syntax violations",
        "Format: List each error as '• [Error description] on line X' or '• [Error description]'",
        "If NO syntax errors found, respond with EXACTLY: 'No syntax errors detected.'",
        "Be thorough - check every line carefully!",
        "",
    ])
    
    # Add Semantic Errors section (ALWAYS include - critical for logic errors)
    prompt_parts.extend([
        "###SEMANTIC_ERRORS###",
        "🟠 **Semantic Errors:**",
        "Analyze the code for ALL semantic/logic errors including:",
        "- Undefined variables or functions being used",
        "- Type mismatches or incorrect data types",
        "- Function calls with wrong number of arguments",
        "- Name mismatches (e.g., defining function_name but calling functionname)",
        "- Unreachable code or dead code paths",
        "- Logical errors (incorrect conditions, wrong operators)",
        "- Missing return statements where expected",
        "- Incorrect scope or variable access issues",
        "Format: List each error as '• [Error description]'",
        "If NO semantic errors found, respond with EXACTLY: 'No semantic errors detected.'",
        "Be thorough - analyze the entire logic flow!",
        "",
    ])
    
    # Context note
    if is_repository_review:
        prompt_parts.append("\n💡 Note: This is part of a larger project. Focus on integration and consistency.")
    
    # Combine feedback section with the rest of the prompt
    final_prompt = feedback_section + "\n".join(prompt_parts)
    return final_prompt

# ------------------ FastAPI App ------------------
app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print("Unhandled Exception:", exc)
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"error": "Internal server error", "detail": str(exc)})

# ------------------ CORS Middleware ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Security Setup ------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ------------------ Models ------------------
class CodeInput(BaseModel):
    code: str
    filename: str | None = None

class FeedbackInput(BaseModel):
    review_id: int
    feedback: str
    rejection_reasons: list[str] = []  # List of selected predefined reasons
    custom_rejection_reason: str | None = None  # Custom reason if "Other" selected
    section_feedback: dict = {}  # Section-level feedback: {"ai_review": "accepted", "explanation": "rejected", etc.}

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class OTPVerify(BaseModel):
    user_id: int
    otp_code: str

class ResendOTP(BaseModel):
    email: str

class UserOut(BaseModel):
    username: str
    email: str

class GitRepoInput(BaseModel):
    repo_url: str
    branch: str = "main"
    include_patterns: List[str] = [
        "*.py", "*.js", "*.ts", "*.jsx", "*.tsx", 
        "*.java", "*.cpp", "*.c", "*.h", "*.cs", 
        "*.php", "*.rb", "*.go", "*.rs", "*.kt"
    ]
    exclude_patterns: List[str] = [
        "node_modules/**", "*.min.js", "dist/**", "build/**",
        "__pycache__/**", "*.pyc", ".git/**", "vendor/**"
    ]
    max_files: int = 50

# ------------------ Helpers ------------------
def verify_password(plain_password, hashed_password):
    try:
        # Truncate password if too long for bcrypt
        if len(plain_password.encode('utf-8')) > 72:
            plain_password = plain_password[:72]
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password):
    try:
        # Truncate password if too long for bcrypt
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        return pwd_context.hash(password)
    except Exception as e:
        print(f"Password hashing error: {e}")
        return None

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if SessionLocal is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise credentials_exception
        return user
    finally:
        db.close()

# ------------------ Git Helper Functions ------------------

def clone_git_repository(repo_url: str, branch: str = "main") -> str:
    """Clone a Git repository to a temporary directory."""
    temp_dir = tempfile.mkdtemp(prefix="git_review_")
    try:
        # Clone the repository
        if branch:
            result = subprocess.run(
                ["git", "clone", "--branch", branch, "--depth", "1", repo_url, temp_dir],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
        else:
            result = subprocess.run(
                ["git", "clone", "--depth", "1", repo_url, temp_dir],
                capture_output=True,
                text=True,
                timeout=300
            )
        
        if result.returncode != 0:
            raise Exception(f"Git clone failed: {result.stderr}")
        
        print(f"Successfully cloned repository to: {temp_dir}")
        return temp_dir
    
    except subprocess.TimeoutExpired:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise Exception("Git clone timed out after 5 minutes")
    except Exception as e:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise Exception(f"Failed to clone repository: {str(e)}")

def get_code_files(repo_path: str, include_patterns: List[str], exclude_patterns: List[str], max_files: int) -> Dict[str, str]:
    """Extract code files from the cloned repository."""
    import fnmatch
    
    code_files = {}
    file_count = 0
    
    for root, dirs, files in os.walk(repo_path):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if not any(fnmatch.fnmatch(d, pattern) for pattern in exclude_patterns)]
        
        for file in files:
            if file_count >= max_files:
                break
                
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, repo_path)
            
            # Check if file matches include patterns
            if not any(fnmatch.fnmatch(file, pattern) for pattern in include_patterns):
                continue
            
            # Check if file matches exclude patterns
            if any(fnmatch.fnmatch(file, pattern) or fnmatch.fnmatch(relative_path, pattern) for pattern in exclude_patterns):
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                # Skip empty files or files that are too large (> 100KB)
                if not content.strip() or len(content) > 100000:
                    continue
                    
                code_files[relative_path] = content
                file_count += 1
                
            except Exception as e:
                print(f"Warning: Could not read file {relative_path}: {e}")
                continue
        
        if file_count >= max_files:
            break
    
    return code_files

def ensure_str(s) -> str:
    return s if isinstance(s, str) else str(s or "")

def extract_text_from_gemini_response(resp) -> str:
    try:
        if not resp:
            return ""
        for attr in ("text", "output_text", "content", "message", "response"):
            val = getattr(resp, attr, None)
            if isinstance(val, str) and val.strip():
                return val.strip()
        if hasattr(resp, "candidates") and resp.candidates:
            first = resp.candidates[0]
            if hasattr(first, "content"):
                return str(first.content).strip()
            if hasattr(first, "text"):
                return str(first.text).strip()
        return str(resp).strip()
    except Exception:
        traceback.print_exc()
        return str(resp)

def derive_title(review_text: str, code_text: str) -> str:
    if not review_text:
        return (code_text or "")[:120]
    keywords = ["error", "exception", "bug", "issue", "fail", "vulnerability"]
    for line in review_text.splitlines():
        l = line.strip()
        if not l:
            continue
        if any(k in l.lower() for k in keywords):
            return l[:200]
    return review_text.strip()[:200]

def detect_programming_language(code: str) -> str:
    """Detect programming language from code content."""
    if not code:
        return 'Unknown'
        
    code_lower = code.lower().strip()
    
    # Language detection patterns - order matters!
    if any(keyword in code_lower for keyword in ['import react', 'usestate', 'useeffect', 'jsx', 'tsx']):
        return 'React/JavaScript'
    elif any(keyword in code_lower for keyword in ['public class', 'static void main', 'system.out', 'import java']):
        return 'Java'
    elif any(keyword in code_lower for keyword in ['function ', 'const ', 'let ', 'var ', 'console.log', '=>']):
        return 'JavaScript'
    elif any(keyword in code_lower for keyword in ['def ', 'print(', 'if __name__', 'import ', 'from ']):
        return 'Python'
    elif any(keyword in code_lower for keyword in ['#include', 'int main', 'printf']):
        return 'C/C++'
    elif any(keyword in code_lower for keyword in ['using namespace', 'std::', 'cin', 'cout']):
        return 'C++'
    elif any(keyword in code_lower for keyword in ['select ', 'insert ', 'update ', 'delete ', 'from ']):
        return 'SQL'
    elif any(keyword in code_lower for keyword in ['<!doctype', '<html', '<div', '<span', '<script']):
        return 'HTML'
    elif any(keyword in code_lower for keyword in ['.css', 'background:', 'color:', 'margin:', 'padding:']):
        return 'CSS'
    elif any(keyword in code_lower for keyword in ['fn ', 'let mut', 'println!', 'match ']):
        return 'Rust'
    elif any(keyword in code_lower for keyword in ['func ', 'package main', 'fmt.print']):
        return 'Go'
    elif any(keyword in code_lower for keyword in ['<?php', 'echo ', '$_']):
        return 'PHP'
    else:
        return 'Unknown'

def extract_rating_from_review(review_text: str) -> int:
    """Extract numerical rating from review text."""
    try:
        import re
        # Look for patterns like "5/10", "Rating: 7/10", "Overall: 3/10"
        patterns = [
            r'(\d+)/10',
            r'rating[:\s]*(\d+)',
            r'score[:\s]*(\d+)',
            r'overall[:\s]*(\d+)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, review_text.lower())
            if matches:
                rating = int(matches[0])
                return max(1, min(10, rating))  # Ensure rating is between 1-10
        
        return None  # No rating found
    except Exception:
        return None

def clone_git_repository(repo_url: str, branch: str = "main") -> str:
    """Clone a Git repository to a temporary directory."""
    try:
        # Ensure URL ends with .git for proper cloning
        if not repo_url.endswith('.git') and 'github.com' in repo_url:
            repo_url = repo_url + '.git'
            
        temp_dir = tempfile.mkdtemp(prefix="code_review_repo_")
        print(f"Cloning repository {repo_url} (branch: {branch}) to {temp_dir}")
        
        # Clone the repository
        cmd = ["git", "clone", "--depth", "1", "--branch", branch, repo_url, temp_dir]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            # Try without specifying branch if the branch doesn't exist
            cmd = ["git", "clone", "--depth", "1", repo_url, temp_dir]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                raise Exception(f"Failed to clone repository: {result.stderr}")
        
        return temp_dir
    except subprocess.TimeoutExpired:
        raise Exception("Repository cloning timed out (5 minutes)")
    except Exception as e:
        raise Exception(f"Error cloning repository: {str(e)}")

def get_code_files(repo_path: str, include_patterns: List[str], exclude_patterns: List[str], max_files: int) -> Dict[str, str]:
    """Get code files from the cloned repository."""
    import fnmatch
    import os
    
    code_files = {}
    file_count = 0
    
    for root, dirs, files in os.walk(repo_path):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if not any(fnmatch.fnmatch(d, pattern.split('/')[0]) for pattern in exclude_patterns)]
        
        for file in files:
            if file_count >= max_files:
                break
                
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, repo_path)
            
            # Check if file matches include patterns
            if not any(fnmatch.fnmatch(file, pattern) for pattern in include_patterns):
                continue
                
            # Check if file matches exclude patterns
            if any(fnmatch.fnmatch(relative_path, pattern) for pattern in exclude_patterns):
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Limit file size to prevent overwhelming the AI
                    if len(content) > 50000:  # 50KB limit
                        content = content[:50000] + "\n# ... (file truncated)"
                    code_files[relative_path] = content
                    file_count += 1
            except (UnicodeDecodeError, IOError):
                # Skip binary files or files that can't be read
                continue
                
        if file_count >= max_files:
            break
    
    return code_files

# ------------------ Routes ------------------
@app.get("/")
def read_root():
    return {"message": "✅ CRVKN Code Review API is running"}

@app.get("/rejection-reasons")
def get_rejection_reasons():
    """Get predefined rejection reasons for code reviews."""
    return {
        "predefined_reasons": PREDEFINED_REJECTION_REASONS,
        "message": "Select one or more reasons, or choose 'Other' to specify custom reason"
    }

@app.post("/register")
def register(user: UserCreate):
    db = SessionLocal()
    try:
        # Check if username already exists
        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Check if email already exists
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Basic email validation
        if "@" not in user.email or "." not in user.email:
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Generate OTP and set expiration (10 minutes)
        otp = generate_otp()
        otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Create user (not verified yet)
        hashed_password = get_password_hash(user.password)
        new_user = User(
            username=user.username, 
            email=user.email,
            hashed_password=hashed_password,
            otp_code=otp,
            otp_expires_at=otp_expires_at,
            is_verified=False
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Send OTP email
        email_sent = send_otp_email(user.email, otp)
        
        if email_sent:
            return {"message": "Registration successful! Please check your email for the verification code.", "user_id": new_user.id}
        else:
            return {"message": "Registration successful! Email service unavailable - contact admin for verification.", "user_id": new_user.id}
    finally:
        db.close()

@app.post("/verify-otp")
def verify_otp(otp_request: OTPVerify):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == otp_request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.is_verified:
            raise HTTPException(status_code=400, detail="User already verified")
        
        if not user.otp_code:
            raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")
        
        if datetime.utcnow() > user.otp_expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
        if user.otp_code != otp_request.otp_code:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
        
        # Verify user and clear OTP
        user.is_verified = True
        user.otp_code = None
        user.otp_expires_at = None
        db.commit()
        
        return {"message": "Email verified successfully! You can now login."}
    finally:
        db.close()

@app.post("/resend-otp")
def resend_otp(resend_request: ResendOTP):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == resend_request.email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User with this email not found")
        
        if user.is_verified:
            raise HTTPException(status_code=400, detail="User already verified")
        
        # Generate new OTP
        otp = generate_otp()
        otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        user.otp_code = otp
        user.otp_expires_at = otp_expires_at
        db.commit()
        
        # Send OTP email
        email_sent = send_otp_email(user.email, otp)
        
        if email_sent:
            return {"message": "New verification code sent to your email."}
        else:
            raise HTTPException(status_code=500, detail="Failed to send verification email")
    finally:
        db.close()

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == form_data.username).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        if not user.is_verified:
            raise HTTPException(status_code=403, detail="Please verify your email before logging in")
        
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()

@app.post("/logout")
def logout():
    # Frontend must delete token from localStorage/session
    return {"message": "Logged out successfully"}

# Pattern Learning Endpoints
class FeedbackRequest(BaseModel):
    feedback_text: str

@app.post("/feedback/")
def submit_feedback(feedback: FeedbackRequest, current_user: User = Depends(get_current_user)):
    """Submit feedback to improve future reviews"""
    db = SessionLocal()
    try:
        result = learn_from_feedback(db, current_user.id, feedback.feedback_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing feedback: {str(e)}")
    finally:
        db.close()

@app.get("/preferences/")
def get_preferences(current_user: User = Depends(get_current_user)):
    """Get current user preferences"""
    db = SessionLocal()
    try:
        preferences = get_user_preferences(db, current_user.id)
        return {
            "security_analysis": preferences.security_analysis,
            "performance_analysis": preferences.performance_analysis,
            "code_optimization": preferences.code_optimization,
            "best_practices": preferences.best_practices,
            "detailed_explanations": preferences.detailed_explanations,
            "ast_analysis": preferences.ast_analysis,
            "feedback_count": len(json.loads(preferences.feedback_history)) if preferences.feedback_history else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting preferences: {str(e)}")
    finally:
        db.close()

@app.post("/admin/login")
def admin_login(credentials: dict):
    username = credentials.get("username")
    password = credentials.get("password")
    
    print(f"DEBUG: Admin login attempt - username: {username}")
    print(f"DEBUG: Expected username: {ADMIN_USERNAME}")
    print(f"DEBUG: Username match: {username == ADMIN_USERNAME}")
    print(f"DEBUG: Password verification: {verify_password(password, ADMIN_PASSWORD_HASH)}")
    
    if username == ADMIN_USERNAME and verify_password(password, ADMIN_PASSWORD_HASH):
        access_token = create_access_token(data={"sub": username, "role": "admin"})
        print("DEBUG: Admin login successful")
        return {"access_token": access_token, "token_type": "bearer"}
    else:
        print("DEBUG: Admin login failed")
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role != "admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    if username != ADMIN_USERNAME:
        raise credentials_exception
    return {"username": username, "role": role}

@app.post("/generate-review")
def generate_review(data: CodeInput, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        # Initialize AST analyzer
        analyzer = CodeAnalyzer()
        
        if not GOOGLE_API_KEY:
            review_text = """🔍 **General Review:**
✅ Code looks good! Add some comments to make it easier to read. 😊

🛡️ **Security Check:**
Safe ✅ No security problems found.

🚨 **Issues Found:**
🟢 LOW: Missing comments for better readability"""
            optimized_code = data.code
            explanation_text = "This code does something cool! 🚀"
            security_issues = ""
        else:
            # Get user preferences for customized review
            preferences = get_user_preferences(db, current_user.id)
            print(f"🔍 User preferences loaded for {current_user.username}:")
            print(f"   - Code Optimization: {preferences.code_optimization}")
            print(f"   - Security Analysis: {preferences.security_analysis}")
            print(f"   - Detailed Explanations: {preferences.detailed_explanations}")
            print(f"   - Best Practices: {preferences.best_practices}")
            print(f"   - AST Analysis: {preferences.ast_analysis}")
            
            # Fetch latest improvement suggestion to incorporate into prompt
            latest_feedback = get_latest_improvement_suggestion(db, current_user.id)
            if latest_feedback:
                print(f"📝 Incorporating user feedback into review prompt: '{latest_feedback[:80]}...'")
            else:
                print(f"ℹ️ No previous feedback to incorporate")
            
            # Perform AST analysis (always needed for syntax/semantic error detection)
            detected_language = detect_programming_language(data.code)
            print(f"Performing AST analysis for code review and error detection...")
            ast_analysis = analyzer.analyze_code(data.code, detected_language)
            
            # Format AST summary for Gemini if user preference is enabled
            ast_summary = ""
            if preferences.ast_analysis:
                ast_summary = format_ast_analysis_for_gemini(ast_analysis)
            
            # Truncate long code submissions to limit model input size and latency
            max_chars = 3500 if preferences.ast_analysis else 4000
            code_for_prompt = data.code
            if isinstance(code_for_prompt, str) and len(code_for_prompt) > max_chars:
                code_for_prompt = code_for_prompt[:max_chars] + "\n# ... (truncated)"

            # Generate custom prompt based on user preferences
            # Use detailed mode if user has enabled detailed_explanations
            detailed_mode = preferences.detailed_explanations
            custom_prompt = generate_custom_prompt(
                preferences, 
                is_repository_review=False, 
                detailed_mode=detailed_mode,
                user_feedback=latest_feedback  # Pass the latest user feedback
            )
            
            # Build complete prompt with code
            combined_prompt = f"""{custom_prompt}

**Code to Review:**
```{detected_language}
{code_for_prompt}
```

Provide your analysis following the exact section markers (###REVIEW###, ###OPTIMIZED_CODE###, ###EXPLANATION###, etc.)."""

            if preferences.code_optimization:
                print("✅ OPTIMIZED_CODE section will be requested in prompt (preference enabled)")
            else:
                print("⚠️ OPTIMIZED_CODE section will NOT be requested (preference disabled)")

            combined_resp = extract_text_from_gemini_response(model.generate_content(combined_prompt))

            # Parse combined response by markers - NOW WITH SEPARATE SECTIONS
            def parse_section(text, marker):
                import re
                pattern = rf"{marker}(.*?)(?=###[A-Z_]+###|$)"
                m = re.search(pattern, text, re.S)
                return m.group(1).strip() if m else ''

            # Parse all new sections
            code_quality = parse_section(combined_resp, '###CODE_QUALITY###')
            key_findings = parse_section(combined_resp, '###KEY_FINDINGS###')
            security_issues = parse_section(combined_resp, '###SECURITY###')
            performance_analysis = parse_section(combined_resp, '###PERFORMANCE###')
            architecture_analysis = parse_section(combined_resp, '###ARCHITECTURE###')
            best_practices = parse_section(combined_resp, '###BEST_PRACTICES###')

            # --- Syntax and Semantic Error Extraction ---
            # Use the ast_analysis already performed earlier
            syntax_errors = []
            semantic_errors = []
            
            # Debug logging
            print(f"🔍 AST Analysis Debug:")
            print(f"  - Language: {detected_language}")
            print(f"  - AST Analysis exists: {ast_analysis is not None}")
            if ast_analysis:
                print(f"  - Structure: {ast_analysis.structure}")
                print(f"  - Issues: {ast_analysis.issues}")
                print(f"  - Security concerns: {ast_analysis.security_concerns}")
            
            # Extract errors based on language
            if ast_analysis:
                # Get syntax errors from structure (for Python)
                if isinstance(ast_analysis.structure, dict) and 'syntax_error' in ast_analysis.structure:
                    syntax_errors.append(ast_analysis.structure['syntax_error'])
                    print(f"✅ Found syntax error in structure: {ast_analysis.structure['syntax_error']}")
                
                # Process issues list
                if ast_analysis.issues:
                    for issue in ast_analysis.issues:
                        if issue.lower().startswith('syntax error'):
                            # It's a syntax error
                            if issue not in syntax_errors:  # Avoid duplicates
                                syntax_errors.append(issue)
                                print(f"✅ Found syntax error in issues: {issue}")
                        else:
                            # It's a semantic error
                            semantic_errors.append(issue)
                            print(f"✅ Found semantic error: {issue}")
                
                # Also check security concerns and performance issues for semantic errors
                if ast_analysis.security_concerns:
                    semantic_errors.extend(ast_analysis.security_concerns)
                    print(f"✅ Added {len(ast_analysis.security_concerns)} security concerns to semantic errors")
                
                if ast_analysis.performance_issues:
                    semantic_errors.extend(ast_analysis.performance_issues)
                    print(f"✅ Added {len(ast_analysis.performance_issues)} performance issues to semantic errors")

            # Format error sections with better formatting
            if syntax_errors:
                syntax_errors_section = '\n'.join([f"• {error}" for error in syntax_errors])
            else:
                syntax_errors_section = 'No syntax errors detected.'
            
            if semantic_errors:
                semantic_errors_section = '\n'.join([f"• {error}" for error in semantic_errors])
            else:
                semantic_errors_section = 'No semantic errors detected.'
            
            print(f"📋 Final Error Sections:")
            print(f"  - Syntax ({len(syntax_errors)} errors):")
            if syntax_errors:
                for err in syntax_errors:
                    print(f"    • {err}")
            else:
                print(f"    {syntax_errors_section}")
            print(f"  - Semantic ({len(semantic_errors)} errors):")
            if semantic_errors:
                for err in semantic_errors:
                    print(f"    • {err}")
            else:
                print(f"    {semantic_errors_section}")
            
            # Parse optimized code sections (may be multiple)
            optimized_code = parse_section(combined_resp, '###OPTIMIZED_CODE###')
            optimized_codes = []
            if optimized_code:
                optimized_codes.append(optimized_code)
            
            # Check for numbered optimized code sections (OPTIMIZED_CODE_1, OPTIMIZED_CODE_2, etc.)
            for i in range(1, 10):  # Support up to 9 versions
                opt_code = parse_section(combined_resp, f'###OPTIMIZED_CODE_{i}###')
                if opt_code:
                    optimized_codes.append(opt_code)
            
            # Combine all optimized codes with separators if multiple
            # NO extra text - just code separated by horizontal rules
            if optimized_codes:
                if len(optimized_codes) > 1:
                    optimized_code = "\n\n---\n\n".join(optimized_codes)
                else:
                    optimized_code = optimized_codes[0]
            
            explanation_text = parse_section(combined_resp, '###EXPLANATION###')
            recommendations = parse_section(combined_resp, '###RECOMMENDATIONS###')
            
            # Parse syntax and semantic errors from Gemini's response
            syntax_errors_from_gemini = parse_section(combined_resp, '###SYNTAX_ERRORS###')
            semantic_errors_from_gemini = parse_section(combined_resp, '###SEMANTIC_ERRORS###')
            
            # Use Gemini's analysis (primary source), fall back to AST if empty
            if syntax_errors_from_gemini and syntax_errors_from_gemini.strip():
                syntax_errors_section = syntax_errors_from_gemini.strip()
            else:
                # Fallback to AST analysis if Gemini didn't provide
                syntax_errors_section = syntax_errors_section if syntax_errors else 'No syntax errors detected.'
            
            if semantic_errors_from_gemini and semantic_errors_from_gemini.strip():
                semantic_errors_section = semantic_errors_from_gemini.strip()
            else:
                # Fallback to AST analysis if Gemini didn't provide
                semantic_errors_section = semantic_errors_section if semantic_errors else 'No semantic errors detected.'
            
            print(f"🔍 Final Error Sections (from Gemini):")
            print(f"  - Syntax Errors: {syntax_errors_section[:100]}...")
            print(f"  - Semantic Errors: {semantic_errors_section[:100]}...")
            
            # Combine all sections into the review text with section markers for frontend parsing
            review_sections = []
            
            if code_quality:
                review_sections.append(f"###CODE_QUALITY###\n{code_quality}")
            
            if key_findings:
                review_sections.append(f"###KEY_FINDINGS###\n{key_findings}")
            
            if security_issues:
                review_sections.append(f"###SECURITY###\n{security_issues}")
            
            if performance_analysis:
                review_sections.append(f"###PERFORMANCE###\n{performance_analysis}")
            
            if architecture_analysis:
                review_sections.append(f"###ARCHITECTURE###\n{architecture_analysis}")
            
            if best_practices:
                review_sections.append(f"###BEST_PRACTICES###\n{best_practices}")
            
            if recommendations:
                review_sections.append(f"###RECOMMENDATIONS###\n{recommendations}")
            
            # Add syntax and semantic error sections (always, not conditional)
            review_sections.append(f"###SYNTAX_ERRORS###\n{syntax_errors_section}")
            review_sections.append(f"###SEMANTIC_ERRORS###\n{semantic_errors_section}")
            
            print(f"🔍 Syntax errors found: {len(syntax_errors)}")
            print(f"🔍 Semantic errors found: {len(semantic_errors)}")
            
            # Join all sections
            review_text = "\n\n".join(review_sections)
            
            # Enhance review with AST findings if Gemini response is incomplete
            if not review_text and ast_analysis.issues:
                review_text = f"AST Analysis findings:\n" + '\n'.join([f"- {issue}" for issue in ast_analysis.issues])
            
            print(f"AST analysis complete. Found {len(ast_analysis.issues)} issues.")
            print(f"Generated sections: {', '.join([s.split('###')[1] for s in review_sections]) if review_sections else 'None'}")

        # Detect programming language and extract rating
        detected_language = detect_programming_language(data.code)
        extracted_rating = extract_rating_from_review(review_text)

        # Use filename in title if provided
        review_title = data.filename if data.filename else derive_title(review_text, data.code)
        if data.filename and review_text:
            # Add a brief summary from the review to the filename
            first_line = review_text.split('\n')[0].strip()
            if first_line and len(first_line) < 100:
                review_title = f"{data.filename} - {first_line.lstrip('- ')}"

        new_review = Review(
            user_id=current_user.id,
            code=ensure_str(data.code),
            language=detected_language,
            review=review_text.strip(),
            title=review_title[:200],  # Limit title length
            optimized_code=optimized_code.strip(),
            explanation=explanation_text.strip(),
            security_issues=security_issues.strip(),
            rating=extracted_rating,
            status="completed"
        )
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        return {
            "id": new_review.id,
            "title": new_review.title,
            "review": new_review.review,
            "optimized_code": new_review.optimized_code,
            "explanation": new_review.explanation,
            "security_issues": new_review.security_issues,
            "language": new_review.language,
            "rating": new_review.rating,
        }
    finally:
        db.close()

@app.post("/submit-feedback")
def submit_feedback(data: FeedbackInput, current_user: User = Depends(get_current_user)):
    print(f"DEBUG: Received feedback data:")
    print(f"  review_id: {data.review_id}")
    print(f"  feedback: {data.feedback}")
    print(f"  rejection_reasons: {data.rejection_reasons}")
    print(f"  custom_rejection_reason: {data.custom_rejection_reason}")
    print(f"  section_feedback: {data.section_feedback}")
    
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == data.review_id, Review.user_id == current_user.id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        review.feedback = ensure_str(data.feedback)
        
        # Handle multiple rejection reasons
        import json
        if data.rejection_reasons:
            print(f"DEBUG: Storing rejection_reasons as JSON: {json.dumps(data.rejection_reasons)}")
            review.rejection_reasons = json.dumps(data.rejection_reasons)
        
        # Handle custom rejection reason
        if data.custom_rejection_reason:
            print(f"DEBUG: Storing custom_rejection_reason: {data.custom_rejection_reason}")
            review.custom_rejection_reason = ensure_str(data.custom_rejection_reason)
        
        # Store section-level feedback
        if data.section_feedback:
            print(f"DEBUG: Storing section feedback: {data.section_feedback}")
            
            # Map frontend section names to database columns
            section_mapping = {
                # OLD sections (kept for backward compatibility)
                'ai_review': 'review_section',
                'original_code': 'original_code_section', 
                'optimized_code': 'optimized_code_section',
                'explanation': 'explanation_section',
                'security_analysis': 'security_analysis_section',
                
                # NEW sections
                'code_quality': 'code_quality_section',
                'key_findings': 'key_findings_section',
                'security': 'security_section',
                'performance': 'performance_section',
                'architecture': 'architecture_section',
                'best_practices': 'best_practices_section',
                'recommendations': 'recommendations_section',
                'syntaxErrors': 'syntax_errors_section',      # NEW: syntax errors mapping
                'semanticErrors': 'semantic_errors_section'   # NEW: semantic errors mapping
            }
            
            # Check if section feedback already exists for this review
            section_feedback_record = db.query(SectionFeedback).filter(
                SectionFeedback.review_id == data.review_id,
                SectionFeedback.user_id == current_user.id
            ).first()
            
            if not section_feedback_record:
                section_feedback_record = SectionFeedback(
                    review_id=data.review_id,
                    user_id=current_user.id,
                    overall_feedback=data.feedback
                )
                db.add(section_feedback_record)
            
            # Update section feedback columns
            for frontend_name, db_column in section_mapping.items():
                if frontend_name in data.section_feedback:
                    setattr(section_feedback_record, db_column, data.section_feedback[frontend_name])
            
            section_feedback_record.overall_feedback = data.feedback
        
        # Update status if rejection reasons provided
        if data.rejection_reasons or data.custom_rejection_reason:
            review.status = "rejected"
            print(f"DEBUG: Set status to rejected")
        else:
            review.status = "reviewed"
            print(f"DEBUG: Set status to reviewed")
            
        db.commit()
        print(f"DEBUG: Successfully committed to database")
        
        return {
            "message": "Feedback submitted successfully",
            "status": review.status,
            "rejection_reasons": data.rejection_reasons,
            "custom_reason": data.custom_rejection_reason,
            "section_feedback": data.section_feedback
        }
    finally:
        db.close()

@app.post("/submit-improvement-suggestion")
def submit_improvement_suggestion(data: dict, current_user: User = Depends(get_current_user)):
    """Submit user improvement suggestions for future reviews"""
    db = SessionLocal()
    try:
        review_id = data.get("review_id")
        suggestion = data.get("suggestion", "").strip()
        
        if not review_id:
            raise HTTPException(status_code=400, detail="Review ID is required")
        
        review = db.query(Review).filter(Review.id == review_id, Review.user_id == current_user.id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Store the improvement suggestion
        review.improvement_suggestions = suggestion if suggestion else None
        
        # Also learn from this feedback for future reviews
        if suggestion:
            learn_from_feedback(db, current_user.id, suggestion)
        
        db.commit()
        
        return {
            "message": "Improvement suggestion saved successfully",
            "has_suggestion": bool(suggestion)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving suggestion: {str(e)}")
    finally:
        db.close()

@app.get("/past-reviews")
def get_past_reviews(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        reviews = db.query(Review).filter(Review.user_id == current_user.id).order_by(Review.created_at.desc()).all()
        return [
            {
                "id": r.id,
                "title": r.title,
                "comment": (r.review or "")[:200],
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reviews
        ]
    finally:
        db.close()

@app.get("/past-reviews/{review_id}")
def get_past_review_detail(review_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == review_id, Review.user_id == current_user.id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Check if this is a repository review
        if review.is_repository_review == "true" and review.file_reviews:
            # Parse file reviews from JSON
            try:
                file_reviews = json.loads(review.file_reviews)
                return {
                    "id": review.id,
                    "title": review.title,
                    "code": review.code,
                    "review": review.review,
                    "optimized_code": review.optimized_code,
                    "explanation": review.explanation,
                    "security_issues": review.security_issues,
                    "language": review.language,
                    "rating": review.rating,
                    "feedback": review.feedback,
                    "rejection_reason": review.rejection_reasons,
                    "created_at": review.created_at.isoformat() if review.created_at else None,
                    "is_repository_review": True,
                    "repository_url": review.repository_url,
                    "repository_branch": review.repository_branch,
                    "total_files": review.total_files,
                    "file_reviews": file_reviews  # Individual file reviews for navigation
                }
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                pass
        
        # Return normal single file review
        return {
            "id": review.id,
            "title": review.title,
            "code": review.code,
            "review": review.review,
            "optimized_code": review.optimized_code,
            "explanation": review.explanation,
            "security_issues": review.security_issues,
            "language": review.language,
            "rating": review.rating,
            "feedback": review.feedback,
            "rejection_reason": review.rejection_reasons,
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "is_repository_review": False
        }
    finally:
        db.close()

@app.post("/generate-repo-review")
async def generate_repo_review(data: GitRepoInput, current_user: User = Depends(get_current_user)):
    """Generate reviews for all files in a Git repository and store as single database entry."""
    temp_dir = None
    try:
        print(f"Starting repository review for: {data.repo_url}")
        
        # Clone the repository
        temp_dir = clone_git_repository(data.repo_url, data.branch)
        
        # Get all code files
        code_files = get_code_files(temp_dir, data.include_patterns, data.exclude_patterns, data.max_files)
        
        if not code_files:
            raise HTTPException(status_code=400, detail="No code files found in repository")
        
        print(f"Found {len(code_files)} code files to review")
        
        # Process each file and collect reviews
        file_reviews = []
        combined_code = ""
        combined_review = ""
        combined_optimized_code = ""
        combined_explanation = ""
        combined_security_issues = ""
        languages_found = set()
        total_rating = 0
        valid_ratings = 0
        
        db = SessionLocal()
        
        try:
            # Extract repository name from URL for title
            repo_name = data.repo_url.split('/')[-1].replace('.git', '')
            
            # Get user preferences for repository review
            preferences = get_user_preferences(db, current_user.id)
            
            # Fetch latest improvement suggestion to incorporate into prompt
            latest_feedback = get_latest_improvement_suggestion(db, current_user.id)
            if latest_feedback:
                print(f"📝 Incorporating user feedback into repository review prompt: '{latest_feedback[:80]}...'")
            else:
                print(f"ℹ️ No previous feedback to incorporate for repository review")
            
            # Initialize AST analyzer for repository review (if enabled)
            analyzer = CodeAnalyzer() if preferences.ast_analysis else None
            
            for i, (file_path, file_content) in enumerate(code_files.items(), 1):
                print(f"Processing file {i}/{len(code_files)}: {file_path}")
                
                # Generate review using user preferences
                if not GOOGLE_API_KEY:
                    review_text = f"""🔍 **General Review:**
✅ {file_path} looks good! Add some comments to make it clearer. 😊

🛡️ **Security Check:**
Safe ✅ No security problems found.

🚨 **Issues Found:**
🟢 LOW: Missing comments for better readability"""
                    optimized_code = file_content
                    explanation_text = f"This {file_path} does something useful! 🚀"
                    security_issues = "No security analysis available (no API key)"
                else:
                    file_language = detect_programming_language(file_content)
                    
                    # Perform AST analysis if enabled
                    ast_analysis = None
                    ast_summary = ""
                    if preferences.ast_analysis and analyzer:
                        ast_analysis = analyzer.analyze_code(file_content, file_language)
                        ast_summary = format_ast_analysis_for_gemini(ast_analysis)
                    
                    # Truncate based on AST preference
                    max_chars = 2500 if preferences.ast_analysis else 3000
                    code_for_prompt = file_content
                    if isinstance(code_for_prompt, str) and len(code_for_prompt) > max_chars:
                        code_for_prompt = code_for_prompt[:max_chars] + "\n# ... (truncated)"

                    # Generate custom prompt based on user preferences for repository review
                    detailed_mode = preferences.detailed_explanations
                    custom_prompt = generate_custom_prompt(
                        preferences, 
                        is_repository_review=True, 
                        detailed_mode=detailed_mode,
                        user_feedback=latest_feedback  # Pass the latest user feedback
                    )
                    
                    # Build complete prompt with file context
                    combined_prompt = f"""{custom_prompt}

**Repository File:** {file_path}
**Language:** {file_language}

**Code to Review:**
```{file_language}
{code_for_prompt}
```

Provide your analysis following the exact section markers (###REVIEW###, ###OPTIMIZED_CODE###, ###EXPLANATION###, etc.)."""

                    try:
                        combined_resp = extract_text_from_gemini_response(model.generate_content(combined_prompt))

                        # Parse combined response by markers
                        def parse_section(text, marker):
                            import re
                            pattern = rf"{marker}(.*?)(?=###[A-Z_]+###|$)"
                            m = re.search(pattern, text, re.S)
                            return m.group(1).strip() if m else ''

                        review_text = parse_section(combined_resp, '###REVIEW###')
                        optimized_code = parse_section(combined_resp, '###OPTIMIZED_CODE###')
                        explanation_text = parse_section(combined_resp, '###EXPLANATION###')
                        security_issues = parse_section(combined_resp, '###SECURITY###')
                        
                        # Fallback to AST findings if Gemini response is empty
                        if not review_text and ast_analysis.issues:
                            review_text = "AST Analysis findings:\n" + '\n'.join([f"- {issue}" for issue in ast_analysis.issues])
                        
                    except Exception as e:
                        print(f"Error processing {file_path}: {e}")
                        # Use AST analysis as fallback
                        review_text = f"AST Analysis for {file_path}:\n" + '\n'.join([f"- {issue}" for issue in ast_analysis.issues]) if ast_analysis.issues else f"Basic analysis completed for {file_path}"
                        optimized_code = file_content
                        explanation_text = f"Failed to analyze {file_path} with AI, AST analysis completed"
                        security_issues = '\n'.join(ast_analysis.security_concerns) if ast_analysis.security_concerns else "Analysis failed"

                # Detect programming language and extract rating
                detected_language = detect_programming_language(file_content)
                extracted_rating = extract_rating_from_review(review_text)
                
                # Track languages and ratings
                languages_found.add(detected_language)
                if extracted_rating:
                    total_rating += extracted_rating
                    valid_ratings += 1

                # Create individual file review object
                file_review = {
                    "file_path": file_path,
                    "original_code": file_content,
                    "review": review_text.strip(),
                    "optimized_code": optimized_code.strip(),
                    "explanation": explanation_text.strip(),
                    "security_issues": security_issues.strip(),
                    "language": detected_language,
                    "rating": extracted_rating,
                    "file_index": i - 1,  # 0-based index for UI navigation
                    "total_files": len(code_files)
                }
                
                file_reviews.append(file_review)
                
                # Build combined content for the main review fields
                combined_code += f"\n\n# File: {file_path}\n" + file_content
                combined_review += f"\n\n## 📁 {file_path}\n{review_text}"
                combined_optimized_code += f"\n\n# Optimized: {file_path}\n{optimized_code}"
                combined_explanation += f"\n• {file_path}: {explanation_text}"
                combined_security_issues += f"\n• {file_path}: {security_issues}"

            # Calculate average rating
            avg_rating = round(total_rating / valid_ratings) if valid_ratings > 0 else None
            
            # Create repository title
            repo_title = f"🏗️ Repository: {repo_name} ({data.branch}) - {len(code_files)} files"
            
            # Create single database entry for the entire repository
            new_review = Review(
                user_id=current_user.id,
                code=ensure_str(combined_code.strip()[:65000]),  # Limit size for database
                language=", ".join(sorted(languages_found)) if languages_found else "Mixed",
                review=combined_review.strip()[:65000],  # Limit size for database
                title=repo_title[:200],
                optimized_code=combined_optimized_code.strip()[:65000],  # Limit size for database
                explanation=combined_explanation.strip()[:5000],
                security_issues=combined_security_issues.strip()[:5000],
                rating=avg_rating,
                is_repository_review="true",
                repository_url=data.repo_url,
                repository_branch=data.branch,
                total_files=len(code_files),
                file_reviews=json.dumps(file_reviews),  # Store individual file reviews as JSON
                status="completed"
            )
            db.add(new_review)
            db.commit()
            db.refresh(new_review)
            
            # Return response in the format expected by frontend
            return {
                "message": f"Successfully reviewed {len(code_files)} files from repository",
                "repository_url": data.repo_url,
                "branch": data.branch,
                "total_files": len(code_files),
                "review_id": new_review.id,
                "reviews": file_reviews  # Individual file reviews for UI navigation
            }
        
        finally:
            db.close()
        
    except Exception as e:
        print(f"Error processing repository: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing repository: {str(e)}")
    
    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"Cleaned up temporary directory: {temp_dir}")
            except Exception as e:
                print(f"Warning: Failed to clean up temporary directory {temp_dir}: {e}")

# ------------------ Admin Endpoints ------------------

@app.get("/admin/stats/overall")
def get_overall_stats(current_admin = Depends(get_current_admin)):
    """Get overall system statistics for admin dashboard"""
    db = SessionLocal()
    try:
        total_reviews = db.query(Review).count()
        accepted_reviews = db.query(Review).filter(Review.feedback == "positive").count()
        rejected_reviews = db.query(Review).filter(Review.status == "rejected").count()
        total_users = db.query(User).count()
        
        # Get rejection reasons statistics
        rejection_stats = {}
        reviews_with_rejection = db.query(Review).filter(Review.rejection_reasons.isnot(None)).all()
        
        for review in reviews_with_rejection:
            if review.rejection_reasons:
                try:
                    reasons = json.loads(review.rejection_reasons)
                    for reason in reasons:
                        rejection_stats[reason] = rejection_stats.get(reason, 0) + 1
                except json.JSONDecodeError:
                    continue
        
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_reviews = db.query(Review).filter(Review.created_at >= thirty_days_ago).count()
        
        return {
            "total_reviews": total_reviews,
            "accepted_reviews": accepted_reviews,
            "rejected_reviews": rejected_reviews,
            "total_users": total_users,
            "acceptance_rate": round((accepted_reviews / total_reviews * 100) if total_reviews > 0 else 0, 2),
            "rejection_reasons": rejection_stats,
            "recent_activity": recent_reviews
        }
    finally:
        db.close()

@app.get("/admin/stats/per-user")
def get_per_user_stats(current_admin = Depends(get_current_admin)):
    """Get per-user statistics for admin dashboard"""
    db = SessionLocal()
    try:
        users_stats = []
        users = db.query(User).all()
        
        for user in users:
            user_reviews = db.query(Review).filter(Review.user_id == user.id).all()
            total = len(user_reviews)
            accepted = len([r for r in user_reviews if r.feedback == "positive"])
            rejected = len([r for r in user_reviews if r.status == "rejected"])
            
            users_stats.append({
                "username": user.username,
                "total_reviews": total,
                "accepted_reviews": accepted,
                "rejected_reviews": rejected,
                "acceptance_rate": round((accepted / total * 100) if total > 0 else 0, 2),
                "last_activity": max([r.created_at for r in user_reviews]).isoformat() if user_reviews else None
            })
        
        return {"users": users_stats}
    finally:
        db.close()

@app.get("/admin/reviews/all")
def get_all_reviews(current_admin = Depends(get_current_admin), page: int = 1, limit: int = 50):
    """Get all reviews with pagination for admin dashboard"""
    db = SessionLocal()
    try:
        offset = (page - 1) * limit
        reviews = db.query(Review).join(User).offset(offset).limit(limit).all()
        total_reviews = db.query(Review).count()
        
        reviews_data = []
        for review in reviews:
            reviews_data.append({
                "id": review.id,
                "username": review.user.username,
                "language": review.language,
                "rating": review.rating,
                "status": review.status,
                "feedback": review.feedback,
                "rejection_reasons": json.loads(review.rejection_reasons) if review.rejection_reasons else [],
                "custom_rejection_reason": review.custom_rejection_reason,
                "created_at": review.created_at.isoformat(),
                "code_preview": review.code[:100] + "..." if len(review.code) > 100 else review.code
            })
        
        return {
            "reviews": reviews_data,
            "total": total_reviews,
            "page": page,
            "limit": limit,
            "has_next": offset + limit < total_reviews
        }
    finally:
        db.close()

@app.get("/admin/reviews/{review_id}")
def get_review_detail(review_id: int, current_admin = Depends(get_current_admin)):
    """Get detailed view of a specific review for admin"""
    db = SessionLocal()
    try:
        review = db.query(Review).join(User).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {
            "id": review.id,
            "username": review.user.username,
            "code": review.code,
            "review": review.review,
            "optimized_code": review.optimized_code,
            "explanation": review.explanation,
            "security_issues": review.security_issues,
            "language": review.language,
            "rating": review.rating,
            "status": review.status,
            "feedback": review.feedback,
            "rejection_reasons": json.loads(review.rejection_reasons) if review.rejection_reasons else [],
            "custom_rejection_reason": review.custom_rejection_reason,
            "created_at": review.created_at.isoformat()
        }
    finally:
        db.close()

@app.get("/admin/analytics/section-feedback")
def get_section_feedback_analytics(current_admin = Depends(get_current_admin)):
    """Get section-level feedback analytics for admin dashboard"""
    db = SessionLocal()
    try:
        from sqlalchemy import func, case
        
        # Query section feedback statistics - NEW sections only
        section_stats = db.query(
            # Count accepted and rejected for each NEW section
            func.sum(case((SectionFeedback.key_findings_section == 'accepted', 1), else_=0)).label('key_findings_accepted'),
            func.sum(case((SectionFeedback.key_findings_section == 'rejected', 1), else_=0)).label('key_findings_rejected'),
            
            func.sum(case((SectionFeedback.architecture_section == 'accepted', 1), else_=0)).label('architecture_accepted'),
            func.sum(case((SectionFeedback.architecture_section == 'rejected', 1), else_=0)).label('architecture_rejected'),
            
            func.sum(case((SectionFeedback.recommendations_section == 'accepted', 1), else_=0)).label('recommendations_accepted'),
            func.sum(case((SectionFeedback.recommendations_section == 'rejected', 1), else_=0)).label('recommendations_rejected'),
            
            func.sum(case((SectionFeedback.optimized_code_section == 'accepted', 1), else_=0)).label('optimized_code_accepted'),
            func.sum(case((SectionFeedback.optimized_code_section == 'rejected', 1), else_=0)).label('optimized_code_rejected'),
            
            func.sum(case((SectionFeedback.syntax_errors_section == 'accepted', 1), else_=0)).label('syntax_errors_accepted'),
            func.sum(case((SectionFeedback.syntax_errors_section == 'rejected', 1), else_=0)).label('syntax_errors_rejected'),
            
            func.sum(case((SectionFeedback.semantic_errors_section == 'accepted', 1), else_=0)).label('semantic_errors_accepted'),
            func.sum(case((SectionFeedback.semantic_errors_section == 'rejected', 1), else_=0)).label('semantic_errors_rejected'),
            
            func.count(SectionFeedback.id).label('total_feedback_records')
        ).first()
        
        # Format data for bar chart - Only the 4 requested sections
        chart_data = [
            {
                "section": "Key Findings",
                "accepted": section_stats.key_findings_accepted or 0,
                "rejected": section_stats.key_findings_rejected or 0
            },
            {
                "section": "Architecture & Design",
                "accepted": section_stats.architecture_accepted or 0,
                "rejected": section_stats.architecture_rejected or 0
            },
            {
                "section": "Recommendations",
                "accepted": section_stats.recommendations_accepted or 0,
                "rejected": section_stats.recommendations_rejected or 0
            },
            {
                "section": "Optimized Code",
                "accepted": section_stats.optimized_code_accepted or 0,
                "rejected": section_stats.optimized_code_rejected or 0
            },
            {
                "section": "Syntax Errors",
                "accepted": section_stats.syntax_errors_accepted or 0,
                "rejected": section_stats.syntax_errors_rejected or 0
            },
            {
                "section": "Semantic Errors",
                "accepted": section_stats.semantic_errors_accepted or 0,
                "rejected": section_stats.semantic_errors_rejected or 0
            }
        ]
        
        # Get recent feedback trends (last 30 days)
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        recent_feedback = db.query(SectionFeedback).filter(
            SectionFeedback.created_at >= thirty_days_ago
        ).count()
        
        return {
            "chart_data": chart_data,
            "summary": {
                "total_feedback_records": section_stats.total_feedback_records or 0,
                "recent_feedback_count": recent_feedback,
                "generated_at": datetime.utcnow().isoformat()
            }
        }
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
