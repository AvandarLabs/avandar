# Nux Dismiss Confirm, Restart Destination, and Tour Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirm before dismissing the tutorial, send Profile restart to Data Import instead of Home, and keep the tour overlay/tooltip alive across Cmd+Tab.

**Architecture:** No new reducer actions and no schema changes. A pure helper decides whether Joyride close events should collapse the tour (hidden document never closes). `NuxRoot` stays mounted while a milestone is active even if eligibility flickers. Checklist X opens `modals.openConfirmModal` then calls existing `dismiss()`. Profile restart calls existing `restart()` then `openMilestone("add_dataset")`.

**Tech Stack:** React 19, TypeScript, Mantine 9 (`modals.openConfirmModal`), Lingui, react-joyride 3, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-17-nux-dismiss-confirm-restart-and-tour-persistence-design.md`

## Global Constraints

- `Nux` is an internal prefix only. User-facing copy says **tutorial**, never Nux.
- All displayable strings go through Lingui (`<Trans>`, `t`, or `msg` + `i18n._`). Do not hand-edit `src/i18n/locales/*/messages.ts`.
- `nuxActions.ts` does not change. `dismiss()` and `restart()` stay as they are.
- No Spotlight / Cmd+K action. No completed-state card. No Playwright Cmd+Tab test. No `visibilitychange` remount of Joyride.
- Commit after every task with `feat(nux):` / `fix(nux):` / `test(nux):`.
- Functions stay <= 45 lines. JSDoc on every exported function describes what it is, not how it works.

**Verification commands**

```bash
pnpm vitest run <file>
pnpm i18n:extract    # Task 4 only, after new copy lands
```

---

## File structure

| File                                                                                            | Responsibility                                                                     |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.ts` | Pure close-or-not decision for Joyride `TARGET_NOT_FOUND`, `ERROR`, and `TOUR_END` |
| `src/components/Nux/NuxTour/NuxTour.tsx`                                                        | Passes event type, step indices, and `document.visibilityState` into that helper   |
| `src/components/Nux/NuxRoot/NuxRoot.tsx`                                                        | Keeps `NuxRootContents` mounted while `activeMilestoneKey` is set                  |
| `src/components/Nux/NuxRoot/NuxRoot.test.tsx`                                                   | Eligibility-false + active milestone still mounts contents                         |
| `src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.ts`     | Confirm vs skip-confirm vs dismiss                                                 |
| `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`                                    | X click uses that helper + `openConfirmModal`                                      |
| `src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.ts`     | `restart()` then `openMilestone("add_dataset")`                                    |
| `src/views/ProfileView/ProfileView.tsx`                                                         | Restart handler uses that helper; stops navigating to Home                         |

---

### Task 1: Close the tour only on a visible page

**Files:**

- Modify: `src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.ts`
- Modify: `src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.test.ts`
- Modify: `src/components/Nux/NuxTour/NuxTour.tsx`

**Interfaces:**

- Consumes: Joyride `EVENTS.TARGET_NOT_FOUND` (`"error:target_not_found"`), `EVENTS.ERROR` (`"error"`), `EVENTS.TOUR_END` (`"tour:end"`); `document.visibilityState`
- Produces: `NuxTourCloseEventType` and `shouldCloseTourOnTargetNotFound(options): boolean` with the signature below. Task 1 wiring is the only consumer.

```ts
export type NuxTourCloseEventType =
  | "error:target_not_found"
  | "error"
  | "tour:end";

export function shouldCloseTourOnTargetNotFound(options: {
  eventType: NuxTourCloseEventType;
  eventStepIndex: number;
  activeStepIndex: number;
  isDocumentVisible: boolean;
}): boolean;
```

- [ ] **Step 1: Rewrite the helper tests for the new signature**

Replace `src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { shouldCloseTourOnTargetNotFound } from "@/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound";

describe("shouldCloseTourOnTargetNotFound", () => {
  it("does not close while the document is hidden, even for the current step", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error:target_not_found",
        eventStepIndex: 1,
        activeStepIndex: 1,
        isDocumentVisible: false,
      }),
    ).toBe(false);
  });

  it("does not close on tour:end or error while the document is hidden", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "tour:end",
        eventStepIndex: 0,
        activeStepIndex: 0,
        isDocumentVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error",
        eventStepIndex: 0,
        activeStepIndex: 0,
        isDocumentVisible: false,
      }),
    ).toBe(false);
  });

  it("closes when the missing target is the step we are still on", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error:target_not_found",
        eventStepIndex: 1,
        activeStepIndex: 1,
        isDocumentVisible: true,
      }),
    ).toBe(true);
  });

  it("does not close when the tour already advanced past the missing target", () => {
    // Save unmounts the import form (step 1) in the same tick that
    // completeMilestone jumps to the payoff (step 2). Joyride still emits
    // TARGET_NOT_FOUND for the form; closing would leave the overlay up
    // and never show the payoff.
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error:target_not_found",
        eventStepIndex: 1,
        activeStepIndex: 2,
        isDocumentVisible: true,
      }),
    ).toBe(false);
  });

  it("closes on tour:end and error on a visible page even if the step indices differ", () => {
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "tour:end",
        eventStepIndex: 0,
        activeStepIndex: 2,
        isDocumentVisible: true,
      }),
    ).toBe(true);
    expect(
      shouldCloseTourOnTargetNotFound({
        eventType: "error",
        eventStepIndex: 0,
        activeStepIndex: 2,
        isDocumentVisible: true,
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail for the right reason**

Run: `pnpm vitest run src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.test.ts`

Expected: FAIL. Hidden-document cases still return `true` (current implementation ignores visibility). `tour:end` / `error` with mismatched indices return `false` (current implementation only compares indices).

- [ ] **Step 3: Implement the helper**

Replace `src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.ts` with:

```ts
/**
 * Event types that currently collapse the tutorial. Kept as the Joyride
 * string values so `NuxTour` can pass `data.type` through without mapping.
 */
