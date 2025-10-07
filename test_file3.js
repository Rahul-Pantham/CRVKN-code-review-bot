function processArray(arr) {
    // This function has some issues that need fixing
    let result = [];
    
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > 0) {
            result.push(arr[i] * 2);
        }
    }
    
    return result;
}

// Test the function
const numbers = [1, -2, 3, -4, 5];
const processed = processArray(numbers);
console.log(processed);