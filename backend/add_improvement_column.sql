-- SQL Script to add improvement_suggestions column to reviews table
-- Run this in your PostgreSQL client (pgAdmin, psql, or any SQL tool)

-- Add the improvement_suggestions column to the reviews table
ALTER TABLE reviews 
ADD COLUMN improvement_suggestions TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reviews' 
AND column_name = 'improvement_suggestions';
