def hello_world():
    """This is a simple hello world function"""
    print("Hello, World!")
    return "Hello, World!"

# Call the function
if __name__ == "__main__":
    message = hello_world()
    print(f"Message: {message}")