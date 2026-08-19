# Unified Chat Sessions Design

## Context

The chat panel already mounts in the workspace shell, but the assistant is
still a per-app copilot. Each turn rebuilds the system prompt from
`ChatPageContext.app` (`data-explorer` vs `dashboards` vs generic), swaps the
tool list, and stuffs live SQL / result schema / errors into that prefix.
Changing page therefore busts provider prompt cache for the whole
conversation.

The thread lives in `useLocalRuntime` memory only. There is no New chat
control. Data Manager (`data-sources`) disables the composer; that stays.

Follow-up (not this spec):
[AVA-318](https://linear.app/avandar/issue/AVA-318/let-chat-tools-run-even-when-the-target-page-is-not-visible)
covers targeted off-page actions, last-viewed dashboard memory, and enabling
chat on more apps. Related existing issues: AVA-134 (persist + new chat),
AVA-141 / AVA-299 (new chat with history). This spec persists **one** live
slot and discards on New chat. It does not add a history list.

## Goal

One seamless chat session across enabled apps (Data Explorer and Dashboards).
The model always knows the current app, route, and selected object through
append-only hidden transcript events, without rewriting the system prefix.
Users can start a new session from the panel header. The current session
survives refresh.

## Non-goals

- Tabbed sessions, session list, rename, resume, or server-side history.
- Enabling the composer on Data Manager / Datasets.
- Page-gating or rejecting tools by current app (full catalog every turn).
- Targeted `addDashboardBlock` when no dashboard id is known (AVA-318).
- Navigating the UI to the page a tool affected (AVA-318).
- Changing discovery, consent, clarification, or SQL-assumption flows.

## Decisions

| Topic            | Choice                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------- |
| View events      | App + route + in-page selection (open dataset, dashboard id). Not every SQL run.              |
| Event strategy   | Hidden messages in the assistant-ui thread, **coalesced** to one pending event between sends. |
| Tools            | Full catalog every turn (`generateSql`, `clarify`, `addDashboardBlock`), stable order.        |
| System prompt    | Frozen union of today's app-specific prefixes.                                                |
| New chat         | Instant discard. No confirm, no undo.                                                         |
| Persistence      | `localStorage`, one blob per workspace + user. New chat deletes the slot.                     |
| New chat control | Header icon button, left of Close.                                                            |
| Data Manager     | Composer stays disabled. Thread and New chat remain.                                          |

## Design

### Session model

One live thread per `(workspaceId, userId)`. Storage key:
`ava.chat.thread.<workspaceId>.<userId>`. Persist only when both ids are
present; otherwise the thread is memory-only.

The blob is the committed assistant-ui message list, including frozen hidden
view events and their metadata. A pending (unsent) view event is **not**
stored. On boot, the panel hydrates from the blob, then derives a pending
view event from the current page snapshot if it differs from the last frozen
view event.

New chat: reset the runtime to an empty thread, delete the storage key, clear
pending clarification. Instant, even if a turn is in flight (drop the late
response so it cannot rewrite the empty thread).

Corrupt, missing, or unreadable blobs hydrate as an empty thread. Write
failures (quota, private browsing) keep the in-memory thread; persist is
best-effort.

### Frozen request prefix

Every cloud and offline turn sends:

1. **Tools** (stable order): `clarify`, `generateSql`, `addDashboardBlock`.
2. **System prompt**: Avandar persona + Data Explorer SQL/clarify rules +
   dashboard-block rules + workspace schema listing.

Do not branch the prefix on `context.app`. Do not put last SQL, last error,
result columns, spatial-docs-for-this-prompt, or retry notes in the system
prompt. Those append as a **turn suffix** after the committed messages (and
after any pending view event) so they sit at the end of the cache prefix.

`ChatPageContext` remains on the request body so the client can apply tools
and analytics. The edge function no longer uses `app` to choose tools or
system prompt.

### Hidden view events

Reuse the internal-message metadata pattern from seamless discovery.
Renderers that already omit discovery continuations also omit view events.
Metadata is presentation-only: the serialized `content` still goes to the
model. View-event content must not count toward the clarification-turn cap
and must not run the user-message bias/consent path (it is client-authored
context, not typed chat).

**Snapshot fields** (event fires only when one of these changes):

- `app` (`data-explorer` | `dashboards` | `data-sources` | `other`)
- route/path from `useChatPageContext` (including Data Manager and dashboard
  edit ids)
- open dataset id (Data Explorer)
- dashboard id (dashboard edit)

Not in the event stream: last SQL, result columns, query errors. Those ride
on the next user turn's suffix.

**Shape.** Role `user`, content prefixed so the model treats it as client
context, not typed chat, for example:

`[View changed: app=data-explorer; route=...; dataset=<id or none>; dashboard=<id or none>]`

**Coalesce.** At most one message marked pending-view-event. On snapshot
change, replace that message in place. When `run()` starts, freeze it
(clear pending). The next navigation appends a new pending event. Navigating
does not start a model request.

On refresh, recompute pending from the current snapshot vs the last frozen
view event. Do not replay a stale pending event from disk.

### Tool application

Tools are always advertised. Apply side effects when the response includes
them:

- `generateSql`: existing explorer store path (`DataExplorerStateManager` is
  workspace-scoped). Visible canvas update only if Data Explorer is showing.
- `clarify`: unchanged.
- `addDashboardBlock`: apply only when a dashboard id is known (current page
  context). If none, do not call `queuePendingBlock`. Untargeted blocks must
  not attach to whichever dashboard the user opens next. Assistant text still
  renders.

### New chat UI

Header row: New chat icon button, then Close. Tooltip and `aria-label`
translated (`New chat`). Instant reset as above. Button stays available when
the composer is disabled (Data Manager).

Empty state still reflects the current page (chip + copy). Suggestions stay
page-aware. That is UI only; it must not rewrite the system prompt.

### Data Manager

Composer and send stay disabled. The panel still shows the unified thread.
View events still record the Data Manager visit so the next send from an
enabled app includes that switch.

## Data flow

1. Navigate → diff snapshot → write or replace the pending hidden message.
2. User sends → freeze pending event → serialize thread → append turn suffix
   → cloud or offline run with frozen prefix + full tools.
3. Apply response (SQL / block / clarification) → persist committed thread.
4. New chat → reset runtime, delete storage key, clear clarification.
5. Refresh → hydrate committed thread → derive pending view from current page.

## Error handling

- Bad storage: empty thread, panel stays up.
- Persist write failure: in-memory thread continues.
- New chat during `run()`: reset wins; ignore late results.
- `addDashboardBlock` without dashboard id: skip queue; keep assistant text.
- Failed turns: existing error/retry UI. Frozen view events stay in the
  thread.

## Testing

Unit:

- View events are excluded from the clarification-turn cap and from
  user-message bias/consent.
- Snapshot equality and coalesce (replace pending; freeze on send; no event
  when snapshot is unchanged).
- `ChatThreadStore` round-trip with hidden metadata; corrupt blob → empty;
  New chat deletes the key.
- Renderers omit view events; ordinary and discovery-internal messages
  unchanged.
- Union prompt and tool config do not branch on app.
- Turn suffix carries last SQL / error / columns; system prompt does not.
- `addDashboardBlock` is not queued without a dashboard id.

Component:

- New chat in the header clears the visible thread.
- Data Explorer → Dashboards keeps messages.
- Dataset or dashboard selection does not add a visible row.

E2E (one spec at a time, through the UI):

- Send in Data Explorer, open a dashboard edit, send again: same thread.
- New chat empties the thread.
- Reload restores the current thread.
- Data Manager: composer disabled, thread still visible.

## Linear

- This work fulfills the "one live session + New chat" slice of P10 without
  P10.5 history.
- [AVA-318](https://linear.app/avandar/issue/AVA-318/let-chat-tools-run-even-when-the-target-page-is-not-visible):
  off-page targeting and visibility (P2, needs scoping).
