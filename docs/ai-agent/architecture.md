# Avandar agent architecture

Status: proposal plus a working spike on `feat/pi-agent`. Every choice here is
logged with its alternatives in [decisions.md](decisions.md), so it can be
reviewed before any of it moves to `develop`.

## 1. Goal and constraints

Avandar's chat becomes one agent for all work in the platform: data
questions, dashboards, dataset management, help with the platform, general
chat that interprets the user's data with social-sector knowledge, the
ontology and case management, and workspace management. Every operation in
Avandar becomes a tool the agent can call.

| Constraint | What it means for the design |
|---|---|
| Cheap | AI cost per user stays at or under **50% of the plan price**: $2.00 a month on the $4 basic plan, $7.50 on the $15 premium plan. Free accounts get a hard cap. |
| Accurate | No worse than today's harness on today's questions, measured by the eval in `scripts/ai-eval`. |
| Private | Row data reaches a hosted model only when needed, and only after the user consents. A user who declines gets instructions to do the work themselves. Models running in the browser are exempt. |
| Good UX | Latency only has to stay under the point where the chat feels slow. |
| No lock-in | Any provider, any model, chosen per task. |

## 2. Shape of the system

```
Browser                                                   Edge (Supabase)            Providers
+-------------------------------------------------+
| Chat panel (assistant-ui)                        |
|   |                                             |
|   v                                             |
| Pi Agent loop (pi-agent-core)                    |  streamProxy  +--------------------+
|   - conversation + tool results                  |-------------->| chat function:     |--> OpenRouter
|   - model policy: primary, escalation            |<--------------| /agent/<prompt id> |    (any model)
|   - per-message run state                        |   SSE events  | /api/stream        |
|   |                                             |               | auth, role check,  |
|   |                                             |               | server-held prompt |
|   |                                             |               | and tools, model   |
|   v                                             |               | allowlist, caps    |
| Tools (execute in the browser)                   |               +--------------------+
|   run_query ----> Data Explorer or chat result   |
|                   -> DuckDB-Wasm                 |
|   lookup_values -> local query (QETL)            |
|   ask_user -----> question card in the chat      |
|   (future) dashboards, datasets, ontology, ...   |
|   |                                             |
|   v                                             |
| Privacy boundary: approveValuesForModel          |
|   (PII check + consent prompt + audit log)       |
+-------------------------------------------------+
```

- **The agent loop runs in the browser.** The data lives there (DuckDB-Wasm
  over Parquet through QETL), so tools that read data run next to it and
  only their *results' shape* goes back to the model. Mutating tools run with
  the user's own Supabase session, so RLS applies to the agent exactly as it
  does to the user.
- **The server is a thin proxy that owns the prompt.**
  `POST /chat/:workspaceId/agent/data-agent-v1/api/stream` holds the
  OpenRouter key, checks that the caller can use the Data Explorer in that
  workspace, builds the system prompt from the workspace's datasets and the
  tool list from `shared/agent/dataAgent` (the browser sends only the
  conversation, D04), looks the requested model up in its own catalog
  (never trusting the client's model object, whose `baseUrl` could redirect
  our key), refuses models outside the roster, caps output tokens and context
  size, and streams Pi's proxy events back. Usage metering per user and plan
  belongs here next (see section 6).
- **Pi supplies the commodity parts:** the loop, tool calling and
  validation, streaming, abort, provider adapters, prompt caching
  (Anthropic `cache_control`, OpenRouter session affinity), cost reporting,
  and switching models mid-conversation. Avandar supplies everything that
  makes the product different: the tools, the privacy boundary, the model
  policy, the prompt, and the eval.
- **Single-shot model tasks get their own routes with server-held prompts.**
  The PDF table assistant posts a region's text, the figures already found,
  and a consent ack to `POST /chat/:workspaceId/extract-measurements`, which
  checks the ack against that exact text and asks the default model with no
  tools (D32). Borrowing the chat route for it had silently broken it.

## 3. The data agent (built in the spike)

Code: `src/lib/agent/dataAgent/`.

