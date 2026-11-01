"""
ACDSF — Administrator & User Provisioning Tool
================================================
A production utility to securely create or update users in the SQLite database.
Uses werkzeug.security to hash passwords before storing in SQLite.

Usage:
    # Interactive mode (prompts for username & password securely)
    python create_admin.py

    # Non-interactive CLI mode
    python create_admin.py --username admin --email admin@acdsf.gov --password "YourSecurePass" --role admin
"""

import argparse
import getpass
import os
import sqlite3
import sys
from datetime import datetime, timezone

from werkzeug.security import generate_password_hash

from database import DB_PATH, get_db, init_db


def provision_user(username: str, password: str, email: str = None, role: str = "admin") -> bool:
    """Hash the password and insert/update the user record in SQLite."""
    if not username or not password:
        print("[-] Error: Username and password are required.", file=sys.stderr)
        return False

    password_hash = generate_password_hash(password)
    now = datetime.now(timezone.utc).isoformat()
    if not email:
        email = f"{username}@acdsf.gov"

    # Ensure tables exist
    init_db()

    try:
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id, username FROM users WHERE username = ? OR email = ?",
                (username, email),
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE users SET password_hash = ?, email = ?, role = ? WHERE id = ?",
                    (password_hash, email, role, existing["id"]),
                )
                print(f"[+] User '{username}' (email: {email}) updated successfully (role: {role}).")
            else:
                conn.execute(
                    "INSERT INTO users (username, email, password_hash, role, created_at) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (username, email, password_hash, role, now),
                )
                print(f"[+] User '{username}' (email: {email}) provisioned successfully (role: {role}).")
        return True
    except sqlite3.Error as e:
        print(f"[-] Database error: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="ACDSF Administrator & User Provisioning Utility")
    parser.add_argument("-u", "--username", help="Username for the account (default: prompt)")
    parser.add_argument("-e", "--email", help="Email for the account (default: username@acdsf.gov)")
    parser.add_argument("-p", "--password", help="Password for the account (default: prompt)")
    parser.add_argument("-r", "--role", default="admin", help="Role: admin, analyst, red-team, blue-team (default: admin)")
    args = parser.parse_args()

    username = args.username
    password = args.password
    email = args.email
    role = args.role

    # If flags not provided, interactively prompt
    if not username or not password:
        print("========================================")
        print("ACDSF User & Admin Provisioning Tool")
        print("========================================")

        if not username:
            username = input("Enter username [admin]: ").strip() or "admin"

        if not email:
            email_input = input(f"Enter email [{username}@acdsf.gov]: ").strip()
            email = email_input or f"{username}@acdsf.gov"

        if not password:
            password = getpass.getpass("Enter secure password: ")
            if not password:
                print("[-] Error: Password cannot be empty.", file=sys.stderr)
                sys.exit(1)
            confirm = getpass.getpass("Confirm password: ")
            if password != confirm:
                print("[-] Error: Passwords do not match.", file=sys.stderr)
                sys.exit(1)

    success = provision_user(username=username, password=password, email=email, role=role)
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
