# 070 — Preview before publish

- **Slug**: `dashboard-view-before-publish`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-070/dashboard-view-before-publish`
- **Depends on**: `none`
- **Estimated PR size**: small — ~3 files, ~250 lines.

## Notes for future you

- Auth-gated preview route — only the workspace owner / editors can hit it; public viewers cannot.
- `DashboardViewerView` gains `mode: "public" | "preview"` so the same renderer powers both. The preview mode adds a "Back to editor" banner.

## What this feature is

A new auth-gated route `/<workspaceSlug>/dashboards/preview/<dashboardId>` that renders the dashboard exactly as it will appear when published, with a "Back to editor" banner. `DashboardViewerView` gains a `mode: "public" | "preview"` prop.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-view-before-publish`.

1. Add the route to TanStack Router's tree.
2. Add the `mode` prop to `DashboardViewerView`.
3. Render the preview banner when `mode === "preview"`.

### Files to copy verbatim

```
src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx
src/views/DashboardApp/DashboardViewerView/PreviewBanner.tsx
```

## How to mark this feature completed

Standard ritual.
