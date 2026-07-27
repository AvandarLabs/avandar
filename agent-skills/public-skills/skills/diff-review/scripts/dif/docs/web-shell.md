# dif web shell — design + implementation notes

Status: **implemented (v1)**. This doc is the design of record for the browser
"web shell" mode and now matches the shipped code under `src/web/`. The
"Implementation plan (Rust)" section below describes what was built. Remaining
items are in [Open questions](#open-questions) (notably the multi-iframe
upgrade). Durable architecture can later be folded into
[architecture.md](architecture.md).

## What this is

Today `dif` is a **terminal** wrapper: a Ratatui TUI that runs difit + a claude
session side by side, with the diff guide rendered in a TUI pane. The web shell
adds a **browser** surface: a single-origin page that wraps difit's own web
frontend and adds

- a left sidebar with **Diff guide** and **Test plan** panels,
- **per-group filtered views**, each a partial difit showing only that group's files,
- all sharing **one difit process, one origin, one `localStorage`**, so
  "viewed" state and comments stay in sync across every view with no extra
  machinery.

It does **not** fork or modify difit. difit is proxied verbatim; only its
HTML document is augmented (one injected `<script>`), and its `/api/diff`
response is *filtered* per group. Everything else passes through byte-for-byte,
so difit upgrades flow straight through.

The tool's purpose is unchanged and worth restating: **a live code-review
session** between the reviewer and claude, **or** a **PR pre-review**
(`/diff-review pr <n>`) where claude reviews a contributor's PR and leaves
findings for the human to vet before their own pass.

## Goals / non-goals

**Goals**
- One browser origin: guide + test plan + full diff + per-group partial diffs,
  with navigation in the left sidebar.
- A group view shows **only** that group's files (data-filtered, not DOM-hidden).
- "Viewed" state and comments are shared across all views automatically.
- Never fork difit; survive difit version bumps with minimal breakage surface.
- Coexist with the TUI (the TUI still drives the LLM session + comment
  injection); the web shell is the human's reading surface.

**Non-goals**
- Replacing the TUI.
- Changing difit or relying on any difit feature it doesn't already expose.
- Multiple difit processes.

## Verified difit facts (v5.0.2) this design leans on

- difit is a **React SPA served by Express**. Document is a trivial
  `<div id="root">` + bundled JS. Data comes from a JSON API:
  `/api/diff`, `/api/comments-json`, `/api/comment-imports`,
  `/api/comments-output`, plus watch/heartbeat (SSE-style) endpoints.
- **Viewed state = `localStorage`, per-origin.** Outer key
  `difit-viewed-index-v1/<diffIdentity>`; inner entries per file
  `{ filePath, viewedAt, diffContentHash }`.
