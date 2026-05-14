# Electrobun Desktop — Phase 4: Hardening & macOS Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` (sections "Observability", "Codebase, Build & Packaging")
**Testing strategy:** `docs/superpowers/specs/2026-05-14-testing-strategy.md` — defines per-PR test groupings (G4.x) referenced in each Task below.

**Goal:** Production-ready macOS distribution. Wire up the platform-aware logger with desktop file sink + rotation, enforce the "no raw user data in logs" discipline, ship an in-app bug-report flow, and set up code signing, notarization, and auto-update for the macOS bundle.

**Architecture:**
- The existing `@avandar/logger` package gets a platform-aware `Sink` interface; desktop uses a JSONL file writer with daily/size rotation; web uses `console.error` only.
- A custom ESLint rule blocks raw-data identifiers in logger calls.
- The bug-report dialog lives in `packages/web/components/` and submits to a new Supabase Edge Function `bug-reports`.
- macOS code signing via Apple Developer ID + notarization via `xcrun notarytool`, automated in CI.
- Auto-update via Electrobun's built-in updater pointed at a manifest hosted on Supabase Storage.

**Tech Stack:** existing `@avandar/logger`, ESLint custom rule, Mantine `Modal`, Supabase Edge Function (Deno), `xcrun notarytool`, Electrobun's updater.

**Phase exit criteria:**
1. Desktop log files are written, rotated, and capped per spec.
2. CI lint fails if a developer logs raw user data.
3. A user can submit a bug report from within the app; the report (with sanitized logs) lands in the team's collection point.
4. A signed and notarized `.dmg` exits the CI pipeline.
5. The packaged app receives an auto-update on next launch when a newer manifest is published.
6. Internal dogfood pass for two weeks with no critical regressions.

**Honest framing:** Code signing + notarization is the part of this project most likely to have rough edges with Electrobun's alpha tooling. Budget time. The logger and bug-report work are straightforward.

---

## File Structure

**Modified: logger**
- `packages/shared/logger/src/index.ts` — re-exports
- `packages/shared/logger/src/types.ts` — `LogSink`, `LogLevel`, `LogEvent`
- `packages/shared/logger/src/createLogger.ts` — main factory; replaces existing direct console calls
- `packages/shared/logger/src/sinks/ConsoleSink.ts`
- `packages/shared/logger/src/sinks/FileSink.ts` — JSONL with rotation
- `packages/shared/logger/src/redaction.ts` — defensive redaction
- Tests for each above

**New: lint rule**
- `eslint-rules/no-raw-data-in-logger.js`
- `eslint-rules/no-raw-data-in-logger.test.js`
- Modify: `eslint.config.js` to register the rule

**New: bug report flow**
- `packages/web/components/src/BugReportDialog/BugReportDialog.tsx`
- `packages/web/components/src/BugReportDialog/BugReportDialog.test.tsx`
- `apps/desktop/main/ipc/bug-report.ts` — collects log files via IPC
- `apps/desktop/main/services/BugReportBundle.ts`
- `supabase/functions/bug-reports/index.ts` — receives reports
- `supabase/functions/bug-reports/index.test.ts`

**New: macOS signing & distribution**
- `apps/desktop/scripts/sign-mac.sh` — wraps `codesign`, `xcrun notarytool`
- `apps/desktop/scripts/build-and-sign-mac.sh` — full pipeline
- `apps/desktop/scripts/publish-update-manifest.ts` — uploads bundle + manifest to Supabase Storage
- `apps/desktop/electrobun.config.ts` — add updater config block
- `.github/workflows/desktop-release-mac.yml` — CI workflow

**Modified:**
- `apps/desktop/main/index.ts` — wire the desktop log sink
- `apps/desktop/main/ipc/bug-report.ts` — IPC handler registration

---

## Task 1: Platform-aware logger sinks

**Test groupings:** G4.1 (Logger rotation math — size boundary at MAX_BYTES; date boundary; collision append; injected clock + fs adapter); G4.2 (Logger redaction unit — emails, URLs, base64 blobs, nested arrays, mixed-content strings, null/undefined short-circuits); G4.3 (Logger redaction property test via fast-check — random row-like objects with sensitive leaves at depth ≤5; assert no email/JWT/blob pattern appears in serialized output; belt-and-suspenders for ESLint rule blind spots); G4.4 (Logger FileSink integration — real tmp dir, faked clock; daily rotation; 14-day cleanup; 100MB total cap eviction).

**PR boundaries:** 3 PRs.
- PR 1: Sink interface + console sink — web behavior unchanged because console sink preserves the existing `console.error` default in `packages/shared/logger/`.
- PR 2: FileSink module + redaction wrapper + unit/integration tests (G4.1–G4.4) — module exists but nothing instantiates it, so neither web nor desktop runtime behavior changes.
- PR 3: Wire FileSink as the desktop sink in the bootstrap behind an `isDesktop` check — web continues using console sink, desktop opts in.

**Files:**
- Inspect current logger surface first: `packages/shared/logger/src/index.ts`
- Modify the logger to accept a pluggable sink. Tests-first.

- [ ] **Step 1: Read the existing logger**

```bash
cat packages/shared/logger/src/index.ts
ls packages/shared/logger/src/
```

Document the current API surface (likely something like `log.info / log.warn / log.error`). The goal is to preserve the surface and only swap the *sink*.

- [ ] **Step 2: Write the failing test for the sink interface**

Create `packages/shared/logger/src/types.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createLogger, type LogEvent } from "./createLogger.ts";

describe("createLogger sinks", () => {
  it("emits events to the configured sink with the structured payload", () => {
    const sink = { write: vi.fn() };
    const log = createLogger({ sink, level: "info" });

    log.info("dataset.import.completed", { datasetId: "d1", rowCount: 42 });

    expect(sink.write).toHaveBeenCalledOnce();
    const event = sink.write.mock.calls[0]![0] as LogEvent;
    expect(event.level).toBe("info");
    expect(event.eventName).toBe("dataset.import.completed");
    expect(event.fields).toEqual({ datasetId: "d1", rowCount: 42 });
    expect(typeof event.timestamp).toBe("number");
  });

  it("filters events below the configured level", () => {
    const sink = { write: vi.fn() };
    const log = createLogger({ sink, level: "warn" });

    log.info("filtered", {});
    log.warn("kept", {});

    expect(sink.write).toHaveBeenCalledOnce();
    expect((sink.write.mock.calls[0]![0] as LogEvent).eventName).toBe("kept");
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/logger test
```

- [ ] **Step 4: Implement the new logger**

Create `packages/shared/logger/src/createLogger.ts`:

