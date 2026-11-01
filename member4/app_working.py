from flask import Flask, render_template_string, request, redirect, url_for, flash
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
    'analyst': User(2, 'analyst', 'analyst'),
    'commander': User(3, 'commander', 'commander')
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

# ===== LANDING PAGE =====
LANDING_HTML = '''
<!DOCTYPE html>
<html>
<head>
    <title>ACDSF - AI Cyber Defence</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#080c18; font-family:Arial,sans-serif; color:white; text-align:center; }
        h1 { font-size:48px; background:linear-gradient(135deg,#00d4ff,#00ff88); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .btn { display:inline-block; padding:14px 40px; border-radius:30px; background:linear-gradient(135deg,#00d4ff,#00ff88); color:#080c18; font-weight:bold; text-decoration:none; margin-top:20px; }
        .features { display:flex; gap:20px; justify-content:center; margin-top:40px; flex-wrap:wrap; }
        .feature { background:rgba(13,21,40,0.8); padding:20px; border-radius:12px; width:150px; }
        .feature .icon { font-size:32px; }
    </style>
</head>
<body>
    <div>
        <h1>🛡️ ACDSF</h1>
        <p style="color:#8899bb; font-size:18px;">AI-Powered Cyber Defence Framework</p>
        <a href="/login" class="btn">🚀 Launch Command Center</a>
        <div class="features">
            <div class="feature"><div class="icon">🛡️</div>Real-Time Detection</div>
            <div class="feature"><div class="icon">🧠</div>Explainable AI</div>
            <div class="feature"><div class="icon">⚡</div>Autonomous Response</div>
            <div class="feature"><div class="icon">📊</div>Live Dashboard</div>
        </div>
    </div>
</body>
</html>
'''

# ===== LOGIN PAGE =====
LOGIN_HTML = '''
<!DOCTYPE html>
<html>
<head>
    <title>ACDSF - Login</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#080c18; font-family:Arial,sans-serif; color:white; }
        .login-box { background:rgba(13,21,40,0.9); padding:40px; border-radius:16px; border:1px solid rgba(0,212,255,0.2); width:350px; }
        h1 { text-align:center; color:#00d4ff; }
        input { width:100%; padding:12px; margin:8px 0; border-radius:8px; border:1px solid rgba(30,48,80,0.4); background:rgba(0,0,0,0.3); color:white; box-sizing:border-box; }
        button { width:100%; padding:14px; border-radius:8px; border:none; background:linear-gradient(135deg,#00d4ff,#00ff88); color:#080c18; font-weight:bold; font-size:16px; cursor:pointer; margin-top:10px; }
        .hint { text-align:center; color:#4a6a8a; font-size:12px; margin-top:16px; line-height:1.6; }
        .hint strong { color:#00d4ff; }
        .flash { padding:10px; border-radius:8px; margin-bottom:10px; text-align:center; }
        .flash-danger { background:rgba(255,68,102,0.15); color:#ff4466; }
        .flash-success { background:rgba(0,255,136,0.15); color:#00ff88; }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>🔐 Login</h1>
        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                {% for category, message in messages %}
                    <div class="flash flash-{{ category }}">{{ message }}</div>
                {% endfor %}
            {% endif %}
        {% endwith %}
        <form method="POST">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">🚀 Access Dashboard</button>
        </form>
        <div class="hint">
            🔑 <strong>admin</strong> / <strong>analyst</strong> / <strong>commander</strong><br>
            Password: <strong>acdsf2024</strong>
        </div>
    </div>
</body>
</html>
'''

