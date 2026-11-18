# Phase 1D: dashboard actions from anywhere

Status: designed with Pablo on 2026-11-11, revised the same day after a
review against the code. Built on 2026-11-17. Part of [Phase 1](phase-1.md). Follows rules R1 to
R4 there. Decision D44 in [decisions.md](../decisions.md). Builds on
[phase-1c.md](phase-1c.md).

## Goal

The agent adds a block to a dashboard from any page: the dashboard open in
the editor, a mentioned or attached dashboard, or a dashboard the user
names. It does this online and offline. The model never sees row values.

## Scope

In:

- An `add_dashboard_block` tool with today's ten block kinds.
- Prompt `data-agent-v6`, served beside v1 to v5, with its own tool list.
- Finding the target dashboard on the device, by name or as the open one.
- The open editor's path, unchanged from today's chat: the block is added
  unsaved and the user saves.
- A confirm card for any other dashboard. Confirm saves the block.
- The offline agent on every page, with the page block, mentions, the
  tray, and the same tool and card.
- Dashboard eval questions D01 to D09, their grader, and support for them
  in the baseline, Pi, and offline harnesses.

Out:

- **Try again**, the agent's question-card parity, and the
  `dashboard.block_added_via_chat` event. They stay in 1E (D40).
- Editing, moving, or removing blocks, and creating dashboards. They stay
  in Phase 3.1.
- A general confirmation system for every tool (roadmap 2.3). The card
  here serves `add_dashboard_block` only.
- More than one block per answer.
- Case-design sessions. They keep today's case-manager chat, online and
  offline.

## Decisions made while designing

| Question | Decision |
|---|---|
| What happens when the target is not the open editor | A card in the chat shows the block and the target dashboard, with Confirm and Cancel. Confirm saves the block to that dashboard and links to it. The open editor keeps today's behavior: the block is added unsaved, with no card, because Save already confirms. |
| How a dashboard the user names is found | The tool takes the dashboard's name as the model saw it, or `"current"`. The browser resolves it. No match goes back to the model. Several matches put a picker on the card. |
| Which block kinds | All ten of today's kinds, with today's fields. |
| Offline | Full parity. The offline agent answers on every page and gets the same tool and card. Only saving needs a connection, and it fails clearly without one. |
| Analytics and Try again | Not in 1D. 1E adds them. |

## Decisions made while reviewing against the code

| The code showed | Decision |
|---|---|
| The editor saves with a plain update, so its next Save overwrites a row written while it was open. | Confirm on a dashboard that is open in the editor at that moment adds the block to the editor, unsaved, instead of writing the row. |
| A DataViz block needs column bindings. The editor's Save prepares them with `DashboardColumnBindingPreparation.prepareDocument`. | Confirm runs the same preparation before it saves. |
| No call checks edit rights for many dashboards at once. | Names are matched first. Edit rights are checked only for the matches, one `UserClient.canAccessResource` call each. |
| A message part cannot change after its turn, data parts never reach the model, and the runtime rewrites the thread record at the end of every run. | The card's proposal is a data part. Its status lives in a per-session store beside the tray, and the next turn's text reports it. |
| `run_query` asks consent for filter values, counts toward a cap of three queries per answer, and escalates after a failed query. | `add_dashboard_block` does the same with a DataViz block's SQL. |
| The vault restores placeholders in SQL only. | The vault gains `unmaskText` for names and labels. |
| Offline routing and value matching read the whole turn text, and the offline model has an 8,192-token window. | Offline routing and value matching read only the user's message. Offline blocks keep SQL for at most three tiles. |

## The tool

`add_dashboard_block` is defined in `shared/agent/dataAgent/dataAgentTools.ts`
beside `run_query`, so the proxy and the browser read one definition.

| Argument | Meaning |
|---|---|
| `dashboard` | `"current"` for the dashboard on the current page, or the dashboard's name exactly as the model saw it in the page block, `<mentioned>`, `<attached>`, or the user's message. A placeholder such as `<value 1>` is allowed. |
| `block` | `kind` and the fields for that kind, as today's `addDashboardBlock` takes them: DataViz (`prompt`, `sql`, `vizType`), HeadingBlock, ParagraphBlock, QuoteBlock, DividerBlock, CalloutBlock, ListBlock, CodeBlock, TableBlock, Card. |
| `summary` | One sentence for the user. It becomes the reply when the block is added or the card is shown. |

How it runs:

1. The block is validated with the shared parser. Invalid fields go back
   to the model.
