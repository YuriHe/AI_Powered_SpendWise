
from flask import Blueprint, request, jsonify, g
import bcrypt
import jwt
import datetime
import os
import uuid
from functools import wraps
from db import get_db_connection

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')

def generate_token(user_id, email):
    """Generate a JWT token for the user"""
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        'iat': datetime.datetime.utcnow(),
        'sub': user_id,
        'email': email
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def token_required(f):
    """Decorator to protect routes that require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from the header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token is missing!'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Verify the token
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            
            # Get current user
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute('SELECT id, email, display_name, photo_url, created_at FROM users WHERE id = %s', 
                       (data['sub'],))
            current_user = cur.fetchone()
            cur.close()
            
            if current_user is None:
                return jsonify({'message': 'User not found!'}), 401
                
            # Store user in g object
            g.current_user = current_user
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(*args, **kwargs)
    return decorated

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields!'}), 400
    
    email = data['email']
    password = data['password']
    display_name = data.get('displayName')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check if user already exists
    cur.execute('SELECT * FROM users WHERE email = %s', (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'message': 'User already exists!'}), 409
    
    # Hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Insert the new user
    try:
        cur.execute(
            'INSERT INTO users (email, password_hash, display_name) VALUES (%s, %s, %s) RETURNING id, email, display_name, photo_url, created_at',
            (email, hashed_password.decode('utf-8'), display_name)
        )
        user = cur.fetchone()
        conn.commit()
        
        # Generate token
        token = generate_token(user['id'], user['email'])
        
        return jsonify({
            'token': token,
            'user': user
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
    
    email = data['email']
    password = data['password']
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Find user by email
    cur.execute('SELECT id, email, password_hash, display_name, photo_url, created_at FROM users WHERE email = %s', (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if not user:
        return jsonify({'message': 'Invalid credentials'}), 401
    
    # Check password
    if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        # Generate token
        token = generate_token(user['id'], user['email'])
        
        # Remove password hash from response
        user.pop('password_hash', None)
        
        return jsonify({
            'token': token,
            'user': user
        })
    
    return jsonify({'message': 'Invalid credentials'}), 401

@bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    return jsonify({'user': g.current_user})

@bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.get_json()
    user_id = g.current_user['id']
    
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    # Fields that can be updated
    updateable_fields = ['display_name', 'photo_url']
    update_data = {k: v for k, v in data.items() if k in updateable_fields and v is not None}
    
    if not update_data:
        return jsonify({'message': 'No valid fields to update'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Construct dynamic SQL update
        set_clause = ", ".join([f"{k.lower()} = %s" for k in update_data.keys()])
        values = list(update_data.values())
        values.append(user_id)
        
        # Update user
        cur.execute(
            f'UPDATE users SET {set_clause} WHERE id = %s RETURNING id, email, display_name, photo_url, created_at',
            values
        )
        updated_user = cur.fetchone()
        conn.commit()
        
        return jsonify({'user': updated_user})
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json()
    user_id = g.current_user['id']
    
    if not data or not data.get('currentPassword') or not data.get('newPassword'):
        return jsonify({'message': 'Missing current or new password'}), 400
    
    current_password = data['currentPassword']
    new_password = data['newPassword']
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get user's current password hash
        cur.execute('SELECT password_hash FROM users WHERE id = %s', (user_id,))
        user = cur.fetchone()
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Verify current password
        if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({'message': 'Current password is incorrect'}), 401
        
        # Hash the new password
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update the password
        cur.execute(
            'UPDATE users SET password_hash = %s WHERE id = %s',
            (new_password_hash.decode('utf-8'), user_id)
        )
        
        conn.commit()
        return jsonify({'message': 'Password changed successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()
