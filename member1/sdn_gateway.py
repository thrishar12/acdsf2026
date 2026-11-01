# sdn_gateway.py - SDN Gateway API for Windows
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import time
from datetime import datetime

app = FastAPI(title='ACDSF SDN Gateway')

# Store blocked IPs in memory
blocked_ips = {}
block_log = []

class BlockRequest(BaseModel):
    ip: str

class RestoreRequest(BaseModel):
    ip: str

@app.get("/")
def root():
    return {
        "message": "ACDSF SDN Gateway is running",
        "status": "active",
        "blocked_count": len(blocked_ips)
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "sdn_gateway",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/block-host")
def block_host(request: BlockRequest):
    """Block a host by IP address"""
    ip = request.ip
    if ip not in blocked_ips:
        blocked_ips[ip] = {
            "ip": ip,
            "blocked_at": datetime.now().isoformat(),
            "reason": "Detected by AI Blue Team"
        }
        block_log.append(f"BLOCKED: {ip} at {datetime.now().isoformat()}")
    
    print(f"🔒 Blocked IP: {ip}")
    return {
        "status": "blocked",
        "ip": ip,
        "message": f"IP {ip} has been blocked successfully",
        "timestamp": datetime.now().isoformat(),
        "total_blocked": len(blocked_ips)
    }

@app.post("/restore-host")
def restore_host(request: RestoreRequest):
    """Unblock a host by IP address"""
    ip = request.ip
    if ip in blocked_ips:
        del blocked_ips[ip]
        block_log.append(f"RESTORED: {ip} at {datetime.now().isoformat()}")
        print(f"🔓 Restored IP: {ip}")
        return {
            "status": "restored",
            "ip": ip,
            "message": f"IP {ip} has been restored"
        }
    return {
        "status": "not_found",
        "ip": ip,
        "message": f"IP {ip} was not in block list"
    }

@app.get("/blocked")
def get_blocked():
    """Get list of all blocked IPs"""
    return {
        "blocked_ips": list(blocked_ips.keys()),
        "total": len(blocked_ips),
        "details": list(blocked_ips.values())
    }

@app.get("/logs")
def get_logs():
    """Get block/restore logs"""
    return {
        "logs": block_log[-50:],  # Last 50 logs
        "total_entries": len(block_log)
    }

if __name__ == "__main__":
    print("🚀 Starting ACDSF SDN Gateway...")
    print("📍 API available at: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("-" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)