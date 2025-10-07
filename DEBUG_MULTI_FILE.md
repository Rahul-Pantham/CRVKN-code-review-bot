# Debugging Multi-File Upload Issue

## Expected Behavior
When uploading multiple files (e.g., test1.py and test2.js), the system should:
1. Process each file individually 
2. Generate separate reviews for each file
3. Display navigation controls (Previous/Next buttons)
4. Show "Review X of Y" indicator
5. Allow user to navigate through each review sequentially

## Current Issue
User reports that only one file is being reviewed when multiple files are uploaded.

## Debugging Steps

### 1. Check File Selection
Open browser console and upload 2 files (test1.py and test2.js). Look for these logs:
- "Added X files. Total files selected: Y" 
- Should show both files in the file list

### 2. Check File Processing
After clicking "Submit for Review", look for these logs:
- "Starting to process X files: [file1, file2]"
- "Processing file 1/2: filename"
- "Processing file 2/2: filename"
- "Successfully processed file: filename" (should appear twice)

### 3. Check Review Storage
After processing, look for these logs:
- "Setting review list with results: [array of reviews]"
- "Generated X reviews for Y files"
- "Current review index set to: 0"
- "Review list length: X"

### 4. Check UI Display
Look for these logs from getDisplayedArray:
- "getDisplayedArray called - reviewList: [array], currentReviewIndex: 0"
- "Showing review 1 of X: [review object]"

### 5. Check Navigation Controls
- Navigation should be visible when reviewList.length > 1
- Progress bar should show 50% for 1 of 2 reviews
- Previous button should be disabled, Next button should be enabled

## Potential Issues to Check

### Issue 1: Files Not Being Selected Properly
**Symptom**: Only 1 file shown in selectedFiles
**Cause**: File upload logic issue
**Debug**: Check if both files appear in console when selecting

### Issue 2: Files Being Processed But Reviews Not Stored
**Symptom**: Files processed but reviewList is empty or has only 1 item
**Cause**: API call failure or state update issue
**Debug**: Check network tab for API calls, check console for errors

### Issue 3: Reviews Stored But UI Not Updating
**Symptom**: reviewList has multiple items but only showing 1
**Cause**: getDisplayedArray logic or render issue
**Debug**: Check if getDisplayedArray is returning correct item

### Issue 4: Navigation Not Showing
**Symptom**: Reviews present but no navigation controls
**Cause**: Condition `reviewList.length > 1` failing
**Debug**: Check if reviewList.length is actually > 1

## Test Files Created
- test1.py: Simple Python function
- test2.js: Simple JavaScript function

## Steps to Test
1. Open application in browser
2. Open browser developer tools (F12)
3. Go to Console tab
4. Upload both test files
5. Click "Submit for Review"
6. Monitor console logs
7. Check if navigation appears
8. Try clicking Next/Previous buttons

## Expected Console Output
```
Added 2 files. Total files selected: 2
Starting to process 2 files: ["test1.py", "test2.js"]
Processing file 1/2: test1.py
Successfully processed file: test1.py
Processing file 2/2: test2.js
Successfully processed file: test2.js
Setting review list with results: [review1, review2]
Generated 2 reviews for 2 files
getDisplayedArray called - reviewList: [reviews], currentReviewIndex: 0
Showing review 1 of 2: [review object]
```

If any of these steps fail, that's where the issue is!