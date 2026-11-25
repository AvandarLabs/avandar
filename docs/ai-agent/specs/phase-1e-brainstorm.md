# Phase 1E brainstorm: "Try again" and parity in the agent

Status: brainstorm, 2026-11-19. Written without a live design session:
every open question is resolved here from the roadmap, the decision log,
and the code, and each resolution is listed under
[Assumptions](#assumptions) for Pablo to confirm or overturn before the
spec is written. This is not the spec and not the plan. Part of
[Phase 1](phase-1.md). Decision D40 in [decisions.md](../decisions.md).
Builds on [phase-1d.md](phase-1d.md).

## Goal

Turning the agent on (1F) loses nothing today's chat does on three counts:

1. **Try again.** Regenerating an answer reruns it with the previous
   attempt as context, as today's `retryContext` does.
2. **Question cards.** The agent's cards are written to the clarification
   audit log and bias-checked, as today's clarification cards are.
3. **Analytics.** The agent logs `chat.sql_generated` and
   `dashboard.block_added_via_chat`, as today's chat does.

## Scope

In:

- Try again on an agent answer, hosted and offline.
- The audit log and bias check for every card the agent shows: `ask_user`
  cards and the value cards `lookup_values` shows.
- The two analytics events, on every agent path that produces them.
- A small Try again eval set, graded against today's chat first.

Out:

- 1F: the browser spec, the agent on by default, and removing the switch.
- Any change to prompts v1 to v6, or to what a turn that is not a Try
  again sends.
- Changing what today's chat does. Its code moves only where 1E shares it.
- New analytics events or payload fields.
- Quirks today's chat already has (listed under [Risks](#risks)).

## Current behavior

### Try again

| | Today's chat | The agent |
|---|---|---|
| Button | `ActionBarPrimitive.Reload` on every assistant message (`src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx:58`). assistant-ui enables it on any assistant message while the thread is idle, drops that message and every later turn, and calls the adapter's `run` with the thread up to the user message before it. | The same button. |
| How a retry is detected | `chatMessagesKey(hostedChatMessages)` equals the key the last completed hosted turn stored in `lastTurnRef` (`createChatModelAdapter.ts:699-704`, `chatRuntimeTurnHelpers.ts:48`). Only the latest answer can match. A session switch resets `lastTurnRef` with the chat generation (`useAvandarChatRuntime.ts:391-392`), and a page reload loses it. | Not detected. The agent branch (`createChatModelAdapter.ts:679-697`) returns before the retry code runs. |
| What the model gets | `buildRetryContext` (`chatRuntimeTurnHelpers.ts:63`) sends the prior reply text (2,000 characters), SQL (8,000), clarification question (400), and dashboard block kind. The server adds `buildRetryContextNote` (`supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts:272`) to the turn suffix: "The user explicitly asked you to TRY AGAIN ... take a different approach". | `askConversationDataAgent` (`dataAgentTurnHelpers.ts:474`) asks the conversation's Pi agent the same message again. The Pi transcript still holds the first attempt (its tool calls, their results, and any reply), so the model reads its first attempt, then the same question, with nothing saying the user wants another answer. |
| Try again on an earlier answer | The key does not match, so no retry context. The server gets the truncated thread, which is the right history. | The Pi transcript keeps every turn after the retried one, which the thread no longer shows. The model answers with turns the user can no longer see. |
| Offline | `runOfflineTurn` runs before the retry code, so an offline turn never sends retry context. | A plain re-ask on the offline conversation. |
| After a failed attempt | `lastTurnRef` is set only after a successful response, so it is a plain re-ask. | A plain re-ask. |

`isSchemaAnswerTurn` (`src/lib/agent/schemaAnswer/isSchemaAnswerTurn.ts:21`)
and prompt v2's SCHEMA rule (`shared/agent/dataAgent/buildDataAgentSystemPrompt.ts:116`)
already expect a typed "try again" after a column question. Neither sees
the button.

### Question cards

| | Today's chat | The agent |
|---|---|---|
| How the card is shown | `applyChatTurnResponse.ts:96-106` awaits `recordClarificationShown`, then calls `setPendingClarification({ ...clarification, auditId })`. | `ask_user` (`askUserTool.ts:42`) and `lookup_values` call `host.askUser`. The browser host (`createBrowserDataAgentHost.ts:87-94`) calls `showQuestionCard`, which the conversation host (`createConversationAgentHost.ts:75-79`) turns into `setPendingClarification(clarification)` with no `auditId`. The hosted and offline agents share this host (`runOfflineDataAgentTurn.ts:31`). |
| Bias check | `detectBias(clarification.question)`. Hits print a `console.warn` with their labels, and the card shows anyway (`applyChatModelTurnResponse.ts:262-274`). | None. |
| Audit log | `ClarificationAuditEntryClient.recordShown` (`ClarificationAuditEntryClient.ts:57`) writes a row to the browser's Dexie database: the response shape, question length, option count, and `turnNumber`, never text. The card records the outcome by `auditId` (`useClarificationSubmission.ts:42-47`, `resolveClarificationAnswer.ts`, `useDiscoveryRecovery.ts`). | No row. The card is the same component, but with no `auditId` it records no outcome either. |
| `turnNumber` | The thread's earlier clarification answers plus one (`countClarificationsInHistory`, `parseClarify.ts:31` and `:95`). | Always `1` (`createBrowserDataAgentHost.ts:90`). |

Offline data sessions run the offline agent whatever the switch says
(`runLocalChatTurn.ts:70-77`), so an offline data session writes no audit
rows today, with the switch on or off.

### Analytics

| Event | Today's chat | The agent |
|---|---|---|
| `chat.message_sent` | Logged in the adapter before either path (`createChatModelAdapter.ts:571-594`). | The same call, so already logged. |
| `chat.sql_generated` | Once per turn, after the consent review passes and the SQL is applied to the Data Explorer, with `app: "data_explorer"` and the payload `{ sqlChars }` (`applyChatModelTurnResponse.ts:119-124`). Logged even when the query then fails. Not logged when consent is declined, the turn is stale, or the turn is a column question. | Not logged. `runQueryForUser` (`runQueryTool.ts:180`) sets `state.lastQuery` after each query it shows, in the explorer or in the chat, and one answer can show up to three. |
| `dashboard.block_added_via_chat` | When a block is queued into the open editor (`applyChatModelTurnResponse.ts:225-247`), with `app: "dashboards"` and the payload from `ChatAnalyticsPayloads.fromDashboardBlock`: the block kind, chart type, dashboard id, and block count after. | Not logged. A block reaches a dashboard two ways: queued into the open editor by the tool (`addAgentDashboardBlock.ts:91`), or through a card the user confirms (`confirmAgentDashboardCard.ts:38`), which queues it into the editor or saves the row. |

The multi-pass offline pipeline, which now serves only case-design
sessions, logs `chat.sql_generated` and audits its cards through
`applyResponseIfCurrent`. The offline agent, which answers every offline
data session, logs neither event.

## Part A: Try again

### Approaches

| | A1. Keep the attempt, add a Try again line (recommended) | A2. Roll back and describe the attempt | A3. A tagged block under prompt v7 |
|---|---|---|---|
| How | The first attempt stays in the Pi transcript, where the model already has it in its own words. The retry turn's text gains one fixed line before the question. | Snapshot the conversation before each ask. On Try again, cut the transcript back to the snapshot (Pi's `agent.state.messages` setter), restore the page and tray block memory and the dashboard card lines the cut turn reported, and send a description of the first attempt with the question, as `buildRetryContext` does. | As A1, but the line is a tagged block that a new prompt version explains, served beside v1 to v6. |
| The previous attempt as context | All of it: the model's own tool calls and results. | A text summary, truncated as today's is. | As A1. |
| Cost of a retry | The line, about 50 tokens. The first attempt is already in the cached prefix. | The summary as new uncached input (up to a few hundred tokens), on a shorter transcript. | As A1, plus the new rules on every turn of every chat. |
| Prompt | Unchanged: v6. | Unchanged: v6. | v7, so the 45, P, M, and D rerun three times each, and v7 is fixed once pushed. |
| Code | One thread comparison, one option on `buildAgentTurnText`, one record per conversation. | Snapshots, transcript surgery, restored block memory, un-reported card lines, and the same again in the eval harness. | As A1, plus the version, its tool list entry, and its hash test. |
| The transcript afterwards | Holds both attempts. The thread shows only the second. | Matches the thread. | As A1. |
| Privacy | Nothing new crosses: the model read the first attempt already. | Nothing new: the summary is built from the model's own output, placeholders intact. | As A1. |

