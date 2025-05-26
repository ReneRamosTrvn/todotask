import os
import logging
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the app with the extension
db.init_app(app)

# Enable CORS for API endpoints
CORS(app)

# Define the Todo model directly here
class Todo(db.Model):
    __tablename__ = 'todos'
    
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(255), nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: __import__('datetime').datetime.utcnow(), nullable=False)
    
    def __repr__(self):
        return f'<Todo {self.id}: {self.text}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'completed': self.completed,
            'created_at': self.created_at.isoformat()
        }

# Create tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    """Render the main todo list page"""
    return render_template('index.html')

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """Get all todos"""
    try:
        todos = Todo.query.order_by(Todo.created_at.desc()).all()
        return jsonify({
            'success': True,
            'todos': [todo.to_dict() for todo in todos]
        })
    except Exception as e:
        app.logger.error(f"Error getting todos: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve todos'
        }), 500

@app.route('/api/todos', methods=['POST'])
def create_todo():
    """Create a new todo"""
    try:
        data = request.get_json()
        
        if not data or not data.get('text', '').strip():
            return jsonify({
                'success': False,
                'error': 'Todo text is required and cannot be empty'
            }), 400
        
        new_todo = Todo(text=data['text'].strip())
        db.session.add(new_todo)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'todo': new_todo.to_dict()
        }), 201
        
    except Exception as e:
        app.logger.error(f"Error creating todo: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to create todo'
        }), 500

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """Update a todo (toggle completion status)"""
    try:
        data = request.get_json()
        
        todo = Todo.query.get(todo_id)
        if not todo:
            return jsonify({
                'success': False,
                'error': 'Todo not found'
            }), 404
        
        if 'completed' in data:
            todo.completed = bool(data['completed'])
        
        if 'text' in data and data['text'].strip():
            todo.text = data['text'].strip()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'todo': todo.to_dict()
        })
        
    except Exception as e:
        app.logger.error(f"Error updating todo {todo_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to update todo'
        }), 500

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Delete a todo"""
    try:
        todo = Todo.query.get(todo_id)
        
        if not todo:
            return jsonify({
                'success': False,
                'error': 'Todo not found'
            }), 404
        
        db.session.delete(todo)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Todo deleted successfully'
        })
        
    except Exception as e:
        app.logger.error(f"Error deleting todo {todo_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete todo'
        }), 500

@app.route('/api/todos/clear-completed', methods=['DELETE'])
def clear_completed():
    """Clear all completed todos"""
    try:
        completed_todos = Todo.query.filter_by(completed=True).all()
        cleared_count = len(completed_todos)
        
        for todo in completed_todos:
            db.session.delete(todo)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Cleared {cleared_count} completed todos'
        })
        
    except Exception as e:
        app.logger.error(f"Error clearing completed todos: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to clear completed todos'
        }), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
