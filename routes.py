from flask import Blueprint, render_template, request, jsonify, g
import sqlite3
from datetime import datetime, timedelta

routes = Blueprint('routes', __name__)
DATABASE = 'fitness.db'

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@routes.teardown_app_request
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

@routes.route('/')
def home():
    return render_template('index.html')

@routes.route('/home_data')
def home_data():
    try:
        db = get_db()
        workouts = get_todays_workouts(db)
        foods = get_todays_foods(db)
        daily_summary = calculate_daily_summary(db)
        weekly_data = get_weekly_data(db)
        stats = calculate_stats(db)
        
        return jsonify({
            'success': True,
            'workouts': workouts,
            'foods': foods,
            'daily_summary': daily_summary,
            'weekly_data': weekly_data,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_todays_workouts(db):
    cursor = db.cursor()
    cursor.execute('''
        SELECT id, type, duration, calories_burned, created_at 
        FROM workouts 
        WHERE date(created_at, 'localtime') = date('now', 'localtime')
        ORDER BY created_at DESC
    ''')
    
    workouts = []
    for row in cursor.fetchall():
        workouts.append({
            'id': row[0],
            'type': row[1],
            'duration': row[2],
            'calories_burned': row[3],
            'created_at': row[4]
        })
    return workouts

def get_todays_foods(db):
    cursor = db.cursor()
    cursor.execute('''
        SELECT id, description, calories, created_at 
        FROM foods 
        WHERE date(created_at, 'localtime') = date('now', 'localtime')
        ORDER BY created_at DESC
    ''')
    
    foods = []
    for row in cursor.fetchall():
        foods.append({
            'id': row[0],
            'description': row[1],
            'calories': row[2],
            'created_at': row[3]
        })
    return foods

@routes.route('/log_workout', methods=['POST'])
def log_workout():
    workout_type = request.form.get('type')
    duration = request.form.get('duration')
    
    try:
        duration = int(duration)
        if not workout_type or duration <= 0:
            return jsonify({'error': 'Invalid workout data'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid duration'}), 400
    
    calories_burned = calculate_calories_burned(workout_type, duration)
    
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('''
            INSERT INTO workouts (type, duration, calories_burned, created_at)
            VALUES (?, ?, ?, datetime('now', 'localtime'))
        ''', (workout_type, duration, calories_burned))
        db.commit()
        
        # Get updated data
        workouts = get_todays_workouts(db)
        daily_summary = calculate_daily_summary(db)
        stats = calculate_stats(db)
        
        return jsonify({
            'success': True,
            'workouts': workouts,
            'daily_summary': daily_summary,
            'stats': stats
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

@routes.route('/log_food', methods=['POST'])
def log_food():
    description = request.form.get('food_description', '').strip()
    
    if not description:
        return jsonify({'error': 'Invalid food data'}), 400
    
    calories = calculate_food_calories(description)
    
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('''
            INSERT INTO foods (description, calories, created_at)
            VALUES (?, ?, datetime('now', 'localtime'))
        ''', (description, calories))
        db.commit()
        
        # Get updated data
        foods = get_todays_foods(db)
        daily_summary = calculate_daily_summary(db)
        stats = calculate_stats(db)
        
        return jsonify({
            'success': True,
            'foods': foods,
            'daily_summary': daily_summary,
            'stats': stats
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

@routes.route('/get_data')
def get_data():
    try:
        db = get_db()
        workouts = get_todays_workouts(db)
        foods = get_todays_foods(db)
        daily_summary = calculate_daily_summary(db)
        stats = calculate_stats(db)
        
        cursor = db.cursor()
        cursor.execute('''
            SELECT daily_calories_target, current_weight, target_weight
            FROM user_info
            ORDER BY created_at DESC
            LIMIT 1
        ''')
        row = cursor.fetchone()
        
        user_info = None
        if row:
            user_info = {
                'daily_calories_target': row[0],
                'current_weight': row[1],
                'target_weight': row[2]
            }
        else:
            # Return default values if no user info exists
            user_info = {
                'daily_calories_target': 2000,
                'current_weight': None,
                'target_weight': None
            }
        
        return jsonify({
            'success': True,
            'workouts': workouts,
            'foods': foods,
            'daily_summary': daily_summary,
            'stats': stats,
            'user_info': user_info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def calculate_daily_summary(db):
    cursor = db.cursor()
    
    # Get today's calories consumed
    cursor.execute('''
        SELECT COALESCE(SUM(calories), 0)
        FROM foods
        WHERE date(created_at, 'localtime') = date('now', 'localtime')
    ''')
    calories_consumed = cursor.fetchone()[0]
    
    # Get today's calories burned
    cursor.execute('''
        SELECT COALESCE(SUM(calories_burned), 0)
        FROM workouts
        WHERE date(created_at, 'localtime') = date('now', 'localtime')
    ''')
    calories_burned = cursor.fetchone()[0]
    
    # Get daily target
    cursor.execute('''
        SELECT daily_calories_target
        FROM user_info
        ORDER BY created_at DESC
        LIMIT 1
    ''')
    row = cursor.fetchone()
    daily_target = row[0] if row else 2000
    
    return {
        'calories_consumed': round(calories_consumed),
        'calories_burned': round(calories_burned),
        'net_calories': round(calories_consumed - calories_burned),
        'daily_target': daily_target
    }

def calculate_stats(db):
    cursor = db.cursor()
    
    # Get daily calories for the last 7 days
    cursor.execute('''
        WITH RECURSIVE dates(date) AS (
            SELECT date('now', 'localtime', '-6 days')
            UNION ALL
            SELECT date(date, '+1 day')
            FROM dates
            WHERE date < date('now', 'localtime')
        ),
        daily_foods AS (
            SELECT date(created_at, 'localtime') as day, SUM(calories) as consumed
            FROM foods
            WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
            GROUP BY date(created_at, 'localtime')
        ),
        daily_workouts AS (
            SELECT date(created_at, 'localtime') as day, SUM(calories_burned) as burned
            FROM workouts
            WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
            GROUP BY date(created_at, 'localtime')
        )
        SELECT 
            dates.date,
            COALESCE(daily_foods.consumed, 0) as consumed,
            COALESCE(daily_workouts.burned, 0) as burned
        FROM dates
        LEFT JOIN daily_foods ON dates.date = daily_foods.day
        LEFT JOIN daily_workouts ON dates.date = daily_workouts.day
        ORDER BY dates.date
    ''')
    
    daily_data = {}
    for row in cursor.fetchall():
        day = row[0]
        if day not in daily_data:
            daily_data[day] = {'calories': 0, 'burned': 0}
        daily_data[day]['calories'] += row[1]
        daily_data[day]['burned'] += row[2]
    
    # Calculate daily arrays for the chart
    daily_calories = []
    daily_burned = []
    total_calories = 0
    total_burned = 0
    days_with_data = 0
    
    for i in range(7):
        date = datetime.now().date() - timedelta(days=i)
        date_str = date.strftime('%Y-%m-%d')
        if date_str in daily_data:
            daily_calories.insert(0, daily_data[date_str]['calories'])
            daily_burned.insert(0, daily_data[date_str]['burned'])
            if daily_data[date_str]['calories'] > 0:
                total_calories += daily_data[date_str]['calories']
                days_with_data += 1
            total_burned += daily_data[date_str]['burned']
        else:
            daily_calories.insert(0, 0)
            daily_burned.insert(0, 0)
    
    # Calculate averages
    avg_calories = round(total_calories / max(days_with_data, 1))
    avg_burned = round(total_burned / 7)
    
    # Get user info
    cursor.execute('''
        SELECT daily_calories_target, current_weight, target_weight
        FROM user_info
        ORDER BY created_at DESC
        LIMIT 1
    ''')
    row = cursor.fetchone()
    if row:
        daily_target = row[0]
        current_weight = row[1]
        target_weight = row[2]
    else:
        daily_target = 2000
        current_weight = None
        target_weight = None
    
    return {
        'daily_calories': daily_calories,
        'daily_burned': daily_burned,
        'weekly_average': avg_calories,
        'avg_calories_consumed': avg_calories,
        'avg_calories_burned': avg_burned,
        'daily_target': daily_target,
        'current_weight': current_weight,
        'target_weight': target_weight
    }

def get_weekly_data(db):
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=6)
    
    cursor = db.cursor()
    cursor.execute('''
        WITH RECURSIVE dates(date) AS (
            SELECT date('now', 'localtime', '-6 days')
            UNION ALL
            SELECT date(date, '+1 day')
            FROM dates
            WHERE date < date('now', 'localtime')
        ),
        daily_foods AS (
            SELECT date(created_at, 'localtime') as day, SUM(calories) as consumed
            FROM foods
            WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
            GROUP BY date(created_at, 'localtime')
        ),
        daily_workouts AS (
            SELECT date(created_at, 'localtime') as day, SUM(calories_burned) as burned
            FROM workouts
            WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
            GROUP BY date(created_at, 'localtime')
        )
        SELECT 
            dates.date,
            COALESCE(daily_foods.consumed, 0) as consumed,
            COALESCE(daily_workouts.burned, 0) as burned
        FROM dates
        LEFT JOIN daily_foods ON dates.date = daily_foods.day
        LEFT JOIN daily_workouts ON dates.date = daily_workouts.day
        ORDER BY dates.date
    ''')
    
    result = {}
    for row in cursor.fetchall():
        result[row[0]] = {
            'consumed': row[1],
            'burned': row[2]
        }
    return result

@routes.route('/get_user_info')
def get_user_info():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT daily_calories_target, current_weight, target_weight, height, age, gender
        FROM user_info 
        ORDER BY created_at DESC 
        LIMIT 1
    ''')
    row = cursor.fetchone()
    
    if row:
        return jsonify({
            'daily_calories_target': row[0],
            'current_weight': row[1],
            'target_weight': row[2],
            'height': row[3],
            'age': row[4],
            'gender': row[5]
        })
    
    return jsonify({
        'daily_calories_target': 2000,
        'current_weight': 70,
        'target_weight': 70,
        'height': 170,
        'age': 30,
        'gender': 'Not specified'
    })

@routes.route('/update_user_info', methods=['POST'])
def update_user_info():
    try:
        daily_calories_target = request.form.get('daily_calories_target')
        current_weight = request.form.get('current_weight')
        target_weight = request.form.get('target_weight')
        
        # Log received data
        print(f'Received user info update: calories={daily_calories_target}, current={current_weight}, target={target_weight}')
        
        # Validate required fields
        if not daily_calories_target or not current_weight or not target_weight:
            print('Missing required fields')
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
            
        # Convert to appropriate types
        try:
            daily_calories_target = int(daily_calories_target)
            current_weight = float(current_weight)
            target_weight = float(target_weight)
        except ValueError as e:
            print(f'Value conversion error: {e}')
            return jsonify({
                'success': False,
                'error': 'Invalid field values. Please check your input.'
            }), 400
        
        # Validate ranges
        if daily_calories_target < 1000 or daily_calories_target > 10000:
            print(f'Invalid calories target: {daily_calories_target}')
            return jsonify({
                'success': False,
                'error': 'Daily calories target must be between 1000 and 10000'
            }), 400
            
        if current_weight < 20 or current_weight > 300:
            print(f'Invalid current weight: {current_weight}')
            return jsonify({
                'success': False,
                'error': 'Current weight must be between 20 and 300 kg'
            }), 400
            
        if target_weight < 20 or target_weight > 300:
            print(f'Invalid target weight: {target_weight}')
            return jsonify({
                'success': False,
                'error': 'Target weight must be between 20 and 300 kg'
            }), 400
        
        db = get_db()
        cursor = db.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO user_info (daily_calories_target, current_weight, target_weight, created_at)
                VALUES (?, ?, ?, datetime('now', 'localtime'))
            ''', (daily_calories_target, current_weight, target_weight))
            db.commit()
            
            # Get updated user info
            cursor.execute('''
                SELECT daily_calories_target, current_weight, target_weight
                FROM user_info 
                ORDER BY created_at DESC 
                LIMIT 1
            ''')
            row = cursor.fetchone()
            
            user_info = {
                'daily_calories_target': row[0],
                'current_weight': row[1],
                'target_weight': row[2]
            }
            
            print(f'User info updated successfully: {user_info}')
            return jsonify({
                'success': True,
                'user_info': user_info
            })
        except Exception as e:
            print(f'Database error: {e}')
            db.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    except Exception as e:
        print(f'Server error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

@routes.route('/edit_workout', methods=['POST'])
def edit_workout():
    try:
        workout_id = request.form.get('id')
        workout_type = request.form.get('type')
        duration = request.form.get('duration')
        
        if not workout_id or not workout_type or not duration:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
        
        calories_burned = calculate_calories_burned(workout_type, int(duration))
        
        db = get_db()
        cursor = db.cursor()
        
        try:
            cursor.execute('''
                UPDATE workouts
                SET type = ?, duration = ?, calories_burned = ?
                WHERE id = ?
            ''', (workout_type, duration, calories_burned, workout_id))
            db.commit()
            
            # Get updated data
            workouts = get_todays_workouts(db)
            daily_summary = calculate_daily_summary(db)
            stats = calculate_stats(db)
            
            return jsonify({
                'success': True,
                'workouts': workouts,
                'daily_summary': daily_summary,
                'stats': stats
            })
        except Exception as e:
            db.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@routes.route('/delete_workout', methods=['POST'])
def delete_workout():
    try:
        workout_id = request.form.get('id')
        
        if not workout_id:
            return jsonify({
                'success': False,
                'error': 'Missing workout ID'
            }), 400
        
        db = get_db()
        cursor = db.cursor()
        
        try:
            cursor.execute('DELETE FROM workouts WHERE id = ?', (workout_id,))
            db.commit()
            
            # Get updated data
            workouts = get_todays_workouts(db)
            daily_summary = calculate_daily_summary(db)
            stats = calculate_stats(db)
            
            return jsonify({
                'success': True,
                'workouts': workouts,
                'daily_summary': daily_summary,
                'stats': stats
            })
        except Exception as e:
            db.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@routes.route('/edit_food', methods=['POST'])
def edit_food():
    try:
        food_id = request.form.get('id')
        description = request.form.get('description')
        
        if not food_id or not description:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
        
        calories = calculate_food_calories(description)
        
        db = get_db()
        cursor = db.cursor()
        
        try:
            cursor.execute('''
                UPDATE foods
                SET description = ?, calories = ?
                WHERE id = ?
            ''', (description, calories, food_id))
            db.commit()
            
            # Get updated data
            foods = get_todays_foods(db)
            daily_summary = calculate_daily_summary(db)
            stats = calculate_stats(db)
            
            return jsonify({
                'success': True,
                'foods': foods,
                'daily_summary': daily_summary,
                'stats': stats
            })
        except Exception as e:
            db.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@routes.route('/delete_food', methods=['POST'])
def delete_food():
    try:
        food_id = request.form.get('id')
        
        if not food_id:
            return jsonify({
                'success': False,
                'error': 'Missing food ID'
            }), 400
        
        db = get_db()
        cursor = db.cursor()
        
        try:
            cursor.execute('DELETE FROM foods WHERE id = ?', (food_id,))
            db.commit()
            
            # Get updated data
            foods = get_todays_foods(db)
            daily_summary = calculate_daily_summary(db)
            stats = calculate_stats(db)
            
            return jsonify({
                'success': True,
                'foods': foods,
                'daily_summary': daily_summary,
                'stats': stats
            })
        except Exception as e:
            db.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def calculate_calories_burned(workout_type, duration):
    # Simplified calorie calculation based on workout type
    calories_per_minute = {
        'Running': 10,
        'Walking': 5,
        'Cycling': 7,
        'Swimming': 9,
        'Yoga': 3,
        'Strength Training': 8
    }
    return duration * calories_per_minute.get(workout_type, 5)

def calculate_food_calories(description):
    # Simplified calorie calculation based on food description
    common_foods = {
        'Apple': 95,
        'Banana': 105,
        'Orange': 62,
        'Sandwich': 300,
        'Salad': 100,
        'Rice': 200,
        'Chicken': 335,
        'Fish': 206,
        'Egg': 78
    }
    
    for food, calories in common_foods.items():
        if food.lower() in description.lower():
            return calories
    return 200  # Default calories if no match found
