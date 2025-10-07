// Test file 2 - Simple JavaScript function
function multiplyNumbers(x, y) {
    if (x === 0 || y === 0) {
        return 0;
    }
    return x * y;
}

const result = multiplyNumbers(4, 7);
console.log(`Product: ${result}`);