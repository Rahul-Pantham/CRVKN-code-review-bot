#!/usr/bin/env python3
"""
Pre-deployment validation script
Checks all components are working correctly
"""

import sys
import os

def check_backend_imports():
    """Verify all required backend modules can be imported"""
    print("\n" + "="*60)
    print("CHECK 1: Backend Imports")
    print("="*60)
    
    required_modules = [
        'fastapi',
        'sqlalchemy',
        'passlib',
        'jwt',
        'python-multipart',
        'pydantic',
    ]
    
    missing = []
    for module in required_modules:
        try:
            __import__(module.replace('-', '_'))
            print(f"✅ {module}")
        except ImportError as e:
            print(f"❌ {module}: {e}")
            missing.append(module)
    
    return len(missing) == 0

def check_backend_syntax():
    """Check main.py for syntax errors"""
    print("\n" + "="*60)
    print("CHECK 2: Backend Syntax")
    print("="*60)
    
    try:
        import py_compile
        py_compile.compile('backend/main.py', doraise=True)
        print("✅ backend/main.py - No syntax errors")
        return True
    except py_compile.PyCompileError as e:
        print(f"❌ backend/main.py - Syntax error: {e}")
        return False

def check_frontend_build():
    """Check if frontend build exists"""
    print("\n" + "="*60)
    print("CHECK 3: Frontend Build")
    print("="*60)
    
    required_files = [
        'frontend/build/index.html',
        'frontend/build/static/js/main.2baa2815.js',
        'frontend/build/static/css/main.67f38f7b.css',
    ]
    
    all_exist = True
    for file in required_files:
        if os.path.exists(file):
            size = os.path.getsize(file)
            print(f"✅ {file} ({size} bytes)")
        else:
            print(f"❌ {file} - NOT FOUND")
            all_exist = False
    
    return all_exist

def check_environment_variables():
    """Check if critical environment variables are set"""
    print("\n" + "="*60)
    print("CHECK 4: Environment Variables")
    print("="*60)
    
    optional_vars = {
        'GOOGLE_API_KEY': 'Gemini API (optional - mock review if not set)',
        'SMTP_USERNAME': 'Email service (optional - fallback mode)',
        'DATABASE_URL': 'Database (optional - SQLite used if not set)',
        'SECRET_KEY': 'JWT signing key (should be set)',
    }
    
    for var, description in optional_vars.items():
        if os.getenv(var):
            print(f"✅ {var} - Set ({description})")
        else:
            print(f"⚠️  {var} - Not set ({description})")
    
    return True

def check_database_schema():
    """Verify database models are properly defined"""
    print("\n" + "="*60)
    print("CHECK 5: Database Schema")
    print("="*60)
    
    try:
        sys.path.insert(0, 'backend')
        from main import User, Review, SessionLocal
        
        print("✅ User model imported")
        print("✅ Review model imported")
        
        # Check User fields
        required_fields = ['id', 'username', 'email', 'hashed_password', 'is_verified']
        for field in required_fields:
            if hasattr(User, field):
                print(f"   ✅ User.{field}")
            else:
                print(f"   ❌ User.{field} - MISSING")
                return False
        
        print("✅ Database models OK")
        return True
    except Exception as e:
        print(f"❌ Database schema error: {e}")
        return False

def check_api_endpoints():
    """Verify critical API endpoints are defined"""
    print("\n" + "="*60)
    print("CHECK 6: API Endpoints")
    print("="*60)
    
    try:
        with open('backend/main.py', 'r') as f:
            content = f.read()
        
        endpoints = {
            '/register': 'User registration',
            '/token': 'User login',
            '/generate-review': 'Code review generation',
            '/past-reviews': 'Fetch user reviews',
            '/verify-otp': 'OTP verification (fallback)',
        }
        
        all_found = True
        for endpoint, description in endpoints.items():
            if f'"{endpoint}"' in content or f"'{endpoint}'" in content:
                print(f"✅ {endpoint} - {description}")
            else:
                print(f"❌ {endpoint} - NOT FOUND")
                all_found = False
        
        return all_found
    except Exception as e:
        print(f"❌ Error checking endpoints: {e}")
        return False

def check_password_functions():
    """Verify password hashing functions are properly defined"""
    print("\n" + "="*60)
    print("CHECK 7: Security Functions")
    print("="*60)
    
    try:
        with open('backend/main.py', 'r') as f:
            content = f.read()
        
        functions = {
            'def verify_password': 'Password verification',
            'def get_password_hash': 'Password hashing',
            'def create_access_token': 'JWT token creation',
            'def get_current_user': 'Token validation',
        }
        
        all_found = True
        for function, description in functions.items():
            if function in content:
                print(f"✅ {function} - {description}")
            else:
                print(f"❌ {function} - NOT FOUND")
                all_found = False
        
        return all_found
    except Exception as e:
        print(f"❌ Error checking functions: {e}")
        return False

def main():
    print("\n" + "🔍 "*30)
    print("PRE-DEPLOYMENT VALIDATION")
    print("🔍 "*30)
    
    checks = [
        ("Backend Imports", check_backend_imports),
        ("Backend Syntax", check_backend_syntax),
        ("Frontend Build", check_frontend_build),
        ("Environment Variables", check_environment_variables),
        ("Database Schema", check_database_schema),
        ("API Endpoints", check_api_endpoints),
        ("Security Functions", check_password_functions),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Error in {name}: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nResult: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT")
        return 0
    elif passed >= 5:
        print("\n⚠️  MOST CHECKS PASSED - Warnings above, but deployment may still work")
        return 0
    else:
        print("\n❌ CRITICAL ISSUES - Do not deploy yet")
        return 1

if __name__ == "__main__":
    sys.exit(main())
