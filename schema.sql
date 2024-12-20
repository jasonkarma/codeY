-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_info;
DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS foods;
DROP TABLE IF EXISTS weight_history;

-- Create user_info table
CREATE TABLE user_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_calories_target INTEGER NOT NULL DEFAULT 2000,
    current_weight REAL NOT NULL DEFAULT 70.0,
    target_weight REAL NOT NULL DEFAULT 70.0,
    height INTEGER NOT NULL DEFAULT 170,
    age INTEGER NOT NULL DEFAULT 30,
    gender TEXT NOT NULL DEFAULT 'Not specified',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create workouts table
CREATE TABLE workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    calories_burned INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create foods table
CREATE TABLE foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    calories INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create weight_history table
CREATE TABLE weight_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight REAL NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default user info
INSERT INTO user_info (
    daily_calories_target,
    current_weight,
    target_weight,
    height,
    age,
    gender
) VALUES (
    2000,
    70.0,
    70.0,
    170,
    30,
    'Not specified'
);
