# Nux: build-dashboard click-through steps - design

**Status:** Ready for implementation
**Author:** pablo@avandarlabs.com
**Date:** 2026-08-18
**Branch:** `feat/nux`
**Amends:** `docs/superpowers/specs/2026-08-16-nux-first-dashboard-tutorial-design.md`
(§3.3 Milestone 3). Does not reopen share, query, or dataset milestones.

**Related:** `src/components/Nux/tutorials/firstDashboard/firstDashboard.ts`,
`src/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu.tsx`,
`src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx`,
`src/components/Nux/NuxPrerequisites/firstDashboard/buildDashboardPrerequisite.ts`

---

## 1. Problem

`build_dashboard` currently has one tooltip on the Save trigger that tells
the user to open Save, pick **Save to dashboard**, name the dashboard, and
create it. That is three clicks buried in one card. The original tutorial
spec also refused to spotlight the menu item because Joyride's overlay
counts as an outside click and Mantine closes the dropdown.

---

## 2. Decision

One tooltip per click. Keep the Save menu open while the menu-item tooltip
is showing. Always open the save modal in create mode during this tour.
Catch-up is already `facts.hasDashboard`; do not rebuild it.

Tooltip count for `first_dashboard` becomes 3 / 2 / 3 / 3 (eleven).

---

## 3. The three steps

`completionEvent` stays `dashboard.created`. No new bus events. Clicks 1
and 2 auto-advance when the next target mounts (`disableNextUntilAnchor`),
same as the share-modal and import-form gates.

| #   | Anchor                              | Spotlight                                       | Gate                | Copy                                                             |
| --- | ----------------------------------- | ----------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| 1   | `explorer-save-menu` (Save trigger) | trigger                                         | menu item appears   | Title: Save it to a dashboard. Body: Open Save.                  |
| 2   | `explorer-save-to-dashboard-item`   | the item                                        | modal root appears  | Title: Save to a dashboard. Body: Click "Save to dashboard".     |
| 3   | `explorer-create-dashboard-button`  | full modal (`explorer-save-to-dashboard-modal`) | `dashboard.created` | Title: Name it. Body: Give the dashboard a name, then create it. |

Step 3 sets `hideBack`. The menu has closed; going back would wait for a
missing item. Step 2 may show Back: the trigger is still there and the
menu is held open.

`targetWaitTimeoutMs` is `AWAIT_USER_ACTION_MS` on all three.

When `dashboard.created` fires on step 3, `completeMilestone` closes the
tour (active index is already last). There is no payoff tooltip after
create: the create button unmounts with the modal.

---

## 4. Holding the Save menu open

Joyride remounts on `stepIndex` (`key={`${milestone.key}-${index}`}`). That
remount would close an uncontrolled Mantine Menu.

`DataExplorerSaveMenu` uses a controlled `Menu`:

- `opened` is true when the user opened it **or** the active step's
  `anchor` is `explorer-save-to-dashboard-item`.
- `closeOnClickOutside` is false while NUX is holding it open.

A pure helper `shouldHoldExplorerSaveMenuOpen` reads the active milestone
and step from `NuxStateManager` via a thin hook
`useNuxExplorerSaveMenu`, same placement exception as
`useNuxOpenChatPanel` (the product surface that owns the control).

---

## 5. Forcing create mode

During an open `build_dashboard` tour, `SaveToDashboardModal` must not
land in list mode.

- New prop `forceCreateMode?: boolean`.
- When true: initial mode is `"create"`, skip the post-load auto-switch
  to list, do not render **Back to dashboards**.
- `DataExplorerSaveMenu` passes `forceCreateMode` when
  `shouldForceSaveToDashboardCreateMode` is true: active milestone is
  `build_dashboard`.

The modal still emits `dashboard.created` only on insert, which is the
path this tour uses.

---

## 6. Anchors

Add to `NuxAnchors.ids`:

- `explorerSaveToDashboardItem`: `"explorer-save-to-dashboard-item"`
- `explorerSaveToDashboardModal`: `"explorer-save-to-dashboard-modal"`
- `explorerCreateDashboardButton`: `"explorer-create-dashboard-button"`

Spread `NuxAnchors.props` on the Save-to-dashboard `Menu.Item`, the
modal's root stack, and the **Create dashboard & save** button.

---

## 7. Catch-up

Unchanged. `buildDashboardPrerequisite.isSatisfied` is `facts.hasDashboard`.
Hydration and the live judge already tick `build_dashboard` when the
workspace has a dashboard. Restart still sets `isCatchUpSuppressed`, so a
replay walks these three clicks even if dashboards exist.

---

## 8. Testing

- `firstDashboard.test.ts`: three `build_dashboard` steps, gates, spotlight,
  `hideBack` on step 3.
- `shouldHoldExplorerSaveMenuOpen` / `shouldForceSaveToDashboardCreateMode`
  unit tests.
- `SaveToDashboardModal`: `forceCreateMode` opens create UI even when
  dashboards exist, with no Back link.
- `getAutoAdvanceStepIndex` still covers a gate whose next tooltip points
  elsewhere: step 2 gates on the modal root, step 3's tooltip is the create
  button.

No Playwright for this slice. No new NUX events.

---

## 9. Out of scope

- Teaching "add to an existing dashboard" (list mode).
- Emitting `dashboard.created` when saving onto an existing dashboard.
- Restoring the Visualizations-tab tooltip.
- Changing Close-button overlay behavior.
