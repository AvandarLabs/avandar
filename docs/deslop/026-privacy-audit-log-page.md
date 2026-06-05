# 026 — Privacy: audit log page

- **Slug**: `privacy-audit-log-page`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-026/privacy-audit-log-page`
- **Depends on**: `024-privacy-consent-modal` (the modal writes entries that this page reads).
- **Estimated PR size**: medium — ~5–8 files, ~500 lines.

## Notes for future you

- The audit log is **client-side** (Dexie), not server-side. It is metadata-only — no message bodies are stored.
- This page is the parent of the clarifications sub-tab (#031). Don't author the Clarifications tab here; it lands with #031.
- Spec: `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md` phase 0 / phase 5.

## What this feature is

A Dexie-backed audit log of every consent decision made in the workspace. UI lives at `/settings/privacy/log`. Features:

- Table view of entries (timestamp, mode, kinds detected, user decision).
- Filter by mode / date range.
- CSV export.
- "Clear log" with confirmation.

Metadata-only: no message bodies, no PII values — only the kinds and decision. This is enforced at the write site in #024.

## Steps to migrate

**Step 0** — `/deslop undrift privacy-audit-log-page`.

1. Confirm #024 has merged.
2. Create the refactor branch.
3. Copy the Dexie store + page route + page components verbatim.
4. Wire the route into TanStack Router's tree.
5. Run verification.

### Files to copy verbatim

```
src/lib/privacy/audit/AvandarConsentAuditDB.ts
src/routes/_auth/$workspaceSlug/settings/privacy/log.tsx (or equivalent)
src/views/PrivacyLogView/ (whatever components live here)
```

### Files to surgically edit on `develop`

- The Settings nav — add a "Privacy" entry pointing to the new route.

### Files to delete

None.

### Dependency changes

None — Dexie is already installed.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/lib/privacy/audit src/views/PrivacyLogView
```

### Manual

1. `pnpm dev`.
2. Trigger consent modal at least once (send a PII-flagged message).
3. Navigate to `/settings/privacy/log`. Confirm the entry appears with timestamp, mode, kinds, decision.
4. Filter by mode. Confirm narrowing works.
5. Export CSV. Confirm the download contains only metadata (no message bodies).
6. Clear log. Confirm rows disappear.

## Risks + things to look out for

- **Dexie schema bump.** A new DB / table — confirm the version is set correctly so existing users don't crash on first load.
- **Privacy of the log itself.** Don't render message bodies even if a future version of #024 starts persisting them. The log UI should be defensive.

## How to mark this feature completed

Standard ritual.
