# Group 5 — Platform, i18n & standalone

- **Group**: 5 of 5 (the **final** group; when this merges, deslop is DONE)
- **Refactor branch**: `refactor-g5/platform-i18n-standalone`
- **Migration strategy:** one PR per group — the whole group lands as a single PR off `refactor-g5/platform-i18n-standalone`; the per-row order below is the in-branch build sequence.
- **Base**: `origin/develop` (was `6ec98d45` at group-planning time; **drifted to `6ec98d45`** — see drift note below)
- **Depends on**: **Groups 1–4** (all of them). This is the last group.
  `#081 frontend-lingui-wiring` populates translation catalogs across **all**
  surfaces, so every other surface must exist before it runs.
- **Estimated size**: **large** — ~16 features. Net new code is dominated
  by three heavy rows (`#062` webllm ~3.6k LoC incl. `#063`, `#081` lingui
  wiring ~3k+ LoC, `#058+#059` desktop auth/snapshot ~0.8k LoC). The rest are
  small-to-tiny. The docs rows (`#091/#092/#093`) and the formatter (`#082`)
  are near-zero code.

### Constituent rows (grouped by sub-area)

**§H — Desktop platform & offline**
| # | Slug | Size |
|---|------|------|
| 056 | `desktop-platform-registry` | small |
| 057 | `desktop-web-platform-impls` | small |
| 058 | `desktop-offline-session` | medium |
| 059 | `desktop-bootstrap-snapshot` | medium |
| 060 | `desktop-duckdb-offline-fix` | tiny |
| 062 | `web-offline-webllm-chat` | large |
| 063 | `offline-chat-sql-hardening` | small |

**§N — i18n remainder**
| # | Slug | Size |
|---|------|------|
| 079 | `workspace-language-picker` | small |
| 080 | `i18n-translate-llm-script` | medium |
| 081 | `frontend-lingui-wiring` | very large |
| 082 | `i18n-catalogs-formatter` | tiny |

**Standalone (§P / §R / §Q)**
| # | Slug | Size |
|---|------|------|
| 090 | `profile-page-redesign` | medium |
| 095 | `share-resource-modal-redesign` | medium |
| 091 | `docs-ict4d-demo-history` | docs (**OPEN OPERATOR DECISION**) |
| 092 | `docs-superpowers-specs-plans` | docs |
| 093 | `docs-demo-features` | docs |

---

## Notes for future you

Read this **first**. This is a large grab-bag (16 features) and the single
most drift-prone group in the whole deslop effort. The per-feature plan files
were written in Session 3 against an earlier `develop` and **several of their
file paths are speculative / wrong**. The paths in *this* file were re-verified
against `origin/develop` and `feat/ict4d-demo` via real `git ls-tree` /
`git diff` reads on 2026-06-26. **Trust this file over the individual plan
files where they disagree**, and re-run `/deslop undrift` per row anyway.

### This is the LAST group — finishing it finishes deslop

When all 16 rows here flip to `[x]`, every row in `ALL_FEATURES.md` is
complete and Phase 3 (cutover: merge `develop` → `main`, repoint prod, delete
`feat/ict4d-demo`, remove `docs/deslop/`) can begin. Call this out in the
completion commit.

### Internal split seam (fallback only — operator declined splitting for now)

The group ships as a **single PR** off `refactor-g5/...`, built row-by-row in the
migration order below. If review ever proves intractable and the PR must be split,
the natural seam is **platform (desktop, §H)** vs. **i18n +
standalone (§N + §P/§R/§Q)**. The two halves share almost no files; the only
coupling is that `#081 frontend-lingui-wiring` wraps strings in
desktop/share/profile UI, so it must come *after* the platform half. This
split is a declined fallback, not the plan.

### `#081` MUST be late — it re-extracts catalogs across ALL surfaces

`#081 frontend-lingui-wiring` sprinkles `<Trans>` / `t` macros across every
user-facing string and then runs `lingui extract` to (re)populate the `.po`
catalogs for all 7 non-source locales. If it runs before other surfaces exist,
those surfaces' strings are missing from the catalogs and you have to re-extract
later. **Run `#081` last within this group**, and ideally last in the whole
deslop effort (it is the final group anyway). After `#081`, run
`pnpm i18n:extract` once more and verify `git diff --exit-code src/i18n/locales`
is clean (see `i18n:check` script on develop).

