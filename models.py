from datetime import datetime

# We'll set this up when the app is created
db = None

class Todo:
    """Placeholder class that will be replaced with the actual model"""
    pass

def setup_models(database):
    """Set up the models with the database instance"""
    global db, Todo
    db = database
    
    # Define the actual Todo model
    class TodoModel(db.Model):
        __tablename__ = 'todos'
        
        id = db.Column(db.Integer, primary_key=True)
        text = db.Column(db.String(255), nullable=False)
        completed = db.Column(db.Boolean, default=False, nullable=False)
        created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
        
        def __repr__(self):
            return f'<Todo {self.id}: {self.text}>'
        
        def to_dict(self):
            return {
                'id': self.id,
                'text': self.text,
                'completed': self.completed,
                'created_at': self.created_at.isoformat()
            }
    
    # Replace the placeholder Todo class
    Todo = TodoModel
    return TodoModel