```ts
export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEvent = {
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly eventName: string;
  readonly fields: Readonly<Record<string, unknown>>;
};

export interface LogSink {
  write(event: LogEvent): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type CreateLoggerArgs = {
  readonly sink: LogSink;
  readonly level: LogLevel;
};

export type Logger = {
  debug(eventName: string, fields?: Record<string, unknown>): void;
  info(eventName: string, fields?: Record<string, unknown>): void;
  warn(eventName: string, fields?: Record<string, unknown>): void;
  error(eventName: string, fields?: Record<string, unknown>): void;
};

export function createLogger(args: CreateLoggerArgs): Logger {
  const minLevel = LEVEL_ORDER[args.level];
  function emit(level: LogLevel, eventName: string, fields: Record<string, unknown> = {}) {
    if (LEVEL_ORDER[level] < minLevel) return;
    args.sink.write({ timestamp: Date.now(), level, eventName, fields });
  }
  return {
    debug: (n, f) => emit("debug", n, f),
    info: (n, f) => emit("info", n, f),
    warn: (n, f) => emit("warn", n, f),
    error: (n, f) => emit("error", n, f),
  };
}
```

- [ ] **Step 5: Run tests and confirm pass**

```bash
pnpm --filter @avandar/logger test
```

- [ ] **Step 6: Implement `ConsoleSink`**

Create `packages/shared/logger/src/sinks/ConsoleSink.ts`:

```ts
import type { LogEvent, LogSink } from "../createLogger.ts";

export class ConsoleSink implements LogSink {
  write(event: LogEvent): void {
    const line = JSON.stringify(event);
    if (event.level === "error" || event.level === "warn") {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}
```

- [ ] **Step 7: Implement `FileSink` with rotation (desktop)**

Create `packages/shared/logger/src/sinks/FileSink.ts`:

```ts
import { appendFileSync, statSync, renameSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { LogEvent, LogSink } from "../createLogger.ts";

const MAX_BYTES_BEFORE_ROTATE = 10 * 1024 * 1024; // 10 MiB
const MAX_AGE_MS = 14 * 24 * 3600 * 1000; // 14 days
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MiB

export class FileSink implements LogSink {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
    this.cleanup();
  }

  write(event: LogEvent): void {
    const path = this.currentPath();
    this.rotateIfNeeded(path);
    appendFileSync(this.currentPath(), JSON.stringify(event) + "\n", "utf8");
  }

  private currentPath(): string {
    return join(this.dir, "current.log");
  }

  private rotateIfNeeded(path: string): void {
    if (!existsSync(path)) return;
    const size = statSync(path).size;
    const today = new Date().toISOString().slice(0, 10);
    const expected = join(this.dir, `${today}.log`);
    const shouldRotateByDate =
      this.lastRotateDay !== today && this.lastRotateDay !== null;
    const shouldRotateBySize = size > MAX_BYTES_BEFORE_ROTATE;
    if (shouldRotateByDate || shouldRotateBySize) {
      const target = existsSync(expected)
        ? join(this.dir, `${today}-${Date.now()}.log`)
        : expected;
      renameSync(path, target);
      this.lastRotateDay = today;
      this.cleanup();
    } else if (this.lastRotateDay === null) {
      this.lastRotateDay = today;
    }
  }

  private lastRotateDay: string | null = null;

  private cleanup(): void {
    const files = readdirSync(this.dir)
      .filter((f) => f.endsWith(".log") && f !== "current.log")
      .map((f) => ({
        name: f,
        path: join(this.dir, f),
        stat: statSync(join(this.dir, f)),
      }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    const now = Date.now();
    // Age-based
    for (const f of files) {
      if (now - f.stat.mtimeMs > MAX_AGE_MS) unlinkSync(f.path);
    }

    // Size-based (cap total)
    let total = files.reduce((n, f) => n + f.stat.size, 0);
    while (total > MAX_TOTAL_BYTES && files.length > 0) {
      const oldest = files.pop()!;
      try {
        unlinkSync(oldest.path);
        total -= oldest.stat.size;
      } catch {
        break;
      }
    }
  }
}
```

Write tests for `FileSink` rotation + cleanup similarly to other tests in this plan; the patterns are well-established by now. Confirm rotation triggers correctly on size and cleanup honors the two caps.

- [ ] **Step 8: Implement `Redaction` defensive pass**

Create `packages/shared/logger/src/redaction.ts`:

```ts
const PATTERNS: ReadonlyArray<RegExp> = [
  // emails
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  // long base64 chunks (e.g. accidental payloads)
  /[A-Za-z0-9+/]{200,}={0,2}/g,
  // bearer tokens or JWTs
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
];

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    let v = value;
    for (const re of PATTERNS) v = v.replace(re, "[REDACTED]");
    return v;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redact(v);
    }
    return out;
  }
  return value;
}
```

Wire redaction into both sinks' `write` methods:

```ts
write(event: LogEvent): void {
  const redacted: LogEvent = { ...event, fields: redact(event.fields) as Record<string, unknown> };
  // ... use `redacted` for the actual write
}
```

Add a redaction test:

```ts
import { describe, expect, it } from "vitest";
import { redact } from "./redaction.ts";

describe("redact", () => {
  it("redacts emails inside strings", () => {
    expect(redact("hello user@example.com world")).toBe("hello [REDACTED] world");
  });
  it("redacts long base64 chunks", () => {
    const long = "x" + "A".repeat(250);
    expect(redact(long)).toContain("[REDACTED]");
  });
  it("recurses through objects", () => {
    expect(redact({ a: { b: "user@example.com" } })).toEqual({ a: { b: "[REDACTED]" } });
  });
  it("leaves non-sensitive strings alone", () => {
    expect(redact("just a normal string")).toBe("just a normal string");
  });
});
```

- [ ] **Step 9: Wire the desktop FileSink on startup**

Modify `apps/desktop/main/index.ts`:

```ts
import { createLogger } from "@avandar/logger";
import { FileSink } from "@avandar/logger/sinks/FileSink";
import { ConsoleSink } from "@avandar/logger/sinks/ConsoleSink";

const log = createLogger({
  sink: {
    write(event) {
      new ConsoleSink().write(event);
      new FileSink(join(dataDir, "logs")).write(event);
    },
  },
  level: "info",
});

log.info("desktop.startup", { dataDir, mode });
```

Replace any existing scattered `console.log` / `console.error` calls in `apps/desktop/main/**` with `log.*` calls. Audit:

```bash
git grep "console\." -- apps/desktop/main/
```