### Desktop (`#056-060`) is Electrobun / Bun-main + IPC — preload isolation gotcha

The desktop app is a real monorepo package at **`apps/desktop/`** (Electrobun),
**not** a `bun/` top-level dir (the per-feature plans invented
`bun/auth/…`, `bun/sync/…` paths — those do not exist). Bun-main code lives in
`apps/desktop/main/**`; the preload bridge is `apps/desktop/preload/index.ts`.

There is a known **preload isolation gotcha** (captured in the operator's
memory `feedback_vite_stale_in_electrobun.md`): user-preload globals like
`window.__AVA_PLATFORM__` injected from the preload script do **not** reach the
page's main world reliably; the working pattern is a Bun-side `dom-ready`
dataset injection. Watch for this if any desktop row touches preload-injected
globals or platform detection at page boot. The renderer talks to Bun-main only
through the typed IPC contracts in `shared/platform/ipc/contracts/*`, polled
from the renderer (not pushed) — keep that direction.

### `#091` docs-ict4d-demo-history — OPEN OPERATOR DECISION (surface before the group PR)

`091-docs-ict4d-demo-history.md` carries an unresolved operator decision:

> Copy `docs/ict4d-demo/CHECKPOINTS.md`, `FEATURE_CHECKLIST.md`,
> `random-thoughts.md` to `develop` **as a read-only historical record**, OR
> leave them only on `feat/ict4d-demo`? Default per the inventory row is
> "read-only on develop as historical record." These files document *how
> `feat/ict4d-demo` was built*. Once `feat/ict4d-demo` is deleted in Phase 3,
> the only place this history survives is `develop` — **if** we bring it over.

**Ask the operator before building the `#091` commit (i.e. before opening the
group PR).** If "leave on source only," skip copying the files and record a
`STATE.md` note for the row instead. The other two docs rows (`#092`, `#093`) have
no such question — copy verbatim.

### Files touched by multiple features (hotspots — see "Consolidated changes")

- **`src/config/platform/PlatformProvider.tsx`** — `#056` (create) + `#057`
  (wire web impls) + `#058` (branch auth on platform).
- **`apps/desktop/main/ipc/createIpcServer/createIpcServer.ts`** (exists on
  develop) — `#058` (register auth handlers) + `#059` (snapshot hook). Register
  each handler additively.
- **`src/clients/AuthClient.ts`** — `#058` (platform-branch the auth client).
- **`apps/desktop/sync/syncable-tables.ts`** (exists on develop) +
  **`apps/desktop/main/services/SnapshotBootstrap/SnapshotBootstrap.ts`**
  (exists on develop as a partial/stub) — `#059` upgrades these to the real impl.
- **`src/i18n/locales/{en,es,pt,fr,sw,ar,zh-Hans,zh-Hant}/messages.po`** —
  touched by `#079`, `#081` (bulk), `#082` (formatter), `#095` (share strings).
  Let `#081`'s extract be the canonical last pass; don't hand-merge `.po`.
- **`playwright.config.ts`** — `#095` (feature-flag env) and possibly `#062`
  (e2e fixtures). Merge env entries additively.

### Sequencing notes

- Desktop **registry/impls (`#056`/`#057`) before** anything desktop that uses
  them (`#058`, `#059`, `#060`).
- **`#062` webllm / `#063` SQL-hardening** ride on `#061 web-offline-mode`
  (already merged, `6ec98d45`) — but see the offline-infra drift note: the
  hooks they import are NOT where the plans claim.
- i18n order: `#079` → `#080` → (everything else) → **`#081` last** → `#082`.
- Standalone (`#090`, `#095`, docs `#091`-`#093`) can slot anywhere late;
  they're independent. Do `#091` only after the operator decision.

---

## Migration order within this group

Numbered, respecting all intra-group dependencies:

