# Phase 1D: dashboard actions from anywhere

Status: designed with Pablo on 2026-11-11. Part of
[Phase 1](phase-1.md). Follows rules R1 to R4 there. Decision D44 in
[decisions.md](../decisions.md). Builds on [phase-1c.md](phase-1c.md).

## Goal

The agent adds a block to a dashboard from any page: the dashboard open in
the editor, a mentioned or attached dashboard, or a dashboard the user
names. It does this online and offline. The model never sees row values.

## Scope

In:

- An `add_dashboard_block` tool with today's ten block kinds.
- Prompt `data-agent-v4`, served beside v1 to v3, with its own tool list.
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
- More than one block per turn.
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

## The tool

`add_dashboard_block` is defined in `shared/agent/dataAgent/dataAgentTools.ts`
beside `run_query`, so the proxy and the browser read one definition.

| Argument | Meaning |
|---|---|
| `dashboard` | `"current"` for the dashboard open in the editor, or the dashboard's name exactly as the model saw it in the page block, `<mentioned>`, `<attached>`, or the user's message. A placeholder such as `<value 1>` is allowed. |
| `block` | `kind` and the fields for that kind, as today's `addDashboardBlock` takes them: DataViz (`prompt`, `sql`, `vizType`), HeadingBlock, ParagraphBlock, QuoteBlock, DividerBlock, CalloutBlock, ListBlock, CodeBlock, TableBlock, Card. |
| `summary` | One sentence for the user. |

What the model reads back:

| Outcome | Tool result |
|---|---|
| Added to the open editor | `Added to the open dashboard (unsaved).` |
| Card shown | `The card is on the user's screen. Nothing changes until they confirm.` The turn ends, as a deferred `ask_user` does. |
| No editor open for `"current"` | No dashboard is open. |
| No dashboard matches, or the user cannot edit it | No dashboard named the given name that the user can edit. |
| DataViz SQL failed | The error, as `run_query` returns it. |
| Invalid fields | `Invalid block:` and the reason. |

A DataViz block's result reaches the model as its row count and column
names, as `run_query`'s does. Never rows.

`parseDashboardBlock`, `dashboardBlockSummary`, and the block types move
from `supabase/functions/chat/PostChatMessages/parsing/` to
`shared/agent/dashboardBlocks/`. Today's chat and the agent validate blocks
with the same code. Today's chat behaves as before.

## Prompt v4 and the proxy

`data-agent-v4` is v3 plus `DASHBOARD_BLOCK_RULES`:

- Add a block only when the user asks to add something to a dashboard.
- One block per turn.
- Name the dashboard as written, or `"current"` for the open one.
- A chart that only needs to show in the chat or the explorer uses
  `run_query`.
- A `<dashboard_card>` line reports what the user did with the last card.

v1 to v3 are served unchanged. Tools become per version:
`DATA_AGENT_TOOLS_BY_PROMPT_ID` gives v1 to v3 their three tools and v4
four. `buildDataAgentProxyContext` reads it. `DATA_AGENT_PROMPT_ID` becomes
`data-agent-v4`. v4 can change until the commit that deploys it. After
that, a change needs v5.

## Finding the dashboard

`resolveAgentDashboardTarget` runs on the device.

- `"current"` is `DashboardEditorStateManager`'s `activeDashboardId`.
- A name is first restored through the conversation's vault, if it is a
  placeholder. It is then compared, ignoring case and surrounding spaces,
  with the page's dashboard, the mentioned dashboards, the attached
  dashboards, and the workspace's dashboards, in that order. The workspace
  list is loaded once per turn and holds ids and names only. It is never
  sent to the model.
- Only dashboards the user can edit count: the dashboards app role and the
  dashboard's own access.
- One match is the target. Several put a picker on the card. None goes
  back to the model.

## Checking a DataViz block

