# Handoff: Phase 1C multiple chats

Temporary. Delete this file when the branch lands. A new session should
read this, then the spec and the plan. Do not re-implement Tasks 1-13.

Worktree: `~/src/worktrees/avandar/feat/agent-sessions`
Branch: `feat/agent-sessions`
HEAD: `0186ff705` `fix(chat): send case-design turns the case manager context`
Nothing on this branch has been pushed. There is no upstream.

## Read first

| Doc | Role |
|---|---|
| [specs/phase-1c.md](specs/phase-1c.md) | Binding behavior. Decision D43. |
| [plans/phase-1c.md](plans/phase-1c.md) | The task argument. Untracked. Do not stage it unless someone asks. |
| [roadmap.md](roadmap.md) | 1C row is marked Built on 2026-11-10. Do not change D43. |

The execution ledger, briefs, and review reports are gitignored at
`.superpowers/sdd/phase-1c/`. `progress.md` there holds every ruling.
Leave that directory until the two test failures below are fixed and
the branch is integrated.

## What landed

29 commits from the spec `c7b6361c3` through `0186ff705`. The product
behavior:

- One localStorage index per workspace and user:
  `ava.chat.sessions.{workspaceId}.{userId}`. It holds `selectedId`,
  `openIds` in display order, `archivedIds` newest first, and per
  session `kind` (`data` or `case-design`), `title`, and
  `titleIsPlaceholder`. No messages.
- One thread record and one tray record per session. Legacy keys
  `ava.chat.thread.{workspaceId}.{userId}` and
  `ava.chat.context.{workspaceId}.{userId}` are read only by the
  first-load migration, and cleared only after the new thread, tray,
  and index writes all succeed.
- Three visible tabs, an overflow list, and a closed-chat archive of
  50. Close archives. Delete is only in the archive and only in this
  browser. Closing a tab that is not selected does not change
  `selectedId`. Closing the panel only hides and docks it.
- New chat adds an empty data session and does not change layout.
  New case type, including the Case Manager home card, adds a
  case-design session, selects it, and expands the panel. A new empty
  case-design session appends `CaseDesignKickoff` once so the
  assistant speaks. A stored thread is only loaded.
- The composer follows the session. Case-design is an enabled textarea
  on every page. A data session uses the agent composer only while
  the agent switch is on. A case-design turn sends case-manager page
  context even when the user is on Data Explorer.
- A title is requested after the first stored assistant reply, only
  while the title is still a placeholder. Prompt `chat-title-v1`,
  Haiku 5.5, locale, redacted excerpt. The title route requires a
  user-scoped `workspace_memberships` row. It does not require a Data
  Explorer role. Offline titles stay on the device.
- `ChatSessionProvider` stays mounted on pages with no workspace. It
  reads the slug with `useParams({ strict: false })` and leaves the
  context undefined until both ids exist. Signup and invites no longer
  crash.
- Browser spec: `tests/e2e/agent-chat-sessions.spec.ts`. It passed in
  about 12 seconds on this branch's own database.

This worktree's local Supabase is the switched project
`feat-agent-sessions` (API port 55401, dev server port 6253). Leave
the switch in place. Never write the production database. Before any
`pnpm db:*`, `supabase start`, `supabase stop`, or `supabase db diff`,
run `ava supabase status` and stop if the first line names the shared
`avandar` stack.

## Still to do

The non-e2e suite was run with
`./scripts/test-runners/run-all-tests.sh --quick` on 2026-11-10. It
stopped in `pnpm test:frontend`: 2 failed, 8996 passed, 2 skipped,
2 todo. The full end-to-end suite was not run. Do not run it as one
job. The integration menu (merge to `develop`, push a PR, or keep the
branch) was not offered, because that suite is not green.

### 1. Retry context posts twice

`src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.retryContext.test.tsx:64`

After Try again, `apiPostMock` is called twice. The test wants one
call, and that call's body to carry `retryContext.priorGeneratedSql`.
`apiPostMock` is `APIClient.post`. The title request uses the same
method (`requestChatSessionTitle`), so the extra call is likely the
title post rather than a second turn. Confirm by printing both call
paths. If it is the title, assert the turn call instead of
`toHaveBeenCalledOnce()`, and keep the retry-context assertion. Do
not stop the title request to make the count 1.

This file was already failing at `c40ebd3b3`, before the final fix
wave.

### 2. Workspace switch reads the pre-session thread key

`src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.workspaceSwitch.test.tsx:93`

`makeThreadStorageKeyFromWorkspace` in
`useAvandarChatRuntime.harness.tsx` still returns
`ava.chat.thread.{workspaceId}.{userId}`. Threads now persist at
`ava.chat.thread.{workspaceId}.{userId}.{sessionId}`. The precondition
`toContain(WORKSPACE_A_QUESTION)` receives `null`.

