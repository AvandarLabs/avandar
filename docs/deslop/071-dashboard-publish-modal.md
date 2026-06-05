# 071 — Publish modal

- **Slug**: `dashboard-publish-modal`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-071/dashboard-publish-modal`
- **Depends on**: `070-dashboard-view-before-publish` (the modal links to the preview route).
- **Estimated PR size**: medium — ~4 files, ~400 lines.

## Notes for future you

- Replaces the previous `confirm()` dialog — a real Mantine Modal.
- URL-first copy: "Your dashboard will be published to: <url>". The preview URL from #070 is shown alongside.

## What this feature is

Real Mantine modal that replaces the prior browser `confirm()` for dashboard publishing. URL-first copy ("Your dashboard will be published to: <url>"). Includes a link to the preview route from #070.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-publish-modal`.

1. Confirm #070 has merged.
2. Copy the modal component.
3. Replace the `confirm()` call site.

### Files to copy verbatim

```
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.module.css
```

## How to mark this feature completed

Standard ritual.