1. **`#056` desktop-platform-registry** — `src/config/platform/platformRegistry.ts`
   + `PlatformProvider.tsx`. Foundation; nothing desktop compiles cross-platform
   without it.
2. **`#057` desktop-web-platform-impls** — `createWebDuckDbClient` /
   `createWebDatasetBlobStore` / `createWebAuthProvider`; wired into the
   provider on web bootstrap.
3. **`#058` desktop-offline-session** — keychain-backed `DesktopAuthProvider`,
   `registerAuthHandlers`, `createKeychain`. (Needs `#056` + `#057`.)
4. **`#059` desktop-bootstrap-snapshot** — `onAuthenticated` hook + real
   `SnapshotBootstrap`; idempotent. (Needs `#058`.)
5. **`#060` desktop-duckdb-offline-fix** — bundle duckdb-wasm extensions at
   build time so offline launch doesn't stall (commit `2e26626`). (Needs `#056`
   + `#057`.)
6. **`#062` web-offline-webllm-chat** — entire `src/lib/offlineChat/` dir +
   download controls. (Needs `#061`, already merged.)
7. **`#063` offline-chat-sql-hardening** — SQL validation/repair/fallback,
   living inside `src/lib/offlineChat/`. (Needs `#062`.)
8. **`#079` workspace-language-picker** — Language tab + `useLanguagePreference`
   + RTL `DirectionProvider`. (Needs `#078`, already merged.)
9. **`#080` i18n-translate-llm-script** — `scripts/i18n/translateWithLLM.ts` +
   its vitest suite. (Needs `#078`.)
10. **`#090` profile-page-redesign** — independent; slot here.
11. **`#095` share-resource-modal-redesign** — `shared/permissions/ShareResourceModal/*`
    + `enable-shared-with-me` flag wiring + e2e infra. Independent.
12. **`#092` docs-superpowers-specs-plans** — copy `docs/superpowers/**` verbatim.
13. **`#093` docs-demo-features** — copy `docs/demo-features/**` + 4 root docs.
14. **`#091` docs-ict4d-demo-history** — **only after operator decision** (copy
    vs. leave on source).
15. **`#081` frontend-lingui-wiring** — wrap remaining strings + `lingui extract`
    to populate all catalogs. **Must be last** (after every other surface,
    including desktop/share/profile, exists). (Needs `#078` + `#079`.)
16. **`#082` i18n-catalogs-formatter** — make prettier stop fighting catalog
    regen (commit `31a166d`). Run after `#081`'s final extract so the formatter
    config is the last word.

---

## Consolidated changes (deduped)

### Files to copy verbatim

**Desktop platform (`#056`, `#057`) — `src/config/platform/**` (all source-only):**
```
src/config/platform/platformRegistry.ts
src/config/platform/platformRegistry.test.ts
src/config/platform/PlatformProvider.tsx
src/config/platform/PlatformProvider.test.tsx
src/config/platform/createWebAuthProvider.ts
src/config/platform/createWebDatasetBlobStore.ts
src/config/platform/createWebDuckDbClient.ts
```

**Desktop auth / snapshot (`#058`, `#059`) — source-only files:**
```
shared/platform/desktop/DesktopAuthProvider.ts                               (#058)
shared/platform/desktop/DesktopDatasetBlobStore.ts                           (#057/#058 support)
apps/desktop/main/ipc/registerAuthHandlers/registerAuthHandlers.ts           (#058)
apps/desktop/main/services/createKeychain/createKeychain.ts                  (#058)
apps/desktop/main/services/createKeychain/createKeychain.test.ts             (#058)
apps/desktop/main/services/createKeychain/createKeychain.integration.test.ts (#058)
apps/desktop/main/ipc/registerDatasetBlobHandlers/registerDatasetBlobHandlers.ts (#057)
apps/desktop/main/services/createFileSystemDatasetBlobStore/createFileSystemDatasetBlobStore.ts        (#057)
apps/desktop/main/services/createFileSystemDatasetBlobStore/createFileSystemDatasetBlobStore.integration.test.ts
apps/desktop/main/ipc/registerServerApiHandlers/registerServerApiHandlers.ts (#059 support)
apps/desktop/main/ipc/createElectrobunIpcTransport/createElectrobunIpcTransport.ts
apps/desktop/main/ipc/desktopIpcBridgeScript/desktopIpcBridgeScript.ts
apps/desktop/main/runtimeImportCompatibility.test.ts
```
> NOTE: `apps/desktop/` and `shared/platform/` ALREADY largely exist on develop
> (registry IPC scaffolding + `SnapshotBootstrap` stub + `syncable-tables` +
> `DesktopDuckDbClient`). The files above are the **source-only delta** —
> confirmed via `comm -23` of the two branches' trees. Everything else under
> those dirs is already on develop and must NOT be re-copied.