| Piece | File | Role |
|---|---|---|
| Agent factory | `createDataAgent/createDataAgent.ts` | Builds the Pi `Agent` with the prompt, three tools, the model policy, a 6-request cap per answer, and usage tracking. |
| Prompt | `buildDataAgentSystemPrompt/buildDataAgentSystemPrompt.ts` | About 1,200 tokens: fixed rules, then the datasets with column types, then today's date (today's harness sends about 3,400 tokens of rules alone). The fixed part is identical across turns, so providers cache it. |
| `run_query` | `createDataAgentTools/runQueryTool.ts` | Runs one query and hands it to the host, which shows it in the Data Explorer or in the chat (D38). The model gets back only the row count and column names. A clean result ends the turn, so a typical answer is one model call. An error (with literals stripped) or an empty result goes back to the model for a fix, at most 3 runs per answer. |
| `lookup_values` | `createDataAgentTools/lookupValuesTool.ts` | Finds how named values are stored. Exact matches (ignoring case and spaces) run locally and answer on their own; anything else shows the user a card of stored values. Only matched or picked values reach the model, through the privacy check. |
| `ask_user` | `createDataAgentTools/askUserTool.ts` | One question card with 2 to 5 options, at most 2 per answer. Built-in options ("Something else") are filtered. |
| Page block | `shared/agent/pageContext/buildAgentPageContextBlock.ts` | The `<current_page>` block that starts each turn's message: the app, the open dataset, dashboard tiles (at most 12), explorer SQL, map, case type, and for a case only its case type. Page text is escaped and marked as data. An "unchanged" line replaces it when the page has not changed. Prompt v2 (`data-agent-v2`) tells the model how to read it (D35). |
| Chat result part | `src/components/ChatPanel/ChatThread/AgentQueryResultPart/` | `AgentQueryResult` stores a result outside the Data Explorer as SQL, chart type, and title, never rows. `AgentQueryResultPart` draws it as a chip or an embed card that re-runs the SQL in DuckDB-Wasm (D36). |
| Host interface | `DataAgentHost.ts` | Everything the tools need from where they run. The browser host (`browser/createBrowserDataAgentHost.ts`) drives the Data Explorer and chat cards; the eval host drives DuckDB in Node and a simulated user. |
| Browser switch | `browser/DataAgentFeature.ts` | Off by default. `localStorage["avandar:data-agent"] = "on"` or `VITE_AVA_DATA_AGENT=on` sends Data Explorer chat through the agent. The agent code loads only when used. |
| Proxy | `supabase/functions/chat/PostAgentStream/` | The server side described above, tested against Pi's own proxy client. |
| Model roster | `shared/agent/DataAgentModelRoster.ts` | One list shared by the browser policy and the proxy allowlist. |

In the browser, a question card ends the agent's turn and the user's answer
arrives as their next message (the existing clarification cards and consent
flow are reused as they are). In the eval, the simulated user answers
inside the tool call. Both cost the same number of model calls.

## 4. Privacy boundary

Every tool result is classified by what it exposes, and one rule decides
what the model sees.

| A tool result exposes | Model sees | Consent |
|---|---|---|
| Nothing but its shape (row count, column names, error kind) | That shape | None |
| Metadata (dataset and column names, types) | Sent freely, in the prompt | None |
| Values the user named, matched exactly on the device | The matched stored value, labeled as an automatic match | Prompt only when the PII check flags it |
| Values the user picked from a card | The picked values | Same |
| Aggregates (not used yet) | The smallest summary computed locally | Always ask, explain what is sent |
| Records (not used yet) | Capped rows after a local PII scan | Always ask |

- Query errors are passed through `sanitizeQueryError`, which keeps the
  error kind and identifiers and replaces quoted literals (which can hold row
  values) with `<value>`.
- A declined consent returns a tool result telling the model to explain how
  to do the step in the UI instead.
- Local models are the planned answer for steps that must read rows without
  consent: PII detection before a consent prompt, column typing, and
  embedding-based routing (section 5).

## 5. Model policy and routing

Eval results (see [eval.md](eval.md)) drove these choices:

- **Primary: Claude Haiku 5.5, thinking off.** It matched or beat today's
  frontier setup on the 45 questions at about 1/85th of the cost.
- **Escalation: Claude Sonnet 5.5, thinking off**, for the rest of an answer
  after a query fails or returns nothing. Most answers never escalate.