2. A second block in the same answer is refused: one block per answer.
3. A DataViz block's SQL has its aliases resolved, gets the consent check
   `run_query` uses (`approveValuesForModel` on its literals), and runs
   on the device with `checkQuery`. It counts toward the three queries an
   answer may run. A failed query goes back to the model and asks for
   escalation, as a failed `run_query` does. An empty result is allowed.
4. The dashboard is resolved (below). The block goes to the open editor,
   or a card is shown.

What the model reads back:

| Outcome | Tool result | Ends the turn |
|---|---|---|
| Added to the open editor | `Added to the open dashboard (unsaved).` | Yes |
| Card shown | `The card is on the user's screen. Nothing changes until they confirm.` | Yes |
| `"current"` with no dashboard on the page | `No dashboard is on this page.` | No |
| No dashboard matches, or the user can edit none of the matches | `No dashboard named "<name>" that the user can edit.` | No |
| DataViz SQL failed | The error, as `run_query` returns it. | On the third query |
| Invalid fields | `Invalid block:` and the reason. | No |
| A second block in one answer | `Only one block per answer. Tell the user what else you would add.` | No |

A DataViz block's result reaches the model as its row count and column
names, as `run_query`'s does. Never rows. When the turn ends on the tool,
the reply is its `summary`.

The parsing in `parseDashboardBlock`, `dashboardBlockSummary`, and
`cleanLlmGeneratedSql` moves from `supabase/functions/chat/` to
`shared/agent/dashboardBlocks/`, so today's chat and the agent validate
blocks with the same code. The edge function keeps a thin wrapper that
parses the tool call's JSON string. Today's chat behaves as before.

## Prompt v6 and the proxy

`data-agent-v6` is v5 plus `DASHBOARD_BLOCK_RULES`. This spec first numbered
it v4, built on v3. `demo/measles` then shipped v4 (a TOOLS bullet for
plugin tools) and v5 (the coded-column rules) first, so the dashboard
prompt became v6, built on v5's full text. Its rules:

- Add a block only when the user asks to add something to a dashboard.
- One block per answer.
- Name the dashboard as written, or `"current"` for the one on the page.
- A chart that only needs to show in the chat or the explorer uses
  `run_query`.
- A `<dashboard_card>` line reports what the user did with an earlier card.

v1 to v5 are served unchanged, and their instruction-hash tests stay as
they are. Tools become per version: `DATA_AGENT_TOOLS_BY_PROMPT_ID` gives
v1 to v5 their three built-in tools and v6 four. The proxy's tool list and
its known-tool check both read it, and so does the browser's tool list.
Plugin tools follow the built-in ones for every version in
`PLUGIN_TOOL_PROMPT_IDS` (v4 to v6), and a bundled plugin tool stays
accepted in the history for every version, as before.
`DATA_AGENT_PROMPT_ID` becomes `data-agent-v6`. v6 can change until the
commit that deploys it. After that, a change needs v7.

## Finding the dashboard

`resolveAgentDashboardTarget` is a pure function. The browser host and the
eval hosts both call it.

- `"current"` is the dashboard open in the editor
  (`DashboardEditorStateManager`'s `activeDashboardId`, which only the
  mounted editor sets). With no editor open, it is the dashboard the page
  shows, such as a preview, which then gets a card. With neither, the
  model is told no dashboard is on this page.
- A name is first restored with the vault's `unmaskText`, if it holds a
  placeholder. It is compared, ignoring case and surrounding spaces, with
  dashboard names in tiers: the page's dashboard, then the mentioned and
  attached dashboards, then every dashboard in the workspace. The first
  tier with a match wins. A requested name that ends in the word
  "dashboard" also matches without that word.
- The workspace's dashboards are loaded once per turn, only when the tool
  first needs them, with `DashboardClient.getAll` filtered by the
  workspace id. The filter matters: without it, the select policy also
  returns public dashboards from other workspaces. The list is never sent
  to the model.
- Each match is checked with `UserClient.canAccessResource` at the editor
  role. Matches the user cannot edit are dropped.
- A match that is the dashboard open in the editor goes to the editor.
  One other match gets a card. Several get a card with a picker.

## The open editor

When the target is the dashboard open in the editor, the browser runs
today's code: `buildPendingDashboardBlock`, then
`DashboardEditorStateManager.queuePendingBlock`. The block shows on the
canvas unsaved, and the user saves it.

## The card

The proposal is an `agent-dashboard-block` data part in the assistant
message: a card id, the block, the summary, and the candidate dashboards.
`AgentDashboardBlockPart` draws it.

The card's status lives in `AgentDashboardCardStore`, one localStorage
record per session beside the thread and the tray
(`ava.chat.dashboardCards.{workspaceId}.{userId}.{sessionId}`), by card
id. It is written as soon as it changes, and deleting a session deletes
it. It is not a field of the thread record, because the runtime rewrites
that record from its own fields at the end of every run.