**Recommendation: A1**, with the earlier-answer rule in the design below.
It is the cheapest, gives the model the most faithful copy of its first
attempt, and needs no new prompt version. A2 is the fallback if the Try
again eval shows the kept attempt hurts the retry or the follow-up after
it. A3 is the fallback if the model ignores the plain line.

A1 departs from the 1E row of [phase-1.md](phase-1.md), which says
regenerating "rolls the agent back to before the last turn". A rolled-back
attempt must be sent again as a summary anyway, and rolling back adds the
bookkeeping in the A2 column. The goal behind that wording, an agent
history that matches the thread, is kept where the two diverge in a way
that misleads the model: Try again on an earlier answer.

### Design

1. **Where a retry is detected.** In `askConversationDataAgent`, which the
   hosted and the offline agent share, not in the adapter's `lastTurnRef`.
   Each conversation records the thread it was last asked (the key
   `chatMessagesKey` builds from `turn.apiMessages`, and the message
   count) and whether that ask ended in a kept reply (not stale, no
   failed model call).
2. **Three cases**, comparing the turn's thread with the recorded one:

   | The turn's thread | What it is | What happens |
   |---|---|---|
   | Starts with the recorded thread and is longer | A follow-up, a card answer, or a view change | As today. |
   | Equals the recorded thread | Try again on the latest answer | A hosted turn after a kept reply gets the Try again line. An offline turn, or one after a failed attempt, is a plain re-ask, as in today's chat. |
   | Anything else | Try again on an earlier answer | The conversation is stopped and dropped, and a new one starts from the thread's recap, as after a reload. No Try again line: the recap does not hold the dropped answer, and today's chat sends no retry context here either. |

