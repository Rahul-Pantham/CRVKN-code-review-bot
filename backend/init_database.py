#!/usr/bin/env python3
"""
Initialize database with all required tables
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import engine, Base, User, Review, UserPreferences, SectionFeedback
from passlib.context import CryptContext

# Initialize password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_all_tables():
    """Create all database tables"""
    print("🚀 Creating database tables...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        
        # Create a test admin user
        from sqlalchemy.orm import sessionmaker
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Check if admin user exists
            admin_user = db.query(User).filter(User.username == "admin").first()
            if not admin_user:
                admin_password_hash = pwd_context.hash("admin123")
                admin_user = User(
                    username="admin",
                    hashed_password=admin_password_hash
                )
                db.add(admin_user)
                
            # Check if regular test user exists
            test_user = db.query(User).filter(User.username == "testuser").first()
            if not test_user:
                test_password_hash = pwd_context.hash("testpass")
                test_user = User(
                    username="testuser", 
                    hashed_password=test_password_hash
                )
                db.add(test_user)
                
            db.commit()
            print("✅ Test users created!")
            print("Admin: username=admin, password=admin123")
            print("User: username=testuser, password=testpass")
            
        except Exception as e:
            print(f"⚠️ Error creating users: {e}")
            db.rollback()
        finally:
            db.close()
            
        # List all tables created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"📊 Tables created: {tables}")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    create_all_tables()