**WebLLM offline chat (`#062` + `#063`) — entire `src/lib/offlineChat/` dir is source-only (54 files, ~3.6k LoC):**
```
src/lib/offlineChat/**            (copy the whole directory verbatim)
```
Plus the download UI:
```
src/components/ChatPanel/OfflineChatDownloadControl/**
src/components/OfflineChatDownloadIndicator/**
```
> `#063`'s hardening files (`repairOfflineGeneratedSql.ts`,
> `offlineSqlHallucinationSubstitutions.ts`, `forceFromTableToDatasetId.ts`,
> `fuseMatchOfflineDataset.ts`, `narrowOfflineSchema.ts`,
> `matchOfflineDatasetTable.ts`, etc.) live **inside** `src/lib/offlineChat/`.
> If `#062` copies the whole dir, `#063` is mostly the surgical wiring of the
> hardening pass into the execution path + its tests. They can be one commit or
> two adjacent commits on the branch (the dir is genuinely one unit); either way
> they land in the single group PR.

**i18n script (`#080`):**
```
scripts/i18n/translateWithLLM.ts
scripts/i18n/translateWithLLM.test.ts
scripts/i18n/update-translations.sh
```

**Language picker (`#079`):** `WorkspaceI18nProvider.tsx` **already exists on
develop** at `src/i18n/WorkspaceI18nProvider.tsx` (from `#078`). Do NOT copy a
`src/lib/i18n/WorkspaceI18nProvider.tsx` (that path is stale in the plan).
Bring over only the genuinely new pieces (Language tab + `useLanguagePreference`)
and surgically edit the existing provider. Re-verify exact paths via
`git diff --stat origin/develop..feat/ict4d-demo -- src/i18n src/views`.

**Docs (`#092`, `#093`, and `#091` if approved):**
```
# #092
docs/superpowers/specs/**
docs/superpowers/plans/**
# #093
docs/demo-features/web-offline-mode.md
docs/demo-features/sql-parser-filter-ui.md
docs/demo-features/desktop-offline-session.md
docs/offline-chat-sql-hardening.md
docs/permissions-architecture.md
docs/avandar-packages.md
docs/adding-new-data-source-types.md
# #091 — ONLY IF OPERATOR APPROVES COPYING
docs/ict4d-demo/CHECKPOINTS.md
docs/ict4d-demo/FEATURE_CHECKLIST.md
docs/ict4d-demo/random-thoughts.md
```

### Files to surgically edit on `develop`

- `src/config/platform/PlatformProvider.tsx` — wire web impls on web bootstrap
  (`#057`); branch auth provider on platform (`#058`). (Created in `#056`.)
- App root / `RootLayout` — wrap tree in `<PlatformProvider>` (`#056`).
- `apps/desktop/main/ipc/createIpcServer/createIpcServer.ts` (exists on develop)
  — register auth handlers (`#058`) and the snapshot `onAuthenticated` hook
  (`#059`). Additive.
- `src/clients/AuthClient.ts` (+ `AuthClient.test.ts`) — platform-branch to
  desktop vs web auth (`#058`).
- `apps/desktop/main/services/SnapshotBootstrap/SnapshotBootstrap.ts` +
  `apps/desktop/sync/syncable-tables.ts` (both exist on develop) — upgrade
  stub → real idempotent snapshot (`#059`).
- DuckDB wasm init + desktop build pipeline — bundle extensions for offline
  launch (`#060`, commit `2e26626`).