| State | Shows |
|---|---|
| Pending | The target dashboard, or a picker when several match, and a preview of the block. Each picker option shows the dashboard's name, how many charts it has, and when it was last edited. A DataViz preview is drawn from the local result, as `AgentQueryResultPart` draws one. Text blocks show their text. Confirm and Cancel. Confirm is disabled until a dashboard is picked. |
| Confirmed | That the block was added, with a link to the dashboard. When it went into the open editor, that it still needs saving. |
| Cancelled | That nothing was added. |
| Failed | Why, with Retry when retrying can help. |

Confirm needs no model call:

1. If the chosen dashboard is open in the editor now, the block is queued
   into the editor, unsaved, as on the editor path.
2. Otherwise it reads the dashboard row, appends the block to its content,
   prepares column bindings with
   `DashboardColumnBindingPreparation.prepareDocument`, and saves the
   content with `updateDashboardRowIfUnchanged`. If the row changed since
   it was read, it reads again and retries once. The published snapshot is
   not touched.

The next agent turn starts with one line for each card resolved since the
agent last heard about it, before the page block:

```text
<dashboard_card>Confirmed: added to "COVID 2022".</dashboard_card>
<dashboard_card>Cancelled.</dashboard_card>
```

A hosted turn masks the name with the vault, like any other name. An
offline turn uses the real name (D42). Each status records whether the
agent has heard it, so a line is sent once, even across a reload.

Every string on the card is translated.

## Offline

- The offline agent answers on every page except case-design sessions,
  which keep today's case-manager chat. The multi-pass offline pipeline
  is no longer used for data sessions.
- It reads the page block, the mentioned block, and the attached block,
  with real names, as offline turns may (D42). Its blocks keep SQL for at
  most three tiles, so they fit the 8,192-token window with the offline
  prompt. Its answers stay marked as offline answers.
- Its results go where the online agent's do: the Data Explorer on that
  page, the chat everywhere else.
- Routing and value matching read only the user's message, never the
  blocks before it.
- It has the same `add_dashboard_block` tool, host, card, and card line.
  The offline prompt gains a short dashboard rule, and its rule that a data
  question needs `run_query` also allows `add_dashboard_block`.
- A turn too long for the window gets today's overflow reply.
- Saving needs a connection. Without one, Confirm fails and the card
  stays retryable. Adding to the open editor works without one, and saving
  the editor needs a connection, as today.

## Errors

| Situation | Behavior |
|---|---|
| `"current"` with no dashboard on the page | The model is told. It asks which one, or names one. |
| No match, or no edit rights | The model is told, and tells the user. Nothing changes. |
| Several matches | The card shows a picker. |
| The DataViz SQL fails | The model gets the error and may retry within the query cap. If the cap runs out, the reply says the chart could not be built. |
| Invalid block fields | The model gets the reason and may retry within the turn cap. |
| The dashboard changed before Confirm | Read again and retry once. Still stale: failed, with Retry. |
| No connection, or the save fails | Failed: "Couldn't save. Check your connection and try again." Retry stays. |
| The dashboard was deleted or access removed | Failed: "This dashboard is no longer available." No Retry. |
| A session switch or reload while a card is pending | The card's status is in the session's store and still works. |
| The target is open in the editor at Confirm | The block goes into the editor, unsaved. |
| Cancel | The card shows cancelled. The next turn's card line says so. |
| Offline, an unreadable tool call | Goes back to the model as a failed call, as offline already does. |

Known limit: a card saved while the same dashboard is open in an editor in
another tab is overwritten by that tab's next Save. Saving from the Data
Explorer's **Save to dashboard** has the same limit today.

## Eval

New category D, run with `--questions D`, kept out of the default 45.

`EvalQuestion` gains `dashboards` (the workspace's dashboards: id, name,
editable, tiles), `openEditorDashboardId` (the dashboard open in the
editor, if any), `card` (the simulated user's script: `confirm` or
`cancel`, and `pickDashboardId` for the picker), and `expectedWrite`.
Every answer records
`dashboardWrites: { dashboardId, block, via: "editor" | "card" }[]`.

`gradeDashboardWrites` checks the end state: the target, `via`, the kind,
and the fields. A DataViz block's SQL runs in DuckDB and is graded against
ground truth with `ResultChecks`.