- **`diffContentHash` is per-file** (hash of that file's own diff content) →
  stable whether or not sibling files are present.
- **`diffIdentity` is derived from the comparison target** (travels with
  `baseCommitish` / `targetCommitish`), **not** from the file list. So it is
  identical across every group view of the same comparison.

Consequence: filtering the `files[]` array does not change any viewed key, as
long as we keep the non-`files` fields of `/api/diff` identical across responses.

## Architecture: reverse proxy + inject, one origin

```
                    browser (one origin :PUBLIC)
                              │
        ┌─────────────────────┴──────────────────────┐
        │            dif web-shell server              │   (new; in the Rust binary)
        │                                              │
        │  GET /                → shell page           │
        │  GET /__wrap/*        → shell assets,        │
        │                          inject.js,          │
        │                          groups.json,        │
        │                          summary/test plan   │
        │  GET /__wrap/difit?group=N → difit HTML,     │
        │                          proxied + <script>  │
        │                          injected            │
        │  GET /api/diff        → proxied, FILTERED    │
        │                          by group (Referer)  │
        │  * (assets, other API,→ proxied verbatim     │
        │     SSE/watch)           to difit            │
        └─────────────────────┬────────────────────────┘
                              │ localhost
                       difit server (:INTERNAL)   ← spawned by dif, as today
```

- `dif` spawns difit on an **internal** localhost port (unchanged from today).
- `dif` runs a **web-shell HTTP server** on the **public** port — this is the
  origin the browser uses. It reverse-proxies everything difit needs, and adds
  the shell + the group filter.
- **One origin** is the whole trick. Because the browser only ever talks to the
  public port, difit's `localStorage` (viewed state) is shared across the full
  view and every group view, and the browser's `storage` event lets views
  react to each other live.

### Group filtering = data-filter at the proxy

- The group → files map comes from the skill's `…-guide.json` (a new
  structured companion to the guide; see [Companion skill
  change](#companion-skill-change)), served to the shell as
  `/__wrap/groups.json`.
- Each **group iframe** loads `GET /__wrap/difit?group=N`. The proxy serves
  difit's real HTML (with our `<script>` injected). difit's frontend then
  fetches `/api/diff` (root-absolute).
- The proxy infers the group for that `/api/diff` request from the **`Referer`
  header** (the iframe document URL carries `?group=N`; same-origin subresource
  requests send the full referrer path+query under the default referrer
  policy). It then returns difit's diff JSON with `files[]` **filtered** to that
  group's set — and **every other field left identical**.
- **Full** tab loads `GET /__wrap/difit` (no group) → proxy returns the diff
  unfiltered.
- Comments (`/api/comments*`) are **never filtered** — they're server-mediated
  and shared, so a comment made in a group view is present everywhere.

Referer-based inference keeps the filter **injection-light**: no need to
monkeypatch `fetch`. If a future difit sets a stricter `referrerPolicy` that
strips the query, the fallback is inject.js monkeypatching `fetch`/`EventSource`
to stamp an `X-Dif-Group` header; the proxy prefers the header when present,
else falls back to Referer.

### The injected script (`/__wrap/inject.js`)

Injected by the proxy into difit's HTML (insert before `</body>`). Minimal by
design; the filter does not depend on it. It handles polish + resilience:

1. **Live viewed-sync across tabs.** Listen for `storage` events on the viewed
   key; when another view marks a file viewed, nudge this difit instance to
   re-reflect it (re-read the index / re-render the badges). Without this,
   already-open iframes only pick up changes on reload — data is still
   consistent, just not live.
2. **Header fallback** for group tagging (see above), only if Referer proves
   unreliable.
3. **Key-normalization fallback.** If a future difit derives `diffIdentity`
   from something file-list-dependent, force a stable identity here so the
   shared key holds. (Not needed for v5.0.2.)
4. **Scroll-to-file.** On a `scroll-to-file` message from the shell, scroll
   difit to the file's `[data-file-path]` element. The shell fires this right
   after `difit-ready`, which is posted the moment `inject.js` runs — *before*
   difit's React has rendered the file rows — so the handler **retries** (~75ms
   ×40) until the row exists, then scrolls. Without the retry, clicking a file in
   the sidebar took two clicks (first re-filtered, second scrolled).

## The shell UI — guide is a persistent, collapsible sidebar

See the design mockup (published separately) for the visual. Principles:

- **The diff guide is a left sidebar and the primary navigation**.
  It stays visible while you review a partial diff, so you can read a group's
  explanations *and* switch between partial diffs without leaving the view.
  - The sidebar has two local tabs: **Diff guide** (default) and **Test plan**.
    The test plan is a separate artifact, not content embedded in the guide.
  - The Diff guide panel shows the `-summary.md` summary under the title before
    the **Full diff** item, then each **group** (number, ticket, name, kind dot,
    reviewed fraction) with its one-line orientation and its file rows (viewed
    check, tag, thread count). The **group heading is a single line**: the
    number/ticket flow inline before the name (not stacked on their own row) to
    spend less vertical space per group.
  - Clicking a **group heading** toggles that group open or closed with an
    animated accordion. When closed, only the heading row remains visible: no
    orientation summary and no file rows.
  - The collapsed rail, palette, and file rows show filtered difit views in the
    main area.
    Clicking a **file** switches to its group *and* scrolls the main view to
    that file (with a brief highlight).
  - The sidebar **collapses to a slim rail** (via the top-bar toggle, the
    sidebar chevron, or the platform toggle shortcut). The rail keeps `Full` + a numbered button per
    group so you can still switch views one-handed while maximizing diff width,
    then expand again.
  - **The collapse animates as a single width transition.** Both the full
    sidebar and the rail are always laid out (the rail is `display:flex` with
    `width:0` when expanded, not toggled on with `display`); collapsing runs
    `width` from `--side-w`→`0` on the sidebar and `0`→`40px` on the rail over
    the same `.2s` ease. Because both are always present and their inner content
    has a fixed width (`--side-w`, so it never reflows mid-animation), the left
    region shrinks monotonically with no flash of the rail popping to full width
    before the sidebar collapses.
- The **main area hosts the difit iframes**, one per view (Full + each group),
  **lazy-mounted** on first open and then kept alive so switching is instant and
  each view keeps its own scroll position — the "simultaneous partial difits"
  goal. Only the active iframe is shown; the sidebar is the switcher.
- Design language: **soft, minimalist, crisp**. No gradients. No purple bias.
  No "AI slop" ornament. Cool-biased neutrals (deliberately not cream), one
  restrained teal-slate accent used only for active/interactive state,
  green = reviewed / amber = changed-since-review as separate semantics, system
  sans + mono (paths, counts, tabular-nums), hairline separators.
- **Light theme lifts difit off the shell** (Linear-style): difit sits **flush**
  (no gutter/margin) but with **rounded corners** (`--canvas-radius`, applied to
  both `#difit` and `.iframe-wrap`), and its container (`.iframe-wrap`) carries a
  **left-leaning box-shadow** (`--canvas-shadow`) plus a `z-index` so the shadow
  is painted **on top of the sidebar** to its left, reading as the canvas lifted
  just above the chrome. The shadow, not any margin, is what sells the lift; the
  negative-x offset is what makes it fall on the sidebar rather than into a
  symmetric halo. The rounded corners reveal the shell's own `--bg` behind them,
  so difit reads as a rounded card. **Dark theme keeps difit edge-to-edge**
  (`--canvas-radius: 0`, `--canvas-shadow: none`), because the lift reads as
  clutter on a dark surface where the shadow barely shows.

Lighter alternative (open question): a **single** difit iframe that re-filters
on view switch instead of one per group — one difit boot, re-renders on change.
Cheaper on memory, but loses instant switching and per-view scroll position, and
is less "simultaneous." Current plan honors the multiple-iframe model with lazy
mount.

## Header chrome, command palette & hotkeys

The shell's own chrome is deliberately **compact** — difit is where reviewing
happens, so it spends as little vertical budget on itself as it can, leaving
maximum height for the diff. There is a **single** 34px top bar and **no
per-view sub-header**. The bar is a **three-section grid** (`1fr auto 1fr`):

- **left** (`.tb-left`): the sidebar toggle + the branch identity (`#brandTitle`,
  the worktree pill, the "Show new changes" button),
- **center** (`#viewInfo`, `justify-self: center`): the current view's name +
  file-count chip — truly centered in the bar regardless of the side widths,
- **right** (`.tb-right`): the reviewed count + progress bar (`#viewProg`), then
  the palette button and Theme.

`renderHead` fills `#viewInfo` and `#viewProg`. Folding what used to be a
separate sub-header row into the top bar reclaims ~30px of height for the diff.
All spacing is tuned toward difit's own density rather than a roomier app shell.

### Header identity — branch title + worktree pill

- The top-bar title is the **branch under review** (e.g. `feat/web-shell`), not a
  static product name.
- When the checkout's directory name differs from the branch (typically a linked
  git **worktree**), a small pill next to the title shows that **worktree name**
  (e.g. `web-shell`), with a `worktree` tooltip. Reviewing a branch in a checkout
  whose folder is named after the branch shows **no** pill.
