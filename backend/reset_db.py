#!/usr/bin/env python3
"""
Database reset script to fix user authentication issues
"""

import sqlite3
import sys
import os
from passlib.context import CryptContext

# Add the backend directory to the path so we can import from main.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Initialize password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def reset_database():
    db_path = r"C:\Users\win11\OneDrive\Desktop\BOT\dev.db"
    
    if not os.path.exists(db_path):
        print("Database file not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Delete existing user if exists
        cursor.execute("DELETE FROM users WHERE username = 'vyshu'")
        
        # Create new user with proper password hash
        password_hash = get_password_hash("vyshu")  # Simple password matching username
        
        cursor.execute("""
            INSERT INTO users (username, hashed_password) 
            VALUES (?, ?)
        """, ("vyshu", password_hash))
        
        conn.commit()
        print("✅ Successfully reset user 'vyshu' with password 'vyshu'")
        print("You can now login with username: vyshu, password: vyshu")
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    reset_database()