# 025 — Privacy: crossBoundary + HMAC

- **Slug**: `privacy-crossboundary-hmac`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-025/privacy-crossboundary-hmac`
- **Depends on**: `024-privacy-consent-modal` (the modal produces ack tokens that this layer validates).
- **Estimated PR size**: medium — ~5–8 files server + client, ~400–600 lines, plus an ESLint rule.

## Notes for future you

- This is the **chokepoint** through which all data crossing the privacy boundary must flow. Anything that bypasses `crossBoundary` is a bug — the ESLint guard exists to catch it at lint time.
- HMAC ack tokens have a TTL and a nonce; the server rejects replays. Don't disable replay protection in tests — write tests that exercise it.
- Server-side rejection code is `UNAPPROVED_DATA_TRANSFER` — surface that exact string up the stack so the UI can show the right error.
- Spec: `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md` phases 0 + 9b.

## What this feature is

A single API chokepoint (`crossBoundary`) on the client through which all data crossing the privacy boundary must flow. The server validates each call with:

- HMAC-signed ack tokens from the consent modal (#024).
- Replay protection via nonce + TTL.
- `UNAPPROVED_DATA_TRANSFER` rejection when the token is missing / invalid.

Plus an ESLint rule that fails the lint job if any code path other than `crossBoundary` attempts to send data crossing the boundary.

## Steps to migrate

**Step 0** — `/deslop undrift privacy-crossboundary-hmac`.

1. Confirm #024 has merged.
2. Create the refactor branch.
3. Copy the `crossBoundary` client wrapper + server validator + ESLint rule.
4. Surgically edit existing data-transfer call sites to go through `crossBoundary`.
5. Run verification (lint MUST be green — the ESLint guard is part of CI).

### Files to copy verbatim

```
src/lib/privacy/crossBoundary.ts
supabase/functions/_shared/privacy/verifyCrossBoundary.ts
eslint-plugin-avandar-privacy/ (or wherever the ESLint guard lives)
```

### Files to surgically edit on `develop`

- Every client-side caller that previously POSTed data to the chat edge function (or any privacy-sensitive endpoint) — route through `crossBoundary`.
- Each Supabase edge function that consumes such data — call `verifyCrossBoundary(request)` at the top.
- ESLint config — register the new rule.

### Files to delete

None.

### Dependency changes

None typically. HMAC uses Web Crypto / Node `crypto`.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint               # the new ESLint rule MUST be green
pnpm vitest run src/lib/privacy supabase/functions
```

### Manual

1. `pnpm dev` + Supabase stack.
2. Send a chat message that triggers consent (Mode A — clean). Confirm the ack token is sent and the edge function accepts.
3. Tamper with the token in DevTools (replay or rewrite). Confirm the server rejects with `UNAPPROVED_DATA_TRANSFER`.
4. Try to add a new direct fetch to a privacy-sensitive endpoint in your editor. Confirm ESLint fails the file.

## Risks + things to look out for

- **HMAC key management.** The signing key lives in Supabase secrets; misconfigured local envs will refuse every call. Document the local-dev key bootstrap in the migration notes.
- **Clock skew.** Token TTL is short (per spec). Clients with skewed clocks will see spurious rejections. Don't extend the TTL to paper over this — fix the client clock.
- **Bypass paths.** Anything that calls `fetch` directly is suspect. Audit the diff for any direct `fetch(.../chat...)` that wasn't routed through `crossBoundary`.

## How to mark this feature completed

Standard ritual.
