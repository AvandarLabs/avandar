# 072 — Vanity URL

- **Slug**: `dashboard-vanity-url`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-072/dashboard-vanity-url`
- **Depends on**: `071-dashboard-publish-modal`.
- **Estimated PR size**: medium — ~5 files, ~400 lines, plus a Supabase route.

## Notes for future you

- `toVanitySlug` enforces kebab-case, lowercase, allowed character set. Don't loosen — these end up in URLs.
- Uniqueness is workspace-scoped, not global. The same slug can exist in two different workspaces.

## What this feature is

Kebab-case slug input in the publish modal with live preview of the resulting URL. `toVanitySlug` utility (8 unit tests) sanitizes user input. Public route `/d/<workspaceSlug>/<slug>` resolves to the published dashboard. Workspace-scoped uniqueness constraint on the DB.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-vanity-url`.

1. Confirm #071 has merged.
2. Confirm Phase 1 added the uniqueness constraint on the dashboards table.
3. Copy the utility + tests + public route + modal field.

### Files to copy verbatim

```
src/lib/url/toVanitySlug.ts
src/lib/url/toVanitySlug.test.ts
src/routes/d/$workspaceSlug/$slug.tsx
```

### Files to surgically edit on `develop`

- `PublishDashboardModal` — add the slug input with live preview.

## How to mark this feature completed

Standard ritual.
