"""
train_red_agent.py
-------------------
ACDSF Member 2 — Train the RL Red Team Agent

Uses the SAME algorithm (DQN, stable-baselines3) and SAME environment
design as the original guide, but with timesteps sized for an 8GB laptop
instead of the original 500,000 (which would take hours/crash on limited
RAM). This mirrors the same "same real code, smaller run" tradeoff already
applied to the GAN traffic generator in Member 1.

By default this trains OFFLINE (live=False) for speed — the environment's
reward logic is fully real, just not making live HTTP calls on every one
of thousands of training steps (which would be extremely slow over
Python's request-per-step at this volume). After training, use
--live-eval to run the trained agent against your REAL running SDN
controller / knowledge graph / threat intel APIs for a genuine live demo.

Usage:
    python train_red_agent.py --train                 # offline training (fast)
    python train_red_agent.py --live-eval              # run trained agent live, once
"""

import argparse
from stable_baselines3 import DQN
from stable_baselines3.common.evaluation import evaluate_policy

from red_env import RedTeamEnv, ACTIONS

MODEL_PATH = "red_dqn_final"
TIMESTEPS = 60_000  # increased from 20K after verifying 20K didn't fully converge


def train():
    env = RedTeamEnv(live=False)  # offline for training speed
    model = DQN(
        "MlpPolicy",
        env,
        verbose=1,
        learning_rate=1e-3,
        buffer_size=10_000,
        batch_size=64,
        gamma=0.99,
        exploration_fraction=0.3,
        exploration_final_eps=0.05,
    )
    print(f"Training DQN red agent for {TIMESTEPS} timesteps (offline, fast)...")
    model.learn(total_timesteps=TIMESTEPS)
    model.save(MODEL_PATH)
    print(f"Done. Saved to {MODEL_PATH}.zip")

    # Quick offline evaluation
    eval_env = RedTeamEnv(live=False)
    mean_reward, std_reward = evaluate_policy(model, eval_env, n_eval_episodes=20)
    print(f"Offline evaluation: mean reward = {mean_reward:.2f} +/- {std_reward:.2f}")


def live_eval():
    """
    Runs the trained agent for ONE real episode against your actual running
    SDN controller, knowledge graph, and threat intel APIs. This is the
    genuine, verifiable demo moment — same spirit as the Member 1 block/
    restore proof.
    """
    model = DQN.load(MODEL_PATH)
    env = RedTeamEnv(live=True)
    obs, _ = env.reset()
    print("Running trained red agent LIVE against your real infrastructure...\n")

    total_reward = 0.0
    for step in range(30):
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, done, _, _ = env.step(int(action))
        total_reward += reward
        print(f"Step {step+1}: action={ACTIONS[int(action)]} reward={reward:.2f} "
              f"done={done}")
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
