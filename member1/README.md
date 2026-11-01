# Member 1 — Infrastructure & Simulation Environment

All-Python implementation of Member 1's role in ACDSF: 6-sector enterprise
network topology, digital twin, GAN-based synthetic traffic generation, and
SDN-style network control. No Docker, GNS3, Kubernetes, or VirtualBox
required — everything here has been tested and confirmed working.

## Files

| File | Role | Maps to (original guide) |
|---|---|---|
| `network_topology.py` | Builds the 6-sector network as a real graph, validates routing, visualizes it | GNS3 topology (Step 2) |
| `digital_twin.py` | Flask+SQLite service tracking live state of every node | Eclipse Ditto (Step 3) |
| `gan_traffic_generator.py` | Conditional GAN generating synthetic NSL-KDD-style traffic | GAN traffic generation (Step 4) |
| `sdn_controller.py` | Flask API to block/restore hosts on the live network graph | OpenDaylight SDN (Step 5) |

## Setup

```bash
pip install -r requirements.txt --break-system-packages
```

(drop `--break-system-packages` if you're using a virtual environment instead)

## Run order

1. **Build the topology first** — this generates `topology.json`, which the other two services read:
   ```bash
   python network_topology.py
   ```
   Produces: console validation report, `topology.png` (visual diagram), `topology.json` (data)

2. **Start the digital twin** (in its own terminal, leave running):
   ```bash
   python digital_twin.py
   ```
   Runs on `http://localhost:5000`. Try: `http://localhost:5000/twins` in your browser.

3. **Start the SDN controller** (in another terminal, leave running):
   ```bash
   python sdn_controller.py
   ```
   Runs on `http://localhost:8000`. Try: `http://localhost:8000/topology` in your browser.

4. **Train the GAN traffic generator** (point `NSL_KDD_PATH` at your processed NSL-KDD CSV):
   ```bash
   set NSL_KDD_PATH=path\to\your\nsl_kdd_processed.csv
   python gan_traffic_generator.py --train
   python gan_traffic_generator.py --generate 50 --label dos
   ```

## Demo: block and restore a host live

With `digital_twin.py` and `sdn_controller.py` both running, open a new terminal:

```bash
curl -X POST http://localhost:8000/block-host -H "Content-Type: application/json" -d "{\"node_id\": \"ENER-SRV1\"}"
curl "http://localhost:8000/path?src=GOVE-PC1&dst=ENER-SRV1"
```

The second command should show `"reachable": false` — the block actually works
at the graph/routing level, not just as a status flag.

```bash
curl -X POST http://localhost:8000/restore-host -H "Content-Type: application/json" -d "{\"node_id\": \"ENER-SRV1\"}"
curl "http://localhost:8000/path?src=GOVE-PC1&dst=ENER-SRV1"
```

Now it should show `"reachable": true` again with a full path.

## Why this approach instead of GNS3/Kubernetes

GNS3 + Kubernetes + VirtualBox require real virtualization and several GB
of RAM running simultaneously — not workable on constrained hardware.
Modeling the topology as an actual graph data structure (rather than a GUI
canvas) is a legitimate, established technique in cyber-range research, and
has a real advantage for this project specifically: every property (routing,
latency, blocking) is programmatically queryable and testable, which is
exactly what Member 2/3's AI agents need to interact with.
