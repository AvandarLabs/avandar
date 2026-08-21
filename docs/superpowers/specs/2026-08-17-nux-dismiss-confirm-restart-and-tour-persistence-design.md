# Nux: dismiss confirm, restart destination, and tour persistence - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-17
**Branch:** `feat/nux`
**Amends:** `docs/superpowers/specs/2026-08-16-nux-first-dashboard-tutorial-design.md`
(§6.4 Restart destination, §6.5 Dismissal UX). Does not reopen that spec's
scope.
**Related:** `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`,
`src/views/ProfileView/ProfileView.tsx`,
`src/components/Nux/NuxRoot/useNuxNavigation.ts`,
`src/components/Nux/NuxTour/NuxTour.tsx`,
`src/components/Nux/NuxRoot/NuxRoot.tsx`,
`src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.ts`

---

## 1. Scope

Three holes in the first-dashboard tutorial that showed up in a real session:

1. Checklist **X** dismisses immediately, with no warning that the only way
   back is Profile restart.
2. Profile **Restart tutorial** navigates to workspace Home while the tour
   opens milestone 1, whose first target lives on Data Import. Joyride paints
   an overlay and waits 60s for an element that is not on the page. That is
   the stuck center spinner.
3. **Cmd+Tab** away and back drops the overlay and tooltip, because Joyride
   treats a backgrounded target as missing and/or eligibility unmounts the
   tour when a hidden window reports a tiny width.

**Out of scope**

- Spotlight / Cmd+K resume. Raised, then withdrawn.
- Changing `dismiss` semantics. Confirm, then the existing `dismiss()` write
  (`status = 'dismissed'`). Only Profile restart brings the UI back.
- A completed-state card. The panel still unmounts when every milestone is
  done. The "skip confirm when complete" path is a defensive check only.
- Persisting the active step index. Still in-memory only.
- Playwright coverage of Cmd+Tab. The OS window switch is not a browser
  action the suite can take.

---

## 2. Confirm before dismiss

Checklist X no longer calls `dispatch.dismiss()` directly. It opens
`modals.openConfirmModal`, the same helper as dashboard/dataset delete.

| Piece   | Copy                                     |
| ------- | ---------------------------------------- |
| Title   | Hide the tutorial?                       |
| Body    | You can restart it anytime from Profile. |
| Confirm | Hide tutorial                            |
| Cancel  | Cancel                                   |

Confirm runs existing `dismiss()`. Cancel leaves the panel and any open
tooltip as they were. No new reducer action. Copy goes through Lingui (`t` /
`<Trans>`).

**Completed skip.** If `areAllMilestonesComplete(completedMilestones)` is
already true when X is clicked, skip the modal and dismiss. Today the panel
returns `null` once every milestone is done, so this branch is defensive.
Do not add a completed card just to host an X.

The collapsed "Get started" pill is unchanged. Tooltip **Close** is unchanged
(`closeTour`: collapse to pill, progress kept, status stays `in_progress`).

---

## 3. Profile restart goes to Data Import

`nuxActions.restart` is unchanged: `status = 'in_progress'`,
`completedMilestones = []`, `activeMilestoneKey = add_dataset`, auto-check
bypassed.

`ProfileView`'s Restart handler today then navigates to workspace Home.
Change it to the same path as **Start tour**: after `restart()`, call
`openMilestone("add_dataset")` from `useNuxNavigation`, which routes to
Data Import and spotlights the upload form.

Do not navigate to Home. Profile copy stays "from the top."

---

## 4. Cmd+Tab must not kill the tour

Two independent close paths, both gated.

### 4.1 Joyride events while the document is hidden

`NuxTour` currently calls `closeTour()` on `TARGET_NOT_FOUND`, `ERROR`, and
`TOUR_END`. A backgrounded tab can make the target look gone (lifecycle
re-run, visibility, timer throttle).

Extend `shouldCloseTourOnTargetNotFound` with `isDocumentVisible` and the
Joyride event type. `NuxTour` asks it before every `closeTour()` from
`TARGET_NOT_FOUND`, `ERROR`, and `TOUR_END`. Same file, no sibling helper.

- `isDocumentVisible === false` → do not close, for any of those events.
- Visible page, `TARGET_NOT_FOUND` for the **current** step → close, same as
  today.
- Visible page, `TARGET_NOT_FOUND` for a **stale** step → ignore, same as
  today.
- Visible page, `TOUR_END` / `ERROR` → close. The stale-step check does not
  apply to those two.

Read `document.visibilityState === "visible"` at event time. No
`visibilitychange` remount unless ignoring the events is not enough.

### 4.2 Do not unmount an active tour on an eligibility flicker

`NuxRoot` returns `null` when `useNuxEligibility()` is false. That hook's
desktop-width `useMediaQuery` can go false when a hidden window reports width
0, which unmounts Joyride and fires `TOUR_END`.

Keep `NuxRootContents` mounted while `activeMilestoneKey` is set, even if
eligibility is false. A tablet/Electron session still never **starts** the
tutorial; this only prevents tearing down a tour that is already running.
`NuxStateManager` already sits above `NuxRoot`, so no extra persistence.

---

## 5. Testing

Red/green TDD. No new e2e.

**`NuxChecklistPanel`**

- X opens the confirm modal and does not dismiss until confirm.
- Cancel leaves the panel.
- If every milestone is already complete, X dismisses with no modal.

**Profile restart**

- Restart navigates to Data Import via `openMilestone("add_dataset")`, not
  Home. Test that in `ProfileView` if a page render is cheap enough; otherwise
  extract the handler next to `useNuxNavigation` and unit-test the helper.
  Existing `nuxActions.restart` wipe tests stay.

**Tour persistence**

- The close-on-event helper is false when the document is hidden, for
  `TARGET_NOT_FOUND`, `TOUR_END`, and `ERROR`.
- It is still true for a missing **current** target on a visible page.
- `NuxRoot` stays mounted when a milestone is active even if eligibility is
  false.

---

## 6. File inventory

**Modified**

```
src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx
src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx
src/views/ProfileView/ProfileView.tsx
src/components/Nux/NuxTour/NuxTour.tsx
src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.ts
src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.test.ts
src/components/Nux/NuxRoot/NuxRoot.tsx
src/i18n/locales/*/messages.po
```

**Created only if needed**

```
src/components/Nux/NuxRoot/NuxRoot.test.tsx
src/components/Nux/NuxRoot/useNuxNavigation/restartFirstDashboardTutorial.ts
```

`nuxActions.ts` does not change.
