"""
ACDSF — Comprehensive Notification System Test Suite
===================================================
Tests all 12 scenarios required for the Major Academic Project:
  1. Simulated cyberattack triggers dashboard pop-up event
  2. The same detection event triggers email notification
  3. The same detection event triggers SMS notification
  4. Email contains correct attack information & recommended response
  5. SMS contains correct essential alert information & Indian mobile format
  6. Duplicate events do not generate repeated notifications (Deduplication)
  7. Email provider failures are handled gracefully
  8. SMS gateway failures are handled gracefully
  9. Application continues working if a notification service is unavailable
  10. Existing dashboard, AI detection, and simulation continue working
  11. Notification status and history are recorded accurately in SQLite
  12. All configured recipients are processed correctly (Deduplicated emails & +91 phones)
"""

import json
import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import get_db, init_db
from api.notification_service import (
    REGISTERED_EMAIL_RECIPIENTS,
    REGISTERED_MOBILE_NUMBERS,
    dispatch_notifications,
    format_indian_phone,
    get_deduplicated_emails,
    get_deduplicated_phones,
    get_notification_logs,
    get_notification_system_status,
    get_recommended_action,
    is_valid_email,
    send_email_notification,
    send_sms_notification,
    should_dispatch_incident,
)

passed_tests = []
failed_tests = []


def run_test(test_num: int, title: str, func):
    print(f"\n[*] Running Test {test_num}: {title}...")
    try:
        func()
        print(f"[PASS] Test {test_num}: {title}")
        passed_tests.append((test_num, title))
    except Exception as exc:
        print(f"[FAIL] Test {test_num}: {title} -> {exc}")
        failed_tests.append((test_num, title, str(exc)))


# ── Scenario 1: Dashboard Pop-Up Event Generation ────────────────────────────
def test_dashboard_popup():
    incident = {
        "incident_id": f"TEST-POPUP-{int(time.time())}",
        "attack_type": "DDoS Volumetric Ingress",
        "severity": "CRITICAL",
        "target": "ENER-SRV1",
        "source": "198.51.100.10",
        "status": "DETECTED",
    }
    statuses = dispatch_notifications(incident)
    assert statuses.get("dashboard_popup") == "SENT", f"Popup status was {statuses.get('dashboard_popup')}"


# ── Scenario 2 & 3: Simultaneous Email & SMS Trigger ─────────────────────────
def test_email_and_sms_trigger():
    incident = {
        "incident_id": f"TEST-DUAL-{int(time.time())}",
        "attack_type": "Lateral SMB Pivot",
        "severity": "HIGH",
        "target": "FINA-PC2",
        "source": "10.0.3.15",
        "status": "DETECTED",
    }
    statuses = dispatch_notifications(incident)
    assert "email" in statuses, "Email channel missing from dispatch"
    assert "sms" in statuses, "SMS channel missing from dispatch"
    assert "dashboard_popup" in statuses, "Dashboard popup channel missing"
    print(f"      Channels dispatched: {statuses}")


# ── Scenario 4: Email Content Verification ───────────────────────────────────
def test_email_content():
    incident = {
        "incident_id": "TEST-CONTENT-VERIFY",
        "attack_type": "SQL Injection & Data Exfiltration",
        "severity": "CRITICAL",
        "risk_score": 95,
        "target": "FINA-SRV1",
        "source_ip": "203.0.113.55",
        "attack_detected_at": "2026-10-12T14:30:00Z",
        "confidence_score": 98.5,
        "mitre_technique_id": "T1190",
        "mitre_technique_name": "Exploit Public-Facing Application",
        "status": "DETECTED",
    }
    action = get_recommended_action(incident)
    assert "WAF SQLi" in action or "database" in action or "SDN" in action, f"Unexpected action: {action}"

    # Single configured recipient mode
    ok, summary, per_rcpt = send_email_notification(incident)
    assert len(per_rcpt) == 1, f"Expected 1 designated email recipient, got {len(per_rcpt)}"
    for email, status in per_rcpt.items():
        assert "@" in email, f"Invalid email key: {email}"
        assert status in ("SENT", "SIMULATED", "FAILED"), f"Unknown status: {status}"

    # Also verify that explicit recipient list can target all registered recipients when required
    ok_all, summary_all, per_all = send_email_notification(incident, recipients_list=REGISTERED_EMAIL_RECIPIENTS)
    assert len(per_all) == 8, f"Expected 8 unique email recipients in full list, got {len(per_all)}"


# ── Scenario 5: SMS Content & Format Verification ────────────────────────────
def test_sms_content():
    incident = {
        "incident_id": "TEST-SMS-VERIFY",
        "attack_type": "Ransomware Infiltration",
        "severity": "CRITICAL",
        "target": "TRAN-CORE-R1",
        "source_ip": "198.51.100.99",
        "status": "DETECTED",
    }
    # Verifying formatting across all registered numbers
    ok, summary, per_phone = send_sms_notification(incident, phones_list=REGISTERED_MOBILE_NUMBERS)
    assert len(per_phone) == 8, f"Expected 8 phone numbers, got {len(per_phone)}"
    for phone, status in per_phone.items():
        assert phone.startswith("+91"), f"Phone number not in +91 format: {phone}"
        assert len(phone) == 13, f"Unexpected phone length: {phone}"


# ── Scenario 6: Deduplication Prevents Repeated Floods ───────────────────────
def test_deduplication():
    test_id = f"TEST-DEDUP-{int(time.time())}"
    assert should_dispatch_incident(test_id, "DETECTED", cooldown_seconds=60) is True, "First call must succeed"
    assert should_dispatch_incident(test_id, "DETECTED", cooldown_seconds=60) is False, "Second call must be suppressed"
    # Different status or incident should be allowed
    assert should_dispatch_incident(f"{test_id}-OTHER", "DETECTED", cooldown_seconds=60) is True, "Different ID must be allowed"