export type NuxTourCloseEventType =
  | "error:target_not_found"
  | "error"
  | "tour:end";

/**
 * Whether a Joyride close-class event should collapse the tutorial.
 *
 * A backgrounded tab can make the current target look missing. Closing then
 * drops the overlay and tooltip, so a hidden document never closes. On a
 * visible page, TARGET_NOT_FOUND still ignores stale steps (save unmounts
 * the previous target in the same tick as the payoff jump); TOUR_END and
 * ERROR always close.
 */
export function shouldCloseTourOnTargetNotFound(options: {
  eventType: NuxTourCloseEventType;
  eventStepIndex: number;
  activeStepIndex: number;
  isDocumentVisible: boolean;
}): boolean {
  if (!options.isDocumentVisible) {
    return false;
  }
  if (options.eventType === "error:target_not_found") {
    return options.eventStepIndex === options.activeStepIndex;
  }
  return true;
}
```

- [ ] **Step 4: Re-run the helper tests**

Run: `pnpm vitest run src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 5: Wire `NuxTour` to the new signature**

In `src/components/Nux/NuxTour/NuxTour.tsx`, replace the `TARGET_NOT_FOUND` / `ERROR` / `TOUR_END` branches inside `onEvent` with one branch. Leave the `STEP_AFTER` branch (including `closeTour` on last-tooltip Done) unchanged: that is a user click, not a backgrounding event.

```ts
if (
  data.type === EVENTS.TARGET_NOT_FOUND ||
  data.type === EVENTS.ERROR ||
  data.type === EVENTS.TOUR_END
) {
  if (
    !shouldCloseTourOnTargetNotFound({
      eventType: data.type,
      eventStepIndex: data.index,
      activeStepIndex: activeStepIndexRef.current,
      isDocumentVisible: document.visibilityState === "visible",
    })
  ) {
    return;
  }
  dispatch.closeTour();
}
```

Do not add a `visibilitychange` listener or remount Joyride.

- [ ] **Step 6: Type-check the tour file still compiles**

Run: `pnpm vitest run src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.test.ts src/components/Nux/NuxTour/NuxTooltip.test.tsx src/components/Nux/NuxTour/NuxTourCaret/NuxTourCaret.test.tsx`