- Both values are served by a new endpoint, **`GET /__wrap/meta.json`** →
  `{"branch": "...", "worktree": "...", "showWorktree": bool}`. The values are
  captured once at startup (`WebShell::start(..., branch, worktree)`); the
  pure decision lives in `src/web/meta.rs` (`worktree_name`, `show_worktree`,
  `meta_json`) and `shell.js` renders it. `showWorktree` is
  `worktree != branch && !worktree.is_empty()`.
- **Matching rule.** `worktree_name(repo_root, branch)` returns the **branch
  verbatim** when the checkout directory path *ends with* the branch's path
  segments — the common worktree layout `…/<repo>/<branch>` where the branch may
  contain slashes (`…/avandar/feat/web-shell` on `feat/web-shell`). That makes
  `worktree == branch`, so the pill is hidden. Only when the directory does not
  correspond to the branch (e.g. a main checkout named `avandar` on `develop`)
  does it fall back to the directory basename, which the pill then shows. This is
  why reviewing `feat/web-shell` inside its own worktree shows **no** pill.

### Command palette (spotlight)

A Mantine-Spotlight-style command palette, built dependency-free in vanilla
JS/CSS (no React — the shell has no build step). Opened by the top-bar
**"Jump to…"** button or the palette hotkey. It flattens the guide into actions:

