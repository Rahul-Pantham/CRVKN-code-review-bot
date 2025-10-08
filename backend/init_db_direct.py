#!/usr/bin/env python3
"""
Direct database initialization using SQLAlchemy
"""

import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, Index, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from passlib.context import CryptContext

# Database configuration
db_uri = "sqlite:///./dev.db"
engine = create_engine(db_uri, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define models directly here to avoid import issues
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=True)
    code = Column(Text, nullable=False)
    review = Column(Text, nullable=True)
    optimized_code = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    security_issues = Column(Text, nullable=True)
    language = Column(String(50), nullable=True, index=True)
    rating = Column(Float, nullable=True)
    feedback = Column(String(20), nullable=True, index=True)
    status = Column(String(20), default="pending", nullable=False, index=True)
    rejection_reasons = Column(Text, nullable=True)
    custom_rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SectionFeedback(Base):
    __tablename__ = "section_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    review_section = Column(String(20), nullable=True)
    original_code_section = Column(String(20), nullable=True)
    optimized_code_section = Column(String(20), nullable=True)
    explanation_section = Column(String(20), nullable=True)
    security_analysis_section = Column(String(20), nullable=True)
    
    overall_feedback = Column(String(20), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    preferred_language = Column(String(50), nullable=True)
    code_style_preferences = Column(Text, nullable=True)
    security_level = Column(String(20), default="standard")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def initialize_database():
    """Initialize the database with tables and test data"""
    
    print("🚀 Initializing database...")
    
    # Delete existing database file
    if os.path.exists("dev.db"):
        os.remove("dev.db")
        print("🗑️ Removed existing database")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")
    
    # Create session and add test users
    db = SessionLocal()
    
    try:
        # Create admin user
        admin_user = User(
            username="admin",
            hashed_password=pwd_context.hash("admin123")
        )
        db.add(admin_user)
        
        # Create test user
        test_user = User(
            username="testuser",
            hashed_password=pwd_context.hash("testpass")
        )
        db.add(test_user)
        
        db.commit()
        print("✅ Test users created!")
        
        # Verify creation
        user_count = db.query(User).count()
        print(f"👥 Total users: {user_count}")
        
    except Exception as e:
        print(f"❌ Error creating users: {e}")
        db.rollback()
    finally:
        db.close()
        
    print("✅ Database initialization complete!")

if __name__ == "__main__":
    initialize_database()