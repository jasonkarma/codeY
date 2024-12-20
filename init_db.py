import sqlite3

def init_db():
    # Connect to database (creates it if it doesn't exist)
    connection = sqlite3.connect('fitness.db')
    
    try:
        # Read schema from file
        with open('schema.sql') as f:
            connection.executescript(f.read())
            
        print("Database initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        
    finally:
        connection.close()

if __name__ == '__main__':
    init_db()
