# Avandar agent

The plan and the first working piece for turning Ask Avandar into one agent
for all work in the platform, built on [Pi](https://github.com/badlogic/pi-mono)
and measured by a new eval. Status: spike on `feat/pi-agent`, for review
before it merges to `demo/measles`, and later `develop`.

| Doc | What it holds |
|---|---|
| [architecture.md](architecture.md) | The target design: agent loop in the browser, metered proxy, tools, privacy boundary, model policy, cost model, and the path to the full agent. |
| [decisions.md](decisions.md) | Every decision made (D01 to D31), with alternatives and costs. |
| [roadmap.md](roadmap.md) | What is left before the agent is the default, including metering (D18), and the offline work. |
| [eval.md](eval.md) | The eval, every run's results, the model sweep, and what it found in today's harness. |
| [spike-findings.md](spike-findings.md) | Bundle size, Deno, prompt caching, the chat UI integration, and the browser run. |

## Results in one table

Same 45 questions, graded against DuckDB ground truth. Cost is what
OpenRouter billed.

| Setup | Correct (per run) | Cost per question | Latency p50 | Questions per $2 |
|---|---|---|---|---|
| Today, Claude Sonnet 5 | 44, 44 | $0.024 to $0.026 | 4.4 to 5.1 s | about 80 |
| Today, GPT-5.6 Terra | 44, 44 | $0.0052 | 3.7 to 3.8 s | about 380 |
| **Today, Claude Haiku 5.5 (the default since D31)** | 44, 45 | $0.0013 to $0.0015 | 4.1 s | about 1,400 |
| **Pi agent, Claude Haiku 5.5 with Sonnet 5.5 escalation** | **45, 45, 45, 45, 44** | **$0.0003** | **2.2 to 2.4 s** | **about 6,600** |

**Offline mode** (models in the browser, nothing leaves the computer):
Qwen3 4B answers **26 of 45** correctly with no needless questions, in a
median 15 s on this Mac, from a 2.2 GB download. It was the best of the
eight models that fit a 16 GB computer ([eval.md](eval.md#offline-mode)).

The budget is 50% of the plan price: $2 per user a month on the $4 plan.
Today's Claude setup spends it in about 80 questions; the Pi agent spends it
in about 6,600, which leaves room for multi-step agent work and a free tier.

## Try it

- **Offline mode:** in the Data Explorer chat, click **Offline** under the
  message box, then **Download offline models** (about 2.2 GB, needs Chrome
  or Edge with WebGPU). Once downloaded, the same control turns offline
  mode on and off.
- **In the app:** open the Data Explorer, then in the browser console run
  `localStorage.setItem("avandar:data-agent", "on")` and reload. Data
  Explorer chat now runs through the agent. Remove the key to switch back.
  The `chat` edge function must include the agent proxy route from this
  branch.
- **The eval:** see [eval.md](eval.md#running-it).

## Open decisions for Pablo

1. **D04:** approve moving the agent's prompt to the proxy before the agent
   is on by default (recommended; matters more now that metering, D18, is
   deferred).