The host gains `checkQuery`. It runs the block's SQL locally, after the
vault restores placeholders, and does not show the result. A failed query
goes back to the model, which may fix it within its usual request cap. An
empty result is allowed, and the card says the chart has no rows yet.

## The open editor

When the target is the dashboard open in the editor, the browser runs
today's code: `buildPendingDashboardBlock`, then
`DashboardEditorStateManager.queuePendingBlock`. The block shows on the
canvas unsaved, and the user saves it.

## The card

`AgentDashboardBlockPart` is a message part stored in the thread, so it
belongs to its session (1C) and survives a reload.

| State | Shows |
|---|---|
| Pending | The target dashboard, or a picker when several match, and a preview of the block. A DataViz preview is drawn from the local result, as `AgentQueryResultPart` draws one. Text blocks show their text. Confirm and Cancel. Confirm is disabled until a dashboard is picked. |
| Confirmed | That the block was added, with a link to the dashboard. |
| Cancelled | That nothing was added. |
| Failed | Why, with Retry when retrying can help. |

Confirm needs no model call. It reads the dashboard row, appends the block
to the draft content, and saves with `updateDashboardRowIfUnchanged`. If
the row changed since it was read, it reads again and retries once. The
published snapshot is not touched.

The next agent turn starts with one line for each card resolved since the
last turn, before the page block:

```text
<dashboard_card>Confirmed: added to "COVID 2022".</dashboard_card>
<dashboard_card>Cancelled.</dashboard_card>
```

The dashboard name passes through the vault's mask like any other name.

Every string on the card is translated.

## Offline

- The offline agent answers on every page except case-design sessions,
  which keep today's case-manager chat. The multi-pass offline pipeline
  is no longer used for data sessions.
- It reads the page block, the mentioned block, and the attached block,
  with real names, as offline turns may (D42). Its answers stay marked as
  offline answers.
- It has the same `add_dashboard_block` tool, host, card, and card line.
  The offline prompt gains a short dashboard rule.
- The router treats an add-to-dashboard request as `data`.
  `add_dashboard_block` counts as the action a data turn must end with.
- Saving needs a connection. Without one, Confirm fails and the card
  stays retryable. Adding to the open editor works without one, and saving
  the editor needs a connection, as today.

## Errors

| Situation | Behavior |
|---|---|
| `"current"` with no editor open | The model is told no dashboard is open. It asks which one, or names one. |
| No match, or no edit rights | The model is told, and tells the user. Nothing changes. |
| Several matches | The card shows a picker. |
| The DataViz SQL fails | The model gets the error and may retry within its cap. If the cap runs out, the reply says the chart could not be built. |
| Invalid block fields | The model gets the reason and may retry once. |
| The dashboard changed before Confirm | Read again and retry once. Still stale: failed, with Retry. |
| No connection, or the save fails | Failed: "Couldn't save. Check your connection and try again." Retry stays. |
| The dashboard was deleted or access removed | Failed: "This dashboard is no longer available." No Retry. |
| A session switch or reload while a card is pending | The card is stored in the thread and still works. |
| The target's editor opens while a card is pending | Confirm still saves the stored row. The editor's usual handling of a row changed elsewhere applies. |
| Cancel | The card shows cancelled. The next turn's card line says so. |
| Offline, an unreadable tool call | Goes back to the model as a failed call, as offline already does. |

## Eval

New category D, run with `--questions D`, kept out of the default 45.

`EvalQuestion` gains `dashboards` (the workspace's dashboards: id, name,
editable, tiles), `openEditor` (the dashboard open in the editor, if any),
and `card` (the simulated user's script: `confirm`, `cancel`, or
`pick: /name/`). Every answer records
`dashboardWrites: { dashboardId, block, via: "editor" | "card" }[]`.

`gradeDashboardAnswer` checks the end state: the target, `via`, the kind,
and the fields. A DataViz block's SQL runs in DuckDB and is graded against
ground truth with `ResultChecks`.

