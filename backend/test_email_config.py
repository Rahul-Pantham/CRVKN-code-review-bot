#!/usr/bin/env python3
"""
Test script to verify email configuration is working
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)

def test_email():
    """Test email configuration by sending a test email"""
    
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("❌ Email credentials not configured!")
        print("Please add SMTP_USERNAME and SMTP_PASSWORD to your .env_sep/creds.env file")
        return False
    
    print(f"📧 Testing email configuration...")
    print(f"   SMTP Server: {SMTP_SERVER}:{SMTP_PORT}")
    print(f"   Username: {SMTP_USERNAME}")
    print(f"   From Email: {FROM_EMAIL}")
    
    try:
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = SMTP_USERNAME  # Send to yourself
        msg['Subject'] = "CRVKN - Email Configuration Test"
        
        body = """
        ✅ Congratulations! 
        
        Your email configuration is working correctly!
        You will now receive OTP codes for user registration.
        
        Best regards,
        CRVKN Code Review Bot
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, SMTP_USERNAME, text)
        server.quit()
        
        print("✅ Email sent successfully!")
        print(f"   Check your inbox: {SMTP_USERNAME}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        print("\n💡 Common issues:")
        print("   - Wrong App Password (should be 16 digits)")
        print("   - 2-Factor Authentication not enabled")
        print("   - App Password not generated")
        print("   - Incorrect Gmail address")
        return False

if __name__ == "__main__":
    print("🧪 CRVKN Email Configuration Test")
    print("=" * 40)
    test_email()