3. **The line.** `buildAgentTurnText` gains an `isRetry` option. When it is
   set, a fixed line goes between the blocks and the user's message:

   > The user clicked Try again: they want a different answer to the
   > question below than your last one above. Do not repeat it. Read the
   > question another way, take a different approach, or ask one question
   > if your last answer had to guess.

   It adapts today's note to the agent. It is plain text, not a tagged
   block, because v2 tells the model that text inside the tagged blocks is
   data, never instructions (`buildDataAgentSystemPrompt.ts:90`). It avoids
   the words `isSchemaAnswerTurn` matches ("columns", "same", "append",
   "stack"), so a retried column question stays one, and it does not tell
   the model to run a query, so v2's SCHEMA rule still answers a retried
   column question in text. Without `isRetry`, the function's output is
   byte-identical to today's.
4. **What is stored.** Nothing new. The line exists only in the Pi
   transcript. The thread stores the user's message, so a recap after a
   reload never shows it. As today, the retry record lives in memory: a
   reload, or a session switch (which starts a new conversation), forgets
   it.
5. **What a retry does not undo.** A query the first attempt showed in the
   Data Explorer, a block it queued into the editor, or a card the user
   confirmed stays, as with today's chat.

## Part B: question cards

### Approaches

| | B1. One shared function, called by the conversation host (recommended) | B2. A copy in the browser host | B3. After the reply, from the run state |
|---|---|---|---|
| How | Move today's `recordClarificationShown` handler out of `applyChatModelTurnResponse.ts` into one function: the bias check, the warning, and `recordShown`, returning the id. Today's chat calls it as before. The conversation host's `showQuestionCard` awaits it and sets the pending card with its `auditId`. | Copy the bias check and the audit write into `createBrowserDataAgentHost.askUser`. | `askConversationDataAgent` reads `state.questions` after the ask, writes the row, and sets the pending card again with the id. |
| Parity | By construction: one function for both paths. | Two copies that can drift apart. | The card is on screen without an `auditId` for a moment, so a quick answer records no outcome. |
| Covers | `ask_user` and value cards, hosted and offline, since both go through the conversation host. | The same. | The same, but late. |

**Recommendation: B1.**

### Design

- The shared function keeps today's behavior exactly: `detectBias` on the
  card's question, a `console.warn` with the hit labels, the card shown
  anyway, and `ClarificationAuditEntryClient.recordShown`. Options are not
  checked: today's chat does not check them, and a value card's options
  are stored data, not the model's words.