- **Routing for the full agent** (not needed yet for data questions): a
  small embedding model in the browser classifies a message into an area
  (data, dashboards, datasets, ontology, cases, workspace, help, general
  chat) with no network call, and only that area's tool pack is loaded. Pi
  can add tools mid-conversation without invalidating the prompt cache on
  Anthropic and OpenAI. A cheap classifier (TypeSafe's Jev or a small LLM)
  is the fallback when the local model is unsure; it sees only the user's
  message, which the main model sees anyway.
- **Availability fallback:** a second provider family (GPT-6 Luna scored
  42/45, GLM 5.3 Flash 41/45) can take over when Anthropic is down, at a
  measured accuracy cost.

## 6. Cost model

Measured on the 45 questions (OpenRouter-billed cost, including caching):

| Setup | Cost per question | Questions per $2 |
|---|---|---|
| Today: chat function, Claude Sonnet 5 | $0.0255 | 78 |
| Today: chat function, GPT-5.6 Terra | $0.0053 | 377 |
| Pi agent, Haiku 5.5 with Sonnet 5.5 escalation | about $0.0003 | about 6,600 |

The agent's code adds nothing to the main bundle; it loads as one 61 KB
(gzipped) chunk on the first Data Explorer message with the agent on. See
[spike-findings.md](spike-findings.md).

At 50% of the basic plan ($2 a month), today's Claude setup affords about 78
questions per user per month, under three a day. The Pi agent on Haiku
affords about 6,600, which leaves room for multi-step agent tasks (5 to 10
model calls each) and for free-tier usage. Free accounts still need a hard
monthly cap, enforced in the proxy.

Still to build for cost control:

1. **Metering in the proxy.** Record each request's billed cost per user,
   workspace, and plan; refuse requests over the plan's monthly budget with
   a readable message.
2. **Per-answer budget.** The 6-request cap is the first guard; add a cost
   cap per answer for long agent tasks.
3. **Context pruning** with Pi's `transformContext` once conversations get
   long: drop old tool results, keep the cached prefix.

## 7. Latency

Median time to an answer on the 45 questions fell from 4.4 to 5.1 s
(today, Claude Sonnet 5) to 2.2 to 2.4 s (Pi agent, Haiku), and p90 from
9.8 to 13.0 s to 3.2 to 3.8 s. Three things keep it there as the agent grows: one model call for most
answers (a clean query ends the turn), local lookups instead of model round
trips, and streaming progress events from Pi for the multi-step tasks.

## 8. From data agent to Avandar agent

The approved, ordered plan is in [roadmap.md](roadmap.md) (D33); this
section is the design behind it.

1. Move the remaining Data Explorer features into the agent path: charts
   (done through `run_query`'s `chart`), dashboards (`add_dashboard_block`),
   and "Try again". Phase 1A is done: the agent answers on every page and
   results outside the Data Explorer show in the chat
   ([spec](specs/phase-1a.md)).
2. Define one **tool registry** for Avandar operations: name, schema, area,
   what it exposes, whether it changes anything, and whether it needs
   confirmation. Each tool calls the existing clients (`DatasetClient`,
   dashboard and ontology clients), so permissions are the user's own.
3. Add **confirmation for mutating tools** in `beforeToolCall`: the user
   approves "Create dashboard X" before it runs.
4. Add **areas** one at a time, each with its own eval questions in
   `scripts/ai-eval`, starting with dashboards and help with the platform.
5. Add **interpretation with consent**: a tool that computes a small summary
   locally and asks before sending it, so the agent can explain what the
   numbers mean with social-sector knowledge.

## 9. Offline mode

Users choose no models (D22). The one choice left is **offline mode**
(D23): chat answered entirely by models in the browser, for privacy, for
working without internet, and as the fallback when the online assistant
cannot be reached.

```
Composer: Offline mode control ── off ──> online agent (proxy, hosted models)
                                └─ on ──> offline agent (this section)
Browser offline + models downloaded ──> offline agent
Online request fails ──> "Answer offline" offer ──> offline agent

Offline agent (src/lib/agent/dataAgent/offline)
  1. Route the message        rules first; a model call only when unsure (D28)
  2. Profile the datasets     once per conversation, in DuckDB (D26)
  3. Find the question's      every 1-3 word run looked up in text columns;
     stored values            longest match wins; names that mean different
                              things in different datasets are flagged
  4. Pi agent loop            same tools and host as online; each step is one
                              WebLLM completion decoded under a JSON Schema of
                              the allowed actions (D25)
       run_query  ─> DuckDB ─> first 5 rows back to the model to check
       ask_user   ─> question card
       (a data question must call a tool before it may reply)
```

**The bundle (D24).** One download, "Download offline models", holds every
model offline mode uses. `OFFLINE_MODEL_BUNDLE` names one model per job
(answer, router, optional escalation). The budget is 4,500 MB of resident
model memory with one large model resident at a time, counted at the app's
8,192-token context window: a 16 GB Mac gives the GPU about 10.7 GB, and
Chrome, the app, and DuckDB-Wasm need most of the rest.

**Why the offline agent gets more help (D26).** A local model may read the
data: nothing leaves the device. So it sees each dataset's profile (row
count, date range, the values of every column with 12 or fewer), the
question's values as they are stored, and the first rows of each result,
which it checks before replying. None of this reaches a hosted model.

**Speed.** On a small model, prefill dominates. Two choices keep WebLLM's
cache warm: the system prompt is the same for the whole conversation (each
question's values travel in its message), and the model's own output is
replayed verbatim in the history, so each step after the first prefills only
the new text (0.5 s instead of 6 s for a 2,000-token prompt in a test).

**Query plans (D27).** `plan_query` lets the model fill slots that tested
code compiles to SQL. It is built and tested, but on Qwen3 4B it scored
below plain SQL, so the offline agent writes SQL by default and the plan
tool stays available behind an option (see [eval.md](eval.md#offline-mode)).

**What is not offline.** Chat outside the Data Explorer keeps the old
multi-pass offline pipeline, now on the bundle's model. Dashboards in the
offline agent wait for the same work online (roadmap R3).
