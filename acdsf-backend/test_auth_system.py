"""
Unit Test: Production Authentication Verification
"""
import sys
from auth import authenticate, create_token
import jwt
import os

def test_auth():
    print("[*] Testing authentication module...")

    # 1. Negative test: wrong password
    token, user = authenticate("admin", "WrongPass123!")
    assert token is None and user is None, "Failed: Wrong password should return None"
    print("[+] Test 1 passed: Invalid password correctly rejected.")

    # 2. Negative test: non-existent user
    token, user = authenticate("nonexistent_user", "AnyPassword123!")
    assert token is None and user is None, "Failed: Nonexistent user should return None"
    print("[+] Test 2 passed: Nonexistent user correctly rejected.")

    # 3. Positive test: Username login
    token, user = authenticate("admin", "Acdsf@2026")
    assert token is not None, "Failed: Valid username login failed"
    assert user["username"] == "admin", f"Unexpected user: {user}"
    assert user["role"] == "admin", f"Unexpected role: {user}"
    print(f"[+] Test 3 passed: Valid login succeeded. JWT: {token[:25]}...")

    # 4. Positive test: Email login
    token_email, user_email = authenticate("admin@acdsf.gov", "Acdsf@2026")
    assert token_email is not None, "Failed: Valid email login failed"
    assert user_email["username"] == "admin"
    print("[+] Test 4 passed: Valid login via email succeeded.")

    # 5. Token validation test
    secret = os.getenv("JWT_SECRET", "")
    from auth import _JWT_SECRET
    payload = jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
    assert payload["username"] == "admin"
    assert payload["sub"] == str(user["id"])
    assert payload["role"] == "admin"
    print(f"[+] Test 5 passed: Token payload verified. Sub: {payload['sub']}, Exp: {payload['exp']}")

    print("\n[=== ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY ===]")

if __name__ == "__main__":
    test_auth()