- **Full diff** (a view action),
- **Diff guide** and **Test plan** sidebar tabs,
- one action per **group** (`Group NN — name`),
- one action per **file** (searchable by path; runs its group's view), and
- **UI actions**: "Collapse / Expand diff guide" (label follows the current
  sidebar state; platform shortcut shown in the row) and, when applicable,
  "Show new changes".

Filtering: a **bare number** (`2`) narrows straight to that group's command (per
the reviewer's request); otherwise every space-separated token must appear in an
action's label/sub/keywords. `↑`/`↓` move, `↵` runs, `esc` closes. Actions that
also have a direct hotkey advertise it as a dimmed `kbd` hint (mirroring the TUI
palette rule).

The modal **grows to fit its widest row** (`width: max-content`) so full file
paths aren't truncated, floored at a readable min-width and capped at the
viewport, so it never introduces horizontal scroll.

### Live diff sync (counts stay honest)

The diff can change *while you review* (Claude edits code, files appear). difit
re-runs the diff on each view boot and shows the new count, so the shell must not
trust the static guide for totals. The shell treats **difit's real
`/api/diff` (unfiltered) as the source of truth**:

- `shell.js` fetches `/api/diff` on boot, after every difit-ready (each view
  switch), and on a gentle 5s poll. The parent document's fetch carries no
  `?group=`/`?view=` referer, so the proxy returns the **full** diff.
- The **Full diff** count, the header "all N files", and the progress fraction
  all come from that authoritative list, not the guide union — so a 25→31 change
  reflects immediately without a shell reload or flicker (React-free equivalent
  of a re-query: fetch + reconcile + re-render).
- The guide (`groups.json`) still drives grouping, tags, threads, and per-file
  status; difit drives the counts and the file set.

**Matching difit's "viewed" count exactly.** A file is counted reviewed when it
is either (a) present in difit's `localStorage` viewed index (an explicit view),
**or** (b) **auto-viewed by difit** — difit silently marks **generated files**
(`isGenerated`) and **deletions** (`status: "deleted"`) as viewed since they need
no review, and does *not* persist those to `localStorage`. The shell therefore
reads `isGenerated`/`status` straight from `/api/diff` and applies the same rule
(`autoViewed` + `isViewedPath` in `shell.js`). Without this, the shell
under-counts by exactly the number of generated/deleted files (e.g. a lockfile
change reads `8/35` in the shell but `10/35` in difit). difit also supports
user-configured auto-view *patterns*; those aren't visible in `/api/diff`, so a
custom pattern is the one case the mirror can't see.

### New files not in guide

Files present in difit's real diff but in **no** guide group are surfaced as a
red **"New files not in guide — N files"** bar directly under **Full diff** in
the sidebar (and as a palette action). Clicking it opens a filtered view of just
those files.

- The view loads `…/__wrap/difit?view=new`; its `/api/diff` is narrowed by
  `filter::filter_ungrouped` to the complement of the guide's file set
  (`Groups::all_files`). Route: `Route::ApiDiff { filter: DiffFilter::Ungrouped }`
  (from the `Referer`, same mechanism as group filtering).
- The bar disappears once the guide covers everything again (e.g. after a
  regenerate); the view falls back to Full when empty.

### Refresh diff guide (browser → TUI bridge)

A **⟳ Refresh diff guide** button sits next to the "Diff guide" title. It is
shown **only when the guide's file list differs from difit's real diff** — a file
was added (present in the diff, absent from the guide) or removed (listed in the
guide, no longer in the diff). Plain content edits to files the guide already
lists do **not** show it: the guide still covers the same files, so it isn't
stale.

- This is decided entirely in the browser (`guideFileListDiffers()` in
  `shell.js`) by comparing the guide's file set (`groups.json`) against difit's
  authoritative `/api/diff` file list — both of which the shell already fetches.
  No server-side signature or `meta.json` flag is involved. `renderAll` re-checks
  it whenever the guide or the diff refreshes, so the button appears/disappears
  live as files are added or removed.

The browser can't type into the TUI's LLM pane, so clicking it bridges through
the shell server:

1. The button `POST`s `/__wrap/regenerate`; the handler sets a shared
   `Arc<AtomicBool>` (`Ctx::regen`) and returns `202`. The button is then
   **disabled** (`regenInFlight`) so a second click can't queue another
   regeneration.
2. The TUI event loop polls `WebShell::take_regen_request()` each tick
   (`App::poll_web_shell_requests`) and, on a pending request, runs
   `App::regenerate_guide()` — the same path as `Ctrl+G`: it types the
   `/diff-review` regenerate prompt into the LLM pane.
3. The skill rewrites `…-guide.json` / `…-guide.md`; the TUI guide view and the
   shell's `groups.json` poll both pick it up. When the shell's poll sees the new
   `groups.json` (`applyGroups`), it re-renders the sidebar in place (never
   touching the difit iframe, so an in-progress comment is safe) and clears
   `regenInFlight`, re-enabling the button (now hidden if the lists match).

### Show new changes (in-place difit reload)

**"Show new changes" is driven by an actual diff-content change, not difit's raw
reload signal.** difit's file-watcher fires a `reload` event on *git-internal*
churn too — `.git/HEAD` (labeled "New commits available"), `.git/index`
("Staging changes detected") — none of which change the diff you're reviewing.
Trusting that signal made the button show spuriously (e.g. on a fresh launch,
because launch-time git activity touches `.git/HEAD`) and never clear. So instead
the shell hashes difit's **live `/api/diff`** (which re-runs the diff per request)
and compares it to the diff difit's iframe is currently showing
(`renderedDiffSig` vs `liveDiffSig` in `shell.js`): the button appears **only when
the content genuinely differs**. difit's reload event is used only as a nudge to
re-fetch and re-check promptly; a 3s poll is the backup.

`inject.js` still detects difit's reload button
(`button[title*="Click to refresh"]` — difit's stable literal title) and posts
`changes-available`, but the shell treats it as "re-check the diff", not "show
the button". The **⟳ Show new changes** button sits by the branch title (and is a
palette action).

Clicking it (or the palette entry) is **instant** — it is not a process (no
Claude, no server restart). It posts `reload-difit` back; `inject.js` clicks
difit's own reload button so difit reloads the diff **in place** (no iframe
reload, so an in-progress comment survives, and no `Ctrl+R`-style server restart
or new browser tab). The shell also re-fetches `groups.json` + `/api/diff` so its
guide and counts match. The affordance clears immediately on click and only
returns when difit reports changes again.

