# Phase 1A: the page-agnostic agent

Status: design approved by Pablo on 2026-11-08. Part of
[Phase 1](phase-1.md); follows rules R1 to R3 there. Decisions D35 and D36
in [decisions.md](../decisions.md).

## Goal

The data agent answers chat on every page, not only the Data Explorer. It
always knows what is on screen, so "this dataset" or "this chart" resolves,
and it never moves the user to another page: outside the Data Explorer its
results show in the chat.

## Scope

In:

- The agent answers every online chat turn on every page, except the case
  manager's pages, which keep today's `chat` function until 1C.
- The current page travels in each turn as a short text block.
- A general browser host that sends a query's result to the Data Explorer
  when the user is on it, and into the chat everywhere else.
- A chat result part, drawn with the gadget link and embed visuals, with a
  live body that re-runs in the browser.
- Prompt version `data-agent-v2`, served alongside `v1`.
- Six page-context eval questions and a mocked-proxy browser spec.

Out (later sub-projects or phases):

- `@` mentions and the context picker (1B).
- Several sessions, the archive, the expand button, and moving the case
  manager into the main panel (1C).
- Dashboard actions (1D), "Try again" (1E), turning the agent on by default
  (1F). Until 1F the agent still runs only behind `DataAgentFeature`; with
  the switch on, it now runs on every page.
- Offline mode outside the Data Explorer. Other pages keep the old offline
  pipeline; widening offline mode is roadmap 4.2.

## Approach

One agent with a general host (D35). Each turn's message begins with a
block describing the current page; the system prompt stays the same on every
page, so providers keep caching it. The host decides where a result goes.

Rejected: one agent per page type, chosen by route (contradicts R1 and needs
an eval per page type), and sending the page context to the proxy to put in
the system prompt (breaks the prompt cache on every navigation, and the
proxy would still be trusting client-built context).

## Components

