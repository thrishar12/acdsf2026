# init_db.py - Create real database
import sqlite3
import hashlib

def init_database():
    conn = sqlite3.connect('acdsf.db')
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
    ''')

    # Sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            session_token TEXT UNIQUE,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Audit log table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Insert default users with hashed passwords
    users = [
        ('admin', 'acdsf2024', 'admin@acdsf.local', 'admin'),
        ('analyst', 'acdsf2024', 'analyst@acdsf.local', 'analyst'),
        ('commander', 'acdsf2024', 'commander@acdsf.local', 'commander'),
        ('operator', 'acdsf2024', 'operator@acdsf.local', 'operator'),
        ('policymaker', 'acdsf2024', 'policymaker@acdsf.local', 'policymaker')
    ]

    for username, password, email, role in users:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cursor.execute('''
            INSERT OR IGNORE INTO users (username, password_hash, email, role)
            VALUES (?, ?, ?, ?)
        ''', (username, password_hash, email, role))

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")
    print("👤 Users created: admin, analyst, commander, operator, policymaker")
    print("🔑 Password for all: acdsf2024")

if __name__ == '__main__':
    init_database()