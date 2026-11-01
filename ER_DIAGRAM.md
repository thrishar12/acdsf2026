# ACDSF (Autonomous Cyber Defense Simulation Framework) — Database ER Diagram

This document outlines the entity relationships, relational schema, and domain architecture for the ACDSF backend database (`digital_twin.db`).

---

## 1. High-Level Architecture Overview

```
                      +-----------------------------+
                      |            USERS            |
                      +-----------------------------+
                        |            |            |
                (1:N)   |      (1:1) |      (1:N) |
                        v            v            v
             +-------------+  +---------------+  +---------------+
             |  AUDIT_LOG  |  | NOTIF_SETTINGS|  | NOTIFICATIONS |
             +-------------+  +---------------+  +---------------+
                                                        ^
                                                        | (1:N)
+-----------------------+              (1:N)            |
|         TWINS         | <---------------------+---------------+
| (Digital Twin Nodes)  |                       |   INCIDENTS   |
+-----------------------+ <-------+             | (Red vs Blue) |
            ^                     |             +---------------+
            |                     | (1:N)               |
            | (1:N)               |             (1:N)   +----------+ (1:N)
            |                     |                     v          v
+-----------------------+         |               +---------+ +---------+
|   SIMULATION_EVENTS   | --------+               |EMAIL_LOG| | SMS_LOG |
+-----------------------+                         +---------+ +---------+
            ^
            | (N:1)
+-----------------------+
|      SIMULATIONS      |
|  (Multi-Agent Arena)  |
+-----------------------+
```

---

## 2. Interactive Mermaid ER Diagram

```mermaid
erDiagram
    USERS ||--o{ AUDIT_LOG : "logs actions"
    USERS ||--o| NOTIFICATION_SETTINGS : "customizes"
    USERS ||--o{ NOTIFICATIONS : "receives"

    TWINS ||--o{ INCIDENTS : "targeted in"
    TWINS ||--o{ NOTIFICATIONS : "source / target"
    TWINS ||--o{ SIMULATION_EVENTS : "compromised node"

    INCIDENTS ||--o{ NOTIFICATIONS : "generates alerts"
    INCIDENTS ||--o{ EMAIL_LOGS : "sends email audit"
    INCIDENTS ||--o{ SMS_LOGS : "sends sms audit"

    SIMULATIONS ||--|{ SIMULATION_EVENTS : "records round events"

    USERS {
        INTEGER id PK
        TEXT full_name
        TEXT username UK
        TEXT email UK
        TEXT password_hash
        TEXT role
        TEXT created_at
        TEXT last_login
    }

    AUDIT_LOG {
        INTEGER id PK
        INTEGER user_id FK
        TEXT user_email
        TEXT action
        TEXT ip_address
        TEXT user_agent
        TEXT details
        TEXT created_at
    }

    NOTIFICATION_SETTINGS {
        INTEGER user_id PK, FK
        INTEGER email_enabled
        INTEGER sound_enabled
        INTEGER desktop_enabled
        TEXT min_severity
        TEXT updated_at
    }

    PASSWORD_RESET_TOKENS {
        INTEGER id PK
        TEXT email
        TEXT token_hash
        TEXT expires_at
        INTEGER used
        TEXT created_at
    }

    OTP_SESSIONS {
        INTEGER id PK
        TEXT identifier
        TEXT otp_hash
        TEXT channel
        TEXT created_at
        TEXT expires_at
        INTEGER attempts
        INTEGER used
    }

    OTP_RATE_LIMIT {
        TEXT identifier PK
        INTEGER request_count
        TEXT window_start
    }

    TWINS {
        TEXT node_id PK
        TEXT sector
        TEXT node_type
        REAL cpu_load
        INTEGER is_compromised
        INTEGER alert_count
        TEXT last_updated
    }

    INCIDENTS {
        TEXT incident_id PK
        TEXT attack_type
        TEXT source
        TEXT target FK
        TEXT status
        TEXT final_status
        TEXT attack_started_at
        TEXT attack_detected_at
        TEXT attack_ended_at
        REAL duration_seconds
        TEXT detection_status
        REAL confidence_score
        TEXT severity
        INTEGER risk_score
        TEXT risk_level
        TEXT mitre_tactic
        TEXT mitre_technique_id
        TEXT mitre_technique_name
        TEXT key_indicators
        TEXT blue_team_response
        TEXT notification_status
        TEXT created_at
        TEXT updated_at
    }

    NOTIFICATIONS {
        INTEGER id PK
        INTEGER user_id FK
        TEXT type
        TEXT severity
        TEXT title
        TEXT message
        TEXT attack_id FK
        TEXT mitre_technique_id
        TEXT source_node FK
        TEXT target_node FK
        INTEGER is_read
        TEXT created_at
    }

    DEVICE_TOKENS {
        TEXT token PK
        TEXT registered_at
    }

    EMAIL_LOGS {
        INTEGER id PK
        TEXT incident_id FK
        TEXT recipient
        TEXT subject
        TEXT status
        INTEGER attempts
        TEXT error
        TEXT created_at
    }

    SMS_LOGS {
        INTEGER id PK
        TEXT incident_id FK
        TEXT recipient
        TEXT message
        TEXT status
        TEXT provider
        INTEGER attempts
        TEXT error
        TEXT created_at
    }

    SIMULATIONS {
        TEXT simulation_id PK
        TEXT scenario
        INTEGER total_rounds
        REAL speed
        TEXT target_sector
        TEXT red_difficulty
        TEXT blue_mode
        TEXT status
        TEXT started_at
        TEXT ended_at
        TEXT winner
        INTEGER red_wins
        INTEGER blue_wins
        REAL red_reward
        REAL blue_reward
        INTEGER stages_completed
        INTEGER nodes_compromised
        REAL detection_rate
        REAL mttd
        REAL mttr
        TEXT results_json
    }

    SIMULATION_EVENTS {
        INTEGER id PK
        TEXT simulation_id FK
        INTEGER round
        TEXT winner
        REAL red_reward
        REAL blue_reward
        TEXT red_technique
        TEXT blue_action
        TEXT target_node FK
        INTEGER detected
        INTEGER red_success
        TEXT timestamp
    }
```

---

## 3. Subsystem Extensions

### SOAR Playbooks (`soar_cases.db`)
- **`CASES`** (`id` PK, `title`, `description`, `severity`, `status`, `target`, `created_at`, `resolved_at`)
- **`CASE_ACTIONS`** (`id` PK, `case_id` FK -> `cases.id`, `action`, `result`, `timestamp`)

### Threat Intelligence (`threat_intel.db`)
- **`IOCS`** (`id` PK, `source`, `ioc_type`, `value`, `threat_tag`, `first_seen`, `fetched_at`)