| Id | Page | Request | Passes when |
|---|---|---|---|
| D01 | Dashboard editor | "Add a line chart of monthly US deaths in 2022" | One editor write: DataViz, line, monthly totals match. |
| D02 | Dashboard editor | "Add a heading that says Deaths in 2022" | One editor write: HeadingBlock with that text. |
| D03 | Dashboard editor | "Add a callout warning that 2023 data is partial" | One editor write: CalloutBlock, tone warning. |
| D04 | Dashboard editor | "Add a table of the 5 states with the most deaths" | One editor write: DataViz table, the top 5 correct. |
| D05 | Dashboard editor | "What were total US deaths in 2022?" | No write. The answer's total is correct. |
| D06 | Data Explorer with a query on screen, a dashboard mentioned | "Add this as a bar chart to @COVID 2022" | One card write to the mentioned dashboard, bar, the explorer query's result. |
| D07 | Map page | "Add a chart of weekly US cases in 2022 to the COVID 2022 dashboard" | One card write to that dashboard, a chart (not a table), weekly total within 5%. |
| D08 | Map page | "Add a heading that says Spending to the Budget dashboard" (none exists) | No write. The reply says it cannot find it. |
| D09 | Map page, two dashboards named "COVID" | "Add a chart of monthly US deaths in 2022 to the COVID dashboard" | The simulated user picks one on the card, and that dashboard gets one write: a chart, monthly totals match. |

Harnesses:

- **Baseline:** a page with an editor open sends `ChatPageContext` with
  `app: "dashboards"` and its `dashboardId`. A returned `dashboardBlock` is
  recorded as an editor write, by the rule `shouldQueueDashboardBlock`
  applies. Mentions are named by type, as today's chat hears them (D42).
- **Pi and pi-local:** the host resolves dashboards with
  `resolveAgentDashboardTarget` over the fixture, runs `checkQuery` in
  DuckDB, and the simulated user answers the card.

The baseline's questions, grader, and harness support come first, and its
runs set the bar before the agent side is built.

| Run | Label | Bar |
|---|---|---|
| Today's chat, Claude Haiku 5.5, D01 to D09 | `phase-1d:today-dashboards` | The baseline: D01 to D05 5/5 and D06 to D09 0/4 on every run (recorded in `eval.md`). |
| Agent v6, D01 to D09, three runs | `phase-1d:agent-dashboards` | D01 to D05 at least as good as the baseline. D06 to D09 pass on all three. |
| Agent v6 on P, M, and the 45 | `phase-1d:agent-page`, `phase-1d:agent-mentions`, `phase-1d:agent-45` | Unchanged from v3. A single miss is rerun before calling it a regression. |
| Offline Qwen3 4B on D and the 45 | `phase-1d:offline-dashboards`, `phase-1d:offline-45` | No write that was not asked for, no write without Confirm, the D score recorded, and the 45 at 26 or better. |

## Testing

Red/green TDD with Vitest, plus one browser spec:

- v1 to v5's instructions keep their hashes. v6 is v5 plus
  `DASHBOARD_BLOCK_RULES`.
- The per-version tool lists: v1 to v5 serve and accept their built-in
  tools unchanged, never `add_dashboard_block`, and v6 four, in the proxy
  and the browser, with plugin tools after them where v4 to v6 offer
  them.
- The shared block parser gets tests (the edge file had none), and the
  edge wrapper still parses today's tool calls.
- The vault's `unmaskText`.
- `resolveAgentDashboardTarget`: `"current"`, the page, a mention, the
  tray, a workspace name, a placeholder, a trailing "dashboard", edit
  rights, no match, several matches, and the open editor among matches.
- The tool: invalid fields, one block per answer, consent, the query cap,
  escalation, the editor path, and the card path ending the turn with the
  summary as the reply.
- The card: each state, the editor-open Confirm, the save with prepared
  bindings, the stale retry, the offline failure, the status on the
  session's store, the store deleted with its session, and a card line
  sent once.
- Offline: routing reads only the message, blocks carry at most three
  tiles of SQL, results go to the chat off the explorer, and the router
  sends an add-to-dashboard request to `data`.
- The specs that mock `data-agent-v5` move to `data-agent-v6`.
- `tests/e2e/agent-dashboard-block.spec.ts`: with the agent proxy mocked,
  seed a test dashboard, ask from the Data Explorer to add a chart to it by
  name, see the card, confirm, see the link, open the dashboard, and see
  the block. `finally` deletes the dashboard.

## Done when

- The eval runs meet their bars and are recorded in `eval.md`.
- The unit tests and the browser spec pass.
- `pnpm exec tsc -b --force --noEmit` and `pnpm i18n:check` pass.
- `roadmap.md` marks 1D built, `decisions.md` records D44, and the PR
  feature log has F129.
