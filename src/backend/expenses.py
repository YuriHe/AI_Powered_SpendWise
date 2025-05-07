
from flask import Blueprint, request, jsonify, g
from db import get_db_connection
from auth import token_required
from datetime import datetime
import uuid
import os

bp = Blueprint('expenses', __name__, url_prefix='/api/expenses')

def format_expense(expense_data, include_category=True):
    """Format expense data to match frontend expectations"""
    if not expense_data:
        return None
        
    expense = dict(expense_data)
    
    # Convert dates to ISO format for JSON serialization
    for date_field in ['date', 'created_at', 'updated_at']:
        if date_field in expense and expense[date_field]:
            expense[date_field] = expense[date_field].isoformat()
            
    return expense

@bp.route('', methods=['GET'])
@token_required
def get_expenses():
    user_id = g.current_user['id']
    
    # Parse filter parameters
    time_filter = request.args.get('timeFilter', 'current-month')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    categories = request.args.getlist('categories')
    min_amount = request.args.get('minAmount', type=float)
    max_amount = request.args.get('maxAmount', type=float)
    search_query = request.args.get('searchQuery')
    
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('pageSize', 10, type=int)
    offset = (page - 1) * page_size
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Base query
    query = """
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.user_id = %s
    """
    params = [user_id]
    
    # Apply time filter
    if time_filter == 'current-month':
        query += " AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)"
    elif time_filter == 'last-month':
        query += " AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')"
    elif time_filter == 'this-year':
        query += " AND DATE_TRUNC('year', e.date) = DATE_TRUNC('year', CURRENT_DATE)"
    elif time_filter == 'custom' and start_date:
        query += " AND e.date >= %s"
        params.append(start_date)
        if end_date:
            query += " AND e.date <= %s"
            params.append(end_date)
    
    # Apply category filter
    if categories and len(categories) > 0:
        categories_list = categories if isinstance(categories, list) else [categories]
        placeholders = ', '.join(['%s'] * len(categories_list))
        query += f" AND e.category_id IN (SELECT id FROM categories WHERE name IN ({placeholders}))"
        params.extend(categories_list)
    
    # Apply amount filters
    if min_amount is not None:
        query += " AND e.amount >= %s"
        params.append(min_amount)
    if max_amount is not None:
        query += " AND e.amount <= %s"
        params.append(max_amount)
    
    # Apply search query
    if search_query:
        query += " AND (e.title ILIKE %s OR e.notes ILIKE %s)"
        search_pattern = f"%{search_query}%"
        params.append(search_pattern)
        params.append(search_pattern)
    
    # Get total count
    count_query = f"SELECT COUNT(*) FROM ({query}) AS filtered_expenses"
    cur.execute(count_query, params)
    total_count = cur.fetchone()['count']
    
    # Apply sorting and pagination
    query += " ORDER BY e.date DESC LIMIT %s OFFSET %s"
    params.append(page_size)
    params.append(offset)
    
    # Execute query
    cur.execute(query, params)
    expenses = [format_expense(expense) for expense in cur.fetchall()]
    
    cur.close()
    conn.close()
    
    return jsonify({
        'expenses': expenses,
        'pagination': {
            'total': total_count,
            'page': page,
            'pageSize': page_size,
            'pages': (total_count + page_size - 1) // page_size
        }
    })

