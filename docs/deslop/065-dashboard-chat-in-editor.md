# 065 — Chat in dashboard editor

- **Slug**: `dashboard-chat-in-editor`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-065/dashboard-chat-in-editor`
- **Depends on**: `015-chat-disabled-visual-feedback` (chat composer must be aware of context).
- **Estimated PR size**: medium — ~6 files, ~500 lines.

## Notes for future you

- The chat composer was previously disabled on the dashboards page. This row unlocks it and adds a `addDashboardBlock` tool so the model can append blocks to the dashboard.
- `buildPendingDataVizBlock` is the helper that translates a tool call into a draft DataViz block; once approved, it lands in the page.

## What this feature is

When the user is on a dashboard, the chat composer is unlocked and an `addDashboardBlock` tool is registered. `DashboardEditorStateManager` queues blocks from the tool; `buildPendingDataVizBlock` constructs the draft block from the tool args.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-chat-in-editor`.

1. Confirm #015 has merged.
2. Register the `addDashboardBlock` tool.
3. Wire `DashboardEditorStateManager` to consume from the tool stream.

### Files to copy verbatim

```
supabase/functions/chat/tools/addDashboardBlock.ts
src/components/Dashboard/DashboardEditorStateManager.ts
src/components/ChatPanel/dashboards/buildPendingDataVizBlock.ts
```

### Files to surgically edit on `develop`

- The chat tool registry.
- The dashboards page — surface chat as available.

## How to mark this feature completed

Standard ritual.