# ===== DASHBOARD PAGE =====
DASHBOARD_HTML = '''
<!DOCTYPE html>
<html>
<head>
    <title>ACDSF - Dashboard</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; background:#080c18; color:white; padding:20px; }
        .header { display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:rgba(13,21,40,0.85); border-radius:12px; border:1px solid rgba(0,212,255,0.1); margin-bottom:20px; }
        .header h1 { background:linear-gradient(135deg,#00d4ff,#00ff88); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .user-info { display:flex; align-items:center; gap:16px; }
        .user-info .logout { color:#ff4466; text-decoration:none; padding:6px 16px; border:1px solid rgba(255,68,102,0.3); border-radius:20px; }
        .user-info .logout:hover { background:rgba(255,68,102,0.1); }
        .kpi-row { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:20px; }
        .kpi-card { background:rgba(13,21,40,0.8); padding:16px; border-radius:12px; border:1px solid rgba(30,48,80,0.3); text-align:center; }
        .kpi-card .label { font-size:11px; color:#4a6a8a; text-transform:uppercase; }
        .kpi-card .value { font-size:28px; font-weight:bold; margin-top:4px; }
        .green { color:#00ff88; }
        .yellow { color:#ffbb33; }
        .red { color:#ff4466; }
        .blue { color:#00d4ff; }
        .grid-2col { display:grid; grid-template-columns:1.6fr 1fr; gap:16px; margin-bottom:16px; }
        .panel { background:rgba(13,21,40,0.8); padding:18px 20px; border-radius:12px; border:1px solid rgba(30,48,80,0.3); }
        .panel h3 { color:#4a6a8a; font-size:12px; text-transform:uppercase; margin-bottom:12px; }
        .sector-item { display:flex; align-items:center; gap:12px; padding:6px 0; border-bottom:1px solid rgba(30,48,80,0.15); }
        .sector-item .bar-track { flex:1; height:6px; background:rgba(30,48,80,0.4); border-radius:4px; overflow:hidden; }
        .sector-item .bar-fill { height:100%; border-radius:4px; transition:width 0.5s; }
        .sector-item .pct { font-weight:bold; min-width:40px; text-align:right; }
        .alert-item { display:flex; gap:10px; padding:6px 0; border-bottom:1px solid rgba(30,48,80,0.15); font-size:13px; }
        .alert-item .time { color:#4a6a8a; min-width:70px; }
        .status-resolved { background:rgba(0,255,136,0.12); color:#00ff88; padding:2px 12px; border-radius:12px; font-size:11px; font-weight:600; }
        .status-investigating { background:rgba(255,187,51,0.12); color:#ffbb33; padding:2px 12px; border-radius:12px; font-size:11px; font-weight:600; }
        .grid-3col { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
        .footer { text-align:center; padding:16px; color:#2a3a5a; font-size:12px; border-top:1px solid rgba(30,48,80,0.15); margin-top:16px; }
        .last-update { color:#4a6a8a; font-size:11px; text-align:right; margin-top:8px; }
        @media (max-width:900px) { .kpi-row { grid-template-columns:repeat(3,1fr); } .grid-2col { grid-template-columns:1fr; } .grid-3col { grid-template-columns:1fr; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ ACDSF Command Center</h1>
        <div class="user-info">
            <span>👤 {{ user.username }} ({{ user.role }})</span>
            <a href="/logout" class="logout">Logout</a>
        </div>
    </div>

    <div class="kpi-row">
        <div class="kpi-card"><div class="label">Detection Rate</div><div class="value green" id="detectionRate">87.3%</div></div>
        <div class="kpi-card"><div class="label">MTTD</div><div class="value blue" id="mttd">2.3 min</div></div>
        <div class="kpi-card"><div class="label">MTTR</div><div class="value green" id="mttr">6.1 sec</div></div>
        <div class="kpi-card"><div class="label">Containment</div><div class="value green" id="containment">100%</div></div>
        <div class="kpi-card"><div class="label">Risk Score</div><div class="value yellow" id="riskScore">18</div></div>
        <div class="kpi-card"><div class="label">Active Threats</div><div class="value red" id="activeThreats">0</div></div>
    </div>

    <div class="grid-2col">
        <div class="panel">
            <h3>🏢 Sector Health</h3>
            <div class="sector-item"><span>🏛</span><span style="min-width:80px;">Government</span><div class="bar-track"><div class="bar-fill green" style="width:92%"></div></div><span class="pct green">92%</span></div>
            <div class="sector-item"><span>⚡</span><span style="min-width:80px;">Energy</span><div class="bar-track"><div class="bar-fill green" style="width:85%"></div></div><span class="pct green">85%</span></div>
            <div class="sector-item"><span>💰</span><span style="min-width:80px;">Finance</span><div class="bar-track"><div class="bar-fill yellow" style="width:63%"></div></div><span class="pct yellow">63%</span></div>
            <div class="sector-item"><span>📡</span><span style="min-width:80px;">Telecom</span><div class="bar-track"><div class="bar-fill green" style="width:95%"></div></div><span class="pct green">95%</span></div>
            <div class="sector-item"><span>💧</span><span style="min-width:80px;">Water</span><div class="bar-track"><div class="bar-fill green" style="width:88%"></div></div><span class="pct green">88%</span></div>
            <div class="sector-item"><span>🚆</span><span style="min-width:80px;">Transport</span><div class="bar-track"><div class="bar-fill green" style="width:91%"></div></div><span class="pct green">91%</span></div>
        </div>

        <div class="panel">
            <h3>🚨 Live Alerts</h3>
            <div class="alert-item"><span class="time">14:23:45</span><span>10.1.0.99</span><span style="flex:1;">Phishing</span><span class="status-resolved">Blocked</span></div>
            <div class="alert-item"><span class="time">14:22:10</span><span>10.2.0.50</span><span style="flex:1;">Port Scan</span><span class="status-investigating">Investigating</span></div>
            <div class="alert-item"><span class="time">14:20:33</span><span>10.3.0.20</span><span style="flex:1;">Ransomware</span><span class="status-resolved">Contained</span></div>
        </div>
    </div>

    <div class="grid-3col">
        <div class="panel">
            <h3>🧠 XAI Explanation</h3>
            <div><strong style="color:#00ff88;">TRUE POSITIVE</strong> (95% confidence)</div>
            <div style="padding:2px 0; font-size:13px; color:#00ff88;">✅ src_ip_reputation: ↑ 0.42</div>
            <div style="padding:2px 0; font-size:13px; color:#00ff88;">✅ asset_criticality: ↑ 0.38</div>
            <div style="padding:2px 0; font-size:13px; color:#ff4466;">❌ connection_duration: ↓ 0.12</div>
        </div>

        <div class="panel">
            <h3>🔗 API Status</h3>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
                <span style="padding:4px 14px; border-radius:20px; background:rgba(0,255,136,0.1); color:#00ff88;">✅ SDN (8000)</span>
                <span style="padding:4px 14px; border-radius:20px; background:rgba(0,255,136,0.1); color:#00ff88;">✅ TTP (8001)</span>
                <span style="padding:4px 14px; border-radius:20px; background:rgba(0,255,136,0.1); color:#00ff88;">✅ KG (8002)</span>
                <span style="padding:4px 14px; border-radius:20px; background:rgba(0,255,136,0.1); color:#00ff88;">✅ SOAR (9000)</span>
            </div>
            <div class="last-update">Last update: {{ last_update or 'Just now' }}</div>
        </div>

        <div class="panel">
            <h3>📊 System Info</h3>
            <div style="font-size:13px; line-height:1.8;">
                <div>👤 Logged in as: <strong>{{ user.username }}</strong></div>
                <div>🔑 Role: <strong>{{ user.role }}</strong></div>
                <div>🖥️ 6 Sectors Monitored</div>
                <div>🛡️ 100% Uptime</div>
            </div>
        </div>
    </div>

    <div class="footer">ACDSF — AI-Powered Cyber Defence Simulation Framework</div>

    <script>
        // Simulate live updates
        function randomBetween(min,max) { return Math.round((Math.random()*(max-min)+min)*10)/10; }

        setInterval(function() {
            document.getElementById('detectionRate').textContent = randomBetween(82,96) + '%';
            document.getElementById('mttd').textContent = randomBetween(1.5,3.5).toFixed(1) + ' min';
            document.getElementById('mttr').textContent = randomBetween(4,10).toFixed(1) + ' sec';
            document.getElementById('riskScore').textContent = Math.round(randomBetween(12,35));
            document.getElementById('activeThreats').textContent = Math.round(randomBetween(0,3));
        }, 5000);
    </script>
</body>
</html>
'''

# ===== ROUTES =====
@app.route('/')
def landing():
    if current_user.is_authenticated:
        return redirect('/dashboard')
    return render_template_string(LANDING_HTML)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect('/dashboard')
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username in USERS and password == 'acdsf2024':
            user = USERS[username]
            login_user(user)
            flash(f'Welcome back, {username}!', 'success')
            return redirect('/dashboard')
        else:
            flash('Invalid username or password.', 'danger')
    
    return render_template_string(LOGIN_HTML)

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template_string(DASHBOARD_HTML, user=current_user, last_update='Just now')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect('/login')

if __name__ == '__main__':
    print("🚀 ACDSF is running!")
    print("📍 http://localhost:5000")
    print("👤 admin / acdsf2024")
    app.run(debug=True, port=5000)