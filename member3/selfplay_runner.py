"""
selfplay_runner.py
--------------------
ACDSF Member 3 — Self-Play Runner (Red vs Blue)

Runs your ALREADY-TRAINED red (Member 2) and blue (Member 3) agents
against each other over multiple rounds on your REAL running infrastructure
(SDN controller, threat intel, knowledge graph) — not a simulated/dummy
scoreboard.

Each round:
  1. Reset the target host to a clean/reachable state.
  2. Run the trained RED agent's episode live — it attempts its learned
     attack chain, culminating in a real SDN block if it reaches
     "exfiltrate" successfully.
  3. Run the trained BLUE agent's episode live — it observes the REAL
     current state of the host (reachable or not) and responds.
  4. Score the round: did red succeed in compromising the host, and did
     blue's response correctly match the real ground truth?

IMPORTANT DESIGN NOTE (worth stating plainly in your report): this
lightweight environment reuses the SAME SDN block/restore primitive to
represent both the attacker's disruptive effect (red's "exfiltrate"
action rendering the host unreachable) and the defender's containment
tool (blue's "block_host" action). In a full-scale system these would be
distinguishable signals (e.g. an anomaly/IDS alert vs an operator
action); here they share one mechanism for simplicity. This is a
reasonable simplification for a lightweight student-project demo, but it
means "blue blocks an already-blocked host" is scored as a correct
CONFIRM/CONTAIN action, not a redundant no-op.

Usage:
    python selfplay_runner.py --rounds 10
"""

import argparse
import json
import time

import requests
from stable_baselines3 import DQN

from red_env import RedTeamEnv, ACTIONS as RED_ACTIONS
from blue_env import BlueTeamEnv, ACTIONS as BLUE_ACTIONS

SDN_URL = "http://localhost:8000"
RED_MODEL_PATH = "red_dqn_final"
BLUE_MODEL_PATH = "blue_dqn_final"
LOG_PATH = "selfplay_log.json"


def restore_target(target: str, sdn_url: str = SDN_URL):
    try:
        requests.post(f"{sdn_url}/restore-host", json={"node_id": target}, timeout=10)
    except requests.RequestException as e:
        print(f"  Warning: could not restore {target} before round: {e}")


def run_red_round(model, target: str, sdn_url: str):
    env = RedTeamEnv(target=target, live=True, sdn_url=sdn_url)
    obs, _ = env.reset()
    actions_taken = []
    total_reward = 0.0
    for _ in range(30):
        action, _ = model.predict(obs, deterministic=True)
        actions_taken.append(RED_ACTIONS[int(action)])
        obs, reward, done, _, _ = env.step(int(action))
        total_reward += reward
        if done:
            break
    red_succeeded = "exfiltrate" in actions_taken and total_reward > 50
    return {"actions": actions_taken, "reward": total_reward, "succeeded": red_succeeded}


def run_blue_round(model, target: str, sdn_url: str):
    env = BlueTeamEnv(target=target, live=True, sdn_url=sdn_url)
    obs, _ = env.reset()
    ground_truth_compromised = env.compromised
    actions_taken = []
    total_reward = 0.0
    for _ in range(20):
        action, _ = model.predict(obs, deterministic=True)
        actions_taken.append(BLUE_ACTIONS[int(action)])
        obs, reward, done, _, _ = env.step(int(action))
        total_reward += reward
        if done:
            break
    blue_correct = total_reward > 0  # blue_env's reward sign already encodes correctness
    return {
        "actions": actions_taken,
        "reward": total_reward,
        "ground_truth_compromised": ground_truth_compromised,
        "correct": blue_correct,
    }


def run_selfplay(rounds: int, target: str = "ENER-SRV1", sdn_url: str = SDN_URL,
                  delay: float = 1.0):
    print(f"Loading trained agents: {RED_MODEL_PATH}.zip, {BLUE_MODEL_PATH}.zip")
    red_model = DQN.load(RED_MODEL_PATH)
    blue_model = DQN.load(BLUE_MODEL_PATH)

    red_wins = 0
    blue_wins = 0
    log = []

    print(f"\nSelf-play started: {rounds} rounds against target {target}\n")
    print(f"{'Round':<7}{'Red Success':<14}{'Blue Correct':<15}{'Winner'}")
    print("-" * 50)

    for round_num in range(1, rounds + 1):
        restore_target(target, sdn_url)
        time.sleep(delay)

        red_result = run_red_round(red_model, target, sdn_url)
        time.sleep(delay)
        blue_result = run_blue_round(blue_model, target, sdn_url)

        # Round scoring: blue wins if it correctly handled whatever real
        # state existed (whether or not red succeeded); red wins if it
        # compromised the host AND blue failed to correctly respond.
        if red_result["succeeded"] and not blue_result["correct"]:
            winner = "RED"
            red_wins += 1
        else:
            winner = "BLUE"
            blue_wins += 1

        print(f"{round_num:<7}{str(red_result['succeeded']):<14}"
              f"{str(blue_result['correct']):<15}{winner}")

        log.append({
            "round": round_num,
            "red": red_result,
            "blue": blue_result,
            "winner": winner,
        })

    print(f"\nSelf-play complete!")
    print(f"Red wins: {red_wins}/{rounds} ({100*red_wins//rounds}%)")
    print(f"Blue wins: {blue_wins}/{rounds} ({100*blue_wins//rounds}%)")

    with open(LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)
    print(f"Full round-by-round log saved to {LOG_PATH}")

    # Leave the target in a clean state afterward
    restore_target(target, sdn_url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=10)
    parser.add_argument("--target", default="ENER-SRV1")
    parser.add_argument("--sdn-url", default=SDN_URL)
    parser.add_argument("--delay", type=float, default=1.0)
    args = parser.parse_args()

    run_selfplay(args.rounds, target=args.target, sdn_url=args.sdn_url, delay=args.delay)