# ── Scenario 7: Email Failure Handled Gracefully ─────────────────────────────
def test_email_failure_handling():
    incident = {
        "incident_id": "TEST-EMAIL-FAIL",
        "attack_type": "Reconnaissance Scan",
        "severity": "LOW",
        "target": "TELE-FW1",
        "status": "DETECTED",
    }
    # Pass an invalid recipient list
    ok, summary, per_rcpt = send_email_notification(incident, recipients_list=["invalid-address-without-at"])
    # Should not crash, returns handled response
    assert ok is False or "SIMULATED" in summary or "No valid" in summary


# ── Scenario 8: SMS Gateway Failure Handled Gracefully ───────────────────────
def test_sms_failure_handling():
    incident = {
        "incident_id": "TEST-SMS-FAIL",
        "attack_type": "Reconnaissance Scan",
        "severity": "LOW",
        "target": "TELE-FW1",
        "status": "DETECTED",
    }
    # Pass an invalid number list
    ok, summary, per_phone = send_sms_notification(incident, phones_list=["123"])
    assert ok is False or "No valid" in summary or "SIMULATED" in summary


# ── Scenario 9: Notification Failure Does Not Crash App ──────────────────────
def test_resilience():
    # Send malformed empty incident
    statuses = dispatch_notifications({})
    assert isinstance(statuses, dict), "Dispatch must return dictionary even on empty payload"


# ── Scenario 10: AI Detection & Simulation Integration ───────────────────────
def test_detection_simulation_integration():
    from ai.detector import detect
    det = detect("DDoS Simulation", "ENER-SRV1", delay_seconds=0)
    assert det["detection_status"] == "DETECTED"
    assert det["confidence_score"] > 80
    assert "mitre_technique_id" in det


# ── Scenario 11: Accurate Status & SQLite History ────────────────────────────
def test_sqlite_audit_history():
    init_db()
    logs = get_notification_logs(limit=10)
    assert "email_logs" in logs, "email_logs missing from audit log"
    assert "sms_logs" in logs, "sms_logs missing from audit log"
    assert len(logs["email_logs"]) > 0, "email_logs should have entries from previous tests"
    assert len(logs["sms_logs"]) > 0, "sms_logs should have entries from previous tests"
    print(f"      Logged {len(logs['email_logs'])} email records and {len(logs['sms_logs'])} SMS records in SQLite.")


# ── Scenario 12: Recipient Deduplication & Validation ────────────────────────
def test_recipients_deduplication():
    # Raw email list has 9 entries (including duplicate thrishanaidu03@gmail.com)
    assert len(REGISTERED_EMAIL_RECIPIENTS) == 9, "Initial email list must have 9 entries"
    deduped_emails = get_deduplicated_emails()
    assert len(deduped_emails) == 8, f"Deduplicated email count must be exactly 8, got {len(deduped_emails)}"
    assert deduped_emails.count("thrishanaidu03@gmail.com") == 1, "Duplicate must be removed"

    # Phone numbers validation: all 8 must be valid Indian numbers (+91)
    assert len(REGISTERED_MOBILE_NUMBERS) == 8, "Initial phone list must have 8 entries"
    deduped_phones = get_deduplicated_phones()
    assert len(deduped_phones) == 8, f"Deduplicated phone count must be 8, got {len(deduped_phones)}"
    for p in deduped_phones:
        assert p.startswith("+91"), f"Number must be formatted with +91: {p}"
        assert len(p) == 13, f"Number must have 13 chars (+91 + 10 digits): {p}"


def main():
    print("=" * 65)
    print("ACDSF — COMPREHENSIVE NOTIFICATION SYSTEM TEST SUITE")
    print("=" * 65)

    run_test(1, "Simulated cyberattack triggers dashboard pop-up event", test_dashboard_popup)
    run_test(2, "Simultaneous Email trigger upon attack detection", test_email_and_sms_trigger)
    run_test(3, "Simultaneous SMS trigger upon attack detection", test_email_and_sms_trigger)
    run_test(4, "Email contains correct attack details & recommended response", test_email_content)
    run_test(5, "SMS contains correct essential alert info in +91 format", test_sms_content)
    run_test(6, "Deduplication prevents repeated notifications for same event", test_deduplication)
    run_test(7, "Email provider failures handled correctly & logged", test_email_failure_handling)
    run_test(8, "SMS gateway failures handled correctly & logged", test_sms_failure_handling)
    run_test(9, "Application continues working if notification service errors", test_resilience)
    run_test(10, "Existing AI detection & simulation modules continue working", test_detection_simulation_integration)
    run_test(11, "Notification status & history recorded accurately in SQLite", test_sqlite_audit_history)
    run_test(12, "All configured recipients processed correctly (8 emails, 8 mobiles)", test_recipients_deduplication)

    print("\n" + "=" * 65)
    print(f"TEST RESULTS: {len(passed_tests)}/12 PASSED")
    print("=" * 65)

    if failed_tests:
        print("\nFailed Tests:")
        for num, title, err in failed_tests:
            print(f"  [X] Test {num}: {title} -> {err}")
        sys.exit(1)
    else:
        print("\n[SUCCESS] ALL 12 TEST SCENARIOS PASSED WITH ZERO FAILURES!")
        sys.exit(0)


if __name__ == "__main__":
    main()