| Id | Page | Request | Passes when |
|---|---|---|---|
| D01 | Dashboard editor | "Add a line chart of monthly US deaths in 2022" | One editor write: DataViz, line, monthly totals match. |
| D02 | Dashboard editor | "Add a heading that says Deaths in 2022" | One editor write: HeadingBlock with that text. |
| D03 | Dashboard editor | "Add a callout warning that 2023 data is partial" | One editor write: CalloutBlock, tone warning. |
| D04 | Dashboard editor | "Add a table of the 5 states with the most deaths" | One editor write: DataViz table, the top 5 correct. |
| D05 | Dashboard editor | "What were total deaths in 2022?" | No write. The answer's total is correct. |
| D06 | Data Explorer with a query on screen, a dashboard mentioned | "Add this as a bar chart to @COVID 2022" | One card write to the mentioned dashboard, bar, the explorer query's result. |
| D07 | Map page | "Add a chart of weekly US cases in 2022 to the COVID 2022 dashboard" | One card write to that dashboard, weekly total within 5%. |
| D08 | Map page | "Add a heading to the Budget dashboard" (none exists) | No write. The reply says it cannot find it. |
| D09 | Map page, two dashboards named "COVID" | "Add a deaths chart to COVID" | The simulated user picks one on the card, and that dashboard gets one write. |

Harnesses:

- **Baseline:** a page with an editor open sends `ChatPageContext` with
  `app: "dashboards"` and its `dashboardId`. A returned `dashboardBlock` is
  recorded as an editor write, by the rule `shouldQueueDashboardBlock`
  applies.
- **Pi and pi-local:** the host resolves dashboards from the fixture, runs
  `checkQuery` in DuckDB, and the simulated user answers the card.

The baseline's questions, grader, and harness support come first, and its
runs set the bar before the agent side is built.

| Run | Label | Bar |
|---|---|---|
| Today's chat, Claude Haiku 5.5, D01 to D09, two runs | `phase-1d:today-dashboards` | The baseline. D06 to D09 are expected to fail. |
| Agent v4, D01 to D09, three runs | `phase-1d:agent-dashboards` | D01 to D05 at least as good as the baseline. D06 to D09 pass on all three. |
| Agent v4 on P, M, and the 45 | `phase-1d:agent-page`, `phase-1d:agent-mentions`, `phase-1d:agent-45` | Unchanged from v3. A single miss is rerun before calling it a regression. |
| Offline Qwen3 4B on D and the 45 | `phase-1d:offline-dashboards`, `phase-1d:offline-45` | No write that was not asked for, no write without Confirm, the D score recorded, and the 45 at 26 or better. |

## Testing

Red/green TDD with Vitest, plus one browser spec:

- `add_dashboard_block`'s schema, and the per-version tool lists: v1 to v3
  serve three tools, unchanged, and v4 serves four.
- `parseDashboardBlock` keeps its tests in its new place.
- Dashboard resolution: `"current"`, a mention, the tray, a name, a
  placeholder, edit rights, no match, and several matches.
- The editor path queues the block unsaved. The card path ends the turn.
- The card: each state, the save, the stale retry, the offline failure,
  and the next turn's card line.
- v4's prompt holds `DASHBOARD_BLOCK_RULES`. v1 to v3 are unchanged.
- Offline: the router sends an add-to-dashboard request to `data`, and
  offline turns on other pages carry the page, attached, and mentioned
  blocks.
- `tests/e2e/agent-dashboard-block.spec.ts`: with the agent proxy mocked,
  set up a test dashboard, ask from the Data Explorer to add a chart to it
  by name, see the card, confirm, see the link, open the dashboard, and see
  the block. `finally` deletes the dashboard.

## Done when

- The eval runs meet their bars and are recorded in `eval.md`.
- The unit tests and the browser spec pass.
- `pnpm exec tsc -b --force --noEmit` and `pnpm i18n:check` pass.
- `roadmap.md` marks 1D built, `decisions.md` records D44, and the PR
  feature log has F129.
