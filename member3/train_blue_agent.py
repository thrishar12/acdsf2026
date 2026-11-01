"""
train_blue_agent.py
--------------------
ACDSF Member 3 — Train the RL Blue Team Agent

Trains a DQN agent (same library/approach as the red agent) to correctly
decide whether to block, restore, or monitor a target host, using genuine
signals from your real threat intel and knowledge graph APIs.

NOTE on the "ground truth" observation field: this environment exposes a
compromised/clean flag directly in the observation (see blue_env.py's
docstring). In full research-grade blue-team RL (e.g. CybORG/CAGE), the
agent must INFER compromise from indirect signals (alert patterns, traffic
anomalies) rather than observe it directly, which is a harder and more
realistic problem. For this lightweight, single-host, single-episode
demo, exposing it directly keeps training fast and the demo legible, at
the honest cost of not being a full partial-observability RL benchmark.
This tradeoff is worth stating plainly in your project report.

Usage:
    python train_blue_agent.py --train
    python train_blue_agent.py --live-eval
"""

import argparse
from stable_baselines3 import DQN
from stable_baselines3.common.evaluation import evaluate_policy

from blue_env import BlueTeamEnv, ACTIONS

MODEL_PATH = "blue_dqn_final"
TIMESTEPS = 40_000


def train():
    env = BlueTeamEnv(live=False)
    model = DQN(
        "MlpPolicy",
        env,
        verbose=1,
        learning_rate=1e-3,
        buffer_size=10_000,
        batch_size=64,
        gamma=0.95,  # slightly lower than red agent: blue episodes are short/single-decision
        exploration_fraction=0.3,
        exploration_final_eps=0.05,
    )
    print(f"Training DQN blue agent for {TIMESTEPS} timesteps (offline, fast)...")
    model.learn(total_timesteps=TIMESTEPS)
    model.save(MODEL_PATH)
    print(f"Done. Saved to {MODEL_PATH}.zip")

    eval_env = BlueTeamEnv(live=False)
    mean_reward, std_reward = evaluate_policy(model, eval_env, n_eval_episodes=50)
    print(f"Offline evaluation: mean reward = {mean_reward:.2f} +/- {std_reward:.2f}")

    # Sanity-check the learned policy explicitly on both scenarios
    _check_policy_correctness(model)


def _check_policy_correctness(model):
    """Explicitly verifies the agent blocks compromised hosts and does NOT
    block clean hosts, rather than trusting mean reward alone."""
    print("\nPolicy correctness check:")
    for forced_compromised in (True, False):
        env = BlueTeamEnv(live=False)
        obs, _ = env.reset()
        env.compromised = forced_compromised
        env.state[5] = 1.0 if forced_compromised else 0.0
        env.state[4] = 0.0 if forced_compromised else 1.0
        obs = env.state

        actions_taken = []
        for _ in range(10):
            action, _ = model.predict(obs, deterministic=True)
            actions_taken.append(ACTIONS[int(action)])
            obs, reward, done, _, _ = env.step(int(action))
            if done:
                break
        label = "COMPROMISED" if forced_compromised else "CLEAN"
        final_action = actions_taken[-1] if actions_taken else "none"
        correct = (
            (forced_compromised and final_action == "block_host")
            or (not forced_compromised and final_action != "block_host")
        )
        verdict = "CORRECT" if correct else "INCORRECT"
        print(f"  {label} host -> agent did: {actions_taken} -> {verdict}")


def live_eval():
    model = DQN.load(MODEL_PATH)
    env = BlueTeamEnv(live=True)
    obs, _ = env.reset()
    print(f"Running trained blue agent LIVE. Ground truth (from real SDN state): "
          f"{'COMPROMISED' if env.compromised else 'CLEAN'}\n")

    total_reward = 0.0
    for step in range(20):
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, done, _, _ = env.step(int(action))
        total_reward += reward
        print(f"Step {step+1}: action={ACTIONS[int(action)]} reward={reward:.2f} done={done}")
        if done:
            break

    print(f"\nEpisode complete. Total reward: {total_reward:.2f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--live-eval", action="store_true")
    args = parser.parse_args()

    if args.train:
        train()
    elif args.live_eval:
        live_eval()
    else:
        parser.print_help()
