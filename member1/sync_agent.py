# sync_agent.py - Digital Twin Synchronization Agent
import requests
import time
import random
from datetime import datetime

print("🔄 Digital Twin Sync Agent Started")
print("Polling every 5 seconds...")
print("-" * 50)

# Define nodes to monitor
NODES = [
    ('GOVT-CORE-R1', '10.1.0.1', 'Government'),
    ('ENERGY-CORE-R1', '10.2.0.1', 'Energy'),
    ('FINANCE-CORE-R1', '10.3.0.1', 'Finance'),
    ('TELECOM-CORE-R1', '10.4.0.1', 'Telecom'),
    ('WATER-CORE-R1', '10.5.0.1', 'Water'),
    ('TRANSPORT-CORE-R1', '10.6.0.1', 'Transport'),
]

def simulate_node_state(name, ip, sector):
    """Simulate node state"""
    is_alive = random.random() > 0.1
    cpu = random.randint(5, 80)
    alerts = random.randint(0, 2) if is_alive else 0
    health = max(0, 100 - (alerts * 15) - (cpu // 10))
    
    return {
        'name': name,
        'ip': ip,
        'sector': sector,
        'is_alive': is_alive,
        'cpu_load': cpu,
        'alert_count': alerts,
        'health_score': health,
        'timestamp': datetime.now().isoformat()
    }

def send_to_influxdb(state):
    """Send metrics to InfluxDB"""
    try:
        influx_url = 'http://localhost:8086/api/v2/write?bucket=acdsf_metrics&precision=s'
        auth = ('admin', 'acdsf2024')
        data = f'sector_health,sector={state["sector"]} health_score={state["health_score"]},cpu_load={state["cpu_load"]},alert_count={state["alert_count"]}'
        requests.post(influx_url, data=data, auth=auth, timeout=2)
        return True
    except:
        return False

# Main loop
while True:
    print(f"\n📊 Update cycle: {datetime.now().strftime('%H:%M:%S')}")
    
    for name, ip, sector in NODES:
        state = simulate_node_state(name, ip, sector)
        
        # Try InfluxDB
        influx_ok = send_to_influxdb(state)
        
        status = "✅" if influx_ok else "⚠️"
        health_bar = "█" * (state['health_score'] // 10) + "░" * (10 - state['health_score'] // 10)
        print(f"  {status} {name} [{sector}] Health: {state['health_score']}% {health_bar}")
    
    time.sleep(5)