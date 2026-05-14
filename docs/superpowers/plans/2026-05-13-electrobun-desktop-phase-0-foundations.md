# Electrobun Desktop — Phase 0: Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Per-step test handoff:** After completing every Step in this plan, output an enumerated list (`1.`, `2.`, `3.`, …) of the exact actions the human partner should take to verify the just-completed Step — commands to run (copy-pasteable), files or UI to inspect, and the expected result for each. Do this for every Step, including "trivial" config/file-creation steps; never skip or summarize. The list is in addition to (not a replacement for) the Manual review checkpoint at the end of each Task.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`
**Testing strategy:** `docs/superpowers/specs/2026-05-14-testing-strategy.md` — defines per-PR test groupings (G0.x) referenced in each Task below.

**Goal:** Stand up an `apps/desktop/` Electrobun shell on macOS that hosts the existing web build, logs in via Supabase, and lets a user browse their online data read-only.

**Architecture:** A new pnpm workspace package `apps/desktop` containing (1) a tiny Bun-main process that hosts an Electrobun webview, and (2) configuration that points the webview at the running Vite dev server (during `dev:desktop`) or the built `dist/` (during packaged builds). No platform abstractions, no native services, no sync — just the shell.

**Tech Stack:** Electrobun, Bun, pnpm workspaces, existing Vite/React app.

**Phase exit criteria:**
1. `pnpm dev:desktop` opens a macOS window running the existing web app against the local Supabase dev stack.
2. The user can log in, navigate to a data view, and see their online data.
3. `pnpm build:desktop` produces an unsigned `.app` bundle that runs the same flow against production Supabase.
4. No regressions to web (`pnpm dev` still works exactly as before).

**Honest framing:** Phase 0 is mostly configuration and integration; "TDD" applies loosely. Where there are pure-function units (path resolution, env normalization), tests come first. Where the work is wiring + smoke tests, the verification step is *running the thing and confirming the exit criterion*.

---

## File Structure

**New files:**
- `apps/desktop/package.json` — workspace package manifest
- `apps/desktop/tsconfig.json` — TypeScript config (extends root)
- `apps/desktop/electrobun.config.ts` — Electrobun app & bundle settings
- `apps/desktop/.gitignore` — ignore build artifacts (`build/`, `bundle/`)
- `apps/desktop/main/index.ts` — Bun-main entry point; opens the webview
- `apps/desktop/main/config/url.ts` — pure function: resolve the URL the webview should load (dev vs prod)
- `apps/desktop/main/config/url.test.ts` — unit test for `url.ts`
- `apps/desktop/preload/index.ts` — minimal preload (`window.__AVA_PLATFORM__ = "desktop"`)
- `apps/desktop/README.md` — one-pager: how to run dev / build / where the app data lives
- `docs/superpowers/plans/2026-05-13-electrobun-desktop-phase-0-foundations.md` — this file (already created when you started)

**Modified files:**
- `package.json` (root) — add `dev:desktop` and `build:desktop` scripts
- `pnpm-workspace.yaml` — no change (already matches `apps/*`)
- `.gitignore` (root) — add ignores for desktop build artifacts if not covered by the package-local `.gitignore`

---

## Task 1: Scaffold the `apps/desktop/` workspace package

**PR boundaries:** 1 PR. All Steps create new files in a new workspace package that is not yet imported by any user-facing code, so each Step is technically safe as its own PR. Each Step is technically safe as its own PR but practically grouped because no Step delivers user-observable value alone — split only if review bandwidth requires it.

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/.gitignore`
- Create: `apps/desktop/README.md`

- [ ] **Step 1: Create the package manifest**

Create `apps/desktop/package.json`:

```json
{
  "name": "@avandar/desktop",
  "version": "0.0.0",
  "description": "Avandar desktop shell (Electrobun)",
  "license": "CPAL-1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run main/index.ts",
    "build": "electrobun build",
    "test": "vitest run -c vitest.config.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "electrobun": "latest"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "vitest": "^3.2.4"
  },
  "engines": {
    "bun": ">=1.1.0",
    "node": ">=22.0.0"
  }
}
```

- [ ] **Step 2: Create the TypeScript config**

Create `apps/desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "./build",
    "rootDir": ".",
    "types": ["bun"],
    "lib": ["ES2022"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["main/**/*", "preload/**/*", "electrobun.config.ts"],
  "exclude": ["build", "bundle", "node_modules", "**/*.test.ts"]
}
```

If `tsconfig.base.json` does not exist at the repo root, omit the `extends` field and copy the rest as-is.

- [ ] **Step 3: Create the package-level gitignore**

Create `apps/desktop/.gitignore`:

```
build/
bundle/
*.app/
*.dmg
.electrobun-cache/
```

- [ ] **Step 4: Create the package README**

Create `apps/desktop/README.md`:

```markdown
# @avandar/desktop