- [ ] **Step 10: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/logger test
  pnpm --filter @avandar/logger typecheck
  pnpm lint
  git grep "console\." -- apps/desktop/main/
  ```
  Expected: all logger unit tests pass (sink interface, level filtering, ConsoleSink, FileSink rotation/cleanup, redaction); typecheck clean; lint clean; `git grep` returns no residual `console.*` calls in `apps/desktop/main/`.

  **Verify:**
  - `packages/shared/logger/src/{types.ts,createLogger.ts,redaction.ts}` exist and match the planned API surface (`LogEvent`, `LogSink`, `Logger`, `createLogger`, `redact`).
  - `packages/shared/logger/src/sinks/ConsoleSink.ts` routes `warn`/`error` to `console.error` and others to `console.log`, emitting one JSON line per event.
  - `packages/shared/logger/src/sinks/FileSink.ts` honors the documented thresholds: `MAX_BYTES_BEFORE_ROTATE = 10 MiB`, `MAX_AGE_MS = 14 days`, `MAX_TOTAL_BYTES = 100 MiB`.
  - Redaction is wired into both sinks' `write` methods (not just exported) so the event written to disk/console has already passed through `redact`.
  - `apps/desktop/main/index.ts` constructs the composite sink (Console + File) with `level: "info"` and emits `desktop.startup` with `{ dataDir, mode }`.
  - Test groupings G4.1, G4.2, G4.3, G4.4 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy. For property-based groupings, also record the seed printed on failure during local runs so failures are reproducible.

  **Manual smoke test:**
  1. Run `pnpm dev:desktop` and let the app reach a logged-in state; perform a few actions that produce log events (open a dataset, trigger a sync, hit an error path).
  2. Open `<userDataDir>/logs/current.log` and confirm each line is valid JSON with `timestamp`, `level`, `eventName`, `fields`; verify no email addresses, JWTs, or long base64 blobs appear in clear text (redaction working).
  3. Force a size rotation by appending >10 MiB of synthetic events (or temporarily lower `MAX_BYTES_BEFORE_ROTATE` in a scratch branch) and confirm `current.log` is renamed to `<YYYY-MM-DD>.log` and a fresh `current.log` is started.
  4. Simulate the 14-day age cap and 100 MiB total cap by `touch -t` backdating fixtures or seeding oversize fixtures into `<userDataDir>/logs/`; relaunch the app and confirm the oldest files are deleted on `cleanup()`.

  Expected: log files written as JSONL with redaction applied; rotation triggers on date change and size threshold; cleanup honors both the 14-day and 100 MiB caps.

  **Greenlight criteria:** all checks above pass before moving to Task 2.

---

## Task 2: ESLint rule — no raw data identifiers in logger calls

**Test groupings:** G4.5 (ESLint rule cases via RuleTester — positive: { row }, { payload }, { data }, nested; negative: structured fields, non-logger objects; documented limitations: aliased imports, destructured methods).

**PR boundaries:** 2 PRs.
- PR 1: Add the rule with `severity: 'off'` (or behind an opt-in config) + RuleTester suite (G4.5) + audit and fix all existing repo violations — CI stays green because the rule does not flag anything yet, and pre-existing violations are repaired in the same PR.
- PR 2: Flip the rule from `off` to `error` in the ESLint config — safe to merge only after PR 1 has eliminated violations, otherwise CI would red the whole repo.

**Files:**
- Create: `eslint-rules/no-raw-data-in-logger.js`
- Create: `eslint-rules/no-raw-data-in-logger.test.js`
- Modify: `eslint.config.js`

- [ ] **Step 1: Write the rule test**

ESLint custom rules use a different testing harness (`RuleTester`). Create `eslint-rules/no-raw-data-in-logger.test.js`:

```js
import { RuleTester } from "eslint";
import rule from "./no-raw-data-in-logger.js";

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

tester.run("no-raw-data-in-logger", rule, {
  valid: [
    { code: "log.info('event', { datasetId: id, rowCount: n })" },
    { code: "log.error('event', { errorCode: 'x' })" },
    // method names other than log are fine
    { code: "someFn({ row: x })" },
  ],
  invalid: [
    {
      code: "log.info('event', { row: x })",
      errors: [{ messageId: "rawDataField" }],
    },
    {
      code: "log.warn('event', { payload: data })",
      errors: [{ messageId: "rawDataField" }],
    },
    {
      code: "logger.error('event', { records: rs })",
      errors: [{ messageId: "rawDataField" }],
    },
  ],
});

console.log("ok");
```

Run with `node eslint-rules/no-raw-data-in-logger.test.js` (RuleTester throws on first failure).

- [ ] **Step 2: Implement the rule**

Create `eslint-rules/no-raw-data-in-logger.js`:

```js
const FORBIDDEN_KEYS = new Set([
  "row",
  "rows",
  "payload",
  "data",
  "body",
  "content",
  "value",
  "record",
  "records",
]);

const LOGGER_CALLEES = new Set(["log", "logger"]);
const LOGGER_METHODS = new Set(["debug", "info", "warn", "error"]);

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw-data field names in logger calls — log structured fields only",
    },
    messages: {
      rawDataField:
        "Do not log raw user data. The field name '{{name}}' suggests this. Log a typed structure (e.g. { datasetId, rowCount }) instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        const obj = node.callee.object;
        const method = node.callee.property;
        if (obj.type !== "Identifier" || method.type !== "Identifier") return;
        if (!LOGGER_CALLEES.has(obj.name)) return;
        if (!LOGGER_METHODS.has(method.name)) return;

        // Inspect 2nd argument
        const arg = node.arguments[1];
        if (!arg || arg.type !== "ObjectExpression") return;
        for (const prop of arg.properties) {
          if (
            prop.type === "Property" &&
            prop.key.type === "Identifier" &&
            FORBIDDEN_KEYS.has(prop.key.name)
          ) {
            context.report({
              node: prop,
              messageId: "rawDataField",
              data: { name: prop.key.name },
            });
          }
        }
      },
    };
  },
};
```

- [ ] **Step 3: Register the rule in ESLint config**

Edit root `eslint.config.js` — append:

```js
import noRawDataInLogger from "./eslint-rules/no-raw-data-in-logger.js";

export default [
  // ... existing config blocks
  {
    plugins: {
      "avandar-internal": {
        rules: {
          "no-raw-data-in-logger": noRawDataInLogger,
        },
      },
    },
    rules: {
      "avandar-internal/no-raw-data-in-logger": "error",
    },
  },
];
```

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```