Expected: PASS. `NuxTour.tsx` has no dedicated test; neighboring tour tests must stay green.

- [ ] **Step 7: Commit**

```bash
git add \
  src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.ts \
  src/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound.test.ts \
  src/components/Nux/NuxTour/NuxTour.tsx
git commit -m "$(cat <<'EOF'
fix(nux): keep the tour open while the window is in the background

EOF
)"
```

---

### Task 2: Keep `NuxRoot` mounted while a milestone is active

**Files:**

- Create: `src/components/Nux/NuxRoot/NuxRoot.test.tsx`
- Modify: `src/components/Nux/NuxRoot/NuxRoot.tsx`

**Interfaces:**

- Consumes: `useNuxEligibility(): boolean`, `NuxStateManager.useState().activeMilestoneKey`
- Produces: `NuxRoot` renders `NuxRootContents` when `isEligible || activeMilestoneKey !== undefined`

- [ ] **Step 1: Write the failing `NuxRoot` tests**

Create `src/components/Nux/NuxRoot/NuxRoot.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NuxRoot } from "@/components/Nux/NuxRoot/NuxRoot";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import { render, screen } from "@/test-utils";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

vi.mock("@/components/Nux/useNuxEligibility/useNuxEligibility", () => {
  return { useNuxEligibility: vi.fn() };
});

vi.mock("@/components/Nux/NuxRoot/NuxRootContents", () => {
  return {
    NuxRootContents: function NuxRootContentsMock(): ReactNode {
      return <div data-testid="nux-root-contents" />;
    },
  };
});

function _renderRoot(options: {
  isEligible: boolean;
  activeMilestoneKey?: NuxAppState["activeMilestoneKey"];
}): ReturnType<typeof render> {
  vi.mocked(useNuxEligibility).mockReturnValue(options.isEligible);
  return render(
    <NuxStateManager.Provider
      initialStateOverrides={{
        ...INITIAL_NUX_STATE,
        isHydrated: true,
        status: "in_progress",
        activeMilestoneKey: options.activeMilestoneKey,
      }}
    >
      <NuxRoot />
    </NuxStateManager.Provider>,
  );
}

beforeEach(() => {
  vi.mocked(useNuxEligibility).mockReset();
});

describe("NuxRoot", () => {
  it("renders nothing when ineligible and no milestone is active", () => {
    _renderRoot({ isEligible: false });
    expect(screen.queryByTestId("nux-root-contents")).not.toBeInTheDocument();
  });

  it("keeps contents mounted when a milestone is active even if eligibility is false", () => {
    _renderRoot({ isEligible: false, activeMilestoneKey: "add_dataset" });
    expect(screen.getByTestId("nux-root-contents")).toBeInTheDocument();
  });

  it("renders contents when eligible", () => {
    _renderRoot({ isEligible: true });
    expect(screen.getByTestId("nux-root-contents")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm vitest run src/components/Nux/NuxRoot/NuxRoot.test.tsx`

Expected: FAIL. The "keeps contents mounted..." test cannot find `nux-root-contents` because `NuxRoot` still returns `null` whenever `useNuxEligibility()` is false.

- [ ] **Step 3: Keep contents mounted while a milestone is active**

Replace `src/components/Nux/NuxRoot/NuxRoot.tsx` with:

```tsx
import { NuxRootContents } from "@/components/Nux/NuxRoot/NuxRootContents";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import type { ReactNode } from "react";

/**
 * The onboarding tutorial's entry point.
 *
 * Ineligible users get nothing, so the `react-joyride` chunk is never
 * fetched for them. An already-running tour stays mounted if eligibility
 * flickers (a hidden window can report a tiny width): unmounting Joyride
 * would fire TOUR_END and drop the overlay.
 */
export function NuxRoot(): ReactNode {
  const isEligible = useNuxEligibility();
  const activeMilestoneKey = NuxStateManager.useState().activeMilestoneKey;
  if (!isEligible && activeMilestoneKey === undefined) {
    return null;
  }
  return <NuxRootContents />;
}
```

- [ ] **Step 4: Re-run the `NuxRoot` tests**