Electrobun shell for Avandar. Hosts the existing web app inside a native macOS / Windows webview, with a Bun-based main process for privileged operations (filesystem, SQLite, native DuckDB, keychain).

## Running locally

From repo root:

    pnpm dev:desktop

This runs Vite (`pnpm dev`) and the desktop shell concurrently. The webview points at `http://localhost:5173`.

## Building

    pnpm build:desktop

Produces an unsigned `.app` (macOS) or `.exe` (Windows). Code signing is configured in later phases.

## App data location

- macOS: `~/Library/Application Support/Avandar/`
- Windows: `%APPDATA%\Avandar\`

## Phase status

Phase 0 — shell only. See `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` for the broader plan.
```

- [ ] **Step 5: Install Electrobun and verify the workspace recognizes the package**

Run from repo root:

```bash
pnpm install
```

Expected: pnpm installs `electrobun` into `apps/desktop/node_modules` (or hoisted, depending on settings) and reports `apps/desktop` as a new workspace package. No errors.

If `pnpm install` fails because `electrobun@latest` doesn't resolve, check Electrobun's npm page and pin the actual current version, then retry.

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm install
  pnpm --filter @avandar/desktop type-check
  ```
  Expected: `pnpm install` completes without errors and reports `apps/desktop` as a workspace package; `type-check` exits 0 with no diagnostics.

  **Verify:**
  - `apps/desktop/package.json` exists with name `@avandar/desktop`, the four scripts (`dev`, `build`, `test`, `type-check`), `electrobun` in dependencies, and `vitest` + `typescript` in devDependencies.
  - `apps/desktop/tsconfig.json` exists with the documented compiler options (or with `extends` omitted if `tsconfig.base.json` is absent at the repo root).
  - `apps/desktop/.gitignore` lists `build/`, `bundle/`, `*.app/`, `*.dmg`, `.electrobun-cache/`.
  - `apps/desktop/README.md` exists with the run/build/app-data-location sections shown in Step 4.
  - `pnpm-lock.yaml` now references `electrobun`.

  **Greenlight criteria:** all checks above pass before moving to Task 2. If anything fails, stop and report back with the exact output.

---

## Task 2: URL resolution pure function (with tests)

**Test groupings:** G0.1 (URL resolver edge cases — extends the 3 base cases written in this task with rejects-`file://`-viteDevUrl, handles spaces/unicode in bundledIndexPath, rejects unknown mode).

**PR boundaries:** 1 PR. The failing test added in Step 2 would red CI on its own; it must ship together with the `resolveWebviewUrl` implementation in Step 4 so the test passes at merge time.

The Bun main needs to decide what URL the webview should load. In dev, that's the local Vite server. In a packaged build, it's `file://...` pointing at the bundled web app's `index.html`. This is a small pure function — the only thing in Phase 0 amenable to genuine TDD.

**Files:**
- Create: `apps/desktop/main/config/url.ts`
- Test: `apps/desktop/main/config/url.test.ts`
- Create: `apps/desktop/vitest.config.ts`

- [ ] **Step 1: Create the vitest config**

Create `apps/desktop/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["main/**/*.test.ts", "preload/**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `apps/desktop/main/config/url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveWebviewUrl } from "./url.ts";

