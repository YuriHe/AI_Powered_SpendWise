
from flask import Blueprint, request, jsonify, g
from db import get_db_connection
from auth import token_required

bp = Blueprint('categories', __name__, url_prefix='/api/categories')

@bp.route('', methods=['GET'])
@token_required
def get_categories():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('SELECT id, name, color FROM categories ORDER BY name')
    categories = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return jsonify({'categories': categories})

@bp.route('', methods=['POST'])
@token_required
def create_category():
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('color'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    name = data['name']
    color = data['color']
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if category with same name exists
        cur.execute('SELECT id FROM categories WHERE name = %s', (name,))
        if cur.fetchone():
            return jsonify({'message': 'Category with this name already exists'}), 409
        
        # Insert new category
        cur.execute(
            'INSERT INTO categories (name, color) VALUES (%s, %s) RETURNING id, name, color',
            (name, color)
        )
        
        new_category = cur.fetchone()
        conn.commit()
        
        return jsonify(new_category), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/<int:category_id>', methods=['PUT'])
@token_required
def update_category(category_id):
    data = request.get_json()
    
    if not data or (not data.get('name') and not data.get('color')):
        return jsonify({'message': 'Missing fields to update'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if category exists
        cur.execute('SELECT id FROM categories WHERE id = %s', (category_id,))
        if not cur.fetchone():
            return jsonify({'message': 'Category not found'}), 404
        
        # Build update query
        update_fields = []
        params = []
        
        if 'name' in data:
            update_fields.append('name = %s')
            params.append(data['name'])
            
            # Check if name already exists
            cur.execute('SELECT id FROM categories WHERE name = %s AND id != %s', (data['name'], category_id))
            if cur.fetchone():
                return jsonify({'message': 'Category with this name already exists'}), 409
        
        if 'color' in data:
            update_fields.append('color = %s')
            params.append(data['color'])
        
        if not update_fields:
            return jsonify({'message': 'No valid fields to update'}), 400
            
        params.append(category_id)
        
        # Update category
        cur.execute(
            f'UPDATE categories SET {", ".join(update_fields)} WHERE id = %s RETURNING id, name, color',
            params
        )
        
        updated_category = cur.fetchone()
        conn.commit()
        
        return jsonify(updated_category)
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/<int:category_id>', methods=['DELETE'])
@token_required
def delete_category(category_id):
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if category exists
        cur.execute('SELECT id FROM categories WHERE id = %s', (category_id,))
        if not cur.fetchone():
            return jsonify({'message': 'Category not found'}), 404
        
        # Check if category is being used
        cur.execute('SELECT COUNT(*) FROM expenses WHERE category_id = %s', (category_id,))
        if cur.fetchone()['count'] > 0:
            return jsonify({'message': 'Cannot delete category that is being used by expenses'}), 400
        
        # Delete category
        cur.execute('DELETE FROM categories WHERE id = %s', (category_id,))
        conn.commit()
        
        return jsonify({'message': 'Category deleted successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()