- Offline-chat pipeline orchestrator / chat runtime hook — integrate WebLLM
  engine factory + call `OfflineChatResourceManager.unload()` on route change /
  unmount (`#062`); integrate the SQL-hardening pass before execution (`#063`).
- Language picker surfaces — Workspace Settings nav + provider wiring (`#079`).
- `shared/permissions/ShareResourceModal/*` (~16 files) — share-modal redesign
  (`#095`).
- `playwright.config.ts` — add `enable-shared-with-me` to e2e env (`#095`);
  merge any `#062` e2e env additively.
- `src/lib/offline/isAppLinkAvailableOffline.ts` — register `enable-shared-with-me`
  flag (`#095`).
- `README.md` — document the `enable-shared-with-me` flag (`#095`).
- `src/i18n/locales/{en,es,pt,fr,sw,ar,zh-Hans,zh-Hant}/messages.po` (+ compiled
  `messages.ts`) — share-modal strings (`#095`); bulk wrap + extract (`#081`).
- `src/routes/_auth/$workspaceSlug/profile.tsx` — profile redesign (`#090`,
  +257/-79).
- `src/clients/users/UserClient.ts` — add `updateProfile` mutation (`#090`).
  (Confirm exact client path; may be `src/clients/UserClient.ts`.)
- Workspace-name dropdown component — normalize typography (`#090`).
- Many user-facing TSX across all in-scope surfaces — wrap strings in
  `<Trans>`/`t` (`#081`).
- `.prettierignore` (and/or prettier config) — stop formatting `.po`/regenerated
  catalogs (`#082`, commit `31a166d`).

### Files to delete

None across the group. (Offline-chat is additive; share-modal and
profile are rewrites-in-place; docs are copies.)

### Dependency changes

Root `package.json` (web) — source-only deps to add:
```
pnpm add @mlc-ai/web-llm@^0.2.81        # #062 webllm offline chat
pnpm add node-sql-parser@^5.4.0         # #063 offline-chat SQL parse/validate (verify not already present via cloud chat)
pnpm add qrcode@^1.5.4                  # share URL row QR (#095, and shared with dashboard share row)
pnpm add -D @types/qrcode@^1.5.6        # #095
```
`apps/desktop/package.json` (Bun-main): no new source-only deps.
```
# electrobun is "latest" in the desktop pkg — confirm parity with develop's desktop pkg
```
i18n script (`#080`):
```
pnpm add openai                          # translateWithLLM uses OpenAI Chat Completions; verify not already present
```
> Lingui packages (`@lingui/*`), `dexie`, and the `i18n:*` scripts are already on
> develop (from `#078`/`#061`) — do not re-add.

---

## Per-feature breakdown

Each subsection is concise; the cold-context agent should read the named
`docs/deslop/NNN-<slug>.md` for full mechanical steps, and **prefer this file's
paths over the plan's where they conflict** (the plans predate the current
develop and contain speculative paths).

### §H — Desktop platform & offline

- **`#056` desktop-platform-registry** (`056-desktop-platform-registry.md`) —
  `src/config/platform/platformRegistry.ts` + `PlatformProvider.tsx`; throws if
  read before mount.
- **`#057` desktop-web-platform-impls** (`057-desktop-web-platform-impls.md`) —
  web DuckDB/blob-store/auth impls; loud throws for not-yet-migrated paths.
- **`#058` desktop-offline-session** (`058-desktop-offline-session.md`) —
  keychain-backed `DesktopAuthProvider`; cached token survives offline relaunch;
  `signOut` must clear BOTH keychain entries (partial clear = session leak).
- **`#059` desktop-bootstrap-snapshot** (`059-desktop-bootstrap-snapshot.md`) —
  `onAuthenticated` hook fetches every syncable table into local SQLite;
  idempotent (resume mid-snapshot).
- **`#060` desktop-duckdb-offline-fix** (`060-desktop-duckdb-offline-fix.md`) —
  bundle duckdb-wasm extensions at build time (commit `2e26626`) so offline
  launch doesn't stall on `extensions.duckdb.org`.
