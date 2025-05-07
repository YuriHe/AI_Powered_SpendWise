import os
import psycopg2
from psycopg2.extras import RealDictCursor
import click
from flask import g, current_app
from flask.cli import with_appcontext

def get_db_connection():
    """Connect to the PostgreSQL database server"""
    # Check if we're in an application context
    try:
        if 'db' not in g:
            # Get connection parameters from environment variables or use defaults
            host = os.environ.get('DB_HOST', 'localhost')
            database = os.environ.get('DB_NAME', 'expense_tracker')
            user = os.environ.get('DB_USER', 'postgres')
            password = os.environ.get('DB_PASSWORD', 'postgres')
            port = os.environ.get('DB_PORT', '5432')
            
            g.db = psycopg2.connect(
                host=host,
                database=database,
                user=user,
                password=password,
                port=port,
                cursor_factory=RealDictCursor
            )
        return g.db
    except RuntimeError:
        # If not in application context, create a direct connection
        host = os.environ.get('DB_HOST', 'localhost')
        database = os.environ.get('DB_NAME', 'expense_tracker')
        user = os.environ.get('DB_USER', 'postgres')
        password = os.environ.get('DB_PASSWORD', 'postgres')
        port = os.environ.get('DB_PORT', '5432')
        
        return psycopg2.connect(
            host=host,
            database=database,
            user=user,
            password=password,
            port=port,
            cursor_factory=RealDictCursor
        )

def close_db(e=None):
    """Close the database connection at the end of the request"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize the database schema"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Create users table
    cur.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        photo_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create categories table
    cur.execute('''
    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(50) NOT NULL,
        UNIQUE(name)
    )
    ''')
    
    # Create expenses table
    cur.execute('''
    CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date TIMESTAMP NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        notes TEXT,
        receipt_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Insert default categories
    default_categories = [
        ('Food', '#FF5733'),
        ('Transportation', '#33A8FF'),
        ('Housing', '#33FF57'),
        ('Entertainment', '#F033FF'),
        ('Utilities', '#FFFF33'),
        ('Healthcare', '#FF3333'),
        ('Shopping', '#33FFF0'),
        ('Education', '#8033FF'),
        ('Travel', '#FF8033'),
        ('Others', '#AAAAAA')
    ]
    
    for name, color in default_categories:
        try:
            cur.execute(
                'INSERT INTO categories (name, color) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING',
                (name, color)
            )
        except Exception as e:
            print(f"Error inserting category {name}: {e}")
            
    conn.commit()
    cur.close()
    conn.close()

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

def init_app(app):
    """Register database functions with the Flask app."""
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