Run: `pnpm vitest run src/components/Nux/NuxRoot/NuxRoot.test.tsx`

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add \
  src/components/Nux/NuxRoot/NuxRoot.tsx \
  src/components/Nux/NuxRoot/NuxRoot.test.tsx
git commit -m "$(cat <<'EOF'
fix(nux): do not unmount an active tour on an eligibility flicker

EOF
)"
```

---

### Task 3: Confirm before dismiss

**Files:**

- Create: `src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.ts`
- Create: `src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.test.ts`
- Modify: `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`
- Modify: `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`

**Interfaces:**

- Consumes: `areAllMilestonesComplete`, `NuxProgress.MilestoneKey[]`, existing `dispatch.dismiss`
- Produces: `dismissNuxChecklistPanel(options): void` with the signature below. The panel is the only caller. `nuxActions.dismiss` is unchanged.

```ts
export function dismissNuxChecklistPanel(options: {
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  dismiss: () => void;
  confirm: (onConfirm: () => void) => void;
}): void;
```

Do not add a completed-state card. The panel still returns `null` when every milestone is done. The complete-skip lives in the helper so it is testable.

- [ ] **Step 1: Write the failing helper tests**

Create `src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { dismissNuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

const ALL_MILESTONES: readonly NuxProgress.MilestoneKey[] = [
  "add_dataset",
  "run_query",
  "build_dashboard",
  "share_dashboard",
];

describe("dismissNuxChecklistPanel", () => {
  it("dismisses immediately when every milestone is already complete", () => {
    const dismiss = vi.fn();
    const confirm = vi.fn();
    dismissNuxChecklistPanel({
      completedMilestones: ALL_MILESTONES,
      dismiss,
      confirm,
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks for confirmation when the tutorial is unfinished", () => {
    const dismiss = vi.fn();
    const confirm = vi.fn();
    dismissNuxChecklistPanel({
      completedMilestones: ["add_dataset"],
      dismiss,
      confirm,
    });
    expect(dismiss).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(1);
    const onConfirm = confirm.mock.calls[0]?.[0] as () => void;
    onConfirm();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss when confirmation is not accepted", () => {
    const dismiss = vi.fn();
    dismissNuxChecklistPanel({
      completedMilestones: [],
      dismiss,
      confirm: () => {
        return;
      },
    });
    expect(dismiss).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the helper tests and confirm they fail**

Run: `pnpm vitest run src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.test.ts`

Expected: FAIL with "Failed to resolve import" / "cannot find module" for `dismissNuxChecklistPanel`.

- [ ] **Step 3: Implement the helper**

Create `src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.ts`:

```ts
import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { areAllMilestonesComplete } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";

/**
 * Runs the checklist X action: confirm, then dismiss, unless every milestone
 * is already complete (then dismiss with no prompt).
 */
export function dismissNuxChecklistPanel(options: {
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  dismiss: () => void;
  confirm: (onConfirm: () => void) => void;
}): void {
  if (areAllMilestonesComplete(options.completedMilestones)) {
    options.dismiss();
    return;
  }
  options.confirm(options.dismiss);
}
```

- [ ] **Step 4: Re-run the helper tests**

Run: `pnpm vitest run src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.test.ts`

Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing panel tests for the confirm modal**

In `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`, change the existing imports to:

```ts
import { modals } from "@mantine/modals";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
```

Add this `describe` **inside** the existing `describe("NuxChecklistPanel", ...)` block, after the current tests:

```tsx
describe("dismiss confirm", () => {
  let confirmModalOptions:
    | Parameters<typeof modals.openConfirmModal>[0]
    | undefined;

  beforeEach(() => {
    confirmModalOptions = undefined;
    vi.spyOn(modals, "openConfirmModal").mockImplementation((options) => {
      confirmModalOptions = options;
      return "nux-dismiss";
    });
  });

  it("opens a confirm modal on X and does not dismiss until confirm", () => {
    _renderPanel({});
    fireEvent.click(screen.getByRole("button", { name: "Hide the tutorial" }));
    expect(modals.openConfirmModal).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Add your first dataset")).toBeInTheDocument();
    expect(confirmModalOptions?.title).toBe("Hide the tutorial?");
    confirmModalOptions?.onConfirm?.();
    expect(
      screen.queryByText("Add your first dataset"),
    ).not.toBeInTheDocument();
  });

  it("keeps the panel when the confirm is cancelled", () => {
    _renderPanel({});
    fireEvent.click(screen.getByRole("button", { name: "Hide the tutorial" }));
    confirmModalOptions?.onCancel?.();
    expect(screen.getByText("Add your first dataset")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the panel tests and confirm the new ones fail**

Run: `pnpm vitest run src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx`

Expected: FAIL. X still has aria-label "Dismiss the tutorial", so `getByRole(..., { name: "Hide the tutorial" })` throws. After you temporarily query by the old name, the click would dismiss immediately with no modal (also a valid red, if you hit that first).

- [ ] **Step 7: Wire the panel to the helper and modal**

In `src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx`:

1. Replace `import { useLingui } from "@lingui/react"` with `import { Trans, useLingui } from "@lingui/react/macro"` and drop the now-duplicate `Trans` import. Add:

```ts
import { modals } from "@mantine/modals";
import { dismissNuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel";
```

Inside the component: `const { i18n, t } = useLingui();`

2. Change the X `aria-label` to `i18n._(msg`Hide the tutorial`)`.

3. Replace the X `onClick` with:

```tsx
onClick={() => {
  dismissNuxChecklistPanel({
    completedMilestones: state.completedMilestones,
    dismiss: dispatch.dismiss,
    confirm: (onConfirm) => {
      modals.openConfirmModal({
        title: t`Hide the tutorial?`,
        children: t`You can restart it anytime from Profile.`,
        labels: {
          confirm: t`Hide tutorial`,
          cancel: t`Cancel`,
        },
        onConfirm,
      });
    },
  });
}}
```

`t` must come from `useLingui()` in this component. Do not put `t` in the helper: it is a hook macro and is invisible to Lingui outside a component.

Collapsed pill and tooltip Close stay as they are.

- [ ] **Step 8: Re-run the panel tests**

Run: `pnpm vitest run src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.test.ts`

Expected: PASS.

- [ ] **Step 9: Extract the new copy**

Run: `pnpm i18n:extract`

Expected: `src/i18n/locales/*/messages.po` gain the new msgids (`Hide the tutorial?`, `You can restart it anytime from Profile.`, `Hide tutorial`, `Hide the tutorial`). Do not edit `messages.ts` by hand.

- [ ] **Step 10: Commit**

```bash
git add \
  src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.ts \
  src/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel.test.ts \
  src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx \
  src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.test.tsx \
  src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(nux): confirm before dismissing an unfinished tutorial

EOF
)"
```

Do not stage `src/i18n/locales/*/messages.ts` if the extract also rewrote unrelated catalogs; include the `.po` files for the new strings. If `pnpm i18n:extract` dirty-diffs existing translations, include those `.po` updates in this commit so `pnpm i18n:check` stays green.

---

### Task 4: Profile restart opens Data Import

**Files:**

- Create: `src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.ts`
- Create: `src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.test.ts`
- Modify: `src/views/ProfileView/ProfileView.tsx`

**Interfaces:**

- Consumes: `nuxDispatch.restart` (existing), `useNuxNavigation()` which is `(key: NuxProgress.MilestoneKey) => void`
- Produces: `restartFirstDashboardTutorial(options): void`. `nuxActions.restart` is unchanged (still wipes milestones). Home is no longer a restart destination.

```ts
export function restartFirstDashboardTutorial(options: {
  restart: () => void;
  openMilestone: (key: NuxProgress.MilestoneKey) => void;
}): void;
```

- [ ] **Step 1: Write the failing helper tests**

Create `src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { restartFirstDashboardTutorial } from "@/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial";

describe("restartFirstDashboardTutorial", () => {
  it("wipes progress then opens add_dataset, not Home", () => {
    const restart = vi.fn();
    const openMilestone = vi.fn();
    restartFirstDashboardTutorial({ restart, openMilestone });
    expect(restart).toHaveBeenCalledTimes(1);
    expect(openMilestone).toHaveBeenCalledTimes(1);
    expect(openMilestone).toHaveBeenCalledWith("add_dataset");
    expect(restart.mock.invocationCallOrder[0]).toBeLessThan(
      openMilestone.mock.invocationCallOrder[0] ?? 0,
    );
  });
});
```

- [ ] **Step 2: Run the helper tests and confirm they fail**

Run: `pnpm vitest run src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.test.ts`

Expected: FAIL with "Failed to resolve import" / "cannot find module".

- [ ] **Step 3: Implement the helper**

Create `src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.ts`:

```ts
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

/**
 * Profile restart: wipe progress, then open milestone 1 on Data Import.
 *
 * Navigating to workspace Home instead leaves Joyride waiting 60s for the
 * upload form, which is the stuck overlay that looks like a center spinner.
 */
export function restartFirstDashboardTutorial(options: {
  restart: () => void;
  openMilestone: (key: NuxProgress.MilestoneKey) => void;
}): void {
  options.restart();
  options.openMilestone("add_dataset");
}
```

- [ ] **Step 4: Re-run the helper tests**

Run: `pnpm vitest run src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.test.ts`

Expected: PASS.

- [ ] **Step 5: Point Profile restart at the helper**

In `src/views/ProfileView/ProfileView.tsx`:

1. Add imports:

```ts
import { restartFirstDashboardTutorial } from "@/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial";
import { useNuxNavigation } from "@/components/Nux/NuxRoot/useNuxNavigation";
```

2. Inside `ProfileView`, next to `nuxDispatch`:

```ts
const openMilestone = useNuxNavigation();
```

3. Replace the `TutorialSection` `onRestart` body. Keep the analytics event. Remove `navigate(AppLinks.workspaceHome(workspace.slug))` from this handler. `navigate` stays in the file: `PasswordSection` still uses it.

```tsx
<TutorialSection
  onRestart={() => {
    restartFirstDashboardTutorial({
      restart: nuxDispatch.restart,
      openMilestone,
    });
    void AnalyticsClient.logEvent({
      event: "nux.restarted",
      workspaceId: workspace.id,
    });
  }}
/>
```

`useNuxNavigation` is valid here: `ProfileView` renders inside `AppShell`, which provides `ChatPanelStateManager`, and inside `NuxStateManager.Provider`.

- [ ] **Step 6: Run restart helper tests and existing Profile tutorial tests**

Run: `pnpm vitest run src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.test.ts src/views/ProfileView/TutorialSection/TutorialSection.test.tsx src/components/Nux/NuxStateManager/nuxActions/nuxActions.test.ts`

Expected: PASS. `nuxActions.restart` still wipes milestones. `TutorialSection` still just calls `onRestart`.

- [ ] **Step 7: Commit**

```bash
git add \
  src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.ts \
  src/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial.test.ts \
  src/views/ProfileView/ProfileView.tsx
git commit -m "$(cat <<'EOF'
fix(nux): restart the tutorial on Data Import, not Home

EOF
)"
```

---

## Self-review

**Spec coverage**

| Spec                                                                    | Task                 |
| ----------------------------------------------------------------------- | -------------------- |
| §2 Confirm modal, copy, `dismiss()` on confirm, cancel leaves panel     | Task 3               |
| §2 Skip confirm when every milestone is complete; no completed card     | Task 3 helper        |
| §2 Pill and tooltip Close unchanged                                     | Task 3 (not touched) |
| §3 `restart()` unchanged; destination is `openMilestone("add_dataset")` | Task 4               |
| §4.1 Helper + `isDocumentVisible` + event type; no remount              | Task 1               |
| §4.2 Keep `NuxRootContents` mounted while a milestone is active         | Task 2               |
| §5 Tests (helper, panel, restart, NuxRoot); no e2e                      | Tasks 1–4            |
| §6 `nuxActions.ts` unchanged                                            | All tasks            |

**Out of scope left out:** Spotlight, completed card, persisting step index, Playwright Cmd+Tab.
