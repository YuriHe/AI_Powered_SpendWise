
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
from db import init_db, get_db_connection
import auth
import expenses
import categories

app = Flask(__name__)
# Update CORS configuration to explicitly allow frontend origin
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8080"]}})

# Register blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(expenses.bp)
app.register_blueprint(categories.bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

# Initialize the database within the application context
with app.app_context():
    init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Changed default port to 5001
    app.run(host='0.0.0.0', port=port, debug=True)
