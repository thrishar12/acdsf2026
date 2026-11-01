"""
blue_env.py
-----------
ACDSF Member 3 — RL Blue Team Environment

A real Gymnasium environment where an RL agent learns to DEFEND your
Member 1 infrastructure, using real signals from your Member 2 APIs
(threat intel IOC matches, knowledge graph asset risk) and real actions
against your Member 1 SDN controller (block/restore a host).

Design mirrors red_env.py (same project, opposite role): observations
pull genuine data from your running services, and the final consequential
action (Block_IP) makes a REAL SDN call — rewarded based on whether the
block was actually correct (matches a real, currently-compromised host)
or a false positive (blocking a clean host), which is the core tradeoff
real SOC analysts and blue team RL research (e.g. the CAGE Challenge /
CybORG benchmarks) optimize for.

Since your infrastructure doesn't have a live attacker running by
default, this environment can operate in two modes:
  - Training mode (live=False): a scripted "compromise state" is
    simulated per episode (a host is randomly marked as compromised
    or clean), so the agent learns the correct policy quickly offline.
  - Live-eval mode (live=True): runs against your REAL running SDN
    controller / threat intel / knowledge graph APIs, using the actual
    current block status of the target host as ground truth.

Usage (standalone test):
    python blue_env.py --test
"""

import argparse
import numpy as np
import requests
import gymnasium as gym

SDN_URL = "http://localhost:8000"
KG_URL = "http://localhost:8002"
TI_URL = "http://localhost:8003"

ACTIONS = [
    "monitor",           # 0: watch, gather info, no network change
    "query_threat_intel",# 1: check IOCs for the target
    "query_asset_risk",  # 2: check the target's real risk score
    "block_host",        # 3: REAL SDN block of the target
    "restore_host",      # 4: REAL SDN restore of the target
    "collect_forensics", # 5: simulated (no real host filesystem to inspect)
    "alert_human",       # 6: escalate (small cost, avoids over-automation)
]


