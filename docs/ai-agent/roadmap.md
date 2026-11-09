# Avandar agent: roadmap

The plan from today's agent (data questions in the Data Explorer, behind a
switch) to one Avandar agent for all work in the platform, approved by
Pablo on 2026-11-08 (decision D33). It covers `demo/measles`, where pushes
deploy the demo. Work needed before anything moves to `develop` is listed
separately at the end. Decisions are in [decisions.md](decisions.md), the
design in [architecture.md](architecture.md), and the eval in
[eval.md](eval.md).

**The bar for every step** is the one the work so far used: the eval for
the area exists before the area ships, and the new setup loses no accuracy
against what it replaces, invents nothing, and then uses the cheapest model
that passes (D16, D31, D32).

## Where things stand (2026-11-08)

| Done | Where |
|---|---|
| Pi data agent for Data Explorer questions, online (Claude Haiku 5.5, Sonnet 5.5 escalation) and offline (Qwen3 4B in the browser) | `src/lib/agent/dataAgent`, D01 to D30 |
| Agent proxy with server-held prompt and tools | `supabase/functions/chat/PostAgentStream`, D04 |
| No model picker; offline mode is the only choice | D22, D23 |
| Today's chat on Claude Haiku 5.5 | D31 |
| PDF table assistant on its own route | `PostExtractMeasurements`, D32 |
| Evals: 45 chat questions (online and offline), PDF assistant | `scripts/ai-eval`, [eval.md](eval.md) |

Today's `chat` function still serves dashboards, the case manager, and any
Data Explorer user without the agent switch (`DataAgentFeature`,
`localStorage["avandar:data-agent"] = "on"`).

## Phase 1: the data agent becomes the default

| # | Item | Done when |
|---|---|---|
| 1.1 | **Dashboards in the agent.** An `add_dashboard_block` tool (and the Data Explorer's "add this to a dashboard"), matching what today's chat does with `addDashboardBlock`. | Dashboard eval questions exist and the agent matches today's chat on them. |
| 1.2 | **"Try again" in the agent.** Regenerating an answer reruns it with the previous attempt as context, as today's `retryContext` does. | Covered by a unit test and the browser test (1.3). |
| 1.3 | **Browser test of the agent** in the Data Explorer: ask, see a table, answer a question card, follow up, ask for a chart. | One Playwright spec, run on its own. |
| 1.4 | **Agent on by default** for data questions, then the switch removed. | A week on the demo without regressions; the 45-question eval unchanged. |

## Phase 2: foundations every area needs

| # | Item | What it is |
|---|---|---|
| 2.1 | **Tool registry** | One shared definition per Avandar operation (name, argument schema, area, what data it exposes, whether it changes anything, minimum app role), extending `shared/agent/dataAgent/dataAgentTools.ts`. The proxy serves tool lists from it (the D04 pattern); the browser adds what runs. |
| 2.2 | **Router** | Rules first, then a small classifier only when unsure (the offline router, D28, is the first piece). Picks the area and loads only that area's tools, which keeps prompts small and cached (D19). |
| 2.3 | **Confirmation for changes** | A tool that creates, edits, or deletes shows a card in the chat with exactly what will change, and Confirm and Cancel, before it runs (D20, D33). Undo where the operation allows it. |
| 2.4 | **General host** | `DataAgentHost` is Data Explorer specific. It becomes a host that knows the current page and can navigate, open datasets and dashboards, and show results anywhere in the app. |
| 2.5 | **Context management** | Pruning old tool results (Pi's `transformContext`) and a short workspace summary, so long conversations stay cheap. |
| 2.6 | **An eval per area** | Each area gets its question set and graders before it ships. Graders for actions check the end state ("the dashboard has these blocks"), run against a local stack. |
| 2.7 | **Instructions hidden in data** | Text from datasets, PDFs, and documents is marked as untrusted in tool results, and changes always go through 2.3, so a document cannot make the agent act. |

## Phase 3: areas, one at a time

| Order | Area | Tools | Data the model may see | Notes |
|---|---|---|---|---|
| 3.1 | Dashboards | create a dashboard; add, edit, move, and remove blocks | none | Replaces today's dashboards chat. |
| 3.2 | Platform help | search Avandar's docs and answer | none | Cheapest model; works offline. |
| 3.3 | Dataset management | describe, rename, set column types, import guidance; the PDF table assistant becomes a tool | column names; rows only with consent | |
| 3.4 | Interpretation | compute a summary locally, show it, ask consent every time (D33), explain it with social-sector knowledge | the exact summary the user approved | The "what does this mean" feature. |
| 3.5 | Ontology and case management | concepts, case types, statuses, individuals | personal data, so consent per send | Absorbs today's case-manager chat (`buildCaseManagerSystemPrompt`, the case type draft card). |
| 3.6 | Workspace management | members, roles, settings | none | Admins only; every change confirmed. |

## Phase 4: one agent

| # | Item |
|---|---|
| 4.1 | Retire today's `chat` function path (`PostChatMessages`) once every page goes through the agent: one agent, one proxy, one eval. |
| 4.2 | Extend offline mode to the read-only areas, starting with platform help and data questions on dashboards. |

## Offline mode, alongside the phases

| # | Item | Notes |
|---|---|---|
| O1 | Test on a real 16 GB laptop | Every offline number so far comes from a 64 GB M4 Pro. Check memory headroom with large datasets open, and real answer times. |
| O2 | Close the accuracy gap | Offline answers about 6 in 10 questions; online answers all 45. Next levers, in order: sample several queries and keep the answer most agree on; a small model fine-tuned on Avandar's query shapes; re-run the model sweep as WebLLM ships new models that fit. |
| O3 | Dashboards offline | Follows 3.1. |
| O4 | Tell the user when an offline answer may be wrong | The offline model sees the result's first rows; it could say when they look off. |

## Future work: before the agent moves to `develop`

Not needed for the demo (Pablo, 2026-11-08). Required before the agent
reaches paying users.

| # | Item | Decision |
|---|---|---|
| F1 | **Metering and plan budgets in the proxy.** Record each request's billed cost per user, workspace, and plan; refuse requests past the monthly budget ($2 on basic, $7.50 on premium) with a readable message. | D18 |
| F2 | **The free plan's monthly AI cap**, enforced by F1. | D18 |
| F3 | **Per-answer cost cap** for long multi-step tasks, beyond today's 6-request cap. | D14 |
