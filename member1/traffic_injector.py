# traffic_injector.py - Traffic Generator
import time
import random
from datetime import datetime

print("🚦 ACDSF Traffic Injector Started")
print("Sending simulated network traffic...")
print("-" * 50)

SECTORS = ['Government', 'Energy', 'Finance', 'Telecom', 'Water', 'Transport']
PROTOCOLS = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'MODBUS', 'DNP3']

def generate_flow():
    src_sector = random.choice(SECTORS)
    dst_sector = random.choice(SECTORS)
    while dst_sector == src_sector:
        dst_sector = random.choice(SECTORS)
    
    return {
        'timestamp': datetime.now().isoformat(),
        'src_sector': src_sector,
        'dst_sector': dst_sector,
        'src_ip': f"10.{random.randint(1,6)}.0.{random.randint(10,100)}",
        'dst_ip': f"10.{random.randint(1,6)}.0.{random.randint(10,100)}",
        'protocol': random.choice(PROTOCOLS),
        'dst_port': random.randint(1, 65535),
        'packet_size': random.randint(64, 1500),
        'bytes_sent': random.randint(100, 10000)
    }

packet_count = 0
while True:
    packet_count += 1
    flow = generate_flow()
    
    print(f"📨 {packet_count}: {flow['protocol']} {flow['src_ip']} -> {flow['dst_ip']}:{flow['dst_port']} [{flow['src_sector']}->{flow['dst_sector']}]")
    
    time.sleep(0.5)