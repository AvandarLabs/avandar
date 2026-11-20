# Phase 1E: "Try again" and parity in the agent

Status: specified on 2026-11-19 from the
[brainstorm](phase-1e-brainstorm.md), with every design choice decided
(Pablo delegated the call). Built on 2026-11-19, with the changes the
build made noted where they apply (see D45's "How a Try again is told
apart, as built"). Part of [Phase 1](phase-1.md). Follows rules R1 to R4
there. Decisions D40 and D45 in [decisions.md](../decisions.md). Builds on
[phase-1d.md](phase-1d.md). Everything a plan needs is here: the brainstorm
is background only.

## Goal

Turning the agent on (1F) loses nothing today's chat does on three counts:

1. **Try again.** Regenerating an agent answer reruns it with the previous
   attempt as context, as today's `retryContext` does.
2. **Question cards.** Every card the agent shows is bias-checked and
   written to the clarification audit log, as today's clarification cards
   are.
3. **Analytics.** The agent logs `chat.sql_generated` and
   `dashboard.block_added_via_chat`, as today's chat does.

## Scope

In:

- Try again on an agent answer, hosted and offline.
- The bias check and the audit log for every card the agent shows:
  `ask_user` cards and the value cards `lookup_values` shows, hosted and
  offline.
- The two analytics events on every agent path that produces them, hosted
  and offline.
- A Try again eval set, T01 to T06, graded against today's chat first.
- The doc updates under [Docs that ship with 1E](#docs-that-ship-with-1e).

Out:

- 1F: the browser spec, the agent on by default, and removing the switch.
- Any change to prompts v1 to v6, or to the text of an agent turn that is
  not a Try again.
- Changing what today's chat does. Its code moves only where 1E shares it,
  and its behavior and payloads stay as they are.
- New analytics events or payload fields.
- Quirks today's chat already has. They are listed under [Risks](#risks)
  and kept.
- A Playwright spec. The roadmap puts the browser test in 1F. The chat
  runtime's integration tests cover the flow here.

## Decisions

| Question | Decision |
|---|---|
| How the agent gets its previous attempt on Try again | It keeps the first attempt in its Pi transcript, where the model already has it in its own words, tool calls and results included. A hosted retry turn adds one fixed plain line before the message. No prompt v7. (The brainstorm's A1.) |
| The 1E row of [phase-1.md](phase-1.md) says regenerating "rolls the agent back to before the last turn" | The departure is accepted. A rolled-back attempt has to be described to the model again anyway, and rolling back needs transcript surgery and restored block memory. The goal behind the wording, an agent history in step with the thread, is kept where the two would mislead the model: Try again on an earlier answer starts the agent over from the thread. The row is reworded with the build. Its second half ("an edited message resyncs the agent's history too") is dropped, since the thread has no edit action. |
| Fallbacks | Rolling back and describing the attempt (the brainstorm's A2) and a tagged block under prompt v7 (A3) stay designed fallbacks. Each ships only if its trigger in the Try again eval fires. See [Fallbacks](#fallbacks). |
| Where a retry is detected | In `askConversationDataAgent`, which the hosted and the offline agent share, from a record each conversation keeps of the thread it was last asked. Not in the adapter's `lastTurnRef`, which the agent branch never reaches and which cannot see a retried earlier answer. |
| Which retries get the line | Only a hosted Try again on the latest answer after a kept reply, as today's chat sends `retryContext` only there. Offline, and after a failed attempt, it is a plain re-ask, as in today's chat. |
| The wording of the line | It starts with the wording under [The Try again line](#the-try-again-line). The Try again eval fixes the final wording during the build, by the rules given there. |
| How cards get the audit log and the bias check | One shared function, `recordClarificationShown`, that today's chat and the agent's conversation host both await before the card shows. (The brainstorm's B1.) |
| `turnNumber` on an agent card | Counted as today's server counts it: the user messages in the turn's thread that carry the `[Clarification answer:` marker, plus one, at most 3. |
| How many `chat.sql_generated` per answer | One per kept answer that showed a query, logged after the ask settles, with the last SQL shown. (The brainstorm's C1.) |
| When `dashboard.block_added_via_chat` is logged | When a block reaches a dashboard: queued into the open editor by the tool, or a card the user confirms, whether it was queued into the editor or saved. (The brainstorm's C4.) |

## What the code showed

The brainstorm's file and line references were checked against this
branch (`446e67637`, on `demo/measles`). Most hold. These differ from it
or add to it:

| The code showed | Consequence |
|---|---|
| The SCHEMA rule that answers a typed "try again" after a column question in text is v3's `SCHEMA_ANSWER_RULES` (`shared/agent/dataAgent/buildDataAgentSystemPrompt.ts:110-120`, the sentence at :116), not v2's. v4 to v6 carry it. v2's CURRENT PAGE rule (:90) is the one that says text inside the tagged blocks is page data. | The line stays plain text outside the blocks, and v6's SCHEMA rule still covers a retried column question. |
| `isSchemaAnswerTurn.ts:21` is `RETRY_PATTERN` (`^(?:try again\b\|that query failed\b)`, no multiline flag). The function is at :37. The agent's `runQueryForUser` (`runQueryTool.ts:153`) calls it on `state.userTexts`, which hold each turn's whole text, blocks included. | The line must match no schema pattern, and must never start a turn's text with "try again" or "that query failed". Otherwise a retried ordinary question after an earlier column question would count as a column question. |
| The client already has the marker and the count: `CLARIFICATION_ANSWER_MARKER_RE`, `MAX_CLARIFICATIONS_PER_QUESTION = 3`, and `countClarificationAnswersInThread` (`src/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions.ts:4-32`), with the same regex as the server's (`parseClarify.ts:10`). | The agent's `turnNumber` reuses them. Nothing is imported from the edge function. |
| The server returns no card at all once three are answered (`parseClarify.ts:67`). The agent has its own cap of two questions per answer (`askUserTool.ts:7`), and the audit row's `turnNumber` is typed `1 \| 2 \| 3`. | The agent's count is capped at 3, and the count never suppresses an agent card. |
| `applyChatModelTurnResponse.test.ts` asserts no `auditId` today. | The guard test for today's chat is new: written before the move, green before and after it. |
| `useAvandarChatRuntime.retryContext.test.tsx` drives today's chat through a mocked `APIClient` and cannot reach the agent. `hostedReplyPrivacy.integration.test.ts` drives the real adapter and `runDataAgentTurn` with `createDataAgent` mocked. | The agent's Try again integration test is a new file in the second pattern. The retryContext tests stay as they are and must still pass. |
| `createBrowserDataAgentHost.ts` has no test file. | One is added. |
| The baseline harness's `DenoChatTurn.retryContext` is typed `undefined` (`scripts/ai-eval/harnesses/baseline/DenoChatTurnRunner.ts:15`), though `supabase/functions/_eval/runChatTurnCli.ts` passes the whole turn to `runChatTurn`. | The baseline Try again widens that type. The Deno side needs no change. |
| The eval hosts answer a card inside the run (D09's "difference from the eval"), so the Pi harness never ends a turn on a card. | The eval gains a way to leave a first attempt's card unanswered (T04). |
| Hosted and offline conversations live in separate maps (`runDataAgentTurn.ts:37`, `runOfflineDataAgentTurn.ts:25`), both keyed `${workspaceId}:${chatGeneration}`. | Each conversation keeps its own retry record. A hosted failure that falls back offline leaves the hosted record marked not kept. |
| `DataAgent.ask` rejects when a model call fails (`_throwIfModelCallFailed`, `src/lib/agent/dataAgent/createDataAgent/createDataAgent.ts`). | "Kept" is defined from how the ask settled and whether the turn went stale, with no new failure type. |
| `ChatAnalyticsPayloads.fromDashboardBlock` reads the dashboard id from the page context and the block count from the editor state. The agent's turn carries only the editor's id and dispatch, and the card only the active id. | The payload builder takes the dashboard id directly, and the agent's two paths pass a way to read the editor's content. |

## Requirements

Try again:

1. A hosted agent turn (`turn.isOffline` not set) whose user messages
   equal those of the thread its conversation was last asked, when that
   ask ended in a kept reply, puts the Try again line between the turn's
   blocks and the user's message.
2. The first attempt stays in the Pi transcript. Nothing in the transcript
   is cut, rewritten, or summarized.
3. The same thread on an offline turn, or after an ask that failed or
   whose reply was discarded, is asked again with no line, on the same
   conversation.
4. A thread whose user messages start with the recorded ones and add more
   (a follow-up, a card answer, a view change) is asked as today.
5. A thread whose user messages neither equal nor extend the recorded ones
   (Try again on an earlier answer) stops and drops the conversation. A new
   conversation starts from the thread's recap, as after a reload, with no
   line.
6. Each conversation keeps, in memory only, the key `chatMessagesKey`
   builds from the user messages of the thread it was last asked, how many
   user messages that thread held, and whether the ask ended in a kept
   reply. Assistant messages are left out (see
   [Classifying the turn](#classifying-the-turn)). A reload or a session
   switch forgets it, as today's `lastTurnRef` is forgotten.
7. `buildAgentTurnText` without `isRetry` returns exactly what it returns
   today, for every input.
8. The line follows the wording rules under
   [The Try again line](#the-try-again-line).
9. A retried column question is still a column question, and the line
   alone is not one.
10. A Try again does not undo what the first attempt did: a query shown in
    the Data Explorer, a block queued into the editor, or a card the user
    confirmed stays, as with today's chat.
11. `chat.message_sent` does not change and is still logged on a Try
    again.

Question cards:

12. Every card the agent shows, hosted and offline, `ask_user` and value
    cards alike, is bias-checked on its question as the user reads it and
    recorded in the clarification audit log before it shows. The card
    carries the row's `auditId`, so answering, dismissing, and the
    discovery recovery record their outcomes as today's cards do.
13. One function, `recordClarificationShown`, does the bias check, the
    warning, and the audit write for today's chat and for the agent.
    Today's chat behaves as before.
14. An agent card's `turnNumber` is the number of `[Clarification answer:`
    user messages in the turn's thread, plus one, at most 3.
15. A bias hit warns and passes, on the question only. Options are not
    checked, and no second model call is made.
16. A card whose turn went stale, or stopped being its conversation's
    current turn, while its row was being written is not set in the chat
    panel. Its row stays.

Analytics:

17. One `chat.sql_generated` per kept agent answer that showed a query,
    logged after the ask settles. Its payload is `{ sqlChars }`, the length
    of the last SQL shown, with placeholders restored. `app` is
    `data_explorer` when that query went to the Data Explorer, and
    otherwise the page's app as `chat.message_sent` maps it.
18. No `chat.sql_generated` for an answer that showed no query (declined
    consent, a column question, a text reply, a card, a dashboard block, a
    plugin tool), and none for a failed or discarded ask.
19. One `dashboard.block_added_via_chat` per block that reaches a
    dashboard: queued into the open editor by `add_dashboard_block`, queued
    into the editor by Confirm, or saved by Confirm. `app` is `dashboards`.
    The payload has today's shape, with the dashboard the block went to.
    `blockCountAfter` is set on the two editor paths and left out for a
    saved card.
20. No `dashboard.block_added_via_chat` for a card that is shown,
    cancelled, or fails. A Retry after a failure logs once, when it
    succeeds.
21. Today's chat logs the same events, with the same payloads, as before.

Across all three parts:

22. No part adds a model call or changes prompts v1 to v6. Nothing new
    reaches a hosted model except the line, on hosted retry turns only.
23. Every behavior above is covered by a test written first (red, then
    green).
24. The Try again eval meets its bars before 1E is done.

## Part A: Try again

### How a retry arrives

`ActionBarPrimitive.Reload` sits on every assistant message
(`src/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage.tsx:58`).
assistant-ui enables it only while the thread is idle, drops that message
and every later one, and calls the adapter's `run` with the thread up to
the user message before it. So a Try again never arrives while a run is in
progress, and its thread is a prefix of a thread the agent was asked
earlier. Today's chat compares `chatMessagesKey(hostedChatMessages)` with
`lastTurnRef` (`createChatModelAdapter.ts:699-704`), but the agent branch
(`:679-697`) returns before that code runs.

### The retry record

`dataAgentConversation.types.ts` gains a type, and `DataAgentConversation`
gains a field:

```ts
/** The user messages of the thread one ask was given, and how it ended. */
export type AgentAskRecord = {
  /** `chatMessagesKey` of the user messages in the turn's `apiMessages`. */
  threadKey: string;
  /** How many user messages that thread held. */
  messageCount: number;
  /** The ask resolved and its turn was not stale. */
  isKept: boolean;
};

/** The last ask that settled. Unset until one does. In memory only. */
lastAsk?: AgentAskRecord;
```

`apiMessages` is the thread the turn's path reads: the hosted-model text on
a hosted turn, the device text (`localTokenMessages`) on an offline turn.
Each conversation compares only threads of its own kind.

`askConversationDataAgent` writes the record after the ask settles, in
both outcomes:

- The ask resolved: `isKept` is `!turn.isStale?.()`.
- The ask rejected: `isKept` is `false`, and the error is rethrown as
  today.

It writes only while `conversation.turnRef.current === turn`, so a run that
settles after a newer turn has started never overwrites that turn's record.
As built, a run a newer message stops usually settles before the newer
turn takes the conversation, so it can write its own record first. The
newer turn's user messages extend it, so that turn is `continues`, and it
writes its record last. A stopped run never logs `chat.sql_generated`:
stopping it clears the query it showed and marks its turn as stopped
(`stoppedTurn`). A turn that fails before it reaches
`askConversationDataAgent` (for example, while loading the datasets)
writes nothing. `createAgentAskRecord` in `getAgentTurnKind.ts` builds the
record.

### Classifying the turn

A new pure function in
`src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind.ts`:

```ts
export type AgentTurnKind = "first" | "continues" | "same_thread" | "rewound";

export function getAgentTurnKind(
  options: Readonly<{
    lastAsk: AgentAskRecord | undefined;
    apiMessages: readonly ChatClientMessage.T[];
  }>,
): AgentTurnKind;
```

| The turn's thread | Kind |
|---|---|
| The conversation has no record (it is new, or no ask has settled) | `first` |
| As many user messages as the record, and their key equals `threadKey` | `same_thread` |
| More user messages than the record, and the key of the first `messageCount` user messages equals `threadKey` | `continues` |
| Anything else | `rewound` |

`chatMessagesKey` is imported from `chatRuntimeTurnHelpers.ts`. As built,
the key and the count cover the thread's user messages only. A run that a
newer message stops can land its reply after the newer turn was sent
without it, which puts an assistant message between two user messages, so
a key over every message would make that follow-up look like a rewind. Try
again on the latest answer keeps the same user messages (`same_thread`).
Try again on an earlier answer has fewer, and an edited user message
differs, so both still rewind. Known limit: the app has no branch picker
and no edit action, so two branches with the same user messages and
different replies cannot happen today, and the record would not tell them
apart. Revisit if either is added.

### What each case does

`askConversationDataAgent` classifies the turn once it has the conversation
and has stopped any run in progress, then:

| Kind | Hosted turn | Offline turn |
|---|---|---|
| `first` | As today: a new conversation's recap, or the message. | As today. |
| `continues` | As today. | As today. |
| `same_thread`, last ask kept | The same conversation, asked the message with the line. | The same conversation, asked the message with no line. |
| `same_thread`, last ask not kept | The same conversation, asked the message with no line. | The same. |
| `rewound` | The conversation's agent is aborted and the conversation removed from the map. A new one is created for the same key and asked the thread's recap, as after a reload. No line. | The same. |

What the agent reads in each user situation:

| The user | The agent reads |
|---|---|
| Clicks Try again on the latest answer, hosted, after a reply | Its first attempt (in the transcript), then the line, then the same message. |
| Clicks Try again on the latest answer, offline | Its first attempt, then the same message. |
| Clicks Try again on an error reply (a failed model call, or the agent was unavailable) | Whatever the failed attempt left in the transcript, then the same message. |
| Clicks Try again on an earlier answer | A recap of the thread up to the retried message, in a new conversation. The answers after it are gone from the agent's history, as from the thread. |
| Clicks Try again after a reload or a session switch | A recap in a new conversation, as on any first turn. |
| Clicks Try again on an answer that followed a card answer | The card answer is the thread's last user message, so it is asked again with the line, as today's chat sends `retryContext` on the card answer's turn. |

The restart for `rewound` reuses existing paths: `_getConversation`
creates the new conversation once the old key is deleted,
`_dropOtherChats` still drops the workspace's other chats, `_namedMessages`
hides the old vault's placeholders, and `_buildPromptText` builds the
recap. The new conversation starts a new vault, so earlier placeholders
read `[earlier value]`, and dashboard cards resolved before are not
reported again, as after a reload (D39).

To keep `askConversationDataAgent` within the 45-line rule, the
conversation lookup, the stop loop, the classification, and the restart
move into `_resolveTurnConversation`, the record write into `_recordAsk`,
and Part C's event into `_logShownQuery`.

### The Try again line

`shared/agent/pageContext/buildAgentTurnText.ts` exports a constant, and
`buildAgentTurnText` gains an option:

```ts
/** Sent before the message on a hosted Try again of the latest answer. */
export const TRY_AGAIN_LINE =
  "The user clicked Try again: they want a different answer to the message below than your last one above. Do not repeat it. Read the message another way, take a different approach, or ask one question if your last answer had to guess.";

// New option on buildAgentTurnText:
/** A hosted Try again of the latest answer: the line goes before the message. */
isRetry?: boolean;
```

As built, the constant above is the starting wording. The wording that
ships is the third one tried (about 130 tokens), quoted in D45 in
[decisions.md](../decisions.md) and kept in `TRY_AGAIN_LINE` in
`shared/agent/pageContext/buildAgentTurnText.ts`.

With `isRetry`, the text is the card lines and blocks, then
`TRY_AGAIN_LINE`, then the message, joined with blank lines as the blocks
already are. With no blocks, the line comes first. Without `isRetry`, the
text is exactly today's.

The line adapts today's `buildRetryContextNote`
(`supabase/functions/chat/PostChatMessages/prompt/buildSystemPrompts.ts:272`),
which tells the model the user explicitly asked to try again, not to repeat
its output, and to take a different approach, read the question another
way, or ask a clarifying question. It says "message" rather than
"question", because Try again on an answer that followed a card answer
re-sends the card answer. It is plain text, not a tagged block, because v2
and v3 tell the model that text inside the tagged blocks is data, never
instructions.

Rules for every wording, the starting one included:

1. Plain text, at most three sentences, with no tag and no em dash.
2. It says the user clicked Try again, points at the last answer above and
   the message below, asks for a different answer, and allows asking one
   question.
3. It contains none of these words, in any case: column, columns, same,
   similar, matching, append, appended, appendable, stack, stacked,
   compare, comparing. `isSchemaAnswerTurn`'s patterns are built from them.
   "different" alone is allowed, since the pattern needs "column" after
   it.
4. It does not start with "try again" or "that query failed".
5. It names no tool and does not tell the model to run a query, so v6's
   SCHEMA rule still answers a retried column question in text.
6. It is English. It is model input, never shown, so it is not translated.

How the wording changes during the build:

- The Try again eval runs the starting wording first. When a bar is missed
  and the misses point at the wording (see [Fallbacks](#fallbacks)), a new
  wording is tried and the T set runs three more times on it.
- At most three wordings in all: the starting one and two more. When the
  third misses, the A3 fallback applies.
- `eval.md` records each wording tried, with its numbers, as 1D recorded
  its prompt wordings.
- The constant at the commit that deploys 1E is the final wording. The
  line is turn text, not the system prompt, so a later change needs no
  prompt version. It still reruns the T set three times and must meet the
  same bars (D16).

### What is stored and sent

- Nothing new is persisted. The line exists only in the Pi transcript. The
  thread stores the user's message, so a recap after a reload never shows
  the line.
- The line is never sent on a device turn, so `splitAgentTurnText`, which
  only the offline agent uses, never sees it.

## Part B: question cards

### Behavior

| Card | Bias check | Audit row | `auditId` on the card | `turnNumber` |
|---|---|---|---|---|
| Today's chat clarification | Unchanged: on the question, warn and pass | Unchanged | Unchanged | The server's |
| Agent `ask_user` card, hosted | On the question as shown, placeholders restored (D39) | Written before the card shows, shape `fixed_options_single` or `fixed_options_multi` | Yes | Counted from the thread |
| Agent value card (`lookup_values`), hosted | The same | The same, shape `discovery_single` or `discovery_multi` | Yes | Counted from the thread |
| Agent cards, offline | The same, on real names | The same | Yes | Counted from the thread |

Before 1E the agent's cards had no bias check, no row, no `auditId`, and
`turnNumber: 1` always (`createBrowserDataAgentHost.ts:90`). Offline data
sessions run the offline agent whatever the switch says
(`runLocalChatTurn.ts:70-77`), so an offline data session wrote no rows
even with the switch off. After 1E it writes them.

### The shared function

New file
`src/components/ChatPanel/recordClarificationShown/recordClarificationShown.ts`:

```ts
/**
 * Bias-checks a clarification card's question, warns on a hit and lets
 * the card through, and records that the card was shown. Returns the
 * audit id the card carries.
 */
export async function recordClarificationShown(
  options: Readonly<{
    workspaceId: string;
    clarification: ChatClarifyRequest;
  }>,
): Promise<ClarificationAuditEntry.Id>;
```

Its body is today's handler (`applyChatModelTurnResponse.ts:262-274`),
unchanged: `detectBias(clarification.question)`, the same `console.warn`
(`"[chat] LLM clarification trips bias detector; passing through:"` with
the hit labels) on a hit, then
`ClarificationAuditEntryClient.recordShown({ workspaceId, request: clarification })`.
A failed write is already swallowed inside `recordShown`, which still
returns an id. `applyChatModelTurnResponse`'s `recordClarificationShown`
handler becomes a call to it, and `applyChatTurnResponse.ts:96-106` still
awaits it before setting the card.

### The hosts

- `src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.ts`:
  `showQuestionCard` becomes
  `(card: Omit<ChatClarifyRequest, "turnNumber">) => Promise<void>`, and
  `askUser` awaits it before it returns `{ kind: "deferred" }`. The fixed
  `turnNumber: 1` goes: the browser host has no thread.
- `createConversationAgentHost.ts`: `showQuestionCard` reads the current
  turn once, adds `turnNumber: buildClarificationTurnNumber(turn.apiMessages)`,
  awaits `recordClarificationShown`, then sets the pending clarification
  with its `auditId`, unless the turn is stale or is no longer
  `state.turnRef.current` (requirement 16).
- `generatedSqlAssumptions.ts` gains
  `buildClarificationTurnNumber(messages): 1 | 2 | 3`, the smaller of
  `countClarificationAnswersInThread(messages) + 1` and
  `MAX_CLARIFICATIONS_PER_QUESTION`.

The hosted conversation's host is wrapped by
`createPlaceholderRestoringHost`, whose `askUser` restores the question
before it calls the browser host, so the bias check reads what the user
reads. The row holds the response shape, the question's length, the option
count, and `turnNumber`, never text, in the browser's own Dexie database.
Nothing leaves the device.

The card is the same component as today's, so
`useClarificationSubmission.ts:42-47`, `resolveClarificationAnswer.ts`, and
`useDiscoveryRecovery.ts` record outcomes by `auditId` with no change, and
`ChatThreadStore` keeps the `auditId` with the pending card across a
reload.

## Part C: analytics

### `chat.sql_generated`

- `AgentConversationState` gains
  `lastShownQuery?: { sql: string; app: AnalyticsApp | undefined }`. It is
  reset to `undefined` at the start of every turn, where `results` is
  reset.
- The conversation host's `showQuery` sets it before it shows the query.
  `sql` is the request's SQL, which `createPlaceholderRestoringHost` has
  already restored. `app` is `"data_explorer"` when `_isOnDataExplorer(turn)`
  is true, and `turn.analyticsApp` otherwise.
- `DataAgentTurnOptions` gains `analyticsApp?: AnalyticsApp`: the page's
  app as `chat.message_sent` records it. The adapter sets it from
  `ChatAnalyticsPayloads.toAnalyticsApp(currentPageContext)`, a new member
  that holds the mapping now inline at `createChatModelAdapter.ts:578-585`
  (`data-explorer` to `data_explorer`, `dashboards` to `dashboards`,
  `data-sources` to `data_sources`, anything else `undefined`).
  `chat.message_sent` calls it too, so both events map the page the same
  way.
- After the ask resolves, and only when the turn is not stale,
  `_logShownQuery` logs one event if `lastShownQuery` is set:

```ts
void AnalyticsClient.logEvent({
  event: "chat.sql_generated",
  workspaceId: turn.workspaceId,
  app: shownQuery.app,
  payload: ChatAnalyticsPayloads.fromSql(shownQuery.sql),
});
```

| Agent answer | Event | `app` |
|---|---|---|
| Showed one query in the Data Explorer | One | `data_explorer` |
| Showed a query in the chat, on any other page | One | The page's app, or none |
| Fixed its query, up to three queries shown | One, with the last SQL's length | Where the last one went |
| Its query then failed or came back empty | One, as today | As above |
| A column question (`runQueryForUser` returns before showing) | None | |
| Consent declined (returns before showing) | None | |
| A text reply, a card, a dashboard block, a plugin tool | None | |
| The ask rejected, or the turn went stale | None | |
| Offline | As hosted. The insert fails quietly with no connection. | |

Today's chat always says `data_explorer` because it always applies the SQL
there. The agent applies it there only on that page (D38), so the event
says where the SQL went.

### `dashboard.block_added_via_chat`

`ChatAnalyticsPayloads.fromDashboardBlock` takes the dashboard id
directly:

```ts
fromDashboardBlock(
  options: Readonly<{
    block: ChatGeneratedDashboardBlock;
    dashboardId: string | undefined;
    editorState?: Pick<DashboardEditorAppState, "activeDashboardId" | "editorData">;
  }>,
): AnalyticsEventPayloads["dashboard.block_added_via_chat"];
```

`blockCountAfter` is `editorData.content.length + 1` when `editorState` is
given and its `activeDashboardId` is `dashboardId`, as today. Without
`editorState` it is left out. Today's chat passes
`dashboardId: currentPageContext.dashboardId` and the editor state it
passes now, so its payload does not change.

| Path | Where | Payload |
|---|---|---|
| The tool queues the block into the open editor | `addAgentDashboardBlock.ts`, around `queuePendingBlock` (line 91) | `target.dashboardId`, and `editorState` from `turn.dashboardEditor.getState()`. Built before queueing, as today's chat builds it. |
| Confirm, with the dashboard open in the editor | `confirmAgentDashboardCard.ts`, around its `queuePendingBlock` | The chosen dashboard's id, and `editorState` from the card's editor. Built before queueing. |
| Confirm, saved | `confirmAgentDashboardCard.ts`, when `appendBlockToDashboard` returns `saved` | The chosen dashboard's id, no `editorState`. |
| A card shown, cancelled, or failed | | None |
| Retry after a failure | The same Confirm path | One, when it succeeds |

Every event has `app: "dashboards"` and the turn's or the card's workspace
id. To read the editor:

- `DataAgentTurnOptions.dashboardEditor` gains
  `getState: () => DashboardEditorAppState`, which the adapter sets to read
  `dashboardEditorStateRef.current`.
- `confirmAgentDashboardCard`'s `editor` option gains `editorData`, which
  `useConfirmCard` in `AgentDashboardBlockPart.tsx` passes from the
  `editorState` it already reads.

## Privacy and cost

- No part adds a model call. The only new model input is the line, about
  50 tokens, on hosted retry turns only. The first attempt is already in
  the cached prefix. As built, the shipped line is wording 3, about 130
  tokens (D45, and `TRY_AGAIN_LINE` in
  `shared/agent/pageContext/buildAgentTurnText.ts`).
- Nothing new reaches a hosted model: the line points at an attempt the
  model already wrote. The bias check and the audit row run on the device.
- The analytics payloads do not change: counts, kinds, and ids, never SQL
  text or chat content. `sqlChars` counts the restored SQL, as today's
  chat counts its own SQL.

## Errors and edge cases

| Situation | Behavior |
|---|---|
| Try again while a run is in progress | Cannot happen: assistant-ui enables Try again only while the thread is idle. |
| A card answer or view change sent while a run is in progress | The run is stopped, as today. The new thread extends the recorded one, so it is `continues`. The stopped run usually settles before the newer turn takes the conversation, so it can write its own record first. The newer turn's record replaces it once that turn's ask settles, and the stopped run logs no `chat.sql_generated`. |
| The audit write fails | `recordShown` swallows it and returns an id. The card shows. |
| The turn goes stale while the audit row is written | The row stays. The card is not set. |
| An analytics insert fails, or the device is offline | `AnalyticsClient.logEvent` swallows it. |
| The first attempt queued a block or the user confirmed its card, then Try again adds another | Both blocks stay, each logged once. Today's chat re-queues the same way. |
| A query was shown during an ask whose later model call failed | No `chat.sql_generated`. The reply is an error or an offline answer. Today's chat never applies SQL from a failed call. |
| A hosted retry fails over to offline on a network error | The offline conversation has its own record: `first` or `continues`, no line. |
| Try again of the latest answer after a reload | `first`: a recap, no line, as today's chat sends no `retryContext` after a reload. |

## Files

No migration, no edge function change, no `supabase/config.toml` change,
and no seed change, so no `ava supabase switch`. No new user-facing
string.

Part A:

| File | Change |
|---|---|
| `shared/agent/pageContext/buildAgentTurnText.ts` | `TRY_AGAIN_LINE`, the `isRetry` option, and its doc comment. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/getAgentTurnKind.ts` (new) | `AgentTurnKind` and `getAgentTurnKind`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts` | `AgentAskRecord` and `DataAgentConversation.lastAsk`, plus Part C's fields. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers.ts` | The classification, the restart, `isRetry`, the record, and Part C's event, through `_resolveTurnConversation`, `_recordAsk`, and `_logShownQuery`. |

Part B:

| File | Change |
|---|---|
| `src/components/ChatPanel/recordClarificationShown/recordClarificationShown.ts` (new) | The shared function. |
| `src/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse.ts` | The handler calls the shared function. `fromDashboardBlock` gets `dashboardId`. |
| `src/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions.ts` | `buildClarificationTurnNumber`. |
| `src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.ts` | An async `showQuestionCard` with no `turnNumber`, awaited by `askUser`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost.ts` | `showQuestionCard` records the card and sets it with its `auditId`. `showQuery` sets `lastShownQuery`. |

Part C:

| File | Change |
|---|---|
| `src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.ts` | `toAnalyticsApp`, and `fromDashboardBlock` with `dashboardId` and an optional `editorState`. |
| `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts` | `chat.message_sent` uses `toAnalyticsApp`. `dataAgentTurn` gets `analyticsApp` and `dashboardEditor.getState`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types.ts` | `AgentConversationState.lastShownQuery`, `DataAgentTurnOptions.analyticsApp`, and `dashboardEditor.getState`. |
| `src/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks/addAgentDashboardBlock.ts` | The editor path's event. |
| `src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/confirmAgentDashboardCard.ts` | The two Confirm paths' events, and `editor.editorData`. |
| `src/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPart.tsx` | Passes `editorData` to Confirm. |

Eval:

| File | Change |
|---|---|
| `scripts/ai-eval/EvalQuestion.ts` | The `try_again` category, `tryAgain`, and `GradeContext.parentResult`. |
| `scripts/ai-eval/harnesses/EvalHarness.ts` | `EvalAnswer.firstAttempt`. |
| `scripts/ai-eval/harnesses/baseline/BaselineHarness.ts` | Try again with `retryContext`, and the exported `buildBaselineTryAgainTurn`. |
| `scripts/ai-eval/harnesses/baseline/DenoChatTurnRunner.ts` | `retryContext: ChatRetryContext \| undefined`. |
| `src/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers.ts` | `buildRetryContext` takes a `RetryContextSource`, the four fields it reads (`assistantText`, `generatedSql.sql`, `clarification.question`, `dashboardBlock.kind`), all optional. `ChatResponse.T` satisfies it, so today's chat calls it as before. A type-only change the baseline harness needs. |
| `scripts/ai-eval/harnesses/pi/PiHarness.ts` | Try again on the same conversation, `isRetry` on hosted conversations, and `isFirstCardUnanswered`. |
| `scripts/ai-eval/runtime/isRepeatedAttempt.ts` (new) | The repeat test. |
| `scripts/ai-eval/runtime/gradeEvalAnswer.ts` | `parentResult` passed to `grade`, and `isRepeat`. |
| `scripts/ai-eval/runtime/summarizeEvalRun.ts` | `repeatCount` in `summary.json`. `summary.md` is unchanged. |
| `scripts/ai-eval/runEval.ts` | The parent's result for each follow-up, `(repeat)` in the console line, and `--questions T` in the header comment. |
| `scripts/ai-eval/selectEvalQuestions.ts` | `try_again` left out of the default 45, and `T` in the doc comment. |
| `scripts/ai-eval/covid/covidTryAgainQuestions.ts` (new) | `createTryAgainQuestions` and T06's grader. |
| `scripts/ai-eval/covid/covidQuestions.ts` | `COVID_QUESTIONS` appends the T questions. |

## Testing

Red/green TDD with Vitest. Each test below is written first and fails for
the behavior it names before its code exists. The two tests marked
**guard** pin today's behavior before code moves, so they are green from
the start and must stay green. Run single files with
`pnpm vitest run <file>`, and the full `pnpm test:frontend` once per part.

Part A:

- `shared/agent/pageContext/buildAgentTurnText.test.ts`:
  - With `isRetry`, the line sits after the card lines and blocks and
    before the message, each separated by a blank line. With no blocks,
    the line comes first.
  - **Guard:** for a turn with card lines, a changed page block, an
    unchanged attached block, a cleared attached block, and a mentioned
    block, `isRetry: false` and no `isRetry` both give the exact string
    today's code gives. The existing cases stay unchanged.
  - `TRY_AGAIN_LINE` contains none of the banned words and does not match
    `/^(?:try again\b|that query failed\b)/i`.
- `src/lib/agent/schemaAnswer/isSchemaAnswerTurn.test.ts`: `[TRY_AGAIN_LINE]`
  is not a column question. A page block, the line, and S01's question
  together are one. An earlier column question, then a page block, the
  line, and "show me deaths" is not one.
- `getAgentTurnKind.test.ts` (new): no record is `first`. An equal thread is
  `same_thread`. A longer thread that starts with the recorded one is
  `continues`. A shorter prefix, a same-length thread with one message
  changed, and a longer thread whose start differs are each `rewound`.
- `dataAgentTurnHelpers.test.ts`, for `askConversationDataAgent`:
  - The same thread after a kept hosted reply: the ask's text has the line,
    and it goes to the same conversation, whose transcript still holds the
    first attempt.
  - The same thread after a rejected ask, and after a stale reply: no line.
  - The same thread with `isOffline`: no line.
  - A follow-up, a card answer, and a view change: no line, and the same
    conversation.
  - A thread that rewinds: the old agent is aborted, the map holds a new
    conversation for the key, its text is the recap without the dropped
    turns, and there is no line.
  - A new chat (a new `chatGeneration`) with the same question: no line.
  - A run stopped by a newer message does not overwrite the newer turn's
    record.
- `src/components/ChatPanel/useAvandarChatRuntime/__tests__/agentTryAgain.integration.test.ts`
  (new, in the pattern of `hostedReplyPrivacy.integration.test.ts`: the
  real adapter and `runDataAgentTurn`, with `createDataAgent` mocked to
  record each `ask` text). Running the same thread twice sends the line on
  the second ask. Running a thread, a longer one, then the first one again
  starts a new agent with a recap and no line. With the switch off, a Try
  again still posts `retryContext`. The existing
  `useAvandarChatRuntime.retryContext.test.tsx` passes unchanged.

Part B:

- `recordClarificationShown.test.ts` (new): a biased question warns with
  its hit labels and still returns an id. The row holds the shape, the
  question's length, the option count, and the given `turnNumber`. A
  failed Dexie write still returns an id.
- `applyChatModelTurnResponse.test.ts`, **guard**, written before the
  move: a clarification response writes one row, and the pending card
  carries that row's `auditId`.
- `generatedSqlAssumptions.test.ts`: `buildClarificationTurnNumber` is 1
  with no card answers, 2 with one, 3 with two, and 3 with five.
- `src/lib/agent/dataAgent/browser/createBrowserDataAgentHost.test.ts`
  (new): `askUser` resolves `deferred` only after `showQuestionCard`
  resolves, and passes a fixed-options shape for an `ask_user` request and
  a discovery shape for a lookup, with no `turnNumber`.
- `createConversationAgentHost.test.ts`: an `ask_user` card and a value
  card each reach `setPendingClarification` with the `auditId` the shared
  function returned. `turnNumber` counts the turn's card answers. A turn
  that went stale during the write sets no card. On a hosted conversation
  the bias check reads the restored question.
- `runOfflineDataAgentTurn.test.ts`: an offline card writes a row and
  carries its `auditId`.

Part C:

- `ChatAnalyticsPayloads.test.ts`: `toAnalyticsApp` for each page app.
  `fromDashboardBlock` gives `blockCountAfter` for a dashboard id the
  editor shows, leaves it out with no `editorState`, and gives today's
  payload for today's call.
- `dataAgentTurnHelpers.test.ts`: one `chat.sql_generated` for an answer
  that showed one query, and one for an answer that showed three, with the
  last one's length. None for an answer that showed none, a rejected ask,
  or a stale turn. `app` is what the host recorded.
- `createConversationAgentHost.test.ts`: `showQuery` records the restored
  SQL, with `data_explorer` on the Data Explorer page, the turn's
  `analyticsApp` elsewhere, and `data_explorer` for an offline turn with no
  page.
- `createChatModelAdapter.test.ts`: `chat.message_sent`'s `app` is
  unchanged for each page, and an agent turn's options carry the same
  `analyticsApp`.
- `addAgentDashboardBlock.test.ts`: the editor path logs one event with the
  resolved dashboard id and the editor's count. The card path logs none.
- `confirmAgentDashboardCard.test.ts`: Confirm into the editor logs one
  event with the count. A saved Confirm logs one with no count. A failed
  save logs none, and the Retry that then succeeds logs one.

Eval code:

- `selectEvalQuestions.test.ts`: the default is still the 45 and holds no
  `try_again` question. `T` selects T01 to T06.
- `covidTryAgainQuestions.test.ts` (new): each T question keeps its
  source's prompt, truth, and grader, with its own id and the `try_again`
  category. T06 passes the monthly series of its parent's reading, and
  fails the other reading's series and a parent result that matches
  neither. A missing source id throws.
- `isRepeatedAttempt.test.ts` (new): each case in the definition below,
  and a pair that differs on each.
- `gradeEvalAnswer.test.ts`: `parentResult` reaches `grade`, and
  `isRepeat` is set only on an answer with a first attempt.
- `BaselineHarness.test.ts` (new): `buildBaselineTryAgainTurn` drops the
  trailing assistant message and builds `retryContext` from the last
  response: its SQL, its card question, or its block kind.
- `PiHarness.test.ts`: a Try again question asks twice on one
  conversation. The second text has `TRY_AGAIN_LINE` on a hosted
  conversation and not on a device one. `isFirstCardUnanswered` defers the
  first attempt's first card. The answer returned is the second attempt's,
  with `firstAttempt` set.

## Eval

### What is not rerun

No rerun of the 45, P, M, D, or the offline 45. Parts B and C run in the
browser and change nothing the model reads. Part A changes the turn text
only on a hosted Try again, which no existing question exercises, and the
guard test pins every other turn's text. Prompt v6 does not change. If the
A3 fallback ships, v7 reruns the 45, P, M, and D three times each against
1D's bars.

### The Try again set

A new category, `try_again`, selected with `--questions T` and kept out of
the default 45. `scripts/ai-eval/covid/covidTryAgainQuestions.ts` exports
`createTryAgainQuestions(sources)`, and `COVID_QUESTIONS` appends its
output. `covidQuestions.ts` passes in the basic, non-technical, schema, and
dashboard questions, so there is no import cycle. Each T question copies
its source by id and overrides `id`, `category`, and what the table says.
A missing source id throws.

| Id | Built from | Prompt | First attempt | The second attempt passes when |
|---|---|---|---|---|
| T01 | B04 | "Which state had the most covid?" | Answered fully. A card is answered by B04's script (deaths). | Its result passes B04's grader: the top state by deaths or by cases. |
| T02 | B05 | "How many people died of covid in the US in total?" | Answered fully. | Its result passes B05's grader: the US total. |
| T03 | S01 | "Look at long-us-deaths.csv and long-global-deaths.csv. Are they appendable? Do they have the same or similar columns?" | Answered fully. | It shows no query, and its text passes `gradeSchemaComparison`. |
| T04 | N06 | "show me deaths in georgia" | Ends at its first card, unanswered (`tryAgain.isFirstCardUnanswered`), as when the user clicks Try again on the card. | It asks, and once N06's script answers (the US state) its result passes N06's grader. Or it answers without asking, and its result is the state's total, sum, or monthly series (N06's truth) or the country's (new truth `countryTotal` and `countryMonthly` over `global_deaths` where `"Country/Region" = 'Georgia'`). `clarification` is `allowed`. |
| T05 | D02 | "Add a heading that says Deaths in 2022", in the dashboard editor | Answered fully: one editor write. | The second attempt makes exactly one write, and it passes D02's `expectedWrite`. |
| T06 | New, `followsId: "T01"` | "show that by month" | Not retried. Asked after T01's second attempt. | Its result is the monthly series (95% of months, as N01's) of the reading T01's second attempt used: monthly deaths of the top deaths state, or monthly cases of the top cases state. It fails when that attempt matched no reading. |

T01 passes on either reading. Whether a retry gave another reading is
measured by the repeat count, not by the grade.

T06's grader reads `GradeContext.parentResult`, T01's second attempt's
result, which `runEval.ts` passes to any question with `followsId`. It
checks which of B04's two truths (`deaths`, `cases`, top one) the parent
matched, then requires the matching monthly truth, built as
`Sql.monthly("us_deaths", ...)` filtered to
`"Province_State" = (SELECT name FROM (<B04's deaths ranking, limit 1>))`,
and the same over `us_cases` for cases.

### Harness support

- `EvalQuestion` gains
  `tryAgain?: { isFirstCardUnanswered?: boolean }`, set on a Try again
  question. The harness asks `prompt`, keeps the first attempt, then reruns
  the same thread as a Try again and returns the second attempt.
- `EvalAnswer` gains
  `firstAttempt?: Omit<EvalAnswer, "result" | "firstAttempt">`.
- **Baseline** (today's chat, as the app runs it). The first attempt runs
  as `ask` does today. With `isFirstCardUnanswered`, a clarification
  response ends the attempt: its text joins the thread, and the card is
  recorded with the answer `(unanswered)`. Then
  `buildBaselineTryAgainTurn(messages, lastResult)` drops the trailing
  assistant message, as assistant-ui does, and builds `retryContext` with
  `buildRetryContext` from the attempt's last model response. The second
  attempt's first model call sends it. Later calls in that attempt (after a
  card answer) send none, since `lastTurnRef` no longer matches in the app.
  The page context carries over from the first attempt, as the Data
  Explorer's state does.
- **Pi** (the agent). The first attempt runs as today. With
  `isFirstCardUnanswered`, the eval host's `askUser` returns
  `{ kind: "deferred" }` for the attempt's first card, and the agent's tool
  ends the turn as in the browser. The Try again asks the same message on
  the same conversation, with `isRetry` on a hosted conversation and never
  on a device one, and with the page block built as for any turn. The eval
  host answers cards inside the run, so a Pi Try again reruns the whole
  question, while the app reruns the last user message, which after a card
  answer is the card answer. T04 covers the card case on both harnesses.
- The agent runs use `--page data-explorer`, as the app always sends a
  page block. The retry's page block then shows the first attempt's query
  on screen, as in the app.

`isRepeatedAttempt(first, second)` in
`scripts/ai-eval/runtime/isRepeatedAttempt.ts` is true when:

- both showed a query and their `finalSql` match after collapsing
  whitespace to single spaces, trimming, and lowercasing, or
- both asked a card first and the card questions match after trimming, or
- both wrote one dashboard block and the blocks are deep-equal, or
- neither showed a query, a card, or a block, and their replies match after
  trimming.

`gradeEvalAnswer` sets `GradedAnswer.isRepeat` for an answer with a
`firstAttempt`. `summary.json` gains `repeatCount`, and `runEval.ts` prints
`(repeat)` beside a repeated answer.

### Runs and bars

Today's chat runs first and sets the bar, before the agent side is built,
as in 1D. The baseline's question, grader, and harness support land first.

| Run | Command | Label |
|---|---|---|
| Today's chat with `retryContext`, three runs | `pnpm vite-script scripts/ai-eval/runEval.ts -- --harness baseline --model anthropic/claude-haiku-5.5 --questions T --label phase-1e:today-retry` | `phase-1e:today-retry` |
| The agent on v6 with the line, three runs | `pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --config haiku-sonnet --page data-explorer --questions T --label phase-1e:agent-retry` | `phase-1e:agent-retry` |

Bars for `phase-1e:agent-retry`, over its three runs against the
baseline's three:

| # | Bar |
|---|---|
| 1 | **Right.** Passes over T01 to T06, summed over the three runs (18 graded answers), at least the baseline's sum. |
| 2 | **No more repeats.** Repeats on T01 and T04, summed over the three runs, at most the baseline's. T02 and T05 have one right answer, so a repeat there is fine. Repeats on every question are still recorded. |
| 3 | **The follow-up builds on the retry.** T06 passes on all three runs. |
| 4 | **A column question stays one.** T03 passes on all three runs. |
| 5 | **Nothing invented.** T04 passes on all three runs: the retry asks, or answers about Georgia, the state or the country, and nothing else. |

A bar missed by exactly one graded answer is checked again: that question
runs three more times on the agent. The miss was chance, and the bar is
met, when all three reruns pass (for bar 2, when none of the three
repeats). Otherwise the bar is missed.

`eval.md` records each run's correct count, per-question passes, repeats,
needless and missed questions, cost per question, input tokens per call,
and latency, as 1D's tables do. The set costs a few cents per run.

### Fallbacks

Each miss is read in its run's `results.jsonl` and sorted by what it
shows:

| What the misses show | Next step |
|---|---|
| A retry that replies to the line ("Sure, trying again") with no tool call, repeats the first attempt, or ignores the line (bars 1, 2, 4, 5) | A new wording, by the rules above. When the third wording misses: A3. |
| A follow-up built on the first attempt (bar 3), or a retry that reuses a wrong first attempt's result (bar 1) | A2. |

**A3: a tagged block under prompt v7.** `data-agent-v7` is v6 plus a TRY
AGAIN section that says a message can start with
`<try_again>...</try_again>`, that it means the user clicked Try again on
the last answer, and what to do then. The line becomes a `<try_again>`
block placed after the other blocks. `try_again` joins
`PLAIN_BLOCK_TAG_START` (`shared/agent/pageContext/agentBlockText.ts:23`),
so page text cannot forge it, and joins `LEADING_TURN_BLOCKS` in
`buildAgentTurnText.ts`. v1 to v6 are served unchanged, with their hash
tests. v7's tool list is v6's, and v7 joins `PLUGIN_TOOL_PROMPT_IDS`.
`DATA_AGENT_PROMPT_ID` becomes `data-agent-v7`. The 45, P, M, and D rerun
three times each against 1D's bars, and the T set against the bars above.
v7 is fixed once it is deployed.

**A2: roll back and describe.** Before each ask, the conversation
snapshots its transcript length, `lastPageBlock`, `lastAttachedBlock`, and
the card lines the turn reported. On `same_thread` after a kept reply, it
sets `agent.state.messages` back to the snapshot (Pi's setter), restores
the block memory, marks the cut turn's card lines unheard, and replaces the
line with a summary of the cut attempt, built as `buildRetryContext` builds
one: its reply text (2,000 characters), the last SQL it ran as the model
wrote it, placeholders kept (8,000), its card question (400), and its
block kind. The Pi harness mirrors the rollback, and the T set reruns
against the bars above. The transcript then matches the thread.

D45 records which design shipped and why.

## Docs that ship with 1E

All in the same branch as the code.

### `decisions.md`

Add D45 after D44, and rows for D43, D44, and D45 to the index table at
the top (it ends at D42 today), each with the status its entry's heading
gives. D45's entry:

```markdown
## D45. Try again keeps the first attempt, and cards and analytics share today's code (built)

- **Decision (2026-11-19, delegated by Pablo).** On Try again of the
  agent's latest answer, the agent keeps its first attempt in its
  transcript, and a hosted turn adds one fixed line before the message
  saying the user wants a different answer. Prompt v6 does not change. Try
  again on an earlier answer starts the agent over from the thread's
  recap. An offline turn, or one after a failed attempt, asks again with
  no line, as today's chat sends no `retryContext` there. Every card the
  agent shows goes through `recordClarificationShown`, shared with today's
  chat: the bias check, then the audit row, before the card shows, with
  `turnNumber` counted from the thread as the server counts it. The agent
  logs one `chat.sql_generated` per answer that showed a query, and
  `dashboard.block_added_via_chat` for every block that reaches a
  dashboard through the open editor or a confirmed card. Spec:
  [phase-1e.md](specs/phase-1e.md).
- **Why.** The model gets its first attempt in its own words, tool calls
  and results included, for about 50 tokens per retry and no prompt
  version. One card function keeps the two paths from drifting. One SQL
  event per answer keeps that event's ratio to `chat.message_sent` when
  the agent is turned on. Since 1D a block reaches a dashboard from any
  page, so the event follows every path that adds one.
- **Departs from [phase-1.md](specs/phase-1.md).** Its 1E row said
  regenerating "rolls the agent back to before the last turn". A
  rolled-back attempt has to be described to the model again anyway, and
  rolling back adds transcript surgery and restored block memory. The
  goal, an agent history in step with the thread, is kept where the two
  would mislead the model: Try again on an earlier answer. The thread has
  no edit action, so "an edited message resyncs" is dropped.
- **Fallbacks.** Roll back and describe the attempt, if the Try again eval
  shows the kept attempt misleads the retry or the follow-up. A
  `<try_again>` block under prompt v7, if the model ignores the plain line
  after three wordings.
- **Alternatives.** Today's `retryContext` sent to the agent proxy
  (changes the request Pi's `streamProxy` sends, and breaks the system
  prompt's cache or needs a new version). Detecting a retry with
  `lastTurnRef` (cannot see an earlier answer's retry, and the offline
  agent never reaches it). The line on offline turns (today's offline chat
  sends nothing, and the 4B model's window is tight). A copy of the card
  code in the browser host (two copies drift). Recording the card after
  the reply (a quick answer would find no `auditId`). An event per query
  shown (up to three per answer). Only the open editor's blocks (misses
  every block added from another page).
- **Cost.** About 50 uncached input tokens on a hosted retry turn. The
  transcript holds both attempts, as cached prefix. Each agent card waits
  for one local Dexie insert, as today's chat's cards do.
```

The build adds one sentence to **Decision** with the final wording of the
line, and one to **Fallbacks** naming the fallback that shipped, if either
did. If one shipped, its design replaces the A1 wording in **Decision**.

### `roadmap.md`

- The 1E row becomes, with the date and numbers filled in:

  > | 1E | **"Try again" and parity in the agent.** Done (date). Try again
  > reruns the agent's latest answer with its first attempt kept in context
  > and a line saying the user wants a different answer, and Try again on
  > an earlier answer starts the agent over from the thread. The agent's
  > question cards are audit-logged and bias-checked through today's
  > function, and it logs `chat.sql_generated` and
  > `dashboard.block_added_via_chat` (D40, D45) ([spec](specs/phase-1e.md)).
  > | Met: unit tests and the chat runtime's integration tests. The Try
  > again set T01 to T06 met its bars against today's chat: the agent's
  > passes and repeats against the baseline's, and T03, T04, and T06 on
  > every run. No prompt change, so the 45, P, M, and D were not rerun.
  > Eval label `phase-1e` ([results](eval.md#phase-1e)). The browser test
  > is 1F's. |

- In **What keeps the agent off**, the sentence above the table becomes
  "Turning it on before 1D and 1E would have lost what today's chat does
  below. Both are done:", and the last three rows become:

  | Today's chat feature | Agent today | Planned |
  |---|---|---|
  | "Try again" sends the previous attempt (`retryContext`) | Keeps its first attempt, and a hosted retry adds a Try again line. Try again on an earlier answer starts over from the thread. | Done in 1E (D45) |
  | Clarification cards are audit-logged and bias-checked | Its `ask_user` and value cards go through the same `recordClarificationShown` | Done in 1E (D40, D45) |
  | Analytics `chat.sql_generated`, `dashboard.block_added_via_chat` | One `chat.sql_generated` per answer that showed a query, and `dashboard.block_added_via_chat` per block that reaches a dashboard | Done in 1E (D40, D45) |

### `specs/phase-1.md`

The 1E row becomes:

> | 1E | **"Try again" and parity** | Regenerating the agent's latest
> answer reruns it with the first attempt kept in the agent's history and
> a line saying the user wants a different answer. Regenerating an earlier
> answer starts the agent over from the thread, so its history matches
> what the user sees. The agent's `ask_user` and value cards get today's
> audit log and bias check, and the agent logs today's chat analytics
> events (D40, D45). | [phase-1e.md](phase-1e.md) |

### `eval.md`

- A **Phase 1E** section after Phase 1D: the baseline's and the agent's
  runs, the bars and whether each was met, every wording of the line tried
  with its numbers, and the fallback taken, if any.
- Under **Questions and ground truth**, a paragraph on
  `covid/covidTryAgainQuestions.ts` with the T table: built from, first
  attempt, and what passes.
- The two commands under **Reproducing every result**.
- The runs archived with `scripts/ai-eval/archiveEvalRuns.ts` under the
  `phase-1e` label, as earlier phases were.

### `architecture.md`

In section 8, item 1, say that dashboards (1D) and Try again (1E) are
done, linking their specs.

### `docs/measles-demo/pr-feature-log.md`

The next free id (F140 today), in F139's format: a Features table row
("Try again and parity in the agent: the Try again line, the shared card
audit, and the agent's analytics events"), depending on F139. A Merge
order row after F139: frontend only, with no edge function or migration
to deploy first. A section with the purpose, the design (this spec), the
PR title `feat(ai-agent): try again and parity in the agent`, and the
files by area with their commits. Rows in the files-by-area tables for the
files above.

## Risks

| Risk | Mitigation |
|---|---|
| The model reads the line as chat and replies "Sure, trying again" with no tool call. | The Try again eval grades it. New wordings, then A3. |
| The kept first attempt misleads a later follow-up ("show that by month" builds on the first attempt). | T06. Fallback: A2. |
| Each extra Try again adds an attempt to the transcript. | The attempts are cached prefix, a few hundred tokens each. Context pruning is roadmap 2.5. |
| Starting over after an earlier answer's Try again uses a new vault, so the thread's placeholders read `[earlier value]` and cards resolved earlier are not reported again. | The same as after a reload or a session switch today (D39). |
| Two different threads match by accident. | The key covers every user message's text. Their user messages repeat exactly only when assistant-ui reruns the thread. Two branches with the same user messages and different replies would match, but the app has no branch picker or edit action to make one. |
| A change slips into the text of turns that are not a Try again and shifts the 45 unnoticed. | The guard test in `buildAgentTurnText.test.ts` and the existing Pi harness turn tests. |
| Awaiting the audit write delays the card. | One local Dexie insert. Today's chat awaits the same call. |
| `recordShown` writes `outcome: "answered"` before any answer, so a card that a Try again or a new message replaces stays `answered`. | Today's chat does the same. Listed, not fixed: 1E is parity. |
| Try again after a confirmed card adds a second block. | Today's chat re-queues a block the same way, and the user sees both. |
| Analytics inserts fail offline. | `AnalyticsClient.logEvent` swallows them, as for today's offline pipeline. |
| The Pi harness reruns the whole question on Try again, while the app reruns the last user message. | D09's known eval difference. T04 exercises the card case on both harnesses, and the integration test covers the app's thread. |

## Done when

- `phase-1e:today-retry` (three runs) is recorded, and
  `phase-1e:agent-retry` (three runs) meets bars 1 to 5, both in
  `eval.md`, with every wording tried.
- If a fallback shipped, its own reruns met their bars (for A3, the 45, P,
  M, and D against 1D's bars too), and D45 says so.
- Every test under [Testing](#testing) is in place and passes, including
  the two guards and the unchanged `useAvandarChatRuntime.retryContext.test.tsx`.
- `pnpm exec tsc -b --force --noEmit`, `pnpm lint`, `pnpm i18n:check`
  (with no change to the catalogs), and `pnpm test:frontend` pass.
- `decisions.md` has D45 and the index rows, `roadmap.md` and
  `specs/phase-1.md` have the 1E rows and the "What keeps the agent off"
  table above, `eval.md` has the Phase 1E section, and the PR feature log
  has the 1E feature.
