# 081 — Frontend Lingui wiring

- **Slug**: `frontend-lingui-wiring`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-081/frontend-lingui-wiring`
- **Depends on**: `078-lingui-scaffold`, `079-workspace-language-picker`.
- **Estimated PR size**: very large — Lingui macros across every user-facing string + populated catalogs, ~3k+ lines.

## Notes for future you

- This row is **wide** but **shallow** — `<Trans>` and `t``` macros sprinkled across every user-facing string. The diff will look enormous but most of it is mechanical wrapping.
- Catalogs are populated across all 7 non-source locales (es / pt / fr / sw / ar / zh-Hans / zh-Hant) for the in-scope surfaces.
- Driver commits: `c93ad08`, `c3e63d6`, `b161920`, `4f8f00f`, `efa8211`. Commit `c3e63d6` also touches #021 (chat-better-pblock-generation) — scope to Lingui portion only.

## What this feature is

Wires every user-facing string in the in-scope surfaces (Workspace Settings, Data Explorer, dashboards, chat shell) through Lingui macros. Populates the non-English catalogs.

## Steps to migrate

**Step 0** — `/deslop undrift frontend-lingui-wiring`.

1. Confirm #078, #079 have merged.
2. Apply the macro wrapping across the listed surfaces.
3. Copy the populated PO catalogs.

### Files to surgically edit on `develop`

Many — basically every user-facing string in the in-scope surfaces. Use the source branch's diff as the spec.

### Files to copy verbatim

The populated PO catalog entries from `feat/ict4d-demo`'s `src/locales/{locale}/messages.po`.

## How to mark this feature completed

Standard ritual.
