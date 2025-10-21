#!/usr/bin/env python3

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))
POSTGRES_URI = os.getenv("POSTGRES_URI")

def get_otp_for_email(email):
    """Get the current OTP for a user's email"""
    
    if POSTGRES_URI:
        engine = create_engine(POSTGRES_URI)
        print("Using PostgreSQL database")
    else:
        engine = create_engine("sqlite:///./dev.db", connect_args={"check_same_thread": False})
        print("Using SQLite database")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT username, email, otp_code, otp_expires_at, is_verified 
                FROM users 
                WHERE email = :email
            """), {"email": email})
            
            user = result.fetchone()
            if user:
                print(f"\n🔍 User found:")
                print(f"   Username: {user[0]}")
                print(f"   Email: {user[1]}")
                print(f"   OTP Code: {user[2] or 'None'}")
                print(f"   OTP Expires: {user[3] or 'None'}")
                print(f"   Verified: {user[4]}")
                
                if user[2]:
                    print(f"\n🔢 Your OTP is: {user[2]}")
                    print(f"   Enter this in the verification form!")
                else:
                    print(f"\n❌ No OTP found for this email")
            else:
                print(f"\n❌ No user found with email: {email}")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    email = input("Enter email to check OTP: ").strip()
    if email:
        get_otp_for_email(email)
    else:
        print("No email provided")