Expected: lint passes (no existing logger call sites should violate, since the new logger doesn't exist yet at most call sites; if any do, those are tech debt to fix in this task).

- [ ] **Step 5: Run the rule's own test**

```bash
node eslint-rules/no-raw-data-in-logger.test.js
```

Expected: no errors.

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  node eslint-rules/no-raw-data-in-logger.test.js
  pnpm lint
  ```
  Expected: the RuleTester script exits cleanly (it throws on the first valid/invalid mismatch, so no thrown error means all cases passed); `pnpm lint` is clean against the real codebase.

  **Verify:**
  - `eslint-rules/no-raw-data-in-logger.js` defines `FORBIDDEN_KEYS` as exactly `{row, rows, payload, data, body, content, value, record, records}` and `LOGGER_CALLEES` as `{log, logger}` with methods `{debug, info, warn, error}`.
  - The rule only flags property keys in the second argument's `ObjectExpression`; literal string args and unrelated identifiers (e.g. `someFn({ row: x })`) are not flagged.
  - `eslint.config.js` registers the rule under `avandar-internal/no-raw-data-in-logger` at severity `error`.
  - Test groupings G4.5 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy. For property-based groupings, also record the seed printed on failure during local runs so failures are reproducible.

  **Manual smoke test:**
  1. Create a scratch file `/tmp/lint-probe.ts` containing `log.info('event', { row: x })` and `log.warn('event', { payload: data })`; run `pnpm exec eslint /tmp/lint-probe.ts` and confirm both lines error with the `rawDataField` message.
  2. Edit the scratch file to use safe structured fields (`{ datasetId, rowCount }`) and confirm lint now passes on that file.
  3. Confirm `pnpm lint` across the repo still passes — if any existing call site trips the rule, it must be fixed (not suppressed) before this checkpoint clears.

  Expected: the rule catches each forbidden identifier with a precise message and does not produce false positives on non-logger call sites or on the safe structured-field form.

  **Greenlight criteria:** all checks above pass before moving to Task 3.

---

## Task 3: In-app bug report flow

**Test groupings:** G4.6 (BugReportBundle selection — 7 most-recent files; oversize file truncated; redacted content passes through); G4.7 (Edge Function schema validation + auth — 401 without header; 405 on GET; 400 on malformed body via Zod; 200 writes correct object path); G4.8 (Bug report dialog flow via fake-IPC e2e — open Settings → preview → submit; mock Edge Function fetch; assert payload schema).

**PR boundaries:** 3 PRs.
- PR 1: Edge Function + Zod validator + tests (G4.7), deployed but with no client callers yet — server-side only, no web or desktop code change, so user-facing behavior is unchanged.
- PR 2: BugReportBundle helper module + tests (G4.6), not wired into any UI — pure module addition, nothing imports it at runtime.
- PR 3: Settings dialog UI + Submit button wiring (G4.8) — goes live only after PRs 1 and 2 have shipped, so the wired button has a working server and bundler to talk to.

**Files:**
- Create: `apps/desktop/main/services/BugReportBundle.ts`
- Create: `apps/desktop/main/ipc/bug-report.ts`
- Create: `packages/shared/platform/src/ipc/contracts.ts` — add `BugReportContracts`
- Create: `packages/web/components/src/BugReportDialog/BugReportDialog.tsx`
- Test: each above
- Create: `supabase/functions/bug-reports/index.ts`

- [ ] **Step 1: Add the IPC contract**

In `packages/shared/platform/src/ipc/contracts.ts`:

```ts
export const BugReportContracts = {
  bundle: defineIpcContract<
    Record<string, never>,
    {
      readonly appVersion: string;
      readonly osVersion: string;
      readonly logFiles: ReadonlyArray<{ readonly name: string; readonly content: string }>;
    }
  >("bugReport.bundle"),
};
```

Export from the platform index.

- [ ] **Step 2: Implement `BugReportBundle`**

Create `apps/desktop/main/services/BugReportBundle.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_LOG_FILES = 7; // last week
const MAX_LOG_FILE_BYTES = 5 * 1024 * 1024; // 5 MiB

export type BugReportBundle = {
  readonly appVersion: string;
  readonly osVersion: string;
  readonly logFiles: ReadonlyArray<{ name: string; content: string }>;
};

export function buildBugReportBundle(args: {
  logsDir: string;
  appVersion: string;
}): BugReportBundle {
  const files = readdirSync(args.logsDir)
    .filter((f) => f.endsWith(".log"))
    .map((f) => ({ name: f, path: join(args.logsDir, f), stat: statSync(join(args.logsDir, f)) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    .slice(0, MAX_LOG_FILES);

  const logFiles = files.map((f) => {
    const size = f.stat.size;
    const content =
      size <= MAX_LOG_FILE_BYTES
        ? readFileSync(f.path, "utf8")
        : `[truncated — file was ${size} bytes, max ${MAX_LOG_FILE_BYTES}]`;
    return { name: f.name, content };
  });

  return {
    appVersion: args.appVersion,
    osVersion: `${process.platform} ${process.arch} ${process.version}`,
    logFiles,
  };
}
```

Write a unit test mirroring earlier patterns; verify file selection limit, truncation, and that already-redacted content is preserved unchanged (the file sink already redacts at write time).

- [ ] **Step 3: IPC handler**

Create `apps/desktop/main/ipc/bug-report.ts`:

```ts
import { BugReportContracts } from "@avandar/platform";
import type { IpcServer } from "@avandar/platform";
import { buildBugReportBundle } from "../services/BugReportBundle.ts";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const PACKAGE_JSON_PATH = join(import.meta.dir, "..", "..", "package.json");

export function registerBugReportHandlers(server: IpcServer, logsDir: string): void {
  server.handle(BugReportContracts.bundle, async () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
      version: string;
    };
    return buildBugReportBundle({ logsDir, appVersion: pkg.version });
  });
}
```

Register in `apps/desktop/main/index.ts` after other registrations:

```ts
import { registerBugReportHandlers } from "./ipc/bug-report.ts";
registerBugReportHandlers(ipcServer, join(dataDir, "logs"));
```

- [ ] **Step 4: Implement the UI dialog**

Create `packages/web/components/src/BugReportDialog/BugReportDialog.tsx`:

```tsx
import { useState } from "react";
import { Button, Group, Modal, Stack, Switch, Text, Textarea } from "@mantine/core";
import { callIpc, BugReportContracts, isDesktop } from "@avandar/platform";

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly submit: (payload: BugReportPayload) => Promise<void>;
};

export type BugReportPayload = {
  readonly description: string;
  readonly appVersion: string;
  readonly osVersion: string;
  readonly logFiles: ReadonlyArray<{ name: string; content: string }>;
};

export function BugReportDialog({ opened, onClose, submit }: Props) {
  const [description, setDescription] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [bundle, setBundle] = useState<{
    appVersion: string;
    osVersion: string;
    logFiles: ReadonlyArray<{ name: string; content: string }>;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadBundle() {
    if (!isDesktop()) {
      setBundle({
        appVersion: "web",
        osVersion: navigator.userAgent,
        logFiles: [],
      });
      return;
    }
    const r = await callIpc(BugReportContracts.bundle, {});
    setBundle(r);
  }

  async function onSubmit() {
    if (!bundle) await loadBundle();
    const b = bundle!;
    setSubmitting(true);
    try {
      await submit({ description, ...b });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Report a problem" size="lg">
      <Stack>
        <Textarea
          label="What happened?"
          minRows={4}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
        <Group>
          <Switch
            label="Preview what gets sent"
            checked={previewing}
            onChange={async (e) => {
              setPreviewing(e.currentTarget.checked);
              if (e.currentTarget.checked && !bundle) await loadBundle();
            }}
          />
        </Group>
        {previewing && bundle && (
          <Stack>
            <Text size="sm">App version: {bundle.appVersion}</Text>
            <Text size="sm">OS: {bundle.osVersion}</Text>
            <Text size="sm">Log files: {bundle.logFiles.length}</Text>
            {bundle.logFiles.slice(0, 1).map((f) => (
              <Textarea
                key={f.name}
                label={f.name}
                value={f.content.slice(0, 2000)}
                readOnly
                minRows={6}
              />
            ))}
          </Stack>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} loading={submitting} disabled={!description.trim()}>
            Submit
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

Add tests for: required description, preview toggle, submit calls submit handler.

- [ ] **Step 5: Wire up submission**

The `submit` prop POSTs to a Supabase Edge Function. Create `supabase/functions/bug-reports/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response("Unauthorized", { status: 401 });

  const payload = await req.json() as {
    description: string;
    appVersion: string;
    osVersion: string;
    logFiles: { name: string; content: string }[];
  };

  // Upload to a private storage bucket
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const bugId = crypto.randomUUID();
  const objectPath = `bug-reports/${userData.user.id}/${bugId}.json`;
  const { error } = await admin.storage.from("internal").upload(
    objectPath,
    new Blob([JSON.stringify({
      userId: userData.user.id,
      submittedAt: Date.now(),
      ...payload,
    })], { type: "application/json" }),
    { upsert: false },
  );
  if (error) return new Response(`Storage error: ${error.message}`, { status: 500 });

  return new Response(JSON.stringify({ ok: true, bugId }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Deploy:

```bash
supabase functions deploy bug-reports
```

Create the `internal` storage bucket via the Supabase dashboard or migration, with policies that only the service role can write/read.

- [ ] **Step 6: Add the dialog launcher to app chrome**

In the app's header / settings menu, add a "Report a problem" item that opens the dialog. The submit handler calls `fetch("/functions/v1/bug-reports", ...)` with the Supabase access token.

- [ ] **Step 7: Smoke test**

```bash
pnpm dev:desktop
```

Trigger an error (or just open the dialog), submit a report, verify it lands in the `internal` storage bucket under `bug-reports/<userId>/<bugId>.json`.

- [ ] **Step 8: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/platform test
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/components test
  pnpm lint
  pnpm typecheck
  supabase functions list
  ```
  Expected: unit tests pass for `BugReportBundle` (file selection limit, truncation behavior, preserved-redaction); `BugReportDialog` tests pass (description required, preview toggle, submit handler invoked); lint and typecheck clean; the `bug-reports` function appears in the deployed list.

  **Verify:**
  - `BugReportContracts.bundle` is exported from `@avandar/platform` and consumed in both the desktop main process and the web component.
  - `BugReportBundle.ts` honors `MAX_LOG_FILES = 7` (most-recent-first) and `MAX_LOG_FILE_BYTES = 5 MiB` truncation marker.
  - `apps/desktop/main/index.ts` calls `registerBugReportHandlers(ipcServer, join(dataDir, "logs"))` after other IPC registrations.
  - `supabase/functions/bug-reports/index.ts` validates the `Authorization` header against `getUser()`, writes to `internal/bug-reports/<userId>/<bugId>.json`, and returns `{ ok: true, bugId }`.
  - The `internal` Storage bucket exists with policies that restrict read/write to the service role (no public access). Do NOT print or echo `SUPABASE_SERVICE_ROLE_KEY`; confirm only that the env var names referenced in the function match the project's Supabase function secrets.
  - The app's header/settings menu exposes the "Report a problem" entry that opens `BugReportDialog`.
  - Test groupings G4.6, G4.7, G4.8 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy. For property-based groupings, also record the seed printed on failure during local runs so failures are reproducible.

  **Manual smoke test:**
  1. `pnpm dev:desktop`, sign in, then open Settings → Report a problem.
  2. Leave the textarea empty and confirm Submit is disabled; type a description and confirm Submit becomes enabled.
  3. Toggle "Preview what gets sent" and verify the preview shows: app version (matches `apps/desktop/package.json` `version`), OS string (`process.platform`/`arch`/`version`), log file count, and a redacted excerpt from the most recent log file — confirm no raw emails, JWTs, or long base64 strings appear.
  4. Submit. In the Supabase dashboard, open Storage → `internal` bucket → `bug-reports/<your userId>/` and confirm a `<bugId>.json` exists with `userId`, `submittedAt`, `description`, `appVersion`, `osVersion`, and `logFiles`.
  5. Check the Edge Function logs (Supabase dashboard → Functions → bug-reports → Logs) and confirm the request was authenticated and returned 200.

  Expected: a redacted bundle of the last 7 log files plus user-provided description lands in the private Storage bucket, scoped under the submitting user's id.

  **Greenlight criteria:** all checks above pass before moving to Task 4.

---

## Task 4: macOS code signing & notarization

**PR boundaries:** 1 PR. Adds shell scripts, an entitlements plist, and an `electrobun.config.ts` entitlements path — none of these are on the build hot path until the Task 6 CI workflow invokes them on tag pushes, so merging cannot regress web, the existing desktop dev build, or normal-PR CI.

**Files:**
- Create: `apps/desktop/scripts/sign-mac.sh`
- Create: `apps/desktop/scripts/notarize-mac.sh`
- Create: `apps/desktop/scripts/build-and-sign-mac.sh`
- Modify: `apps/desktop/electrobun.config.ts` — entitlements path
- Create: `apps/desktop/entitlements.mac.plist`

- [ ] **Step 1: Procure or confirm Apple Developer ID**

Verify the team has a paid Apple Developer account. Required:
- Developer ID Application certificate
- Apple Team ID
- An Apple ID with App Store Connect access for notarization
- App-specific password for notarization (`appleid.apple.com` → Sign-In and Security → App-Specific Passwords)

Store credentials as CI secrets:
- `APPLE_DEVELOPER_ID_NAME` (e.g. `Developer ID Application: Avandar Labs (TEAM12345)`)
- `APPLE_TEAM_ID`
- `APPLE_ID_EMAIL`
- `APPLE_APP_PASSWORD`

Locally: store the certificate in the macOS Keychain (default behavior of Apple's tooling).

- [ ] **Step 2: Create the entitlements file**

Create `apps/desktop/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key><true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
  <key>com.apple.security.network.client</key><true/>
  <key>com.apple.security.files.user-selected.read-write</key><true/>
</dict>
</plist>
```

These entitlements cover: JIT (Bun runtime needs it), network client (we make HTTPS calls), user-selected file access (drag-and-drop CSV uploads).

- [ ] **Step 3: Write the sign script**

Create `apps/desktop/scripts/sign-mac.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Expects: APPLE_DEVELOPER_ID_NAME env var
# Args:    $1 = path to .app bundle

APP_PATH="$1"
ENTITLEMENTS="$(dirname "$0")/../entitlements.mac.plist"

# Sign every framework, dylib, helper, and finally the main app.
# --options runtime enables the hardened runtime (required for notarization).
find "$APP_PATH/Contents" -type f \( -name "*.dylib" -o -name "*.so" \) | while read -r f; do
  codesign --sign "$APPLE_DEVELOPER_ID_NAME" --force --timestamp --options runtime "$f"
done

# Sign embedded executables / helpers
find "$APP_PATH/Contents/Frameworks" -type d -name "*.framework" 2>/dev/null | while read -r f; do
  codesign --sign "$APPLE_DEVELOPER_ID_NAME" --force --timestamp --options runtime "$f"
done

# Finally, the .app bundle itself with entitlements
codesign --sign "$APPLE_DEVELOPER_ID_NAME" --force --timestamp \
  --options runtime --entitlements "$ENTITLEMENTS" \
  "$APP_PATH"

# Verify
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
echo "Signed: $APP_PATH"
```

Make it executable: `chmod +x apps/desktop/scripts/sign-mac.sh`.

- [ ] **Step 4: Write the notarize script**

Create `apps/desktop/scripts/notarize-mac.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Expects: APPLE_ID_EMAIL, APPLE_APP_PASSWORD, APPLE_TEAM_ID env vars
# Args:    $1 = path to .app bundle

APP_PATH="$1"
ZIP_PATH="${APP_PATH%.app}-for-notarization.zip"

# Create a notarization zip
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

# Submit and wait
xcrun notarytool submit "$ZIP_PATH" \
  --apple-id "$APPLE_ID_EMAIL" \
  --password "$APPLE_APP_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait

# Staple the ticket onto the .app
xcrun stapler staple "$APP_PATH"
xcrun stapler validate "$APP_PATH"

# Clean up
rm "$ZIP_PATH"
echo "Notarized & stapled: $APP_PATH"
```

`chmod +x` it.

- [ ] **Step 5: Write the full build-sign-notarize pipeline**

Create `apps/desktop/scripts/build-and-sign-mac.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# 1. Build the web bundle and electrobun bundle
pnpm --filter @avandar/desktop build

# 2. Locate the .app — Electrobun output path may vary; adapt if needed
APP_PATH=$(find ./bundle -maxdepth 3 -name "*.app" -type d | head -n1)
if [[ -z "$APP_PATH" ]]; then
  echo "Could not find .app under ./bundle"
  exit 1
fi

# 3. Sign
./scripts/sign-mac.sh "$APP_PATH"

# 4. Notarize
./scripts/notarize-mac.sh "$APP_PATH"

# 5. Package into .dmg (using create-dmg or `hdiutil`)
DMG_PATH="./bundle/Avandar.dmg"
hdiutil create -volname Avandar -srcfolder "$APP_PATH" -ov -format UDZO "$DMG_PATH"

# 6. Sign the DMG too (optional but recommended)
codesign --sign "$APPLE_DEVELOPER_ID_NAME" --force --timestamp "$DMG_PATH"

echo "Build complete: $DMG_PATH"
```

- [ ] **Step 6: Smoke test the pipeline locally**

```bash
APPLE_DEVELOPER_ID_NAME="Developer ID Application: <Your Team>" \
APPLE_ID_EMAIL="..." APPLE_APP_PASSWORD="..." APPLE_TEAM_ID="..." \
bash apps/desktop/scripts/build-and-sign-mac.sh
```

Expected: a signed `.app` and `.dmg` under `apps/desktop/bundle/`.

Test the bundle on a *different* Mac that's never opened the app:

```bash
open apps/desktop/bundle/Avandar.dmg
# drag to Applications
open /Applications/Avandar.app
```

Expected: opens without Gatekeeper warnings.

- [ ] **Step 7: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  codesign --verify --deep --strict --verbose=2 apps/desktop/bundle/**/*.app
  codesign --display --entitlements :- apps/desktop/bundle/**/*.app
  spctl --assess --type execute --verbose=4 apps/desktop/bundle/**/*.app
  xcrun stapler validate apps/desktop/bundle/**/*.app
  hdiutil verify apps/desktop/bundle/Avandar.dmg
  ```
  Expected: `codesign --verify` exits 0; entitlements output shows the five keys from `entitlements.mac.plist`; `spctl --assess` reports `accepted` with source `Notarized Developer ID`; `stapler validate` reports `The validate action worked!`; DMG verification passes.

  **Verify:**
  - `apps/desktop/entitlements.mac.plist` enables JIT, unsigned-executable-memory, library-validation-disable, network client, and user-selected file read-write — and nothing broader.
  - `sign-mac.sh`, `notarize-mac.sh`, and `build-and-sign-mac.sh` are all `chmod +x`.
  - `sign-mac.sh` signs frameworks/dylibs first and the `.app` last with `--options runtime` (hardened runtime) and the entitlements file.
  - `notarize-mac.sh` references env vars only — no Apple ID, app-specific password, or team id is hard-coded; secrets come from `APPLE_ID_EMAIL`, `APPLE_APP_PASSWORD`, `APPLE_TEAM_ID`.
  - `build-and-sign-mac.sh` locates the `.app` under `./bundle`, runs sign → notarize → `hdiutil create` → DMG signing, and exits non-zero if any step fails (`set -euo pipefail`).
  - `apps/desktop/electrobun.config.ts` references the entitlements file path.

  **Manual smoke test:**
  1. With secrets exported from 1Password (do NOT echo them; reference items by 1Password URI), run `bash apps/desktop/scripts/build-and-sign-mac.sh`.
  2. On the build host, open `apps/desktop/bundle/Avandar.dmg`, drag the app to `/Applications`, double-click, confirm it launches with no Gatekeeper dialog.
  3. Transfer the DMG to a second Mac that has never opened this app (or simulate quarantine: `xattr -w com.apple.quarantine "0081;$(printf '%x' $(date +%s));Safari;" /Applications/Avandar.app`). Open the app and confirm Gatekeeper accepts it (no "unidentified developer" warning, no right-click bypass needed).
  4. Run `codesign --verify --deep --strict --verbose=2 /Applications/Avandar.app` on the second machine and confirm it passes.

  Expected: a freshly downloaded copy of the signed/notarized `.app` launches on a clean Mac with zero Gatekeeper friction, and `codesign --verify --deep --strict` returns success on both build and target machines.

  **Greenlight criteria:** all checks above pass before moving to Task 5.

---

## Task 5: Auto-update

**Test groupings:** G4.9 (Auto-updater version comparison + manifest parsing — semver edges; 1.0.0-beta; missing fields; malformed JSON).

**PR boundaries:** 2 PRs.
- PR 1: Updater module + manifest parser + version-compare unit tests (G4.9), not wired into the Bun-main bootstrap — pure module + publish script, no runtime path executes the updater, so neither web nor desktop behavior changes.
- PR 2: Wire updater into Bun-main startup + Settings "Check for updates" UI — desktop-only entry point, web is untouched.

Use Electrobun's built-in updater. The app polls a manifest URL on launch; if a newer version is listed, download and self-update.

**Files:**
- Modify: `apps/desktop/electrobun.config.ts` — add updater block
- Create: `apps/desktop/scripts/publish-update-manifest.ts`

- [ ] **Step 1: Configure the updater**

Edit `apps/desktop/electrobun.config.ts`:

```ts
const config: ElectrobunConfig = {
  // ... existing fields
  updater: {
    channel: "stable",
    feedUrl: process.env.AVA_UPDATE_FEED_URL ?? "https://<your-supabase-storage-domain>/updates/mac/stable/manifest.json",
  },
};
```

Adjust the field names to match Electrobun's actual updater schema. The intent: point at a JSON manifest. If Electrobun's updater isn't ready/usable, fall back to **manual update checks** in V1 — the app fetches the manifest on launch, compares versions, and shows a "Download new version" link. Not ideal UX, but ships.

- [ ] **Step 2: Write the publish script**

Create `apps/desktop/scripts/publish-update-manifest.ts`:

```ts
#!/usr/bin/env bun

import { readFileSync, statSync, createReadStream } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "updates";
const CHANNEL = "stable";
const PLATFORM = "mac";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const PKG = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
  version: string;
};

const DMG_PATH = join(REPO_ROOT, "apps/desktop/bundle/Avandar.dmg");
const DMG_BYTES = statSync(DMG_PATH).size;

// Upload the DMG
const dmgKey = `${PLATFORM}/${CHANNEL}/Avandar-${PKG.version}.dmg`;
await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${dmgKey}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/octet-stream",
    "x-upsert": "true",
  },
  body: readFileSync(DMG_PATH),
});

// Write the manifest
const manifest = {
  version: PKG.version,
  releasedAt: Date.now(),
  url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${dmgKey}`,
  sizeBytes: DMG_BYTES,
};
await fetch(
  `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PLATFORM}/${CHANNEL}/manifest.json`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      "x-upsert": "true",
    },
    body: JSON.stringify(manifest, null, 2),
  },
);

console.log(`Published ${PKG.version} to ${PLATFORM}/${CHANNEL}`);
```

Configure the `updates` bucket as public-read in Supabase.

- [ ] **Step 3: Wire into the release pipeline**

Append to `apps/desktop/scripts/build-and-sign-mac.sh`:

```bash
# 7. Publish manifest (only when AVA_PUBLISH_UPDATE=1)
if [[ "${AVA_PUBLISH_UPDATE:-}" == "1" ]]; then
  bun run apps/desktop/scripts/publish-update-manifest.ts
fi
```

- [ ] **Step 4: Smoke test the update path**

1. Build version `0.9.3` of the app. Install it.
2. Bump root `package.json` version to `0.9.4`.
3. Run `AVA_PUBLISH_UPDATE=1 bash apps/desktop/scripts/build-and-sign-mac.sh`.
4. Open the installed `0.9.3` app.
5. Expected: the updater detects `0.9.4`, downloads, and either prompts the user or applies on next launch (Electrobun's specific UX).

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  curl -sSf "$AVA_UPDATE_FEED_URL" | jq .
  pnpm --filter @avandar/desktop typecheck
  pnpm lint
  ```
  Expected: the manifest URL responds 200 with a JSON body containing `version`, `releasedAt`, `url`, `sizeBytes`; typecheck and lint clean.

  **Verify:**
  - `apps/desktop/electrobun.config.ts` `updater` block sets `channel: "stable"` and reads `feedUrl` from `AVA_UPDATE_FEED_URL` with a sensible default pointing at the Supabase Storage manifest.
  - `apps/desktop/scripts/publish-update-manifest.ts` reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env vars only (never hard-coded). Do NOT print the service role key during verification; confirm only that the env var names line up with the project's 1Password entries.
  - The `updates` Supabase Storage bucket exists, is configured public-read, and the manifest path `mac/stable/manifest.json` is reachable without auth.
  - `build-and-sign-mac.sh` invokes the publish script only when `AVA_PUBLISH_UPDATE=1`, so local signing runs do not accidentally publish.
  - Test groupings G4.9 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy. For property-based groupings, also record the seed printed on failure during local runs so failures are reproducible.

  **Manual smoke test:**
  1. With root `package.json` at `0.9.3`, run the build/sign pipeline and install the resulting DMG to `/Applications`. Launch and confirm `Avandar > About` (or equivalent) shows `0.9.3`.
  2. Bump root `package.json` version to `0.9.4`, rebuild, then `AVA_PUBLISH_UPDATE=1 bash apps/desktop/scripts/build-and-sign-mac.sh`.
  3. `curl -sSf "$AVA_UPDATE_FEED_URL" | jq .version` and confirm it reports `0.9.4`; download the `url` field and confirm it returns a DMG of `sizeBytes` bytes.
  4. Quit the installed `0.9.3` and relaunch. Confirm the updater detects `0.9.4` and either prompts to install or applies on next restart (whichever UX Electrobun delivers).
  5. After restart, confirm the About panel reports `0.9.4` and that `<userDataDir>/logs/current.log` contains an update-related event.

  Expected: an installed older version transitions to the published newer version through the updater, with the manifest being the single source of truth.

  **Greenlight criteria:** all checks above pass before moving to Task 6.

---

## Task 6: CI release workflow

**Test groupings:** G4.10 (Codesign/notarize CI smoke job — on release tag: codesign --verify --deep --strict, spctl --assess, stapler validate; fail build on non-zero).

**PR boundaries:** 1 PR. Adds a new workflow file that triggers only on tag pushes (`v*`) — it does not run on regular pull-request CI, so existing PR check status is unchanged. Web is untouched; desktop runtime is untouched until a release tag is cut.

**Files:**
- Create: `.github/workflows/desktop-release-mac.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/desktop-release-mac.yml`:

```yaml
name: Desktop Release (macOS)

on:
  workflow_dispatch:
    inputs:
      publish-update:
        description: "Publish update manifest after build"
        required: true
        default: "false"

jobs:
  build:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 10.30.3
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: pnpm
      - uses: oven-sh/setup-bun@v2
      - run: pnpm install --frozen-lockfile

      - name: Import code signing certificate
        env:
          MACOS_CERT_P12_BASE64: ${{ secrets.MACOS_CERT_P12_BASE64 }}
          MACOS_CERT_PASSWORD: ${{ secrets.MACOS_CERT_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          echo "$MACOS_CERT_P12_BASE64" | base64 --decode > cert.p12
          security import cert.p12 -k build.keychain -P "$MACOS_CERT_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" build.keychain
          rm cert.p12

      - name: Build, sign, notarize
        env:
          APPLE_DEVELOPER_ID_NAME: ${{ secrets.APPLE_DEVELOPER_ID_NAME }}
          APPLE_ID_EMAIL: ${{ secrets.APPLE_ID_EMAIL }}
          APPLE_APP_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: bash apps/desktop/scripts/build-and-sign-mac.sh

      - name: Publish update manifest
        if: ${{ inputs.publish-update == 'true' }}
        env:
          AVA_PUBLISH_UPDATE: "1"
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: bun run apps/desktop/scripts/publish-update-manifest.ts

      - uses: actions/upload-artifact@v4
        with:
          name: avandar-desktop-mac
          path: apps/desktop/bundle/Avandar.dmg
```

- [ ] **Step 2: Add the CI secrets**

Via GitHub UI (repo Settings → Secrets and variables → Actions):
- `MACOS_CERT_P12_BASE64` — base64 of your exported `.p12` Developer ID cert
- `MACOS_CERT_PASSWORD` — password for the .p12
- `KEYCHAIN_PASSWORD` — random password for the ephemeral CI keychain
- `APPLE_DEVELOPER_ID_NAME`, `APPLE_ID_EMAIL`, `APPLE_APP_PASSWORD`, `APPLE_TEAM_ID`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Trigger the workflow manually**

Use GitHub UI: Actions → Desktop Release (macOS) → Run workflow → leave `publish-update` as `false` for the first run.

Expected: green run, artifact uploaded.

Re-run with `publish-update: true` to verify the manifest path.

- [ ] **Step 4: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  gh workflow list
  gh workflow run desktop-release-mac.yml --ref <your-branch> -f publish-update=false
  gh run watch
  gh run download <run-id> --name avandar-desktop-mac --dir /tmp/ava-ci-artifact
  codesign --verify --deep --strict --verbose=2 /tmp/ava-ci-artifact/Avandar.dmg
  spctl --assess --type open --context context:primary-signature /tmp/ava-ci-artifact/Avandar.dmg
  ```
  Expected: workflow appears in `gh workflow list`; the dispatched run finishes green; the artifact downloads; `codesign --verify` passes on the CI-produced DMG; `spctl --assess` reports it as accepted.

  **Verify:**
  - `.github/workflows/desktop-release-mac.yml` runs on `macos-14`, pins pnpm to `10.30.3`, Node `22`, and uses `oven-sh/setup-bun@v2`.
  - The "Import code signing certificate" step creates an ephemeral keychain, decodes the cert from base64, imports it, and deletes `cert.p12` at the end. It never echoes any secret value.
  - All required secrets are configured in repo Settings → Secrets and variables → Actions (verify by *name only* in the GitHub UI — do NOT view or echo values): `MACOS_CERT_P12_BASE64`, `MACOS_CERT_PASSWORD`, `KEYCHAIN_PASSWORD`, `APPLE_DEVELOPER_ID_NAME`, `APPLE_ID_EMAIL`, `APPLE_APP_PASSWORD`, `APPLE_TEAM_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
  - The "Publish update manifest" step is gated on `inputs.publish-update == 'true'` so the default dispatch path does not publish.
  - The artifact upload step names the artifact `avandar-desktop-mac` and uploads `apps/desktop/bundle/Avandar.dmg`.
  - Test groupings G4.10 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy. For property-based groupings, also record the seed printed on failure during local runs so failures are reproducible.

  **Manual smoke test:**
  1. Dispatch the workflow with `publish-update=false` from a feature branch; confirm green run and downloadable artifact.
  2. Install the downloaded DMG on a clean Mac (or quarantine-tagged copy) and confirm Gatekeeper accepts and the app launches.
  3. Bump version, re-dispatch with `publish-update=true`, watch the run, then `curl -sSf "$AVA_UPDATE_FEED_URL" | jq .version` and confirm it now reports the new version.
  4. Inspect the run logs and confirm no secret value (cert password, app-specific password, service role key) is printed — only env var *names* should be visible.

  Expected: the CI workflow produces a signed, notarized, Gatekeeper-accepted DMG identical in shape to local builds, optionally updating the manifest when explicitly requested, with zero secret leakage in logs.

  **Greenlight criteria:** all checks above pass before moving to Task 7.

---

## Task 7: Internal dogfood + Phase 4 acceptance

**PR boundaries:** No code-change boundaries — this Task is verification + spec annotation only. Dogfood observation, acceptance sign-off, and Phase 4 retro produce no merges to `main`; any incidental fixes discovered during dogfood ship as their own PRs scoped under the relevant earlier Task.

- [ ] **Step 1: Ship to an internal group**

Build, sign, and distribute the signed `.dmg` to a small internal user group (5-10 people). Track issues in a shared doc / Linear / GitHub issues.

- [ ] **Step 2: Two-week observation window**

Capture:
- Crash reports (from `<userDataDir>/logs/` files attached to bug reports)
- Auto-update behavior on each member's machine
- Sync engine correctness — anyone seeing missing data, duplicated rows, or stale state
- Performance — anyone seeing the app feel sluggish vs the web version

- [ ] **Step 3: Triage**

Categorize findings as:
- Blocker (fix before broader rollout)
- Tolerable (file for V2)
- Already-known risk per the spec's register

- [ ] **Step 4: Fix blockers**

Address any blocker as a hotfix PR + new release through the CI workflow.

- [ ] **Step 5: Manual review checkpoint — Phase 4 acceptance (do NOT commit)**

  **Run:**
  ```bash
  pnpm test
  pnpm lint
  pnpm typecheck
  ```
  Expected: full repo test, lint, and typecheck all clean.

  **Verify:**
  - Every dogfood report captured during the two-week window has been triaged into Blocker / Tolerable / Already-known. No item remains in an untriaged state.
  - Zero P0 (blocker) items remain open; any blocker discovered during dogfood has been resolved via a hotfix release through the Task 6 CI workflow.
  - The Task 1–6 manual-review checkpoints all remain green (no regression on logger sinks, lint rule, bug-report flow, signing/notarization, auto-update, CI workflow).
  - The auto-update path was exercised at least once across the dogfood group with an observed successful version bump.
  - Tolerable issues are filed (Linear/GitHub issues) with a "V2" or "Phase 5+" label so they are not lost.
  - The Phase 4 line in `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` is annotated with today's completion date (`2026-05-13` or later) and a one-line summary of the dogfood outcome.

  **Manual smoke test:**
  1. Walk the Phase 4 exit-criteria list at the top of this plan and confirm each item observably holds in the shipped build: log files written/rotated/capped; lint blocks raw-data logger calls; bug reports reach the `internal` bucket; signed/notarized DMG exits CI; auto-update succeeds on relaunch; two-week dogfood completed without critical regressions.
  2. Open the spec file in the editor and confirm the Phase 4 line annotation is present and accurate.
  3. Have a second team member independently confirm dogfood triage state and the spec annotation before declaring Phase 4 done.

  Expected: Phase 4 is observably complete against the documented exit criteria, with no open blockers, and the spec reflects that completion.

  **Greenlight criteria:** all checks above pass. Phase 4 is closed; staging into Phase 5 (Windows port) is unblocked.

---

## Out of Scope for Phase 4

- Windows port (Phase 5)
- Microsoft Store distribution
- App Store distribution
- Beta update channel
- Crash auto-reporting (V2 — Phase 4 covers manual bug reports only)
- Self-hosted Sentry / Glitchtip / Highlight.io (V2)
- Auto-rollback on auto-update failure

---

## Risks Specific to Phase 4

| Risk | Mitigation in this phase |
|---|---|
| Electrobun's updater APIs are immature; auto-update path may not work cleanly | Manual fallback documented in Task 5 Step 1; ship that if Electrobun's updater stalls |
| Notarization fails because of an unforeseen entitlement requirement (e.g. Bun JIT) | Entitlements file in Task 2 already enables JIT + library validation disable; if more is needed, iterate via `xcrun notarytool log` output |
| User reports unredacted PII in their submitted logs | Logger redaction is on by default; bug-report dialog's "Preview" toggle gives the user one more chance to review |
| Auto-update bricks the app on a failure | Phase 4 doesn't introduce rollback; mitigation is keeping the installed `.app` intact during update download, only swapping on successful verification |
| Internal dogfood surfaces something fundamental (e.g. sync engine LWW eating someone's work) | Phase 3's diagnostic tooling helps reproduce; if a critical correctness bug emerges, treat as a Phase 3 spec change, not a Phase 4 patch |