This is distinct from **Refresh diff guide**: that one is gated on a *file-list*
difference (a process that asks Claude to regenerate the guide, disabled until it
finishes), whereas Show new changes is an instant in-place reload of the current
code + guide.

**difit's own reload button doubles as Show new changes.** difit renders its
native reload button whenever its watcher fires, and the reviewer may click that
one directly instead of ours. When they do, `inject.js` catches the click in the
capture phase (`button[title*="Click to refresh"]`) and posts `difit-reloaded`
up; the shell then rebaselines (`renderedDiffSig = liveDiffSig`, opens a short
settle window) and re-fetches `groups.json` + `/api/diff`, exactly as our own
button does. So a reviewer who reaches for difit's button gets the shell's guide
and counts refreshed too, and our redundant **Show new changes** affordance
clears on the next content check rather than lingering.

### Sidebar file rows

Each file row shows the viewed check, the file name, and a short note. The name
stays full; the **note ellipsizes** when it doesn't fit and a hover **tooltip**
(a small dependency-free Mantine-style popover, `#tip` in `shell.js`) shows the
full note. Hovering the name shows the full repo-relative path. Thread counts are
not shown in the row.

### Iframe auto-retry (no manual "Retry")

difit is briefly down right after a `Ctrl+R` restart, so the iframe's first load
can `502`. `shell.js` retries the load silently (up to `RETRY_MAX`, 500ms apart)
before surfacing the manual "difit didn't load" box — so a restart reopens the
shell and difit fills in on its own. `difit-ready` (from `inject.js`) cancels the
retry loop.

