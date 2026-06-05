# 039 — Phase 6: Python sandbox

- **Slug**: `chat-plan-python-sandbox`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-039/chat-plan-python-sandbox`
- **Depends on**: `033-chat-plan-propose`.
- **Estimated PR size**: large — sandboxed iframe + Pyodide loader + bridge, ~900 lines + Pyodide deps.

## Notes for future you

- **WebR is explicitly deferred.** Python-only in this row.
- The sandbox iframe lives at `/sandbox-executor.html` with a strict CSP and pre-boot network stubs. Don't loosen the CSP for convenience.
- Pyodide load is lazy — only when a Python step is about to run.
- The parquet bridge uses `pyarrow` inside the sandbox to read parquet blobs handed in via `postMessage`.

## What this feature is

A sandboxed iframe at `/sandbox-executor.html` with strict CSP + pre-boot network stubs. Pyodide loads lazily on first Python step. Parquet I/O via `pyarrow`. Communication via `sandboxClient` / `sandboxProtocol` (postMessage with structured-clone payloads). Default timeout 30 s per step.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-python-sandbox`.

1. Confirm #033 has merged.
2. Create the refactor branch.
3. Copy the sandbox HTML + protocol + client + parquet bridge.
4. Configure CSP via Vite's static-asset headers (or the index template).

### Files to copy verbatim

```
public/sandbox-executor.html
src/lib/sandbox/sandboxClient.ts
src/lib/sandbox/sandboxProtocol.ts
src/lib/sandbox/parquetBridge.ts
src/lib/sandbox/networkStubs.ts
```

### Files to surgically edit on `develop`

- Vite config — register the sandbox HTML as a separate entry; apply CSP headers via dev middleware (or document the prod equivalent).
- `planExecutor` (from #033) — dispatch to sandbox for `type: "python"` steps.

### Dependency changes

```
pnpm add pyodide
```

(Plus any `vite-plugin-static-copy` if used to bundle the Pyodide wheel.)

## Verification

### Manual

1. Trigger a Python plan step.
2. Confirm Pyodide loads on first use, the iframe is at `/sandbox-executor.html`, and the code runs in 30 s or times out.
3. Inspect CSP via DevTools — confirm the iframe rejects outbound `fetch`.

## Risks + things to look out for

- **Pyodide is large** (~10 MB download). Lazy-load aggressively. Cache via service worker if #061 lands later.
- **postMessage payloads** — large parquet blobs use `Transferable` to avoid clone overhead.

## How to mark this feature completed

Standard ritual.
