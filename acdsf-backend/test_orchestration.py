import json
import time
import os
import sys

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

results = []

# Probe whether live server is running
server_mode = False
try:
    import urllib.request
    import urllib.error
    req = urllib.request.Request("http://127.0.0.1:3001/cases", method="GET")
    with urllib.request.urlopen(req, timeout=0.8) as resp:
        if resp.status in (200, 404):
            server_mode = True
except Exception:
    server_mode = False

if server_mode:
    print("[*] Testing against live backend at http://127.0.0.1:3001")
    BASE = "http://127.0.0.1:3001"

    def test(name, method, path, body=None, headers=None, expect_status=200):
        url = f"{BASE}{path}"
        data = json.dumps(body).encode() if body else None
        hdrs = {"Content-Type": "application/json"}
        if headers:
            hdrs.update(headers)
        req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
        try:
            resp = urllib.request.urlopen(req)
            status = resp.status
            payload = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            status = e.code
            payload = json.loads(e.read())
        passed = status == expect_status
        icon = "PASS" if passed else "FAIL"
        results.append(passed)
        print(f"[{icon}] {name}: expected={expect_status} got={status}")
        if not passed:
            print(f"       Response: {json.dumps(payload)}")
        return payload
else:
    print("[*] Live server not detected — testing via Flask test_client in-process")
    from app import app
    client = app.test_client()

    def test(name, method, path, body=None, headers=None, expect_status=200):
        hdrs = dict(headers or {})
        if body is not None:
            hdrs["Content-Type"] = "application/json"
            resp = client.open(path, method=method, data=json.dumps(body), headers=hdrs)
        else:
            resp = client.open(path, method=method, headers=hdrs)
        status = resp.status_code
        try:
            payload = resp.get_json()
        except Exception:
            payload = resp.data.decode("utf-8")
        passed = status == expect_status
        icon = "PASS" if passed else "FAIL"
        results.append(passed)
        print(f"[{icon}] {name}: expected={expect_status} got={status}")
        if not passed:
            print(f"       Response: {payload}")
        return payload or {}

print("Testing ML/RL endpoints...")
test("GET /api/ml/telemetry", "GET", "/api/ml/telemetry")
test("GET /api/rl/state/blue", "GET", "/api/rl/state/blue")
test("GET /api/rl/state/red", "GET", "/api/rl/state/red")

print("\nTesting Authentication...")
token_resp = test("POST /auth/login", "POST", "/auth/login",
                  body={"username": "admin", "password": "Acdsf@2026"}, expect_status=200)
token = token_resp.get("token", "")

print("\nTesting Attack Orchestration...")
attack = test("POST /api/orchestration/attacks", "POST", "/api/orchestration/attacks",
     body={"attack_type": "T1498", "target": "ENER-SRV1", "source": "EXTERNAL-01"},
     headers={"Authorization": f"Bearer {token}"}, expect_status=200)

attack_id = attack.get("attack_id")
print(f"Attack launched with ID: {attack_id}")

test("GET /api/orchestration/attacks", "GET", "/api/orchestration/attacks")

time.sleep(1)
if attack_id:
    test(f"GET /api/orchestration/attacks/{attack_id}", "GET", f"/api/orchestration/attacks/{attack_id}")
    test(f"POST /api/orchestration/attacks/{attack_id}/cancel", "POST", f"/api/orchestration/attacks/{attack_id}/cancel",
         headers={"Authorization": f"Bearer {token}"})

print(f"\nResults: {sum(results)}/{len(results)} passed")
if not all(results):
    sys.exit(1)
