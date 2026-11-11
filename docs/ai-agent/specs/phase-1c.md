# Phase 1C: multiple chats and an archive

Status: designed with Pablo on 2026-11-09. Built on 2026-11-10. Part of
[Phase 1](phase-1.md). Follows rules R1 to R4 there. Decision D43 in
[decisions.md](../decisions.md). Builds on [phase-1b.md](phase-1b.md).

## Goal

The user can keep more than one chat. Opening the panel returns to the
session they were in. Closing a tab keeps that session in an archive.
**New case type** is one of those sessions, and it does not replace the
chat they already had.

## Scope

In:

- Several open sessions, shown as tabs on the chat panel.
- An overflow list for open sessions that do not fit on the strip.
- An archive of closed sessions, stored in the browser, that can be
  reopened or deleted.
- A tray per session.
- Titles for sessions.
- **New case type** as a new session that uses today's case-manager chat.
- The chat stored today becomes the first session.

Out:

- Chat history in the database, and plan limits on how many sessions an
  account may keep. Both stay future work.
- The map-layer name leak. It waits for a later privacy pass.
- Case management on the agent. A case-design session is still answered
  by today's case-manager chat.
- Dashboard actions, **Try again**, and turning the agent on by default.
- A new eval set. A data session sends the same turn text as today.

## Decisions made while designing

| Question | Decision |
|---|---|
| Which session is showing when the panel opens | The one that was selected when the panel last closed. A new session starts from **New chat**, from an AI entry point, or when nothing is stored. |
| Where sessions that do not fit on the strip go | Two lists. The strip shows three open sessions. Further open ones sit in an overflow list. Closed ones sit in a separate archive. |
| What closing a tab does | It archives the session. Delete is a separate action in the archive and removes the session from this browser. Closing the panel only hides it and docks it. |
| What **New case type** does | It adds a case-design session, selects it, and expands the panel. That session uses today's plain case-manager composer. Data sessions use the agent composer when the agent switch is on, and today's textarea when it is off. A case-design session always uses today's textarea. |
| What the wide drawer belongs to | The panel. Switching sessions or pages does not dock or expand it. |
| How sessions are stored | One localStorage record per session, plus an index. The archive keeps the 50 newest closed sessions. |

## What the user sees

The strip shows the first three open sessions. The selected session is
always one of them: choosing a session from the overflow moves it to the
front of the open order. Reopening an archived session does the same, and
selects it.

**New chat** adds an empty data session at the front and selects it. It
does not change docked or expanded. **New case type**, and only that
entry point, also expands the panel. Any other AI entry point adds a data
session, selects it, and opens the panel if it was closed. It does not
change the layout. The case designer page has no chat of its own.

A data session is titled **New chat**, and a case-design session **New
case type**, until a title is generated. Those words are translated in
the component. The generated title is stored as the model returned it.

Closing the last open session archives it and starts a new empty data
session, so the strip is never empty.

## Storage

`ChatThreadStore` and `ChatContextTrayStore` keep messages and tray refs.
Their keys gain a session id.

| Store | Key |
|---|---|
| Thread | `ava.chat.thread.{workspaceId}.{userId}.{sessionId}` |
| Tray | `ava.chat.tray.{workspaceId}.{userId}.{sessionId}` |
| Index | `ava.chat.sessions.{workspaceId}.{userId}` |

The thread record holds the messages, the pending clarification, and the
pending case-type draft. Those cards belong to the session. The tray
record stays refs only.

The index holds the open ids in display order, the selected id, the
archived ids newest first, and for each session its kind (`data` or
`case-design`), its title, and whether the title is still a placeholder.
It does not hold messages.

The panel's open flag and its docked or expanded layout stay in
`ChatPanelStateManager`. They are not stored on a session.

On first load, if the index is missing, the thread and tray stored today
become one data session. The old keys are removed only after the new
index, thread, and tray writes have all succeeded.

Archiving a session past the fiftieth deletes the oldest archived
session's thread and tray. Open sessions are not capped. A failed
localStorage write keeps the in-memory session and leaves the previous
stored value in place.

## Switching sessions

The runtime keeps one live thread. Switching writes the current messages,
pending cards, and tray, then loads the next session into the runtime,
the pending cards, and the tray. The composer follows the session kind
and the agent switch, not the page. A case-design session always uses
today's textarea. A data session uses the agent composer only while the
switch is on. The layout does not change.

A missing or unreadable session is skipped. If the selected id is gone,
the first open session is selected. If none are open, a new empty data
session is created.

`caseDesignSessionNonce` goes away. A new case-design session is a new
id, which is what that nonce was forcing the thread to do.

## Titles

A title is requested after the first assistant message is committed, and
only while the title is still a placeholder. The request does not block
the reply. One attempt runs per successful reply until a title is stored.

The title model sees the same user text the hosted turn saw: masked
names, a mention named by type on today's chat, and an offline answer
replaced by `[An answer from the offline model, not shown]`. It does not
see rows, SQL, gadget ids, or the session title. The data-agent prompt
does not gain the title.

For a hosted reply, the browser sends that excerpt and the UI locale to
the proxy. The proxy holds prompt `chat-title-v1` and calls Claude Haiku
5.5. The prompt asks for a short noun phrase in that locale and tells the
model to keep a placeholder as written. `chat-title-v1` can change until
the commit that deploys it. After that, a change needs a new id.

For an offline reply, the offline model runs the same instruction on the
device. That title stays in the browser. Later hosted requests do not
include it.

A failed title request leaves the placeholder. The next successful reply
tries again.

## Errors

| Situation | Behavior |
|---|---|
| The index or a session record is corrupt | That record is skipped. The panel still opens. |
| The selected session is missing | The first open session is selected, or a new empty data session is created. |
| localStorage refuses a write | The in-memory session stays. The previous stored value stays. |
| The title request fails | The placeholder stays until a later reply succeeds. |
| The archive already holds 50 sessions | The oldest archived session, its thread, and its tray are deleted. |
| The user closes the last open session | It is archived, and a new empty data session is selected. |

## Testing

Red/green TDD with Vitest, plus one browser spec:

- The index creates, orders, selects, archives, reopens, and deletes.
- Thread and tray keys include the session id. One session cannot read
  another's messages or tray.
- Switching writes the current session and loads the next, including
  pending cards. The composer follows the session kind and the agent
  switch. The layout does not change.
- Closing the last open session leaves a new empty data session.
- The first load turns today's thread and tray into one data session and
  removes the old keys only after the new index, thread, and tray writes
  succeed.
- A corrupt session is skipped. A failed write does not clear storage.
- Archiving a 51st session deletes the oldest archived session.
- A data session is titled **New chat**, and a case-design session **New
  case type**, until generation succeeds. A failed request leaves the
  placeholder.
- The title excerpt contains no raw mention token, no row, and no offline
  answer text.
- **New case type** adds a case-design session, selects it, and expands
  the panel. The other session is still open.
- `tests/e2e/agent-chat-sessions.spec.ts`: with the agent proxy mocked,
  open the panel, send, start a second chat, reload, see the selected
  session again, close a tab, reopen it from the archive, and start a
  case-type session without losing the other one.

## Done when

- The unit tests and the browser spec pass.
- `pnpm exec tsc -b --noEmit` and `pnpm i18n:check` pass.
- A data session's turn text is unchanged, covered by the turn tests.
- `roadmap.md` points here, and `decisions.md` records D43.