@bp.route('/<int:expense_id>', methods=['GET'])
@token_required
def get_expense(expense_id):
    user_id = g.current_user['id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT e.*, c.name as category_name, c.color as category_color
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.id = %s AND e.user_id = %s
    """, (expense_id, user_id))
    
    expense = cur.fetchone()
    cur.close()
    conn.close()
    
    if not expense:
        return jsonify({'message': 'Expense not found'}), 404
    
    return jsonify(format_expense(expense))

@bp.route('', methods=['POST'])
@token_required
def create_expense():
    user_id = g.current_user['id']
    data = request.get_json()
    
    required_fields = ['title', 'amount', 'date', 'categoryId']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Insert expense
        cur.execute("""
            INSERT INTO expenses (user_id, title, amount, date, category_id, notes, receipt_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, title, amount, date, category_id, notes, receipt_url, created_at, updated_at
        """, (
            user_id, 
            data['title'], 
            data['amount'], 
            data['date'], 
            data['categoryId'], 
            data.get('notes'), 
            data.get('receiptUrl')
        ))
        
        new_expense = cur.fetchone()
        
        # Get category details
        cur.execute("SELECT name, color FROM categories WHERE id = %s", (data['categoryId'],))
        category = cur.fetchone()
        if category:
            new_expense['category_name'] = category['name']
            new_expense['category_color'] = category['color']
            
        conn.commit()
        return jsonify(format_expense(new_expense)), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/<int:expense_id>', methods=['PUT'])
@token_required
def update_expense(expense_id):
    user_id = g.current_user['id']
    data = request.get_json()
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check if expense exists and belongs to user
    cur.execute("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (expense_id, user_id))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'message': 'Expense not found or access denied'}), 404
    
    # Updateable fields
    fields = {
        'title': data.get('title'),
        'amount': data.get('amount'),
        'date': data.get('date'),
        'category_id': data.get('categoryId'),
        'notes': data.get('notes'),
        'receipt_url': data.get('receiptUrl'),
        'updated_at': datetime.now()
    }
    
    # Remove None values
    fields = {k: v for k, v in fields.items() if v is not None}
    
    if not fields:
        cur.close()
        conn.close()
        return jsonify({'message': 'No valid fields to update'}), 400
    
    try:
        # Construct dynamic SQL update
        set_clause = ", ".join([f"{k} = %s" for k in fields.keys()])
        values = list(fields.values())
        values.append(expense_id)
        values.append(user_id)
        
        # Update expense
        cur.execute(
            f"""
            UPDATE expenses SET {set_clause} 
            WHERE id = %s AND user_id = %s
            RETURNING id, user_id, title, amount, date, category_id, notes, receipt_url, created_at, updated_at
            """,
            values
        )
        
        updated_expense = cur.fetchone()
        
        # Get category details
        if updated_expense and updated_expense['category_id']:
            cur.execute("SELECT name, color FROM categories WHERE id = %s", (updated_expense['category_id'],))
            category = cur.fetchone()
            if category:
                updated_expense['category_name'] = category['name']
                updated_expense['category_color'] = category['color']
                
        conn.commit()
        return jsonify(format_expense(updated_expense))
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/<int:expense_id>', methods=['DELETE'])
@token_required
def delete_expense(expense_id):
    user_id = g.current_user['id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if expense exists and belongs to user
        cur.execute("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (expense_id, user_id))
        if not cur.fetchone():
            return jsonify({'message': 'Expense not found or access denied'}), 404
        
        # Delete the expense
        cur.execute("DELETE FROM expenses WHERE id = %s AND user_id = %s", (expense_id, user_id))
        conn.commit()
        
        return jsonify({'message': 'Expense deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

@bp.route('/summary', methods=['GET'])
@token_required
def get_expense_summary():
    user_id = g.current_user['id']
    
    # Parse filter parameters
    time_filter = request.args.get('timeFilter', 'current-month')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Date filter clause
    date_filter = ""
    params = [user_id]
    
    if time_filter == 'current-month':
        date_filter = "AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)"
    elif time_filter == 'last-month':
        date_filter = "AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')"
    elif time_filter == 'this-year':
        date_filter = "AND DATE_TRUNC('year', e.date) = DATE_TRUNC('year', CURRENT_DATE)"
    elif time_filter == 'custom' and start_date:
        date_filter = "AND e.date >= %s"
        params.append(start_date)
        if end_date:
            date_filter += " AND e.date <= %s"
            params.append(end_date)
    
    # Get total expenses
    cur.execute(
        f"SELECT COALESCE(SUM(amount), 0) as total FROM expenses e WHERE user_id = %s {date_filter}",
        params
    )
    total_amount = cur.fetchone()['total']
    
    # Get expenses by category
    cur.execute(
        f"""
        SELECT 
            c.id,
            c.name,
            c.color,
            COALESCE(SUM(e.amount), 0) as amount,
            COUNT(e.id) as count
        FROM categories c
        LEFT JOIN expenses e ON c.id = e.category_id AND e.user_id = %s {date_filter}
        GROUP BY c.id, c.name, c.color
        ORDER BY amount DESC
        """,
        params
    )
    
    categories = []
    for row in cur.fetchall():
        categories.append({
            'id': row['id'],
            'name': row['name'],
            'color': row['color'],
            'amount': float(row['amount']),
            'count': row['count'],
            'percentage': float(row['amount'] / total_amount * 100) if total_amount > 0 else 0
        })
    
    # Get recent expenses
    cur.execute(
        f"""
        SELECT e.*, c.name as category_name, c.color as category_color
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = %s {date_filter}
        ORDER BY e.date DESC
        LIMIT 5
        """,
        params
    )
    
    recent_expenses = [format_expense(expense) for expense in cur.fetchall()]
    
    cur.close()
    conn.close()
    
    return jsonify({
        'total': float(total_amount),
        'byCategory': categories,
        'recentExpenses': recent_expenses
    })
