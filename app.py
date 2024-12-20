# Main application file for Health and Fitness Tracker

from flask import Flask, send_from_directory
from routes import routes
import logging
import os

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for testing
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# Register the blueprint
app.register_blueprint(routes)

# Add favicon route
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Add error handlers
@app.errorhandler(404)
def not_found_error(error):
    logger.error(f"404 error: {error}")
    return {'error': 'Not Found'}, 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {error}")
    return {'error': 'Internal Server Error'}, 500

if __name__ == '__main__':
    print("\n=== Starting Flask application ===")
    print("\nRegistered Routes:")
    print("-" * 80)
    
    # Sort routes by URL for better readability
    routes_info = []
    for rule in app.url_map.iter_rules():
        routes_info.append({
            'endpoint': rule.endpoint,
            'methods': sorted(list(rule.methods)),
            'url': rule.rule
        })
    
    # Sort by URL
    routes_info.sort(key=lambda x: x['url'])
    
    # Print routes in a table format
    print(f"{'Endpoint':<30} {'Methods':<20} {'URL':<30}")
    print("-" * 80)
    for route in routes_info:
        print(f"{route['endpoint']:<30} {','.join(route['methods']):<20} {route['url']:<30}")
    print("-" * 80)
    
    print("\nStarting server...")
    app.run(debug=True, host='127.0.0.1', port=5000)
