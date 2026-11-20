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

## Phase 1: the agent becomes the default, everywhere

Reshaped while speccing (D34): the agent is no longer tied to a page, which
pulls 2.4 into this phase. Rules and details are in
[specs/phase-1.md](specs/phase-1.md). Each item gets its own spec, plan,
and implementation, in order.

| # | Item | Done when |
|---|---|---|
| 1A | **Page-agnostic agent.** Done (2026-11-09). The agent answers on every page except the case designer; the current page travels in each turn; results outside the Data Explorer show in the chat as gadget embeds and links ([spec](specs/phase-1a.md)). | Met: unit tests, six page-context eval questions passing (6/6 on three runs), the 45-question eval unchanged (45/45), and a mocked browser spec. Eval label `phase-1a` ([results](eval.md#phase-1a)). Three live checks with live models in the real app passed (2026-11-09). Pushed to the demo on 2026-11-09, so prompt v2 is now fixed: a prompt change needs a new version served beside v1 and v2. The agent stays off until 1D and 1E close the gaps listed under [What keeps the agent off](#what-keeps-the-agent-off-pablo-2026-11-09). |
| 1B | **Attachable context.** Done (2026-11-09). `@` mentions of gadgets in the chat composer and a context picker ([spec](specs/phase-1b.md)). | Done (2026-11-09) on `feat/agent-context` (D41, D42). Met: unit tests; an adversarial privacy review over three rounds, with eight leaks found and fixed; mention questions M01 to M06 passing on all three runs, with P01 to P07 passing and the 45 questions at 44/45 (the miss passed on rerun) on prompt v3. Eval label `phase-1b` ([results](eval.md#phase-1b)). A mocked browser spec, and a live check with live models in the real app that passed all six steps. |
| 1C | **Multiple chats and an archive.** Session tabs, a browser-only archive, the expand button, auto-generated titles, and every AI entry point opening a new session (the case manager's chat moves into the main panel). Built (2026-11-10) ([plan](plans/phase-1c.md), [spec](specs/phase-1c.md), D43). | Unit tests, one browser spec, and a data session's turn text unchanged. |
| 1D | **Dashboard actions from anywhere.** `add_dashboard_block` on the current, mentioned, or asked-for dashboard, online and offline (was 1.1). **Done (2026-11-17). P04 and D04 are closed (2026-11-18). No eval bar is missed.** ([spec](specs/phase-1d.md), D44). | Final eval on prompt v6 (2026-11-18): dashboard questions D01 to D09 passed 9/9 on each of three runs, M01 to M06 (with M03b) 7/7, the 45 questions 44/45 on the final prompt (45/45 on the first v6 runs; the miss is N11, answered in text), and the offline 45 30/45 against a bar of 26, run with the page block the app sends on every turn, on an empty Data Explorer (a first turn with a non-empty page block behaves like the 26/45 and 27/45 runs, so the real app's score depends on what the Data Explorer shows; the earlier offline runs sent none: they scored 25/45 on the rebased tree, 26/45 after the dashboard text was gated, and 30/45 after the tool was gated too; with the page block, the code gated on any block scored 27/45, gated on dashboard turns 26/45, and gated on dashboard turns with an empty Data Explorer's block left out 30/45, the same misses as with no page block; the offline D questions 6/9). **P04, closed:** P01 to P07 scored 6/7 on the first v6 run (P04 answered without asking which chart) and 5 of 9 on single reruns. P04 asks on 10 of 10 runs of v3 and v4 and 5 of 10 of v5 and of v6, so the drop came with v5 (the CODED COLUMNS rules from `demo/measles`), not with the dashboard rules. A bullet in DASHBOARD BLOCKS (`5a508a3c2`) makes v6 ask which chart before changing how one is shown: P04 10/10, P 7/7, M 7/7, the 45 45/45, and D01 and D06 on all six D runs. Two earlier wordings did not close it and were not kept: one reached 10/10 but broke D01 and D06, the other scored 8/10. **D04, closed:** D04 ("Add a table of the 5 states with the most deaths") missed on about half the runs of committed v6 (7 of 13), because the model added a year taken from the dashboard's title, and sometimes dropped the "Unassigned" and "Out of" rows from the ranking. That made the three-run D bar unreliable (the earlier 9/9 was luck). A second bullet in DASHBOARD BLOCKS (`a4def86ad`) says a dashboard's name, title, and charts are labels, not filters, and that a ranking keeps those rows: D04 10/10, then D 9/9 on all three runs, P 7/7, P04 10/10, M 7/7, and the 45 44/45. Two earlier wordings were not kept. The browser spec `tests/e2e/agent-dashboard-block.spec.ts` passes, and the three agent specs moved to prompt v6 pass. Eval label `phase-1d` ([results](eval.md#phase-1d)). Prompt v6 (first numbered v4, then renumbered on top of `demo/measles`'s v4 and v5, built on v5) is fixed once it is pushed to the demo, so a later change needs a new version served beside v1 to v6. The first eval runs (2026-11-17) used it as first numbered: v3 plus the dashboard rules, and the final runs above used v6 itself. |
| 1E | **"Try again" and parity in the agent.** Done (2026-11-19). Try again reruns the agent's latest answer with its first attempt kept in context and a line saying the user wants a different answer, and Try again on an earlier answer starts the agent over from the thread. The agent's question cards are audit-logged and bias-checked through today's function, and it logs `chat.sql_generated` and `dashboard.block_added_via_chat` (D40, D45) ([spec](specs/phase-1e.md)). | Met: unit tests and the chat runtime's integration tests. The Try again set T01 to T06 met its bars against today's chat: the agent passed 18 of 18 graded answers over three runs, with 0 repeats on T01 and T04, against the baseline's 18 of 18 and 0, and T03, T04, and T06 on every run. That is the third wording of the Try again line, the one that ships. The first two missed bar 1 (15 of 18 each as graded), and no fallback was needed. No prompt change, so the 45, P, M, and D were not rerun. Eval label `phase-1e` ([results](eval.md#phase-1e)). The browser test is 1F's. |
| 1F | **Browser test, then on by default.** One Playwright spec (ask, see a table, answer a question card, follow up, ask for a chart), then the agent as the default and the switch removed (was 1.3 and 1.4). | A week on the demo without regressions; the 45-question eval unchanged. |
| 1G | **Loose ends from 1A to 1E.** Every follow-up the earlier phases left open, in one place ([below](#phase-1g-loose-ends-from-1a-to-1e)). | Each item below is fixed or consciously dropped, and the phase's own checks pass. |

### Open after 1D (2026-11-17)

- **P04 on v5 and v6.** Closed (2026-11-18, `5a508a3c2`). "make this a pie
  chart" with two charts on a dashboard should ask which one. It did on 10
  of 10 runs of v3 and v4 and on 5 of 10 of v5 and of v6, so the drop came
  with v5's CODED COLUMNS rules on `demo/measles`. v6 now has a bullet in
  DASHBOARD BLOCKS, right after the `run_query` sentence, that asks which
  chart before changing how one is shown when the page lists several. P04
  scored 10/10, P 7/7, M 7/7, the 45 45/45, and D01 and D06 passed on all
  six D runs. Two earlier wordings failed: wording 1 (a last section with
  "this" or "it", an "@mention" clause, and "before you run any query or
  add any block") scored P04 10/10 but D01 missed 10 of 11 runs and D06 6 of
  11, and the 45 scored 42/45. Wording 2 (only "this", before DASHBOARD
  BLOCKS) scored P04 8/10. The wordings and numbers are in
  [eval.md](eval.md#phase-1d).
- **D04 flakiness.** Closed (2026-11-18, `a4def86ad`). "Add a table of the 5
  states with the most deaths" missed on about half the runs of committed v6
  (7 of 13), and on 2 of 6 D runs with the P04 bullet, because the model
  added `year("date") = 2022` when the dashboard is titled "COVID 2022" and
  sometimes dropped the "Unassigned" and "Out of" rows from the ranking, so
  the three-run D bar (D01 to D05 5/5 on every run) could not be met
  reliably. A second bullet in DASHBOARD BLOCKS says a dashboard's name,
  title, and charts are labels, not filters, and that a ranking keeps those
  rows. D04 alone scored 10/10, and the D questions 9/9 on all three runs.
  Two earlier wordings failed: wording A scored D04 9/10 but D04 missed in 2
  of 3 D runs, and wording B scored 8/10 (the year gone, but the rows still
  dropped on 2 runs). The wordings and numbers are in
  [eval.md](eval.md#phase-1d).
- **Offline bar.** Closed (updated 2026-11-18): the offline 45 is 30/45
  against a bar of 26, run with the page block the app sends on every turn
  (`--page data-explorer`), on an empty Data Explorer. In the app the Data
  Explorer keeps its last query and open dataset across chats, so a first
  turn with a non-empty page block behaves like the 26/45 and 27/45 runs,
  and the real app's score depends on that state. It was 25/45 on the rebased tree and 26/45 after
  the offline prompt stopped carrying the dashboard text on plain questions,
  with N01 newly missing. Listing the dashboard tool only on a turn with
  blocks or a dashboard in the message (`a68dac7f8`) brought it to 30/45, but
  those runs sent no page block, so the app never took that path: the app's
  page block on every turn turned the rules and the tool on for every
  offline turn. The rules and the tool now come only on a turn that can be
  about a dashboard. With the page block the offline 45 scored 27/45 before
  that gate and 26/45 after it, at 939 input tokens per call against 1,129,
  because the page block itself cost the offline model four questions (H05,
  N01, N05, N12) against the same prompt without it. A device turn now
  leaves out the block of a Data Explorer that shows nothing, which says
  only the page's name: the offline 45 scored 30/45 again, with the same
  misses as with no page block, at 970 input tokens per call. The offline
  dashboard questions are 6/9, as before: D04 replied with no block, and D08
  and D09 ended with no reply and no block. D05 and D08 correctly wrote no
  block. Every write outside the open editor used the confirm card.
- **D08 grader.** Fixed in `9925721e3`: `NOT_FOUND_PATTERN` now accepts "don't
  have" and similar, and D08 passed 3 of 3 on v6.
- **Unmasked text.** Updated 2026-11-18: a hosted turn shows real values in
  its replies, a query's summary, and a question card's text and option
  labels (D39). Still masked: the message that posts a picked option reads
  `<value N>` in the thread, since the option goes back to the model with no
  consent check.
- **Chart results.** Closed in `d2ab8f862`: the dashboard tool's result now
  tells the model the chart's row count and column names, never its rows.
- **Forged card lines.** Closed in `0e05fe689`: `dashboard_card` is in
  `PLAIN_BLOCK_TAG_START` (`shared/agent/pageContext/agentBlockText.ts`), so
  tile SQL cannot forge a card line.
- **Translations.** Closed in `1da720482`: the card's strings are translated
  in every locale.

### What keeps the agent off (Pablo, 2026-11-09)

Turning it on before 1D and 1E would have lost what today's chat does
below. Both are done:

| Today's chat feature | Agent today | Planned |
|---|---|---|
| "Add a chart to this dashboard" adds a block in the dashboard editor | Adds the block from any page: unsaved in the open editor, or through a confirm card for another dashboard, online and offline | Done in 1D |
| "Try again" sends the previous attempt (`retryContext`) | Keeps its first attempt, and a hosted retry adds a Try again line. Try again on an earlier answer starts over from the thread. | Done in 1E (D45) |
| Clarification cards are audit-logged and bias-checked | Its `ask_user` and value cards go through the same `recordClarificationShown` | Done in 1E (D40, D45) |
| Analytics `chat.sql_generated`, `dashboard.block_added_via_chat` | One `chat.sql_generated` per answer that showed a query, and `dashboard.block_added_via_chat` per block that reaches a dashboard | Done in 1E (D40, D45) |

Parity or better: data questions (45/45, about a quarter of the cost, about
twice as fast), consent before values or a typed message cross, the case
designer, offline mode. New: questions from maps, datasets, case pages,
settings.

## Phase 1G: loose ends from 1A to 1E

Everything 1A to 1E marked done "except for" something lives here, so a
finished phase stays finished. Each item names where it came from. The
specs keep their own lists as history. This table is the one to work from.
Order: after 1F's browser spec, during its week on the demo, and before
Phase 2.

| # | Group | Item | From |
|---|---|---|---|
| G1 | Privacy | **Names that never appear as a SQL literal** (a column alias, a title no chart filters on, a dashboard name) still reach the model. | [1A redaction](specs/phase-1a-redaction.md#still-open) |
| G2 | Privacy | **Map layer names** can carry a layer's own filter value, because layer queries are not vaulted. | [1B](specs/phase-1b.md), [1C](specs/phase-1c.md) |
| G3 | Privacy | **Row counts as an oracle**, double-quoted values, short values, common words that are names, and over-redaction. The rest of the redaction doc's "Still open" list. | [1A redaction](specs/phase-1a-redaction.md#still-open) |
| G4 | Privacy | **The message that posts a picked option** reads `<value N>` in the thread, because the option goes back to the model with no consent check. | 1D, D39 |
| G5 | Accuracy | **The agent occasionally invents row details it never saw.** Needs a grader and a prompt or tool fix under the usual bar (no accuracy loss, nothing invented). | [1B](specs/phase-1b.md) |
| G6 | Accuracy | **Offline score depends on the Data Explorer.** The offline 45 is 30/45 on an empty Data Explorer and about 26/45 when the page block is not empty. | 1D |
| G7 | Reliability | **Stopping a run:** pass the abort signal into `run_query` and consent so a stopped run ends at once. | [1A](specs/phase-1a.md) |
| G8 | Reliability | **Two simultaneous first turns** of one chat could each create a conversation. | [1A](specs/phase-1a.md) |
| G9 | Reliability | **Table aliases can drift:** the proxy rebuilds them from the workspace's current datasets each request, the browser keeps the first list. A dataset added mid-conversation can shift them. | [1A](specs/phase-1a.md) |
| G10 | Reliability | **Each chat result runs twice** (host, then card) and the two runs can apply different row limits. Also give the result query a fixed id so cached results survive a reload. | [1A](specs/phase-1a.md) |
| G11 | Reliability | **A saved dashboard card is overwritten** by another tab's next Save when the dashboard is open in an editor there. | [1D](specs/phase-1d.md) |
| G12 | UX | **Today's chat shows no error text** for a failed turn and no Try again (the message has no content). Render the message's error status. The agent path already replies. | [1A](specs/phase-1a.md) |
| G13 | UX | An auto-height body for a failed card, and dropping the unused "Unavailable result" label. | [1A](specs/phase-1a.md) |
| G14 | Try again | **Branches with identical user messages** are not told apart. Only matters if the app gains a branch picker or an edit action. | 1E, D45 |
| G15 | Try again | `isRepeatedAttempt` counts an errored attempt pair as a repeat, and the schema grader still passes "nothing needs to be renamed". | 1E |
| G16 | Cleanup | Rename `agentPageNameLoader.ts` to match `createAgentPageNameLoader`. Make `isAgentAccessDenied` stop reading the proxy's error message. Make the e2e helpers `seedDashboardWithTile.ts` and `createDashboardWithDataVizBlock.ts` write snake-cased configs like the app. | 1A, 1B |
| G17 | Cleanup | The minor review findings 1E left: `create*` naming on three helpers, test names with two claims, a partial `ANALYTICS_APP_BY_PAGE_APP`, two positional-parameter helpers, two `as unknown as` casts, and a card test with no `card_shown` assertion. | 1E |

Accepted and not on the list: offline replies stored before the offline
answer mark existed reach hosted requests as written.

## Phase 2: foundations every area needs

| # | Item | What it is |
|---|---|---|
| 2.1 | **Tool registry** | One shared definition per Avandar operation (name, argument schema, area, what data it exposes, whether it changes anything, minimum app role), extending `shared/agent/dataAgent/dataAgentTools.ts`. The proxy serves tool lists from it (the D04 pattern); the browser adds what runs. |
| 2.2 | **Router** | Rules first, then a small classifier only when unsure (the offline router, D28, is the first piece). Picks the area and loads only that area's tools, which keeps prompts small and cached (D19). |
| 2.3 | **Confirmation for changes** | A tool that creates, edits, or deletes shows a card in the chat with exactly what will change, and Confirm and Cancel, before it runs (D20, D33). Undo where the operation allows it. |
| 2.4 | **General host** (moved into Phase 1 as 1A, done) | `DataAgentHost` is Data Explorer specific. It becomes a host that knows the current page and shows results in the chat without moving the user (Phase 1 rule R3). |
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
| F4 | **Chat history in the database.** Phase 1C keeps sessions and the archive in the browser only; persist every chat server-side so history follows the user across devices. | D34 |
| F5 | **Chat session limits** for free and basic accounts, enforced with F1. | D34 |