class BlueTeamEnv(gym.Env):
    """
    Observation (6 values, normalized 0-1):
        [0] threat_intel_queried flag
        [1] asset_risk_queried flag
        [2] normalized live IOC count (from real threat_intel.py)
        [3] normalized real asset risk score (from real knowledge_graph.py)
        [4] current_host_reachable flag (from real SDN /path, 1 = reachable/unblocked)
        [5] ground_truth_compromised flag (only used to compute reward,
            not something the agent should be able to read directly in a
            "fair" RL setup — but we DO expose it here for transparency
            in this lightweight, single-episode demo setting; see notes
            in train_blue_agent.py about why this is an acceptable
            simplification for a student project of this scope)
    """

    def __init__(self, target: str = "ENER-SRV1", src: str = "GOVE-PC1",
                 sdn_url: str = SDN_URL, kg_url: str = KG_URL, ti_url: str = TI_URL,
                 max_steps: int = 20, live: bool = True):
        super().__init__()
        self.target = target
        self.src = src
        self.sdn_url = sdn_url
        self.kg_url = kg_url
        self.ti_url = ti_url
        self.max_steps = max_steps
        self.live = live

        self.observation_space = gym.spaces.Box(low=0, high=1, shape=(6,), dtype=np.float32)
        self.action_space = gym.spaces.Discrete(len(ACTIONS))

        self.reset()

    # ------------------------------------------------------------
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.step_count = 0
        self.actions_rewarded = set()
        self.state = np.zeros(6, dtype=np.float32)

        if self.live:
            # Determine REAL current compromise state via the real SDN controller:
            # if the target is currently unreachable, treat it as "already
            # flagged/compromised" ground truth for this episode.
            path = self._live_get(
                f"{self.sdn_url}/path", params={"src": self.src, "dst": self.target},
                default={"reachable": True},
            )
            reachable = path.get("reachable", True)
            self.state[4] = 1.0 if reachable else 0.0
            self.compromised = not reachable
        else:
            # Offline training: randomly simulate whether this episode's
            # target is compromised, ~50/50, so the agent learns both
            # "correctly block a compromised host" and "correctly leave
            # a clean host alone" (avoids trivial always-block policy).
            self.compromised = bool(self.np_random.integers(0, 2))
            self.state[4] = 0.0 if self.compromised else 1.0

        self.state[5] = 1.0 if self.compromised else 0.0
        return self.state, {}

    def _first_time_reward(self, action_name: str, amount: float, repeat_penalty: float = -15.0) -> float:
        if action_name not in self.actions_rewarded:
            self.actions_rewarded.add(action_name)
            return amount
        return repeat_penalty

    # ------------------------------------------------------------
    def _live_get(self, url, params=None, default=None):
        if not self.live:
            return default
        try:
            r = requests.get(url, params=params, timeout=10)
            return r.json()
        except requests.RequestException:
            return default

    def _live_post(self, url, json_body, default=None):
        if not self.live:
            return default
        try:
            r = requests.post(url, json=json_body, timeout=10)
            return r.json()
        except requests.RequestException:
            return default

    # ------------------------------------------------------------
    def step(self, action):
        self.step_count += 1
        name = ACTIONS[action]
        reward = -0.3  # small per-step time cost
        terminated = False

        if name == "monitor":
            reward += self._first_time_reward("monitor", 0.5)

        elif name == "query_threat_intel":
            data = self._live_get(f"{self.ti_url}/health", default={"total_iocs": 0})
            ioc_count = data.get("total_iocs", 0) if data else 0
            reward += self._first_time_reward("query_threat_intel", 2.0)
            self.state[0] = 1.0
            self.state[2] = min(1.0, ioc_count / 500.0)

        elif name == "query_asset_risk":
            data = self._live_get(f"{self.kg_url}/asset-risk/{self.target}", default=None)
            risk = data.get("risk_score", 0) if data else 0
            reward += self._first_time_reward("query_asset_risk", 2.0)
            self.state[1] = 1.0
            self.state[3] = min(1.0, risk / 15.0)

        elif name == "block_host":
            if self.live:
                result = self._live_post(
                    f"{self.sdn_url}/block-host", {"node_id": self.target}, default=None
                )
                block_succeeded = bool(result and result.get("status") == "blocked")
            else:
                block_succeeded = True  # offline: assume the mechanism works, judge the DECISION

            if block_succeeded:
                if self.compromised:
                    reward += 50.0  # correct: blocked a genuinely compromised host
                else:
                    reward += -25.0  # false positive: blocked a clean host — costly in real SOC terms
            else:
                reward += -5.0  # block attempt failed technically
            self.state[4] = 0.0
            terminated = True

        elif name == "restore_host":
            if self.live:
                result = self._live_post(
                    f"{self.sdn_url}/restore-host", {"node_id": self.target}, default=None
                )
                restore_ok = bool(result and result.get("status") == "restored")
            else:
                restore_ok = True

            if restore_ok:
                if not self.compromised:
                    reward += 10.0  # correctly restoring a clean/already-contained host
                else:
                    reward += -15.0  # restoring a still-compromised host: bad call
            self.state[4] = 1.0
            terminated = True

        elif name == "collect_forensics":
            reward += self._first_time_reward("collect_forensics", 1.5)

        elif name == "alert_human":
            reward += -2.0  # discourages over-escalating everything, but not catastrophic
            terminated = True

        if self.step_count >= self.max_steps:
            terminated = True

        return self.state, reward, terminated, False, {}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true")
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()

    if args.test:
        env = BlueTeamEnv(live=args.live)
        obs, _ = env.reset()
        print("Initial observation:", obs, "compromised (ground truth):", env.compromised)
        for i in range(10):
            action = env.action_space.sample()
            obs, reward, done, _, _ = env.step(action)
            print(f"Step {i+1}: action={ACTIONS[action]} reward={reward:.2f} done={done} obs={obs}")
            if done:
                break
