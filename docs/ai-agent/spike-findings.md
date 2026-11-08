# Pi spike: findings

What the spike set out to learn, and what it found. Run on 2026-11-07 on
`feat/pi-agent`, against a local Supabase stack for the branch and the
`@earendil-works/pi-*` packages at 1.5.0.

| Question | Answer | Evidence |
|---|---|---|
| Can Pi run inside the web app? | Yes | The data agent runs in the browser through the real chat panel, Data Explorer, and DuckDB-Wasm (section 1). |
| What does it add to the bundle? | Nothing up front; 61 KB gzipped on first use | Production build (section 2). |
| Does it run in our edge functions? | Yes | `pi-ai` streams from Deno 2.1.4, the version in the local edge runtime, and the proxy route serves the browser (section 3). |
| Does prompt caching work through OpenRouter? | Yes on Anthropic models; partly on OpenAI | 88 to 95% of input tokens were cache reads on Claude models, 21 to 27% on GPT models (section 4). |
| Does it plug into the existing chat UI? | Yes, with no new UI | One branch in `createChatModelAdapter` and a browser host (section 5). |
| Can it match today's harness on today's questions? | Yes, at about 1/85th of the cost | [eval.md](eval.md). |

## 1. In the browser

With `localStorage["avandar:data-agent"] = "on"`, these ran end to end in
headless Chromium against the local app (screenshots in
`.temp/feat-pi-agent/shots/`, which git ignores):

| Question | Path exercised | Result |
|---|---|---|
| Top 10 countries by total covid deaths | One model call, query in the Data Explorer | Correct (US 1,123,836 to France 166,176), 10 s including the first load of the dataset |
| Weekly covid deaths in the UK in 2021 | `lookup_values` matched "United Kingdom" on the device, no card | Correct, 53 weekly rows, summary says the overseas territories are included |
| covid deaths in korea in 2022 | Automatic match, stated assumption | South Korea, said so in the summary |
| how many participants did the youth program have in the north? (a small test dataset) | No exact match, so the existing values card listed the stored programs; the pick came back as the next message | Correct (231) after picking Youth Mentoring |
| now show it by month for the south | Follow-up in the same agent conversation | Correct, 6 monthly rows |
| make me a chart of global covid deaths by month | `run_query` with `chart: "line"` | Line chart drawn in the explorer |

One bug found and fixed in the browser run: the reply showed the model's
narration written beside the tool call ("Let me check that and run it")
instead of the query summary. The agent now shows the summary when its
turn ends on a query.

Two things to polish before wider use:

- When the turn ends on a question card, the reply above the card is the
  model's narration ("I'll look up how the program names are stored"). A
  fixed line, or the question alone, would read better.
- The lookup card's question said "Which stored program…"; the prompt asks
  the model to avoid "stored", and Haiku used it anyway.

## 2. Bundle size

From `vite build` on the branch:

| Chunk | Raw | Gzip | Loaded |
|---|---|---|---|
| `runDataAgentTurn-*.js` (agent, tools, prompt, Pi loop, OpenRouter catalog) | 429 KB | 61 KB | On the first Data Explorer message with the switch on |
| Provider SDK chunks (`anthropic-messages`, `openai-completions`, `client`) | 530 KB | 141 KB | Never in the browser: every request goes through the proxy |
| Main chunks | unchanged | unchanged | No Pi code (checked for `streamProxy`) |

Most of the agent chunk is Pi's OpenRouter model catalog (388 models). It
could shrink by building the two roster models by hand instead of
importing the catalog, at the cost of copying model metadata (API kind,
cost, compatibility flags) that Pi keeps current.

## 3. Deno and the proxy

- `pi-ai` imports and streams from Deno with `npm:` specifiers (tested on
  the local Deno and through the edge runtime). The only warning is about
  `@google/genai`'s install script, which the proxy never loads.
- The route `POST /chat/:workspaceId/agent/api/stream` returns server-sent
  events in Pi's proxy format. `toProxyEvent.test.ts` streams scripted
  model output through it over HTTP and reads it back with Pi's own
  `streamProxy` client, so both sides of the wire format are checked.
- The proxy served 12 requests in the browser run with no errors in the
  function log.

## 4. Prompt caching

| Model family | Share of input tokens read from cache (Pi agent) | Today's harness |
|---|---|---|
| Anthropic (Haiku 5.5, Sonnet 5) | 88 to 97% | 0% (no cache markers) |
| OpenAI (GPT-5.6 Terra, GPT-6 Luna) | 21 to 28% | 97 to 99% |

On Anthropic models, Pi adds the `cache_control` markers and OpenRouter
session affinity, and the agent's fixed prompt comes first, so nearly all
of every request after the first is a cache read at a tenth of the price.
On OpenAI models, today's harness caches better: its prompt is long and
stable enough for OpenAI's automatic cache, while the agent's shorter
prompt and the per-turn date at its end leave less to cache. It does not
matter for the chosen roster, which is all Anthropic, but moving the date
out of the system prompt would help if an OpenAI model joins it.

## 5. Chat UI integration

- `createChatModelAdapter` sends a Data Explorer message to
  `runDataAgentTurn` when the switch is on; everything before that branch
  (the bias check, consent acks, analytics, the offline mode) still runs.
- The agent's code is loaded with a dynamic import on first use.
- Question cards reuse the existing clarification card and its consent
  flow. The card's answer arrives as the next chat message, which goes to
  the same agent (D09 in [decisions.md](decisions.md)).
- One agent per conversation, kept in memory. After a reload, the first
  message starts a new agent with a short recap of the thread.

## 6. Not done in the spike

- Usage metering and plan budgets in the proxy (D18).
- Dashboards in the agent (`add_dashboard_block`) and "Try again".
- An automated end-to-end test of the agent path in `tests/e2e` (the
  browser run above was manual, through a headless driver).
- Context pruning for long conversations.