- `showQuestionCard` becomes async and `askUser` awaits it, so the card
  appears with its `auditId`, in the order today's chat uses. A failed
  audit write is already swallowed inside `recordShown`.
- The card already records outcomes by `auditId`, so answering,
  dismissing, and the discovery recovery path need no change.
- `turnNumber` is counted as today's server counts it: the user messages
  in the turn's thread that start with `[Clarification answer:`, plus one,
  at most 3. The fixed `1` goes. The agent's card ends its turn (D09), so a
  count within one answer would always be 1.
- On a hosted turn the card's question is unmasked before it is shown
  (D39), so the bias check reads what the user reads. The audit row holds
  lengths and counts, never text, in the browser's own database. Nothing
  leaves the device.

## Part C: analytics

### Approaches for `chat.sql_generated`

| | C1. Once per answer, after the ask (recommended) | C2. In the host, on every query shown | C3. From Pi's tool events |
|---|---|---|---|
| How | The conversation host notes the last SQL it showed this turn, placeholders restored, as the user sees it. When the ask settles, `askConversationDataAgent` logs one event if a query was shown. | The conversation host's `showQuery` logs every time. | A subscriber on `tool_execution_end` for `run_query`. |
| Count | One per answer, as today's one per turn. | Up to three per answer when a query is fixed, so the ratio to `chat.message_sent` shifts when the agent is turned on. | As C2. |
| Covers | Hosted and offline. | The same. | Hosted only, unless wired twice. |