describe("resolveWebviewUrl", () => {
  it("returns the Vite dev URL in development", () => {
    const url = resolveWebviewUrl({
      mode: "development",
      viteDevUrl: "http://localhost:5173",
      bundledIndexPath: "/tmp/should-be-ignored/index.html",
    });
    expect(url).toBe("http://localhost:5173");
  });

  it("returns a file:// URL pointing at the bundled index in production", () => {
    const url = resolveWebviewUrl({
      mode: "production",
      viteDevUrl: "http://localhost:5173",
      bundledIndexPath: "/Applications/Avandar.app/Contents/Resources/web/index.html",
    });
    expect(url).toBe("file:///Applications/Avandar.app/Contents/Resources/web/index.html");
  });

  it("throws when production mode is missing the bundled index path", () => {
    expect(() =>
      resolveWebviewUrl({
        mode: "production",
        viteDevUrl: "http://localhost:5173",
        bundledIndexPath: "",
      }),
    ).toThrow(/bundledIndexPath required in production/);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

From repo root:

```bash
pnpm --filter @avandar/desktop test
```

Expected: FAIL with "Cannot find module './url.ts'" or equivalent.

- [ ] **Step 4: Implement `resolveWebviewUrl` minimally**

Create `apps/desktop/main/config/url.ts`:

```ts
export type ResolveWebviewUrlArgs = {
  mode: "development" | "production";
  viteDevUrl: string;
  bundledIndexPath: string;
};

export function resolveWebviewUrl(args: ResolveWebviewUrlArgs): string {
  if (args.mode === "development") {
    return args.viteDevUrl;
  }
  if (!args.bundledIndexPath) {
    throw new Error("bundledIndexPath required in production");
  }
  return `file://${args.bundledIndexPath}`;
}
```

- [ ] **Step 5: Re-run the test and confirm it passes**

```bash
pnpm --filter @avandar/desktop test
```

Expected: 3 tests pass.

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/desktop test
  ```
  Expected: 3 tests pass (`resolveWebviewUrl > returns the Vite dev URL in development`, `> returns a file:// URL ... in production`, `> throws when production mode is missing the bundled index path`). Vitest exits 0.

  **Verify:**
  - `apps/desktop/vitest.config.ts` exists with `environment: "node"` and the include glob covering `main/**/*.test.ts` and `preload/**/*.test.ts`.
  - `apps/desktop/main/config/url.ts` exports `resolveWebviewUrl` and `ResolveWebviewUrlArgs`, contains only URL-resolution logic (no I/O, no Electrobun imports, no side effects), and throws when `mode === "production"` and `bundledIndexPath` is empty.
  - `apps/desktop/main/config/url.test.ts` covers all three cases from Step 2.
  - Test groupings G0.1 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Greenlight criteria:** all checks above pass before moving to Task 3. If anything fails, stop and report back with the exact output.

---

## Task 3: Bun-main entry point that opens an Electrobun webview

**Test groupings:** G0.2 (Env reader — requires extracting `readDesktopEnv()` from `main/index.ts` and unit-testing AVA_DESKTOP_MODE default, invalid-value throws, AVA_VITE_DEV_URL default).

**PR boundaries:** 1 PR. Each file (electrobun config, preload, main entry) is a fragment of one runnable unit; none is independently useful and `main/index.ts` would fail type-check without the others. Each Step is technically safe as its own PR but practically grouped because no Step delivers user-observable value alone — split only if review bandwidth requires it.

**Files:**
- Create: `apps/desktop/main/index.ts`
- Create: `apps/desktop/electrobun.config.ts`
- Create: `apps/desktop/preload/index.ts`

- [ ] **Step 1: Create the Electrobun config**

Create `apps/desktop/electrobun.config.ts`:

```ts
import type { ElectrobunConfig } from "electrobun";

const config: ElectrobunConfig = {
  app: {
    name: "Avandar",
    identifier: "com.avandarlabs.desktop",
    version: "0.0.0",
  },
  build: {
    main: {
      entry: "main/index.ts",
      out: "build/main",
    },
    preload: {
      entry: "preload/index.ts",
      out: "build/preload",
    },
    web: {
      // points at the repo-root Vite build output
      source: "../../dist",
      out: "build/web",
    },
    bundle: {
      out: "bundle",
      platforms: ["mac-arm64", "mac-x64"],
    },
  },
};

export default config;
```

Note: if the Electrobun config schema differs from what's shown (alpha software — APIs evolve), consult `node_modules/electrobun` for the actual exported type and adjust field names accordingly. Keep the *intent* the same: declare the main entry, preload entry, web-source directory, and target platforms.

- [ ] **Step 2: Create the preload script**

Create `apps/desktop/preload/index.ts`:

```ts
// Runs inside the webview before any page script.
// Marks the platform so the React app can branch on isDesktop().
declare global {
  interface Window {
    __AVA_PLATFORM__: "desktop";
  }
}

(window as Window).__AVA_PLATFORM__ = "desktop";
```

- [ ] **Step 3: Create the Bun main entry point**

Create `apps/desktop/main/index.ts`:

```ts
import { Electrobun } from "electrobun";
import { resolveWebviewUrl } from "./config/url.ts";

const mode = (process.env.AVA_DESKTOP_MODE ?? "development") as
  | "development"
  | "production";

const viteDevUrl = process.env.AVA_VITE_DEV_URL ?? "http://localhost:5173";

const bundledIndexPath =
  process.env.AVA_BUNDLED_INDEX_PATH ??
  // resolved at runtime in production by Electrobun's resource path helper
  Electrobun.resources.path("web/index.html");

const url = resolveWebviewUrl({ mode, viteDevUrl, bundledIndexPath });

const window = Electrobun.windows.create({
  title: "Avandar",
  url,
  width: 1280,
  height: 800,
  preload: "preload/index.js",
});

window.on("closed", () => {
  Electrobun.app.quit();
});

console.log(`[avandar-desktop] webview loaded ${url}`);
```

If Electrobun's actual API for window creation differs, port the same logic to the real method names (`Electrobun.BrowserWindow`, `Electrobun.app.createWindow`, etc.). The four invariants:
1. Read `mode` from `AVA_DESKTOP_MODE`.
2. Resolve URL via `resolveWebviewUrl`.
3. Open one window pointing at that URL with the preload attached.
4. Quit the app when the window closes.

- [ ] **Step 4: Smoke-run main against a running Vite server**

In one terminal, from repo root:

```bash
pnpm dev
```

Wait for `Local: http://localhost:5173/` to appear.

In a second terminal:

```bash
AVA_DESKTOP_MODE=development AVA_VITE_DEV_URL=http://localhost:5173 bun run apps/desktop/main/index.ts
```

Expected:
- A native macOS window opens displaying the Avandar web app.
- Console prints `[avandar-desktop] webview loaded http://localhost:5173`.
- The login screen renders.
- Closing the window terminates the Bun process.

If this fails: capture the exact error and fix it before proceeding. Common issues:
- Electrobun's API names differ from the example — port to the real names.
- The webview can't reach `localhost:5173` — check macOS local network permissions for Bun.
- WebView2 isn't installed (irrelevant on macOS but flag for the Windows port).

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/desktop type-check
  ```
  Expected: exits 0 with no diagnostics. The new `main/index.ts`, `preload/index.ts`, and `electrobun.config.ts` should all type-check cleanly against Electrobun's actual exported types.

  **Verify:**
  - `apps/desktop/electrobun.config.ts` declares the four build sections (`main`, `preload`, `web`, `bundle`) and uses `../../dist` as the web source so Electrobun reads the repo-root Vite build output.
  - `apps/desktop/preload/index.ts` sets `window.__AVA_PLATFORM__ = "desktop"` and declares the global on `Window`.
  - `apps/desktop/main/index.ts` reads `AVA_DESKTOP_MODE` / `AVA_VITE_DEV_URL` / `AVA_BUNDLED_INDEX_PATH`, calls `resolveWebviewUrl`, opens one window, and quits the app on `closed`.
  - Test groupings G0.2 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test:**
  1. Terminal A, from the repo root: `pnpm dev`. Wait for `Local: http://localhost:5173/`.
  2. Terminal B, from the repo root: `AVA_DESKTOP_MODE=development AVA_VITE_DEV_URL=http://localhost:5173 bun run apps/desktop/main/index.ts`.
  3. Open the webview devtools (via the Electrobun-exposed shortcut or a temporary `Electrobun.app.openDevtools()` call) and run `window.__AVA_PLATFORM__` in the console.
  4. Close the native window.

  Expected: a native macOS window opens showing the Avandar login screen; terminal B prints `[avandar-desktop] webview loaded http://localhost:5173`; the devtools console returns `"desktop"`; closing the window terminates the Bun process in terminal B.

  **Greenlight criteria:** all checks above pass before moving to Task 4. If anything fails, stop and report back with the exact output.

---

## Task 4: Root-level `dev:desktop` script

**PR boundaries:** 1 PR. A single additive script edit to the root `package.json`; web behavior is unchanged because the existing `dev` script is untouched.

Wire a convenient one-command developer experience that runs Vite and the desktop shell concurrently.

**Files:**
- Modify: `package.json` (root) — add `dev:desktop`

- [ ] **Step 1: Read the existing root `package.json`**

```bash
cat package.json | grep -A 50 '"scripts"'
```

Confirm `concurrently` is already in `devDependencies` (it is per the existing manifest).

- [ ] **Step 2: Add the `dev:desktop` script**

In `package.json` (root), add to the `scripts` block:

```json
"dev:desktop": "concurrently -k -n vite,electrobun -c blue,magenta \"pnpm dev\" \"AVA_DESKTOP_MODE=development AVA_VITE_DEV_URL=http://localhost:5173 pnpm --filter @avandar/desktop dev\"",
```

Place it adjacent to the existing `dev` script for discoverability. The flags:
- `-k` kills all processes if any exits
- `-n` names the two streams
- `-c` colors them
- `AVA_DESKTOP_MODE` / `AVA_VITE_DEV_URL` env vars are passed to the desktop process

- [ ] **Step 3: Test the script**

```bash
pnpm dev:desktop
```

Expected:
- Vite logs appear in blue, Electrobun logs in magenta.
- A native window opens within ~5s of Vite reporting "ready".
- Closing the window stops both processes.

Press Ctrl+C to stop if the script doesn't self-terminate.

- [ ] **Step 4: Manual review checkpoint (do NOT commit)**

  **Run:** no extra commands beyond Step 3 — `pnpm dev:desktop` is itself the test.

  **Verify:**
  - Root `package.json` has a `dev:desktop` script in `scripts` matching the documented `concurrently -k -n vite,electrobun -c blue,magenta ...` invocation, with the `AVA_DESKTOP_MODE` and `AVA_VITE_DEV_URL` env vars inlined on the desktop side.
  - The script is placed adjacent to the existing `dev` script.
  - No other scripts were modified.

  **Manual smoke test:**
  1. From the repo root: `pnpm dev:desktop`.
  2. Watch the two log streams — Vite labelled in blue, Electrobun in magenta.
  3. Wait up to ~5s after Vite reports "ready"; the native Avandar window should open.
  4. Close the window (or Ctrl-C the script).
  5. Run `ps aux | grep -E 'vite|bun run'` and confirm no orphan Vite or Bun processes remain.

  Expected: blue and magenta interleaved logs, a window appears within 5s of Vite ready, closing the window (or Ctrl-C) terminates both processes thanks to `-k`, and no orphan processes survive.

  **Greenlight criteria:** all checks above pass before moving to Task 5. If anything fails, stop and report back with the exact output.

---

## Task 5: Login smoke test

**PR boundaries:** No code change PR boundaries — this Task is verification/documentation. The README annotation Step (Step 4) is a single safe doc PR.

Verify the existing Supabase login flow works inside the Electrobun webview. This is *not* an automated test — it's a manual checklist whose pass-state gates Phase 0 completion.

**Files:** none (manual verification)

- [ ] **Step 1: Start the dev stack with local Supabase**

```bash
supabase start
pnpm db:reset
pnpm db:seed
pnpm dev:desktop
```

- [ ] **Step 2: Log in via the desktop window**

In the Avandar window that opens:
1. Click "Sign in".
2. Enter the seed user's credentials from `.env.development` / seed data.
3. Submit.

Expected:
- Login completes without errors.
- The post-login dashboard renders.
- The Supabase session cookie/localStorage entry is set inside the webview.

If login fails:
- Open the webview DevTools (Electrobun should expose a keyboard shortcut or `Electrobun.app.openDevtools()`; otherwise add a temporary call to open them).
- Inspect the network tab for Supabase auth requests.
- Common cause: CORS / referrer policy differences in WKWebView vs Chrome. Document any required workaround.

- [ ] **Step 3: Browse to an online data view**

Navigate to any existing data-listing page (e.g. "Datasets" or "Workspaces"). Confirm rows render. This proves Supabase read access works from inside the webview.

- [ ] **Step 4: Capture the smoke test result in the README**

Append to `apps/desktop/README.md`:

```markdown
## Phase 0 smoke-test status

Verified on macOS <version> with Electrobun <version>:
- Login works
- Online data view renders
- Window close terminates the app
```

Replace `<version>` placeholders with the actual versions you tested with.

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run:** no extra commands — Steps 1–4 above are themselves the verification.

  **Verify:**
  - `apps/desktop/README.md` now contains a `## Phase 0 smoke-test status` section with the actual macOS version and Electrobun version substituted in (no `<version>` placeholders left).
  - During the sign-in flow in Step 2, the webview devtools console showed no errors (auth, CORS, CSP, network).
  - The post-login dashboard rendered fully in Step 2.
  - The data-listing page in Step 3 rendered with at least one row of seeded online data.
  - Closing the window from Step 1's `pnpm dev:desktop` cleanly terminated both processes.

  **Greenlight criteria:** all checks above pass before moving to Task 6. If anything fails, stop and report back with the exact output (including any console errors captured from the webview devtools).

---

## Task 6: Production build (unsigned)

**Test groupings:** G0.3 (Bundle layout assertion — `pnpm build:desktop` produces `web/index.html` at the path `resolveWebviewUrl` computes; catches Electrobun renaming its output dir between alpha versions).

**PR boundaries:** 1 PR. Adding the `build:desktop` script and the README unsigned-builds note are both additive and safe; web behavior is unchanged.

Produce a runnable `.app` bundle to validate the build pipeline. Code signing is deferred to Phase 4.

**Files:**
- Modify: `package.json` (root) — add `build:desktop`

- [ ] **Step 1: Add the root `build:desktop` script**

In `package.json` (root) `scripts`:

```json
"build:desktop": "pnpm build && pnpm --filter @avandar/desktop build",
```

This runs the existing Vite build (producing `dist/`) and then the desktop bundler (which reads `dist/` per `electrobun.config.ts`).

- [ ] **Step 2: Build for the local architecture**

```bash
pnpm build:desktop
```

Expected:
- Vite build completes (existing behavior).
- Electrobun packages the Bun-main + preload + web into a bundle.
- A `.app` (or similar) appears under `apps/desktop/bundle/`.

If the build fails:
- Capture the error verbatim.
- If it's an Electrobun bug, file an upstream issue and apply the minimum workaround (e.g. pinning a specific version).

- [ ] **Step 3: Run the bundled app and smoke-test against production Supabase**

```bash
open apps/desktop/bundle/<mac-arm64|mac-x64>/Avandar.app
```

(Adjust the path to whatever Electrobun emits.)

Expected:
- The app opens with no console (it's now a packaged app, not the dev script).
- It connects to *production* Supabase (because the Vite build embeds production env vars from `.env.production`).
- Login works, online data view renders.

If you don't want to hit production, build with development env vars by exporting them before `pnpm build`:

```bash
NODE_ENV=development pnpm build:desktop
```

- [ ] **Step 4: Note the unsigned-app caveat in the README**

Append to `apps/desktop/README.md`:

```markdown
## Unsigned builds (Phase 0)

The Phase 0 bundle is unsigned. macOS will refuse to open it on first launch with a "developer cannot be verified" Gatekeeper warning. To bypass during development:

    xattr -d com.apple.quarantine apps/desktop/bundle/<arch>/Avandar.app

Code signing & notarization land in Phase 4.
```

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm build:desktop
  ```
  Expected: Vite build completes, Electrobun packages the bundle, and a `.app` appears under `apps/desktop/bundle/<arch>/Avandar.app`. No build errors.

  **Verify:**
  - Root `package.json` has the `build:desktop` script set to `pnpm build && pnpm --filter @avandar/desktop build`.
  - `apps/desktop/README.md` now has a `## Unsigned builds (Phase 0)` section that documents the Gatekeeper warning and the `xattr -d com.apple.quarantine` workaround.
  - The packaged `.app` exists at the expected path; `dist/` is populated by the Vite build.
  - Test groupings G0.3 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test:**
  1. From the repo root: `xattr -d com.apple.quarantine apps/desktop/bundle/<arch>/Avandar.app` (substitute the actual arch directory).
  2. `open apps/desktop/bundle/<arch>/Avandar.app`.
  3. Sign in with credentials appropriate to the env the Vite build was made against (production by default, or dev if you exported `NODE_ENV=development pnpm build:desktop`).
  4. Navigate to a data-listing page.

  Expected: the packaged app opens without a Gatekeeper block after `xattr`, the login succeeds against the intended Supabase environment (production vs dev — confirm this matches what you intended to build), the dashboard renders, and the data list shows rows.

  **Greenlight criteria:** all checks above pass before moving to Task 7. If anything fails, stop and report back with the exact output (build error, Gatekeeper dialog text, or any login/data errors).

---

## Task 7: Phase 0 acceptance checklist

**PR boundaries:** No code change PR boundaries — this Task is verification/documentation. The spec annotation Step (Step 5) is a single safe doc PR.

A final sanity-check pass before declaring Phase 0 done. No file changes — pure verification.

- [ ] **Step 1: Confirm web is unchanged**

```bash
pnpm dev
```

Expected: web app starts on `localhost:5173` exactly as before this branch. Login works in the browser.

- [ ] **Step 2: Confirm `dev:desktop` works**

```bash
pnpm dev:desktop
```

Login + browse data. Close window cleanly.

- [ ] **Step 3: Confirm `build:desktop` works**

```bash
pnpm build:desktop
open apps/desktop/bundle/<arch>/Avandar.app
```

Login + browse data in the packaged app.

- [ ] **Step 4: Confirm tests pass**

```bash
pnpm --filter @avandar/desktop test
pnpm test:frontend
```

Expected: both green.

- [ ] **Step 5: Update the spec's "Phase 0" line with completion date**

Edit `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`, find the Phase 0 line under "Phased Rollout", and append "— completed YYYY-MM-DD" with today's date.

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:** no extra commands — Steps 1–4 above already exercise everything.

  **Verify:**
  - `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` has the Phase 0 line under "Phased Rollout" updated with `— completed YYYY-MM-DD` using today's date.
  - No other edits were made to the spec.
  - Step 1 confirmed: `pnpm dev` still serves the web app on `localhost:5173` and login works in a browser (no regression).
  - Step 2 confirmed: `pnpm dev:desktop` opens the window, login succeeds, the data view renders, the window closes cleanly.
  - Step 3 confirmed: `pnpm build:desktop` produces a working `.app`; the packaged app logs in and shows data.
  - Step 4 confirmed: both `pnpm --filter @avandar/desktop test` and `pnpm test:frontend` are green.

  **Greenlight criteria:** every sub-step result above is confirmed before declaring Phase 0 done. If any of the four prior steps regressed or the spec edit is missing/incorrect, stop and report back with the exact failure.

---

## Out of Scope for Phase 0

To avoid scope creep, the following are explicitly deferred and should *not* be added to this phase:

- Platform abstraction interfaces (Phase 1)
- Any IPC contracts (Phase 2)
- SQLite, native DuckDB, filesystem `DatasetBlobStore`, keychain (Phase 2)
- SyncEngine (Phase 3)
- Code signing, notarization, auto-update (Phase 4)
- Logger desktop sink, in-app bug report (Phase 4)
- Windows support (Phase 5)

If any of these become necessary to make Phase 0 work, that's a signal to revisit the spec — they should not be silently smuggled into Phase 0.

---

## Risks Specific to Phase 0

| Risk | Mitigation in this phase |
|---|---|
| Electrobun's API names differ from the example code in this plan | Plan explicitly calls this out at Tasks 3 and 6; engineer adapts to actual API, keeps invariants. |
| WKWebView has quirks Chrome doesn't (CORS, storage isolation, WebAssembly threading) | Surfaced via smoke test in Task 5. Phase 0 only needs auth + reads to work; deeper compatibility is Phase 1+ concern. |
| Unsigned app blocked by Gatekeeper on first launch | Documented workaround in Task 6 Step 4. Real fix is Phase 4. |
