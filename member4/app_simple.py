from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import hashlib
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Simple user database
class User(UserMixin):
    def __init__(self, id, username, role):
        self.id = id
        self.username = username
        self.role = role

USERS = {
    'admin': User(1, 'admin', 'admin'),
    'analyst': User(2, 'analyst', 'analyst')
}

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    for user in USERS.values():
        if str(user.id) == user_id:
            return user
    return None

@app.route('/')
def landing():
    return '<h1>🚀 ACDSF is Running!</h1><p><a href="/login">Login</a></p>'

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username in USERS and password == 'acdsf2024':
            user = USERS[username]
            login_user(user)
            return redirect('/dashboard')
        return 'Invalid credentials', 401
    return '''
        <form method="POST">
            <input type="text" name="username" placeholder="Username" required><br>
            <input type="password" name="password" placeholder="Password" required><br>
            <button type="submit">Login</button>
        </form>
        <p>Username: admin, Password: acdsf2024</p>
    '''

@app.route('/dashboard')
@login_required
def dashboard():
    return f'<h1>Welcome {current_user.username}!</h1><p>Role: {current_user.role}</p><a href="/logout">Logout</a>'

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/login')

if __name__ == '__main__':
    app.run(debug=True, port=5000)