### Hotkeys

Leader is **Ctrl** on macOS (the browser reserves **Cmd**+digit for tab
switching, so Ctrl+digit is free; the palette uses the platform Mod key). On
Windows/Linux the leader is **Alt+Shift**, because browsers reserve
`Ctrl+D`/`Ctrl+T`, and plain `Alt+D` usually focuses the address bar.

| Key | Action |
| --- | --- |
| `Ctrl`+`1`…`9` (macOS) / `Alt+Shift`+`1`…`9` (Windows/Linux) | Jump to group N |
| `Ctrl`+`F` / `Alt+Shift`+`F` | Full diff |
| `Ctrl`+`H` / `Alt+Shift`+`H` | Collapse / expand the guide sidebar |
| `Ctrl`+`D` / `Alt+Shift`+`D` | Show the Diff guide sidebar tab |
| `Ctrl`+`T` / `Alt+Shift`+`T` | Show the Test plan sidebar tab |
| `⌘K` / `Ctrl`+`K` | Toggle the command palette |

Hotkeys never fire while focus is in an editable field (so difit's comment boxes
and emacs-style Ctrl keys keep working). Because a keydown inside the difit
iframe never bubbles to the shell document, **`inject.js` forwards** matching
combos up to the shell via `postMessage` (`{source:"dif-web-shell",
type:"hotkey", combo}`), so the hotkeys work even when focus is inside difit.
This reuses the same message channel as the existing `difit-ready` signal.

> Cross-platform note: on Windows/Linux `Ctrl`+digit / `Ctrl`+`F` /
> `Ctrl`+`D` / `Ctrl`+`T` are browser shortcuts and cannot be reliably
> suppressed from a page. `Alt+Shift` avoids the common browser reservations
> while keeping the same letter/digit choices.

## Implementation plan (Rust)

### Decisions locked

