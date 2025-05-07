
# Expense Tracker Backend

This is the backend API for the Expense Tracker application.

## Setup

### Prerequisites

- Python 3.8+
- PostgreSQL database

### Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on `.env.example` and update with your actual values.

5. Create the PostgreSQL database:
   ```sql
   CREATE DATABASE expense_tracker;
   ```

6. Run the application:
   ```bash
   python app.py
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/profile` - Get user profile (requires authentication)
- `PUT /api/auth/profile` - Update user profile (requires authentication)

### Expenses

- `GET /api/expenses` - List expenses with filtering and pagination
- `GET /api/expenses/{id}` - Get a specific expense
- `POST /api/expenses` - Create a new expense
- `PUT /api/expenses/{id}` - Update an expense
- `DELETE /api/expenses/{id}` - Delete an expense
- `GET /api/expenses/summary` - Get expense summary statistics

### Categories

- `GET /api/categories` - List all expense categories
- `POST /api/categories` - Create a new category
- `PUT /api/categories/{id}` - Update a category
- `DELETE /api/categories/{id}` - Delete a category

## Authentication

The API uses JWT for authentication. Include the JWT token in the `Authorization` header for protected endpoints:

```
Authorization: Bearer your-jwt-token
```