- **`#062` web-offline-webllm-chat** (`062-web-offline-webllm-chat.md`) — whole
  `src/lib/offlineChat/` dir + download controls. `releaseLoadedPipeline` /
  `OfflineChatResourceManager.unload()` is **critical** (WebLLM holds GBs;
  unload on route change). Rides on `#061` (merged).
- **`#063` offline-chat-sql-hardening** (`063-offline-chat-sql-hardening.md`) —
  local models hallucinate SQL; add validation + repair + friendly fallback.
  Files live inside `src/lib/offlineChat/`. Read `docs/offline-chat-sql-hardening.md`.

### §N — i18n remainder

- **`#079` workspace-language-picker** (`079-workspace-language-picker.md`) —
  Language tab, `useLanguagePreference` (per-workspace localStorage), RTL via
  Mantine `DirectionProvider`. `WorkspaceI18nProvider` already on develop — edit,
  don't copy.
- **`#080` i18n-translate-llm-script** (`080-i18n-translate-llm-script.md`) —
  `translateWithLLM.ts` via OpenAI Chat Completions; real CLI
  (`--help/--scope/--locale/--all/--model/--dry-run`); preserves PO comments/refs;
  vitest suite (preserve all tests).
- **`#081` frontend-lingui-wiring** (`081-frontend-lingui-wiring.md`) — **LAST.**
  Wrap remaining strings + `lingui extract` to populate all 7 non-source
  locales. Wide but shallow. Scope `c3e63d6` to the Lingui portion only.
- **`#082` i18n-catalogs-formatter** (`082-i18n-catalogs-formatter.md`) — add
  `.po`/`src/i18n/locales/**` to prettier ignore so it stops fighting regen
  (commit `31a166d`). Run after `#081`'s final extract.

### Standalone

- **`#090` profile-page-redesign** (`090-profile-page-redesign.md`) — sectioned
  profile (identity/account/security); `UserClient.updateProfile`. Merge commit
  `20cfc1b` also dragged in `.agents/skills/` — that's tooling noise, NOT in
  scope.
- **`#095` share-resource-modal-redesign** (`095-share-resource-modal-redesign.md`)
  — rewrites `shared/permissions/ShareResourceModal/*`; gates behind
  `enable-shared-with-me` flag (wired into `playwright.config.ts`,
  `isAppLinkAvailableOffline.ts`, README, 8 locale catalogs); bundles e2e infra
  (`reducedMotion: "reduce"` + `ensureE2eViteFeatureFlags`). No schema work
  owed (the `list_shared_with_me_rpc` migration was added and dropped on both
  branches).
- **`#091` docs-ict4d-demo-history** (`091-docs-ict4d-demo-history.md`) —
  **OPEN OPERATOR DECISION** (copy vs. leave). See Notes above.
- **`#092` docs-superpowers-specs-plans** (`092-docs-superpowers-specs-plans.md`)
  — copy `docs/superpowers/{specs,plans}/**` verbatim.
- **`#093` docs-demo-features** (`093-docs-demo-features.md`) — copy
  `docs/demo-features/**` + 4 root docs verbatim.

---

## Verification

### Automated

Run from the refactor branch after each row's commit; a full green pass
(type-check + vitest + eslint + relevant e2e) is required before opening the
single group PR.

```sh
# Type-check (root + desktop project refs)
pnpm tsc -b --noEmit

# Lint
pnpm lint            # eslint (neostandard / eslint 9 config)

# Platform registry + web impls (#056/#057)
pnpm vitest run src/config/platform

# Desktop (#058/#059) — runs under apps/desktop/vitest.config.ts
pnpm --filter ./apps/desktop vitest run \
  apps/desktop/main/ipc/registerAuthHandlers \
  apps/desktop/main/services/createKeychain \
  apps/desktop/main/services/SnapshotBootstrap

# WebLLM offline chat + SQL hardening (#062/#063)
pnpm vitest run src/lib/offlineChat

# i18n translate script (#080) — the 32-test suite
pnpm vitest run scripts/i18n/translateWithLLM.test.ts

# Share modal (#095) — toVanitySlug / buildShareSummary if present
pnpm vitest run shared/permissions/ShareResourceModal

# After #081 (and #082): catalogs must be stable
pnpm i18n:extract && git diff --exit-code src/i18n/locales   # == the i18n:check script
pnpm i18n:compile

# e2e (operator-run; may need Vite feature-flag boot)
pnpm exec playwright test tests/**/share*.spec.*
pnpm exec playwright test tests/**/workspace-billing*.spec.*   # if billing surfaces touched
```
> `toVanitySlug` tests apply to the dashboard vanity-URL work (Group 4); include
> them here only if `#095`/share touches slug code. Confirm exact spec paths
> with `git ls-tree -r feat/ict4d-demo -- tests`.

