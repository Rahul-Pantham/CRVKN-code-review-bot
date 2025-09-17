from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import uuid
import traceback

# ------------------ Load Environment ------------------
load_dotenv(os.path.join(os.getcwd(), ".env_sep", "creds.env"))
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
POSTGRES_URI = os.getenv("POSTGRES_URI")
SECRET_KEY = os.getenv("SECRET_KEY", str(uuid.uuid4()))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    code = Column(Text)
    review = Column(Text)
    title = Column(String(200), nullable=True)
    optimized_code = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    security_issues = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

Base.metadata.create_all(bind=engine)

# ------------------ Gemini Setup ------------------
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

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

class FeedbackInput(BaseModel):
    review_id: int
    feedback: str
    rejection_reason: str | None = None

class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    username: str

# ------------------ Helpers ------------------
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

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

# ------------------ Routes ------------------
@app.get("/")
def read_root():
    return {"message": "✅ CRVKN Code Review API is running"}

@app.post("/register")
def register(user: UserCreate):
    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already registered")
        hashed_password = get_password_hash(user.password)
        new_user = User(username=user.username, hashed_password=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "User registered successfully"}
    finally:
        db.close()

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == form_data.username).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()

@app.post("/logout")
def logout():
    # Frontend must delete token from localStorage/session
    return {"message": "Logged out successfully"}

@app.post("/generate-review")
def generate_review(data: CodeInput, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        if not GOOGLE_API_KEY:
            review_text = "⚠️ Mock review: Add comments, handle edge cases, and write unit tests."
            optimized_code = data.code
            explanation_text = "Mock explanation (no AI)."
            security_issues = ""
        else:
            review_text = extract_text_from_gemini_response(
                model.generate_content(f"Give a short code review (max 5 bullet points):\n{data.code}")
            )
            optimized_code = extract_text_from_gemini_response(
                model.generate_content(f"Provide a clean and optimized version of this code only:\n{data.code}")
            )
            explanation_text = extract_text_from_gemini_response(
                model.generate_content("Explain the optimized code briefly in 2 sentences, simple and clear.")
            )
            security_issues = extract_text_from_gemini_response(
                model.generate_content(f"ist any security issues in 3 bullet points max:\n{data.code}")
            )

        new_review = Review(
            user_id=current_user.id,
            code=ensure_str(data.code),
            review=review_text.strip(),
            title=derive_title(review_text, data.code),
            optimized_code=optimized_code.strip(),
            explanation=explanation_text.strip(),
            security_issues=security_issues.strip(),
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
        }
    finally:
        db.close()

@app.post("/submit-feedback")
def submit_feedback(data: FeedbackInput, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == data.review_id, Review.user_id == current_user.id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        review.feedback = ensure_str(data.feedback)
        review.rejection_reason = ensure_str(data.rejection_reason)
        db.commit()
        return {"message": "Feedback submitted"}
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
        return {
            "id": review.id,
            "title": review.title,
            "code": review.code,
            "review": review.review,
            "optimized_code": review.optimized_code,
            "explanation": review.explanation,
            "security_issues": review.security_issues,
            "feedback": review.feedback,
            "rejection_reason": review.rejection_reason,
            "created_at": review.created_at.isoformat() if review.created_at else None,
        }
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