**Recommendation: C1.** The event keeps its meaning: an answer put
generated SQL in front of the user. It is logged when the explorer or the
chat showed a query, even if the query then failed (as today), and not when
consent was declined or the question was about columns, since no query was
shown. The payload is unchanged: `{ sqlChars }`, the length of the SQL
shown. `app` is `data_explorer` when the result went to the Data Explorer
(the conversation host's `_isOnDataExplorer`), and otherwise the page's app,
mapped as `chat.message_sent` maps it. Today's chat always says
`data_explorer` because it always applies the SQL there. The agent does so
only on that page (D38), so the event says where the SQL went.

### Approaches for `dashboard.block_added_via_chat`

| | C4. When a block reaches a dashboard (recommended) | C5. When the agent proposes a block | C6. Only on the open editor |
|---|---|---|---|
| When | Queued into the open editor by the tool, and on a confirmed card, whether it was queued into the editor or saved. | Also when a card is shown. | Only the editor path, the one path today's chat has. |
| Gap | None. | Counts cards the user cancels. | Misses every block added from another page, which is what 1D added. |

**Recommendation: C4.** One event per block that reaches a dashboard. None
for a card that is shown, cancelled, or fails. A Retry after a failed save
logs once, when it succeeds. `app` is `dashboards`, as today.
`ChatAnalyticsPayloads.fromDashboardBlock` takes the dashboard id directly
instead of reading it from the page context, so the agent passes the
dashboard it resolved. `blockCountAfter` is set when the block goes into
the open editor, from the editor's content as today's chat reads it, and
left out for a saved card (the field is optional).

## Privacy and cost

- No part adds a model call. The only new model input is the Try again
  line, about 50 tokens, on retry turns only.
- Nothing new reaches a hosted model: a retry points at an attempt the
  model already wrote, and the bias check and audit log run on the device.
- The analytics payloads do not change: counts, kinds, and ids, never SQL
  text or chat content.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| Send today's `retryContext` to the agent proxy, which adds the note on the server | Changes the request that Pi's `streamProxy` sends, and either breaks the system prompt's cache or needs a new prompt version. |
| Detect a retry in the adapter, with `lastTurnRef` | It cannot see that an earlier answer was retried, and the offline agent never reaches it. The conversation code is shared by both agents. |
| Roll back the transcript (A2) as the first choice | See Part A. Kept as a fallback. |
| A new prompt version for the line (A3) as the first choice | Three reruns of four question sets for a line the model may well follow as plain text. Kept as a fallback. |
| The Try again line on offline turns | Today's offline chat sends no retry context. The 4B model's window and accuracy are tight, and measuring the line needs the real-WebLLM eval. |
| Cutting the transcript back on Try again of an earlier answer, instead of starting over | The same bookkeeping as A2 for a rarer case. The recap path already exists and is tested. |
| A Try again line after an earlier answer's retry | The new conversation's recap does not hold the dropped answer, so "your last one above" would point at nothing. Today's chat sends nothing here either. |
| Asking the model to rephrase when the bias check hits | Today's chat passes the card through. A second model call per hit is a cost today's chat does not pay, and the audit row's `biasReprompts` stays 0. |
| The chat session id as the audit row's `threadId` | Today's chat records none. Worth doing for both paths later, not as parity. |
| An `isAgent` field on both events | Changes shared payload types for a difference that ends when 1F removes the switch. |
| Returning the block count from `appendBlockToDashboard` for saved cards | A client change for an optional field. |

## Assumptions

1. Prompt v6 stays as it is. The Try again line ships without a new
   version unless the Try again eval misses its bar, which leads to A3.
2. "As today's `retryContext` does" means the model gets its previous
   attempt and is told to take a different approach. The form the attempt
   takes (transcript or summary) is free.
3. The 1E row of [phase-1.md](phase-1.md) ("rolls the agent back") states
   the goal, a history in step with the thread, not the mechanism. Its
   second half ("an edited message resyncs the agent's history too") has
   no feature to attach to: the thread has no edit action, so Try again on
   an earlier answer is the only way the thread rewinds.
4. Only Try again on the latest answer gets the line, as in today's chat.
5. Try again offline stays a plain re-ask, as in today's offline chat.
6. Retry state is kept in memory only. A reload or a session switch
   forgets it, as today.
7. Try again after a failed attempt is a plain re-ask, as today.
8. `chat.message_sent` does not change, and is still logged on a retry, as
   today.
9. The bias check stays warn-and-pass, on the card's question only.
10. Value cards from `lookup_values` count as question cards, since
    today's discovery cards are audited.
11. `turnNumber` follows the server's count from the thread.
12. One `chat.sql_generated` per answer that showed a query, with `app` by
    where the SQL went.
13. `dashboard.block_added_via_chat` for the editor path and confirmed
    cards only, with the payload shape unchanged and no block count for a
    saved card.
14. No Playwright spec in 1E: the roadmap puts the browser test in 1F.
    The chat runtime's integration tests cover the flow here.
15. The baseline for the Try again eval is today's chat on Claude Haiku
    5.5 (D31) with `retryContext`.

## Risks

| Risk | Mitigation |
|---|---|
| The model reads the line as chat and replies "Sure, trying again" with no tool call. | The Try again eval grades it. Fallback: A3. |
| The kept first attempt misleads a later follow-up ("make it a chart" builds on the first attempt). | A follow-up question in the eval. Fallback: A2. |
| Each extra Try again adds an attempt to the transcript. | The attempts are cached prefix, a few hundred tokens each. Context pruning is roadmap 2.5. |
| Starting over after an earlier answer's Try again uses a new vault, so the thread's placeholders read `[earlier value]` and cards resolved earlier are not reported again. | The same as after a reload or a session switch today (D39). |
| Two different threads match by accident. | The key covers every message's role and text. A thread repeats exactly only when assistant-ui reruns it. |
| A change slips into the text of turns that are not a Try again and shifts the 45 unnoticed. | A test that `buildAgentTurnText` without `isRetry` is byte-identical for every existing case, plus the existing Pi harness turn tests. |
| Awaiting the audit write delays the card. | It is one local Dexie insert, and today's chat awaits the same call. |
| `recordShown` writes `outcome: "answered"` before any answer, so a card that a Try again or a new message replaces stays `answered`. | Today's chat does the same. Listed, not fixed: 1E is parity. |
| Try again after a confirmed card adds a second block. | Today's chat re-queues a block the same way, and the user sees both. |
| Analytics inserts fail offline. | `AnalyticsClient.logEvent` swallows them, as for today's offline pipeline. |

## Test and eval plan

Red/green TDD with Vitest: each test below is written first and fails
before its code exists.

### Part A

- `buildAgentTurnText`: with `isRetry`, the line sits after the blocks and
  before the message. Without it, every existing case is byte-identical.
- `isSchemaAnswerTurn`: the line alone is not a column question, and a
  column question with the line still is.
- `askConversationDataAgent`:
  - The same thread after a kept hosted reply: the ask's text has the
    line, and the Pi transcript still holds the first attempt.
  - The same thread after a failed ask: no line.
  - The same thread offline: no line.
  - A follow-up, a card answer, and a view change: no line, and the same
    conversation.
  - Try again on an earlier answer: the old conversation is stopped and
    dropped, the new one gets the recap without the dropped turns, and
    there is no line.
  - A new chat with the same question: no line, as today's test checks.
- `useAvandarChatRuntime.retryContext.test.tsx` gains agent cases:
  `reload()` on the last answer sends the line, and on an earlier answer
  starts the conversation over. Today's chat cases still pass.

### Part B

- The shared function warns on a biased question and still returns an id,
  and writes the row's shape, counts, and `turnNumber`.
- `applyChatModelTurnResponse.test.ts`: today's chat still records the row
  and puts the `auditId` on the card.
- The conversation host: an `ask_user` card and a value card each get an
  `auditId` before they show, `turnNumber` counts the thread's card
  answers, and the offline agent's host does the same.
- Answering an agent card records `answered` under its `auditId`.

### Part C

- `chat.sql_generated`: one event for an answer that showed one query, one
  for an answer that fixed its query twice, and none for a declined
  consent, a column question, a text reply, or a dashboard block. `app`
  follows where the SQL went, `sqlChars` is the shown SQL's length, and
  offline turns log too.
- `dashboard.block_added_via_chat`: logged on the editor path with the
  editor's count, on Confirm into the editor and on a saved Confirm, once
  after a Retry that succeeds, and never when a card is shown, cancelled,
  or fails.
- `ChatAnalyticsPayloads.fromDashboardBlock` with a dashboard id, with
  today's call producing the same payload as before.

### Eval

**No rerun of the 45, P, M, D, or the offline 45.** Parts B and C run in
the browser and change nothing the model reads. Part A changes the turn
text only on a Try again, which no existing question exercises, and the
byte-identical test guards every other turn. Prompt v6 does not change. If
the eval below forces A3, the new version reruns the 45, P, M, and D three
times each, as 1D did.

**A Try again set, `--questions T`, outside the default 45.** Each
question is asked, its first attempt recorded, and the same thread run
again as a Try again: in the Pi harness on the same conversation with
`isRetry`, and in the baseline harness with `retryContext` built from the
first response (the harness passes `undefined` today,
`scripts/ai-eval/harnesses/baseline/BaselineHarness.ts:136`). The second
attempt is graded.

| Id | Built from | What it checks |
|---|---|---|
| T01 | A ranking question whose grader accepts more than one reading | The retry gives another valid reading. |
| T02 | A question with one right answer | The retry stays right: a different approach must not mean a wrong answer. |
| T03 | A column question from the S set | The retry answers in text, with no query. |
| T04 | A question whose right first answer is a card (a place name two datasets read differently) | The retry asks or answers, and invents nothing. |
| T05 | D02, in the editor | The retry adds one valid block. |
| T06 | T01, then a follow-up ("show that by month") | The follow-up builds on the second attempt. |

Each run records whether the second attempt is right (the question's own
grader) and whether it repeats the first (the same SQL after normalizing
whitespace, or the same text, and no card).

| Run | Label | Bar |
|---|---|---|
| Today's chat with `retryContext`, three runs | `phase-1e:today-retry` | The baseline, recorded first. |
| Agent v6 with the line, three runs | `phase-1e:agent-retry` | Right on the second attempt at least as often as the baseline, a repeat no more often, nothing invented, and T06's follow-up passing. A single miss is rerun before calling it a regression. |

The set costs well under a dollar per run. The roadmap's bar for 1E (unit
tests now, the browser test in 1F) stays. This set is what lets A1 ship
without a new prompt version, and it decides whether a fallback is needed.

## What the spec should settle

- Pablo's call on A1 against the "rolls the agent back" wording in
  phase-1.md.
- The exact wording of the Try again line, after the eval.
- Which existing questions the T set is built from.
- The doc changes that ship with 1E: a decision entry for its design, the
  1E rows in roadmap.md and phase-1.md, and the "What keeps the agent off"
  table.
