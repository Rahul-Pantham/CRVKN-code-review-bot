# PostgreSQL Database Setup Guide

## Current Issue
The backend is trying to connect to PostgreSQL but the column `improvement_suggestions` doesn't exist in the `reviews` table.

## Solution Steps

### Step 1: Set PostgreSQL Connection String

You need to set the `POSTGRES_URI` environment variable with your PostgreSQL credentials.

**Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

**Example:**
```
postgresql://postgres:mypassword@localhost:5432/code_review_db
```

### Step 2: Choose one of these methods:

#### Option A: Set Environment Variable (Recommended)

**Windows PowerShell:**
```powershell
$env:POSTGRES_URI="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/code_review_db"
```

**Windows Command Prompt:**
```cmd
set POSTGRES_URI=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/code_review_db
```

#### Option B: Create .env file in backend directory

Create a file named `.env` in the `backend` folder with:
```
POSTGRES_URI=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/code_review_db
GOOGLE_API_KEY=your_google_api_key_here
```

### Step 3: Run the Migration

After setting the POSTGRES_URI, run:

```powershell
cd backend
python migrate_postgres_improvement_suggestions.py
```

### Step 4: Restart the Server

```powershell
python main.py
```

## Common PostgreSQL Default Credentials

- **Username**: `postgres`
- **Password**: Usually set during PostgreSQL installation
- **Database**: `code_review_db` (needs to be created if doesn't exist)
- **Host**: `localhost`
- **Port**: `5432`

## Create Database if Needed

If the database doesn't exist, connect to PostgreSQL and create it:

```sql
CREATE DATABASE code_review_db;
```

## Verify PostgreSQL is Running

**Windows:**
- Check Services app for "postgresql" service
- Or run: `pg_isready -U postgres`

**Check if database exists:**
```powershell
psql -U postgres -l
```

## Need Help?

If you don't know your PostgreSQL password:
1. Check your PostgreSQL installation notes
2. Or reset it using `psql` or pgAdmin
3. Or let me know and I can help you set up PostgreSQL from scratch