- **Filtering model: single difit iframe, reload-on-switch.** The main area
  holds one `<iframe>`; selecting Full or a group sets its `src` to
  `/__wrap/difit` or `/__wrap/difit?group=N`, and difit re-boots and fetches the
  filtered `/api/diff`. One difit process, one SSE connection, one diff in
  memory — robust against unforked difit's connection/heartbeat behavior, and a
  near-trivial frontend. Shared viewed-state survives the reload (difit re-reads
  the shared-origin `localStorage` on boot). Costs: scroll resets on switch
  (fine — it's a different file set); an in-progress comment draft is lost if you
  switch mid-typing (minor, rare). Upgrade path if that bites: N lazy-mounted
  iframes toggled by visibility — truly simultaneous, no reload, at the price of
  N SSE connections + more lifecycle. Not built for v1.
- **Entry point: auto-open the shell, alongside the TUI, as the default.** Today
  `dif` spawns difit with `open_browser=true` (`startup.rs`) and difit opens the
  browser at its own URL. Flip that to `--no-open`; the shell server opens the
  browser at the **shell** URL instead. No new flag — the wrapped frontend simply
  replaces difit's default frontend as what auto-opens.

### Style / deps

Keep the crate **async-free** and `#![forbid(unsafe_code)]`. Add **one** dep,
`tiny_http` (blocking, thread-per-connection) — it matches the crate's existing
thread-based design (poller, PTY panes are all blocking threads), so no tokio /
axum. Reuse `ureq` (already a dep) for upstream calls to difit.

### New module tree `src/web/`

- `mod.rs` — `WebShell` handle: `start(difit_port, shell_port, repo_root, paths)
  -> WebShell`; spawns the server thread; exposes `url()` + shutdown. Thin glue.
- `server.rs` — `tiny_http` accept loop on a dedicated thread; hands each
  request to the router + handlers (thread-per-request so SSE can stream).
- `router.rs` — **pure** `route(method, path, query, referer) -> Route`, where
  `Route ∈ { ShellPage, ShellAsset(name), Groups, InjectJs, DifitDoc{group},
  ApiDiff{group}, Proxy }`. `group` is parsed from the `Referer`'s `?group=N`.
  Unit-tested, no socket.
- `filter.rs` — **pure** `filter_diff(body: &[u8], allowed: &HashSet<String>) ->
  Vec<u8>`: parse JSON; keep only `files[]` entries whose `path` (or `oldPath`
  for renames) ∈ `allowed`; leave **every other top-level field byte-stable**;
  on any shape surprise, return `body` unchanged (**fail-open** → degrades to
  "no grouping", never breaks). The load-bearing function; unit-tested against a
  captured `/api/diff` payload asserting non-`files` fields are identical.
- `inject.rs` — **pure** `inject_script(html) -> Vec<u8>`: insert
  `<script src="/__wrap/inject.js"></script>` before `</body>` (fallback: EOF),
  exactly once. Unit-tested.
- `groups.rs` — read `…-guide.json`; expose the group roster + per-group
  allowed-set; serialize `/__wrap/groups.json`.
- `proxy.rs` — forward a request to `127.0.0.1:<difit_port>` via `ureq` and
  **stream the response through unbuffered** (crucial for SSE / `watch`); apply
  `inject` on the difit document, `filter` on `/api/diff`.
- `frontend/` — embedded via `include_str!` (no build step): `shell.html`,
  `shell.css`, the shell script (main area = a real `<iframe>` whose `src` the
  sidebar drives), and `inject.js` (the in-difit script: `storage`-event live
  viewed-sync + the `X-Dif-Group` header fallback).
  - **The shell script is split into ordered fragments under `frontend/shell/`**
    rather than one large file. They share ONE IIFE + closure scope and are
    concatenated at compile time — in order — into `server::SHELL_JS`, served as
    a single `/__wrap/shell.js`. `shell.js` (the entry) opens the IIFE and
    declares all shared state + DOM refs; feature fragments (`tooltip`,
    `helpers`, `iframe`, `render`, `data`, `spotlight`, `hotkeys`, `chrome`) add
    behavior; `boot.js` runs startup and closes the IIFE. Ordering is
    load-bearing only in that `shell.js` is first and `boot.js` last (the middle
    fragments are hoisted function/listener definitions). The fragments are not
    individually parse-valid; lint/syntax-check the assembled `/__wrap/shell.js`.
    A unit test (`server::tests::shell_js_is_one_well_formed_iife`) guards the
    assembled shape (single wrapper, entry to features to boot order, key symbols
    present).

Pure-first, mirroring how the crate already isolates logic (`inject/`,
`comparison`, `slug`): `router`, `filter`, `inject` are pure and fully
unit-tested; the only I/O is in `server.rs` / `proxy.rs`.

### Wiring changes

- **`difit/server.rs` + `tui/startup.rs`**: spawn difit with
  `open_browser=false`. After difit is ready, `web::WebShell::start(...)`, then
  open the browser at the shell URL (shell out to `open` / `xdg-open`). Shut the
  shell server down alongside difit on exit.
- **Shell port**: `pick_port` off a dedicated hash (e.g. `port_for(branch,
  scope)` xor a constant), with the same free-port fallback difit uses.
- **`tui/session_meta.rs`**: keep `port` = difit's **internal** port so the
  skill's live-POST flow is **unchanged**: a `POST /api/comment-imports`
  straight to difit still reaches the proxied browser, because difit broadcasts
  over SSE and the proxy streams that through. Add `shell_port: u16` +
  `shell_url: String` (informational; the human's surface).

### Companion skill change

The sidebar renders per-group **orientation + per-file tags + thread counts +
status**, a high-level summary, and a separate manual test plan. When the skill
writes `…-guide.md` + `…-reviewed.json`, it also writes structured
`…-guide.json`, `…-summary.md`, and `…-test-plan.md`:

```jsonc
[
  { "n": 1, "kind": "bug", "ticket": "PP-39", "name": "…", "orient": "…",
    "files": [ { "path": "src/…", "tag": "…", "threads": 1, "status": "—" } ] }
]
```

The skill already computes the group data for the markdown; emitting the JSON
twin lets the web shell's sidebar read exact data with **no markdown parsing**.
The summary and test plan stay as markdown. The TUI renders `-guide.md` and
`-test-plan.md`; only the web shell reads the JSON and summary. This companion
contract lives in the SKILL's guide-writing step (Initial / Continue /
Diff-guide modes).

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| difit `/api/diff` shape changes across versions | Filter is schema-light: only touch `files[]` by path. Guard with a shape check; if unexpected, pass through **unfiltered** (degrade to "no grouping", never break). |
| `diffIdentity` derivation changes (breaks shared key) | Keep non-`files` fields identical (already required); inject.js key-normalization fallback. |
| Referer stripped by a future `referrerPolicy` | `X-Dif-Group` header via inject.js fallback. |
| N iframes = N React boots + N SSE connections | Lazy-mount tabs; cap concurrent live iframes; single-iframe fallback design on file. |
| SSE proxy buffering stalls live updates | Stream unbuffered; explicit flush; test with a live comment round. |
| difit server-side diff cache | Proxy filter is stateless, applied per response after difit responds — cache is upstream and unaffected. |

## Open questions

1. ~~Iframe model~~ — **decided:** single difit iframe, reload-on-switch (see
   Implementation plan). Multi-iframe is the documented upgrade path.
2. ~~Nav placement~~ — **decided:** the guide is a persistent, collapsible left
   sidebar that is itself the nav (collapses to a numbered rail); the main area
   holds the difit iframe. No top tab bar.
3. Does the web shell become the primary reading surface, leaving the TUI as
   the claude co-pilot only? (Leaning yes; keep the TUI guide as fallback.)
4. ~~Entry point~~ — **decided:** auto-open the shell alongside the TUI as the
   default (difit gets `--no-open`; the shell opens the browser at its own URL).
   No new flag.

## Testing

- **Pure filter**: given a captured `/api/diff` payload + a group's file set,
  assert `files[]` is exactly the group's files and every other field is byte-
  identical (this is what pins the viewed key).
- **groups.json builder**: from a `…-reviewed.json`, assert the served map.
- **Manual/e2e**: mark a file viewed in a group tab → it reads as viewed in the
  Full tab (shared origin); post a comment in a group tab → visible everywhere;
  difit live SSE updates still arrive inside an iframe.
