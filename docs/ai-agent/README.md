# Avandar agent

The plan and the first working piece for turning Ask Avandar into one agent
for all work in the platform, built on [Pi](https://github.com/badlogic/pi-mono)
and measured by a new eval. Status: spike on `feat/pi-agent`, for review
before it merges to `demo/measles`, and later `develop`.

| Doc | What it holds |
|---|---|
| [architecture.md](architecture.md) | The target design: agent loop in the browser, metered proxy, tools, privacy boundary, model policy, cost model, and the path to the full agent. |
| [decisions.md](decisions.md) | Every decision made (D01 to D38), with alternatives and costs. |
| [roadmap.md](roadmap.md) | The approved plan to the full Avandar agent (D33), offline work, and what must happen before `develop`. |
| [HANDOFF.md](HANDOFF.md) | Temporary: how a new session starts on the roadmap. Deleted once the Phase 1 plan exists. |
| [eval.md](eval.md) | The eval: results, model sweeps (online and offline), the method in detail (data checksums, graders, metrics, versions), and the command behind every number. |
| [eval-runs/](eval-runs/README.md) | Every eval run with all of its answers, for checking any number. |
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

**PDF table assistant** (reads the figures PDF import's rules miss): it had
been returning nothing because of a routing bug; on its own route with a
tuned prompt, Haiku 5.5 finds every required figure in the eval (63/63)
with no fabricated ones, against Sonnet 5's 59/63, at $0.0005 a region
([eval.md](eval.md#pdf-table-assistant), D32).

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
  `localStorage.setItem("avandar:data-agent", "on")` and reload. With the
  switch on, the agent answers on every page except the case designer.
  Results outside the Data Explorer show in the chat. Remove the key to
  switch back.
  The `chat` edge function must include the agent proxy route from this
  branch.
- **The eval:** see [eval.md](eval.md#running-it).

## Open decisions for Pablo

None. D04 (server-held prompts) and D31 (Haiku 5.5) are done; D18
(metering and the free-tier cap) is deferred and tracked in
[roadmap.md](roadmap.md).
