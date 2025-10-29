#!/usr/bin/env python3
"""
Reset database - removes all users and data
Run this to clear any old test data on Render
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, 'backend')

# Try to import and connect
try:
    from main import SessionLocal, Base, engine, User, Review
    
    print("🔄 Resetting database...")
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("✅ Dropped all tables")
    
    # Recreate tables
    Base.metadata.create_all(bind=engine)
    print("✅ Recreated all tables")
    
    # Verify
    db = SessionLocal()
    user_count = db.query(User).count()
    review_count = db.query(Review).count()
    db.close()
    
    print(f"\n📊 Database status:")
    print(f"   Users: {user_count}")
    print(f"   Reviews: {review_count}")
    print(f"\n✅ Database reset complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