Point the harness at the session key (index, then the selected
session's thread). The product rule under test still holds: workspace
A's thread must not be stored under workspace B's key. Do not move
persistence back to the legacy key.

The other three tests in that file passed in the last full frontend
run. Only this storage assertion failed. The file was already failing
at `c40ebd3b3`.

### 3. Case list spec cannot click Dock

`tests/e2e/case-list-field.spec.ts:295` times out at 45 seconds on
`getByRole("button", { name: "Dock chat panel" })`. The expanded chat
panel covers the overlay's click point. The same click failed with
the source checked out at `c7b6361c3`, before Phase 1C. The kickoff
draft now appears, which is the part Phase 1C owns. Do not raise the
timeout. Fix the click the way `agent-chat-sessions.spec.ts` avoids
clicking through the expanded panel, or dock through a control the
panel does not cover. Run only that spec.

### 4. Integrate

`git merge-base origin/develop HEAD` is `fb5d2ca5`. This branch and
current `develop` diverged before Phase 1C. The spec's parent is
`4de947922` `feat(gis): edit a layer from the layers panel`, and that
commit is not on `origin/develop`. A merge to `develop` is not this
feature by itself. Confirm the base with the branch owner before
merging or opening a PR. Do not merge into `demo/measles`. Do not
force-push.

After the two unit failures are fixed, rerun
`./scripts/test-runners/run-all-tests.sh --quick`. Then ask whether to
merge locally, push a PR, or leave the branch.

## Deferred, do not fix unless asked

These were triaged at the branch review and left on purpose.

- `for...of` while parsing the session index.
- Missing thread-store tests for card preservation, invalid cards, and
  legacy reads ignoring a session id.
- Tray isolation does not read session B. No test for the write
  boolean, a thrown `setItem`, or `clearLegacy`. Empty user id is not
  separately asserted. Tray `write` returns true when identity is
  empty. Thread `writeRecord` returns false. That mismatch is known.
- Provider test does not render outside the provider or with no user.
  The no-workspace crash now has `ChatSessionProvider.noWorkspace.test.tsx`.
- `NewCaseTypeButton` test does not assert `startCaseDesignSession`.
  The home-card test does.
- jsdom `window.scrollTo`, missing `plugin_installations`, and stale
  `caniuse-lite` warnings.
- Composer fallbacks when the hook is undefined or the selected row
  is missing.
- Close-tab test does not assert `selectSession` stays uncalled.
- Archive dropdown is still `role="menu"` with no menu items.
- The 2000-character excerpt cap has no test.
- Title route has no tests for an unknown prompt id, the exact
  OpenRouter options, a missing API key, or returning raw model text.
- The adapter test checks that the title-mask ref is passed. The
  hosted title post is covered in `chatSessionTitle.integration.test.ts`.
- The browser spec's test name omits archive, reopen, and delete.
- StrictMode can run a state updater twice, so a discarded call can
  write a different new-session id than the one in memory.
- Switching tabs mid-reply cancels the run and saves the partial
  assistant message.
- A title is requested for an error reply. The spec says one attempt
  per successful reply.
- The title excerpt uses the latest user text raw, not the hosted
  turn's `_userModelContent`.
- Tab strip close buttons sit inside `role="tablist"`, with no
  `tabpanel` or arrow-key roving.
- Duplicate ids in `openIds` are not removed. Session rows listed in
  neither open nor archived ids are never removed.
- The provider value is not memoized.
- `docs/ontology-architecture.md` still describes
  `caseDesignSessionNonce`.
- Some locales translate "chat" with more than one word.
- Reloading while a kickoff run is in flight can append the kickoff
  again, because the stored thread is still empty.

## Rulings that still bind

- Visible select does not reorder. Overflow select and reopen move to
  the front. The archive is newest first. Evict the last id.
- `parseChatSessionIndex` does not create the replacement data
  session. `loadChatSessions` does.
- `_sessionLabel` does not take `t`. The tab strings are
  component-local macros.
- Reopen and Delete stay buttons outside `Menu.Item`.
- Both user and assistant mentions in a title excerpt are named by
  gadget type, then masked. Offline answers use the stand-in text.
- Hosted today's chat requests a title with an identity name mask.
  A turn that has a SQL vault uses `sqlVault.maskText`. Direct
  offline chat uses identity and does not call the hosted route.
- Do not edit `buildDataAgentSystemPrompt`, `DATA_AGENT_PROMPT_ID`,
  or `buildAgentTurnText`.