| Unit | Where | What it does |
|---|---|---|
| `AgentPageContext` | `shared/agent/pageContext/` (new) | A pure model of what is on screen: app, route, open dataset (id, name), open dashboard (id, name, visible tiles with title, chart type, and SQL), the Data Explorer's current SQL and result columns, open map, case type, or case (id, name, case type name). |
| `createAgentPageContext` | `src/components/ChatPanel/` (new) | Builds an `AgentPageContext` from the router state, `useChatPageContext`, and the dashboard editor state. |
| `buildAgentPageContextBlock` | `shared/agent/pageContext/` (new) | Renders the context as the text block that starts each turn's message. Shared, so the browser and the eval send the same text. |
| `AgentHost` | `src/lib/agent/dataAgent/DataAgentHost.ts` (renamed type) | `DataAgentHost` with `showQuery` no longer tied to the Data Explorer. `askUser`, `readColumnValues`, and `approveValuesForModel` are unchanged. |
| `createBrowserAgentHost` | `src/lib/agent/dataAgent/browser/` (replaces `createExplorerDataAgentHost`) | Sends `showQuery` to the explorer (today's code) when the page is the Data Explorer, otherwise runs the query through the dashboard tiles' path and adds a result part to the reply. |
| `AgentQueryResultPart` | `src/components/ChatPanel/ChatThread/` (new) | A chat content part holding `{ sql, chartType, title, datasetIds }`, never rows. Drawn two ways: an inline chip (the `GadgetChip` look; opens the query in the Data Explorer through its URL params) and an embed card (the `GadgetCard` header over a live body built on `DataVizContent`, re-run in DuckDB-Wasm when shown). Agent results show as embeds. |
| Prompt and tools | `shared/agent/dataAgent/` | One new system prompt rule: the current page block says what "this" means, and when several things on the page could be meant, ask. `run_query`'s description no longer says the result shows in the Data Explorer. `DATA_AGENT_PROMPT_ID` becomes `data-agent-v2`; the proxy serves `v1` too, so tabs opened before the deploy keep working. |
| `ChatThreadStore` | `src/components/ChatPanel/ChatThreadStore/` | Persists the result part (its SQL, chart type, title, and dataset ids), so a reloaded thread re-runs its results. |
| Chat routing | `createChatModelAdapter.ts` | With the switch on, every online turn outside the case manager goes to the agent. Offline turns are unchanged. |

The agent proxy (`PostAgentStream`) needs no change beyond serving the new
prompt id: it already builds the dataset list from the whole workspace, not
from the page.

## One turn

1. The user sends a message from any page. The adapter runs today's consent
   check on the message, captures the `AgentPageContext` at that moment, and
   asks the conversation's agent with the page block followed by the
   message.
2. The model calls `run_query`.
   - On the Data Explorer, the host applies the SQL to the explorer and
     waits for its result, as today.
   - On any other page, the host runs the SQL through the fail-closed
     analyzer and DuckDB-Wasm (the dashboard tiles' path) and adds an
     `AgentQueryResultPart` to the reply.
   - Either way the model gets back only the row count and column names
     (D05), and a clean result ends the turn (D06).
3. The assistant message shows the summary with the result's embed below it.

## Privacy

| The page block carries | Rule |
|---|---|
| App, route, names of the open dataset, dashboard, map, and case type, and column names and types | Metadata, sent freely, as in the system prompt. |
| The Data Explorer's current SQL and result columns | Sent as today's chat already sends them (`lastSql` in `ChatPageContext`), so nothing new crosses. |
| Visible dashboard tiles: title, chart type, SQL | Sent on the same basis as the explorer's SQL. At most 12 tiles; each SQL cut at 1,500 characters. |
| An open case | Its name and case type name only. Never its field values. |
| Rows | Never. |

## Errors

| Situation | Behavior |
|---|---|
| A query fails or comes back empty | Unchanged: the sanitized error (D07) goes back to the model, at most 3 runs per answer, and Sonnet 5.5 takes over (D10). |
| A stored result cannot run later (dataset deleted, no access) | The card shows "Unavailable result", like an unavailable gadget. |
| "This" could mean several things (several tiles, none named) | The agent asks with a question card whose options are the visible tile titles. |
| The user navigates during a turn | The context captured at send time stands; the result still lands in the chat. |
| The user lacks Data Explorer access | The proxy refuses, as today (D03), and the chat says data questions need access to the Data Explorer. 1D revisits roles per tool. |
| A page with nothing to describe (settings) | The block names only the app. |

## Testing

Red/green TDD with Vitest:

- `buildAgentPageContextBlock`: every app; the 12-tile and 1,500-character
  caps; a case page names the case and never its field values.
- `createAgentPageContext`: from router, explorer, and dashboard editor
  state.
- `createBrowserAgentHost`: the explorer destination on the Data Explorer,
  a chat part everywhere else.
- `ChatThreadStore`: the result part survives a round trip and stores no
  rows.
- `AgentQueryResultPart`: loading, rows, chart, and unavailable states, as
  chip and as embed.
- `createChatModelAdapter`: with the switch on, the agent answers on every
  page except the case manager; offline routing is unchanged.
- The proxy serves `data-agent-v1` and `data-agent-v2`.

## Eval

- `EvalQuestion` gains an optional `pageContext`. The Pi harness renders it
  with `buildAgentPageContextBlock`, and the baseline harness passes the
  matching `ChatPageContext` where today's chat has one.
- Six new questions, P01 to P06, on the COVID datasets:

  | Id | Page | Question shape |
  |---|---|---|
  | P01 | Data Explorer, global deaths open | A total over "this dataset" |
  | P02 | Data Explorer, a query on screen | "Break this down by state" |
  | P03 | Dashboard, one tile visible | "Show this chart by month" |
  | P04 | Dashboard, two tiles visible | "Make this a line chart" (a question is expected) |
  | P05 | Map page | A data question that has nothing to do with the page |
  | P06 | Follows P03 | A follow-up on the new result |

- **The bar:** the 45 questions score as before (44 or 45; a miss is rerun
  before it counts as a regression); every P question passes on
  `haiku-sonnet` and scores at least as well as today's chat wherever today's
  chat gets the same context; cost per question stays in today's range, or
  the rise is reported. Runs are archived under a `phase-1a` label.

## Browser test

One Playwright spec with the agent proxy's stream mocked, as
`dashboard-chat-block.spec.ts` mocks today's chat: turn the switch on, open
a dashboard, ask a question, see the result embed in the chat, reload, and
see the result run again. The full agent browser test is 1F.

## Done when

- Unit tests, the type checks (`pnpm type-check`, `pnpm type-check:deno`),
  and lint pass.
- The eval bar above is met and archived.
- The browser spec passes on its own.
- `roadmap.md` marks 1A done and `decisions.md` records any new decisions.