### Manual (needs a browser, a desktop build, or live services — flag to operator)

1. **Desktop build** — `pnpm --filter ./apps/desktop build` (Electrobun); launch
   the app. Sign in online, kill network, relaunch → still logged in (`#058`).
   Sign out → relaunch → lands at login; confirm BOTH keychain entries cleared.
4. **Desktop bootstrap snapshot (`#059`)** — watch Bun-main log for
   `[snapshot-bootstrap] …` lines; verify local SQLite under user-data dir is
   populated; kill mid-snapshot and relaunch → resumes (idempotent).
5. **Desktop DuckDB offline (`#060`)** — launch desktop offline; DuckDB
   initializes without stalling on `extensions.duckdb.org`.
6. **WebLLM offline chat (`#062`)** — go offline, download a local model in chat
   settings, send a message → runs locally; navigate away and check DevTools
   heap drops (proves `unload()`).
7. **Offline SQL hardening (`#063`)** — offline + model loaded, prompt for SQL
   that hallucinates a table/column → repaired or friendly fallback, no DuckDB
   crash.
8. **Language switching / RTL (`#079`, `#081`)** — switch workspace language to
   each locale; confirm strings translate; switch to Arabic and confirm RTL
   layout flips (Mantine `DirectionProvider`).
9. **Translate script (`#080`)** — `pnpm tsx scripts/i18n/translateWithLLM.ts
   --help`; dry-run a scope (needs `OPENAI_API_KEY` in `.env` — live LLM, flag
   to operator).
10. **Share modal (`#095`)** — with `enable-shared-with-me` flag on, open the
    share modal, add a principal, change general access, copy share URL / QR;
    confirm summary line + offline gating.
11. **Profile page (`#090`)** — open profile, update display name (verify
    `updateProfile` persists workspace-scoped), check sectioned layout and
    dropdown typography.

---

## How to mark this group completed

This group ships as a **single PR** off `refactor-g5/platform-i18n-standalone`.
The operator opens exactly one PR for the group against `develop`. On merge:

1. Verify the refactor branch merged into `develop`
   (`git merge-base --is-ancestor refactor-g5/platform-i18n-standalone origin/develop`).
2. Flip **all 16 constituent rows** (`#056`-`#060`, `#062`,
   `#063`, `#079`-`#082`, `#090`, `#091`, `#092`, `#093`, `#095`) in
   `ALL_FEATURES.md` from `[ ]` to `[x] (<merge-sha>)` (the same merge SHA for all).
3. Log the group completion in `STATE.md` (move the rows from `In-flight
   migrations` to the `Completed migrations log` with date + SHA).
4. Delete all of the group's per-feature plan files:
   `rm docs/deslop/0{56,57,58,59,60,62,63,79,80,81,82,90,91,92,93,95}-*.md`.
5. Delete this group plan: `rm docs/deslop/GROUP-5-platform-i18n-standalone.md`.
6. Delete the refactor branch `refactor-g5/platform-i18n-standalone` locally + remote.
7. Commit + push to `feat/ict4d-demo`.

> **DESLOP IS NOW FULLY DONE.** This is the final group. With every row in
> `ALL_FEATURES.md` at `[x]`, `develop` has full feature parity with
> `feat/ict4d-demo`. Hand off to Phase 3 (cutover): operator merges `develop`
> → `main`, repoints production from `feat/ict4d-demo` to `main`, deletes
> `feat/ict4d-demo`, and removes the `docs/deslop/` directory. Call this out
> explicitly in the completion commit message.
