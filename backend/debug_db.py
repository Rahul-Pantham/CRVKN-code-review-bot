#!/usr/bin/env python3
"""
Debug script to check the repository review entries in the database
"""

import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))
POSTGRES_URI = os.getenv("POSTGRES_URI")

# Database setup
if POSTGRES_URI:
    db_uri = POSTGRES_URI
    engine = create_engine(db_uri, future=True)
else:
    db_uri = "sqlite:///./dev.db"
    engine = create_engine(db_uri, future=True, connect_args={"check_same_thread": False})

def check_repo_reviews():
    """Check repository reviews in the database."""
    print("Checking repository reviews in database...")
    
    try:
        with engine.connect() as conn:
            # Get all repository reviews
            result = conn.execute(text("""
                SELECT id, title, repository_url, repository_branch, total_files, 
                       length(file_reviews) as file_reviews_length,
                       substring(file_reviews from 1 for 200) as file_reviews_preview
                FROM reviews 
                WHERE is_repository_review = 'true'
                ORDER BY created_at DESC
                LIMIT 5
            """))
            
            reviews = result.fetchall()
            
            if not reviews:
                print("❌ No repository reviews found in database")
                return
            
            print(f"✅ Found {len(reviews)} repository reviews:")
            print("-" * 80)
            
            for review in reviews:
                print(f"ID: {review[0]}")
                print(f"Title: {review[1]}")
                print(f"Repository URL: {review[2]}")
                print(f"Branch: {review[3]}")
                print(f"Total Files: {review[4]}")
                print(f"File Reviews Length: {review[5]} characters")
                print(f"File Reviews Preview: {review[6]}...")
                print("-" * 80)
                
            # Get the latest one for detailed analysis
            if reviews:
                latest_id = reviews[0][0]
                print(f"\n🔍 Detailed analysis of latest repository review (ID: {latest_id}):")
                
                result = conn.execute(text("""
                    SELECT file_reviews FROM reviews WHERE id = :id
                """), {"id": latest_id})
                
                file_reviews_json = result.fetchone()[0]
                
                if file_reviews_json:
                    try:
                        file_reviews = json.loads(file_reviews_json)
                        print(f"✅ Successfully parsed JSON with {len(file_reviews)} files:")
                        
                        for i, file_review in enumerate(file_reviews):
                            print(f"  File {i+1}: {file_review.get('file_path', 'Unknown')}")
                            print(f"    Language: {file_review.get('language', 'Unknown')}")
                            print(f"    Rating: {file_review.get('rating', 'None')}")
                            print(f"    Review length: {len(file_review.get('review', ''))}")
                            print(f"    Code length: {len(file_review.get('original_code', ''))}")
                            
                    except json.JSONDecodeError as e:
                        print(f"❌ Failed to parse file_reviews JSON: {e}")
                        print(f"Raw content (first 500 chars): {file_reviews_json[:500]}")
                else:
                    print("❌ file_reviews is NULL or empty")
                
    except Exception as e:
        print(f"❌ Database check failed: {e}")

if __name__ == "__main__":
    check_repo_reviews()