class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadTodos();
    }

    initializeElements() {
        // Form elements
        this.todoForm = document.getElementById('todo-form');
        this.todoInput = document.getElementById('todo-input');
        this.addBtn = document.getElementById('add-btn');
        
        // Display elements
        this.todoList = document.getElementById('todo-list');
        this.todoCount = document.getElementById('todo-count');
        this.emptyState = document.getElementById('empty-state');
        this.loading = document.getElementById('loading');
        
        // Filter elements
        this.filterButtons = document.querySelectorAll('input[name="filter"]');
        this.clearCompletedBtn = document.getElementById('clear-completed');
        
        // Alert elements
        this.errorAlert = document.getElementById('error-alert');
        this.successAlert = document.getElementById('success-alert');
        this.errorMessage = document.getElementById('error-message');
        this.successMessage = document.getElementById('success-message');
        this.inputError = document.getElementById('input-error');
    }

    bindEvents() {
        // Form submission
        this.todoForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Filter changes
        this.filterButtons.forEach(button => {
            button.addEventListener('change', (e) => this.handleFilterChange(e));
        });
        
        // Clear completed button
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        
        // Input validation
        this.todoInput.addEventListener('input', () => this.clearInputError());
    }

    async makeRequest(url, options = {}) {
        try {
            this.setLoading(true);
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            this.showError(error.message);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    async loadTodos() {
        try {
            const data = await this.makeRequest('/api/todos');
            this.todos = data.todos;
            this.renderTodos();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load todos:', error);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const text = this.todoInput.value.trim();
        if (!text) {
            this.showInputError('Please enter a task');
            return;
        }

        try {
            const data = await this.makeRequest('/api/todos', {
                method: 'POST',
                body: JSON.stringify({ text })
            });
            
            this.todos.push(data.todo);
            this.todoInput.value = '';
            this.renderTodos();
            this.updateStats();
            this.showSuccess('Task added successfully!');
            
            // Focus back to input for better UX
            this.todoInput.focus();
        } catch (error) {
            console.error('Failed to add todo:', error);
        }
    }

    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        try {
            const data = await this.makeRequest(`/api/todos/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ completed: !todo.completed })
            });
            
            // Update local todo
            Object.assign(todo, data.todo);
            this.renderTodos();
            this.updateStats();
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    }

    async deleteTodo(id) {
        try {
            await this.makeRequest(`/api/todos/${id}`, {
                method: 'DELETE'
            });
            
            this.todos = this.todos.filter(t => t.id !== id);
            this.renderTodos();
            this.updateStats();
            this.showSuccess('Task deleted successfully!');
        } catch (error) {
            console.error('Failed to delete todo:', error);
        }
    }

    async clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        if (completedCount === 0) return;

        try {
            await this.makeRequest('/api/todos/clear-completed', {
                method: 'DELETE'
            });
            
            this.todos = this.todos.filter(t => !t.completed);
            this.renderTodos();
            this.updateStats();
            this.showSuccess(`Cleared ${completedCount} completed tasks!`);
        } catch (error) {
            console.error('Failed to clear completed todos:', error);
        }
    }

    handleFilterChange(e) {
        this.currentFilter = e.target.value;
        this.renderTodos();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const filteredTodos = this.getFilteredTodos();
        
        if (filteredTodos.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        
        this.todoList.innerHTML = filteredTodos.map(todo => `
            <div class="card mb-2 todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="card-body py-3">
                    <div class="d-flex align-items-center">
                        <div class="form-check me-3">
                            <input 
                                class="form-check-input todo-checkbox" 
                                type="checkbox" 
                                ${todo.completed ? 'checked' : ''}
                                data-id="${todo.id}"
                            >
                        </div>
                        <div class="flex-grow-1">
                            <span class="todo-text ${todo.completed ? 'text-decoration-line-through text-muted' : ''}">${this.escapeHtml(todo.text)}</span>
                        </div>
                        <button class="btn btn-outline-danger btn-sm delete-btn" data-id="${todo.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Bind events for new elements
        this.bindTodoEvents();
    }

    bindTodoEvents() {
        // Checkbox events
        document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.toggleTodo(id);
            });
        });
        
        // Delete button events
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.delete-btn').dataset.id);
                this.deleteTodo(id);
            });
        });
    }

    updateStats() {
        const activeCount = this.todos.filter(t => !t.completed).length;
        const completedCount = this.todos.filter(t => t.completed).length;
        
        // Update counter
        this.todoCount.textContent = `${activeCount} ${activeCount === 1 ? 'item' : 'items'} left`;
        
        // Show/hide clear completed button
        if (completedCount > 0) {
            this.clearCompletedBtn.style.display = 'inline-block';
        } else {
            this.clearCompletedBtn.style.display = 'none';
        }
    }

    showEmptyState() {
        this.todoList.style.display = 'none';
        this.emptyState.style.display = 'block';
    }

    hideEmptyState() {
        this.todoList.style.display = 'block';
        this.emptyState.style.display = 'none';
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.loading.style.display = loading ? 'block' : 'none';
        this.addBtn.disabled = loading;
        
        if (loading) {
            this.addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span class="d-none d-sm-inline ms-1">Adding...</span>';
        } else {
            this.addBtn.innerHTML = '<i class="fas fa-plus"></i><span class="d-none d-sm-inline ms-1">Add Task</span>';
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.style.display = 'block';
        setTimeout(() => {
            this.errorAlert.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.successAlert.style.display = 'block';
        setTimeout(() => {
            this.successAlert.style.display = 'none';
        }, 3000);
    }

    showInputError(message) {
        this.todoInput.classList.add('is-invalid');
        this.inputError.textContent = message;
    }

    clearInputError() {
        this.todoInput.classList.remove('is-invalid');
        this.inputError.textContent = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
