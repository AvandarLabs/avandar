# Case Statuses 3: Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the status screens: a reusable status set editor, a Statuses section on the create-case-type form, the case type page and record page rebuilt on `AppView` (with an Edit statuses modal and a record status control), the records list rebuilt on `AppListPane` with a status filter and a matching count, the cache invalidation that keeps all of them current, and three UI-driven E2E specs.

**Architecture:** Presentational status components live in `src/components/caseStatuses/` and know nothing about data loading: `StatusDot`, `StatusBadge`, `StatusColorPicker`, and the controlled `StatusSetEditor` (create mode `value`/`onChange`, edit mode adds saved statuses, record counts, and replacements). Views wire them to `ConceptStatusClient`, `IndividualClient`, and the permission keys from plan 1. One helper, `invalidateCaseStatusQueries`, owns spec §11: it marks the case type's record lists, counts, status queries, and every Data Explorer query stale, and reloads the route loader. The records list query and its count share one filter builder, so the key, the rows, and the count always agree.

**Tech Stack:** React 19, Mantine 9, `@dnd-kit/react` 0.1 (sortable plus its keyboard sensor), TanStack Router and Query (through `@avandar/query-hooks`), Lingui 6, Vitest with Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-case-statuses-design.md` (sections 8.1, 8.2, 8.4, 8.5, 8.6, 11, 12 E2E 1 to 3). **Overview and shared names:** `docs/superpowers/plans/2026-10-25-case-statuses.md`

---

## Before you start

- Plans 1 and 2 have landed on `feat/statuses`. Everything in the overview's "Shared names" exists with exactly those signatures: the `ConceptStatus` model and helpers, `ConceptStatusClient` (`useGetAll`, `useGetRecordCounts`, `useSaveStatusSet`), `Individual.T.statusId`, `Concept.T.defaultStatusId`, `ConceptFormValues.statuses` and `defaultStatusId`, the RPC hints, the trigger hint `case_records_editor_required`, and the permission keys.
- Read `CLAUDE.md`, `DESIGN.md` (Named Rules), `docs/design/app-view-layout.md`, `docs/rules/typescript.md`, `docs/rules/testing.md`, `docs/rules/e2e-testing.md`, `docs/rules/i18n.md`, and `docs/rules/css.md`.
- Lint rules that shape every code block below: `arrow-body-style: always` (every arrow function has a block body), `@typescript-eslint/array-type: array-simple`, explicit return types on exported functions, 80-column lines, and alphabetical CSS properties (`stylelint-order`).
- Never stage `supabase/config.toml`. Commit by path. End every commit message with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (shown as a second `-m` below). Do not push.
- Before any E2E run, run `ava supabase status` and confirm the first line is green and names the `feat-statuses` project.
- The code blocks follow the house style, but the formatter has the final word on wrapping and import order. Run `pnpm format` before every commit, then re-run the task's tests.

## Commands

| Purpose | Command |
| --- | --- |
| Unit tests for one path | `pnpm test:frontend <path or file pattern>` |
| Type check | `pnpm type-check` |
| Lint (ESLint, stylelint, react-doctor) | `pnpm lint` |
| Format changed files (oxfmt, eslint --fix, stylelint --fix) | `pnpm format` |
| Lingui catalogs | `pnpm i18n:extract && pnpm i18n:compile` |
| Catalog gate | `pnpm i18n:check` |
| One E2E spec | `pnpm test:e2e <spec>.spec.ts` |
| Design detector | `.claude/skills/impeccable/scripts/impeccable detect --json <paths>` |

## Decisions this plan locks in

| Topic | Decision | Why |
| --- | --- | --- |
| Status color in the UI | A small square `StatusDot` beside the name. `StatusBadge` is a neutral `light` badge carrying the dot, never a badge filled with the status color. | The One Blue Rule: neutral carries the interface. A filled yellow or teal badge would also fail text contrast. The dot has an inset hairline so a yellow dot stays visible on white. |
| Record status control | A Mantine `Menu` whose trigger shows the current badge, with one item per status. Each item and the trigger sit in a tooltip that opens on hover and focus. | Menu items take real DOM focus, which is what lets each option's description open on keyboard focus. Combobox options are only highlighted, so a `Select` cannot show a tooltip on focus. |
| Keyboard reordering | `@dnd-kit/react`'s default keyboard sensor on the drag handle (Space or Enter, arrows, Space or Enter), plus Alt and Up or Down on the same handle to move one place. | The GIS layer list's pattern. The sensor needs real layout to find a drop target, which jsdom does not have, so the Alt shortcut is the deterministic path the unit test and the E2E spec drive. |
| Title accessory | `AppViewHeader` gains `titleAccessory`, rendered beside the name outside the heading. | The spec puts the status control "beside" the record name. Putting a button inside the `role="heading"` title would make the heading's accessible name "Case 001 Status: Suspected". |
| List pane scrolling | `AppListPane` gains `bodyRef`, so the virtualized records list measures the pane's own scrolling body. | A second scroll container inside the pane body would double-scroll. |
| §11 superset | A record status change also invalidates the case type's `ConceptStatusClient` queries. | The case type page shows a record count per status, and the default stale time is six minutes. |
| View records button | Shown only with `case_records__can_view_record`. | Without it the button leads to the access-denied page. |

## File structure

| File | Responsibility |
| --- | --- |
| Create `src/components/caseStatuses/StatusDot/StatusDot.tsx` | A status color square, labelled by the status name when it stands alone |
| Create `src/components/caseStatuses/StatusDot/StatusDot.module.css` | Dot sizes and the hairline that keeps light colors visible |
| Create `src/components/caseStatuses/StatusDot/StatusDot.test.tsx` | Labelled and hidden dots |
| Create `src/components/caseStatuses/StatusBadge/StatusBadge.tsx` | Neutral badge with the dot and name, description tooltip on hover and focus |
| Create `src/components/caseStatuses/StatusBadge/StatusBadge.test.tsx` | Tooltip on focus, no focus when embedded |
| Create `src/components/caseStatuses/useStatusColorLabels.ts` | Translated name of each palette color |
| Create `src/components/caseStatuses/StatusColorPicker/StatusColorPicker.tsx` | Swatch button that opens the eight-color palette |
| Create `src/components/caseStatuses/StatusColorPicker/StatusColorPicker.module.css` | Swatch and palette grid |
| Create `src/components/caseStatuses/StatusColorPicker/StatusColorPicker.test.tsx` | Accessible color name, picked color reported |
| Create `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.tsx` | The controlled editor: rows, drag and drop, add, set-level messages |
| Create `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.types.ts` | `StatusReplacements` and `StatusSetEditorActions` |
| Create `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css` | Row grid, handle, removed rows, narrow-container layout |
| Create `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.test.tsx` | Validation, default handling, keyboard reorder, replacements |
| Create `src/components/caseStatuses/StatusSetEditor/makeStatusSetEditorActions.ts` | Pure edits of a set value: add, update, remove, default, move |
| Create `src/components/caseStatuses/StatusSetEditor/useStatusSetIssueMessages.ts` | `findSetIssues` translated into row and set messages |
| Create `src/components/caseStatuses/StatusSetEditor/StatusSetEditorRow.tsx` | One sortable row |
| Create `src/components/caseStatuses/StatusSetEditor/StatusSetEditorFields.tsx` | A row's name, description, and default radio |
| Create `src/components/caseStatuses/StatusSetEditor/StatusDragHandle.tsx` | Reorder handle with keyboard instructions and the Alt shortcut |
| Create `src/components/caseStatuses/StatusSetEditor/RemovedStatusList.tsx` | Removed saved statuses that still have records |
| Create `src/components/caseStatuses/StatusSetEditor/RemovedStatusRow.tsx` | "Move N records to" select for one removed status |
| Create `src/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues.ts` | Form values to a set value, dropping a stale default |
| Create `.../getStatusSetValueFromFormValues/getStatusSetValueFromFormValues.test.ts` | Default kept or dropped |
| Create `src/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset/ConceptStatusesFieldset.tsx` | The create form's Statuses section bound to the form |
| Create `.../ConceptStatusesFieldset/ConceptStatusesFieldset.test.tsx` | Edits written back into the form |
| Modify `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx` | Render the section, block submit while the set has issues |
| Create `src/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter.ts` | The one `where` the records list and its count share |
| Create `.../makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter.test.ts` | Unfiltered and filtered shapes, stable id order |
| Modify `src/views/IndividualManagerApp/useConceptIndividuals.ts` | Options object, status filter in the key and the page query |
| Modify `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx` | New `useConceptIndividuals` call |
| Create `src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.ts` | Spec §11 in one place |
| Create `.../invalidateCaseStatusQueries/invalidateCaseStatusQueries.test.ts` | Against a real `QueryClient` cache |
| Modify `src/components/layouts/AppView/AppViewHeader/AppViewHeader.tsx` and `.module.css` | `titleAccessory` |
| Create `src/components/layouts/AppView/AppViewHeader/AppViewHeader.test.tsx` | Accessory outside the heading |
| Modify `src/components/layouts/AppListPane/AppListPane.tsx` | `bodyRef` |
| Move `src/views/IndividualManagerApp/IndividualNavbar.tsx` and `.module.css` to `src/views/IndividualManagerApp/IndividualNavbar/` and rewrite | Records list on `AppListPane` with filter and count |
| Create `src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbarRows.tsx` | Loading, empty, and virtualized rows |
| Create `src/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter.tsx` | Status multi-select |
| Create `src/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilterOption.tsx` | Dot, name, description tooltip |
| Create `src/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter.test.tsx` | Picked statuses reported |
| Move `src/views/IndividualManagerApp/useVirtualIndividualLinks.ts` to `.tsx` and modify | Status dot on each row |
| Modify `src/views/IndividualManagerApp/index.tsx` | Outlet owns its scrolling, list pane keyed by case type |
| Create `src/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl.tsx` | Menu for editors, badge for everyone else |
| Create `.../RecordStatusControl/RecordStatusMenu.tsx` | The status menu |
| Create `.../RecordStatusControl/RecordStatusControl.module.css` | Trigger styling |
| Create `.../RecordStatusControl/RecordStatusControl.test.tsx` | Menu, tooltips, viewer badge |
| Create `src/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange.ts` | Optimistic save, rollback, toast, invalidation |
| Create `.../useRecordStatusChange/useRecordStatusChange.test.tsx` | Optimistic, rollback, refusal copy, invalidation |
| Create `src/views/IndividualManagerApp/SingleIndividualView/RecordRail/RecordRail.tsx` and `.test.tsx` | Record reference facts |
| Create `src/views/IndividualManagerApp/SingleIndividualView/useHydratedIndividual.ts` | The existing hydration hook, moved out of `index.tsx` unchanged |
| Create `src/views/IndividualManagerApp/SingleIndividualView/RecordDetailsSection.tsx` | Details section |
| Modify `src/views/IndividualManagerApp/SingleIndividualView/index.tsx` | Record page on `AppView` |
| Modify `src/views/IndividualManagerApp/SingleIndividualView/ActivityBlock.tsx` | Drop its own heading, the section names it |
| Modify `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx` | Key the view by record |
| Create `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList.tsx`, `.module.css`, `.test.tsx` | Status rows on the case type page |
| Create `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/EditStatusesForm.tsx` | The modal's form |
| Create `.../EditStatusesForm/RenameWarning.tsx` | Saved filters match names |
| Create `.../EditStatusesForm/SaveErrorCallout.tsx` | Save hint to translated copy |
| Create `.../EditStatusesForm/EditStatusesForm.test.tsx` | Save gating, rename warning, refused save |
| Create `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesModal.tsx` | Loads, saves, closes |
| Create `.../EditStatusesModal/useSaveCaseTypeStatuses.ts` | Save mutation plus §11 invalidation |
| Create `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusesSection.tsx` | Statuses section and its Edit statuses action |
| Create `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeRail.tsx` | Case type reference facts |
| Create `src/views/OntologyDesignerApp/ConceptMetaView/RefreshRecordsButton.tsx` | The sync action, split out |
| Create `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActionsMenu.tsx` | Overflow menu with Delete case type |
| Modify `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.tsx` | Gated header actions |
| Modify `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.test.tsx` (plan 1's) | Delete now lives in the overflow menu; render with a `QueryClient` |
| Modify `src/views/OntologyDesignerApp/ConceptMetaView/ViewRecordsButton.tsx` | Primary (filled) |
| Modify `src/views/OntologyDesignerApp/ConceptMetaView/index.tsx` | Case type page on `AppView` |
| Modify `src/views/OntologyDesignerApp/index.tsx` | The case type route owns its scrolling |
| Modify `src/i18n/locales/*/messages.po` and `messages.ts` | Regenerated catalogs |
| Create `tests/e2e/helpers/insertE2ECaseTypeWithRecords.ts` | Seed a case type with chosen statuses and records, beside plan 1's `insertE2ECaseType` |
| Create `tests/e2e/case-statuses-record.spec.ts` | E2E 1 |
| Create `tests/e2e/case-statuses-edit.spec.ts` | E2E 2 |
| Create `tests/e2e/case-statuses-list-filter.spec.ts` | E2E 3 |
| Modify `docs/ontology-architecture.md` | Section 9 UI map, section 13 item 5 |

---

## Task 1: StatusDot

**Files:**
- Create: `src/components/caseStatuses/StatusDot/StatusDot.tsx`
- Create: `src/components/caseStatuses/StatusDot/StatusDot.module.css`
- Test: `src/components/caseStatuses/StatusDot/StatusDot.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import { render, screen } from "@/test-utils";

describe("StatusDot", () => {
  it("is announced by the status name when it has a label", () => {
    render(<StatusDot color="#40c057" label="Active" />);

    expect(screen.getByRole("img", { name: "Active" })).toBeInTheDocument();
  });

  it("is hidden from assistive technology when the name is written beside it", () => {
    render(<StatusDot color="#40c057" />);

    expect(screen.queryByRole("img")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/components/caseStatuses/StatusDot`
Expected: FAIL, `Failed to resolve import "@/components/caseStatuses/StatusDot/StatusDot"`.

- [ ] **Step 3: Write the stylesheet**

`src/components/caseStatuses/StatusDot/StatusDot.module.css`:

```css
/*
 * A square rather than a circle: the form language is rectilinear. The inset
 * hairline keeps a light color such as yellow visible on a white surface.
 */
.statusDot {
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px var(--ava-border-default);
  display: inline-block;
  flex-shrink: 0;
  height: calc(0.5rem * var(--mantine-scale));
  width: calc(0.5rem * var(--mantine-scale));
}

.statusDot[data-size="md"] {
  border-radius: var(--mantine-radius-xs);
  height: calc(0.875rem * var(--mantine-scale));
  width: calc(0.875rem * var(--mantine-scale));
}
```

- [ ] **Step 4: Write the component**

`src/components/caseStatuses/StatusDot/StatusDot.tsx`:

```tsx
import clsx from "clsx";
import css from "@/components/caseStatuses/StatusDot/StatusDot.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The status color, a `#rrggbb` string. */
  color: string;

  /**
   * The status name. Set it when the dot stands alone, such as on a records
   * list row, so the dot is announced by it. Leave it unset when the name is
   * already written beside the dot.
   */
  label?: string;

  /** `md` for a swatch someone clicks, `sm` (the default) beside a name. */
  size?: "sm" | "md";

  className?: string;
};

/**
 * A small square of a status's color.
 *
 * A status keeps its color to this mark rather than filling a badge with it,
 * so the interface stays neutral and every status name reads at the same
 * contrast whatever color the case type designer picked.
 */
export function StatusDot({
  color,
  label,
  size = "sm",
  className,
}: Readonly<Props>): ReactNode {
  return (
    <span
      className={clsx(css.statusDot, className)}
      data-size={size}
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
      // The color is data the user chose, so it cannot live in the
      // stylesheet.
      style={{ backgroundColor: color }}
    />
  );
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `pnpm test:frontend src/components/caseStatuses/StatusDot`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/caseStatuses/StatusDot
git commit -m "feat(case-statuses): add the status color dot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: StatusBadge

**Files:**
- Create: `src/components/caseStatuses/StatusBadge/StatusBadge.tsx`
- Test: `src/components/caseStatuses/StatusBadge/StatusBadge.test.tsx`

`StatusBadge` is the shared name plan 4 renders in the chat draft card. Its props are final: `name`, `color`, optional `description`, optional `withTooltip` (default `true`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import { act, render, screen, waitFor } from "@/test-utils";

const DESCRIPTION = "A lab test came back positive.";

describe("StatusBadge", () => {
  it("shows what the status means when the badge has keyboard focus", async () => {
    render(
      <StatusBadge name="Confirmed" color="#fa5252" description={DESCRIPTION} />,
    );

    const badge = screen
      .getByText("Confirmed")
      .closest<HTMLElement>("[tabindex='0']");
    expect(badge).not.toBeNull();
    act(() => {
      badge?.focus();
    });

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(DESCRIPTION);
    });
  });

  it("takes no focus inside a control that explains the status itself", () => {
    render(
      <StatusBadge
        name="Confirmed"
        color="#fa5252"
        description={DESCRIPTION}
        withTooltip={false}
      />,
    );

    expect(screen.getByText("Confirmed").closest("[tabindex]")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/components/caseStatuses/StatusBadge`
Expected: FAIL, `Failed to resolve import "@/components/caseStatuses/StatusBadge/StatusBadge"`.

- [ ] **Step 3: Write the component**

`src/components/caseStatuses/StatusBadge/StatusBadge.tsx`:

```tsx
import { Tooltip } from "@avandar/ui";
import { Badge } from "@mantine/core";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import type { ReactNode } from "react";

type Props = {
  /** The status name, as the case type designer wrote it. */
  name: string;

  /** The status color, a `#rrggbb` string. */
  color: string;

  /** What the status means. Shown in a tooltip on hover and focus when set. */
  description?: string;

  /**
   * Set to `false` when the badge sits inside another control (a menu item,
   * a button) that shows the description itself. A badge with its own
   * tooltip takes keyboard focus so the tooltip can be reached, and a
   * focusable element inside a button is invalid.
   */
  withTooltip?: boolean;
};

/**
 * A status as a badge: the status color as a dot, then the name, on the
 * same neutral badge every other label in the app uses.
 *
 * The badge itself is never filled with the status color. Neutral carries
 * the interface, and a filled yellow or teal badge would also fail text
 * contrast.
 */
export function StatusBadge({
  name,
  color,
  description,
  withTooltip = true,
}: Readonly<Props>): ReactNode {
  const hasTooltip =
    withTooltip && description !== undefined && description !== "";
  const badge = (
    <Badge
      variant="light"
      color="neutral"
      radius="sm"
      size="md"
      tt="none"
      fw={500}
      leftSection={<StatusDot color={color} />}
      tabIndex={hasTooltip ? 0 : undefined}
    >
      {name}
    </Badge>
  );

  return hasTooltip ? (
    <Tooltip label={description} multiline maw={280}>
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm test:frontend src/components/caseStatuses/StatusBadge`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/caseStatuses/StatusBadge
git commit -m "feat(case-statuses): add the status badge" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Palette color names and StatusColorPicker

**Files:**
- Create: `src/components/caseStatuses/useStatusColorLabels.ts`
- Create: `src/components/caseStatuses/StatusColorPicker/StatusColorPicker.tsx`
- Create: `src/components/caseStatuses/StatusColorPicker/StatusColorPicker.module.css`
- Test: `src/components/caseStatuses/StatusColorPicker/StatusColorPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { StatusColorPicker } from "@/components/caseStatuses/StatusColorPicker/StatusColorPicker";
import { fireEvent, render, screen } from "@/test-utils";

describe("StatusColorPicker", () => {
  it("names the status and its current color on the swatch button", () => {
    render(
      <StatusColorPicker
        color="#40c057"
        statusName="Active"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Active color: Green" }),
    ).toBeInTheDocument();
  });

  it("reports the palette color picked for the status", async () => {
    const onChange = vi.fn();
    render(
      <StatusColorPicker
        color="#40c057"
        statusName="Active"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Active color: Green" }));
    fireEvent.click(await screen.findByRole("button", { name: "Red" }));

    expect(onChange).toHaveBeenCalledWith("#fa5252");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend src/components/caseStatuses/StatusColorPicker`
Expected: FAIL, `Failed to resolve import "@/components/caseStatuses/StatusColorPicker/StatusColorPicker"`.

- [ ] **Step 3: Write the color names hook**

`src/components/caseStatuses/useStatusColorLabels.ts`. "Purple" and "Gray" are the user's words for the `grape` and `neutral` keys:

```ts
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * The user-facing name of each status palette color, keyed by its palette
 * key. A swatch announces its color by this name.
 *
 * @returns A translated name for every `ConceptStatus.ColorKey`.
 */
export function useStatusColorLabels(): Record<
  ConceptStatus.ColorKey,
  string
> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      neutral: t`Gray`,
      green: t`Green`,
      blue: t`Blue`,
      teal: t`Teal`,
      yellow: t`Yellow`,
      orange: t`Orange`,
      red: t`Red`,
      grape: t`Purple`,
    };
  }, [t]);
}
```

- [ ] **Step 4: Write the stylesheet**

`src/components/caseStatuses/StatusColorPicker/StatusColorPicker.module.css`:

```css
.statusColorPickerPalette {
  display: grid;
  gap: var(--mantine-spacing-xxs);
  grid-template-columns: repeat(4, auto);
}

/* Same footprint as an `xs` input, so the swatch lines up with its row. */
.statusColorPickerSwatch {
  align-items: center;
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  display: flex;
  height: calc(1.875rem * var(--mantine-scale));
  justify-content: center;
  transition: var(--ava-transition-interactive);
  width: calc(1.875rem * var(--mantine-scale));
}

.statusColorPickerSwatch:hover {
  background-color: var(--mantine-color-neutral-1);
}

.statusColorPickerSwatch[aria-pressed="true"] {
  border-color: var(--ava-border-focus);
}
```

- [ ] **Step 5: Write the component**

`src/components/caseStatuses/StatusColorPicker/StatusColorPicker.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Popover, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import css from "@/components/caseStatuses/StatusColorPicker/StatusColorPicker.module.css";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import { useStatusColorLabels } from "@/components/caseStatuses/useStatusColorLabels";
import type { ReactNode } from "react";

type Props = {
  /** The status's current color, a `#rrggbb` string. */
  color: string;

  /** The status's name, so the swatch says which status it colors. */
  statusName: string;

  /** Called with the palette hex the user picks. */
  onChange: (color: string) => void;
};

/**
 * A swatch button showing a status's color. It opens the eight-color status
 * palette, and picking a color closes it.
 *
 * A color outside the palette (stored by a future custom-color feature)
 * still shows on the swatch and is announced as "Custom".
 */
export function StatusColorPicker({
  color,
  statusName,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const colorLabels = useStatusColorLabels();
  const [isOpen, setIsOpen] = useState(false);
  const colorKey = ConceptStatus.getColorKey(color);
  const colorName = colorKey === undefined ? t`Custom` : colorLabels[colorKey];

  return (
    <Popover
      opened={isOpen}
      onChange={setIsOpen}
      position="bottom-start"
      trapFocus
    >
      <Popover.Target>
        <UnstyledButton
          className={css.statusColorPickerSwatch}
          aria-label={t`${statusName} color: ${colorName}`}
          onClick={() => {
            setIsOpen((wasOpen) => {
              return !wasOpen;
            });
          }}
        >
          <StatusDot color={color} size="md" />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <div
          role="group"
          aria-label={t`Colors for ${statusName}`}
          className={css.statusColorPickerPalette}
        >
          {ConceptStatus.PALETTE.map((swatch) => {
            return (
              <UnstyledButton
                key={swatch.key}
                className={css.statusColorPickerSwatch}
                aria-label={colorLabels[swatch.key]}
                aria-pressed={swatch.hex === color.toLowerCase()}
                onClick={() => {
                  onChange(swatch.hex);
                  setIsOpen(false);
                }}
              >
                <StatusDot color={swatch.hex} size="md" />
              </UnstyledButton>
            );
          })}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
```

- [ ] **Step 6: Run the test and watch it pass**

Run: `pnpm test:frontend src/components/caseStatuses/StatusColorPicker`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/caseStatuses/useStatusColorLabels.ts src/components/caseStatuses/StatusColorPicker
git commit -m "feat(case-statuses): add the status color picker" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Task 4: StatusSetEditor, editing a set

**Files:**
- Create: `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.types.ts`
- Create: `src/components/caseStatuses/StatusSetEditor/makeStatusSetEditorActions.ts`
- Create: `src/components/caseStatuses/StatusSetEditor/useStatusSetIssueMessages.ts`
- Create: `src/components/caseStatuses/StatusSetEditor/StatusDragHandle.tsx`
- Create: `src/components/caseStatuses/StatusSetEditor/StatusSetEditorFields.tsx`
- Create: `src/components/caseStatuses/StatusSetEditor/StatusSetEditorRow.tsx`
- Create: `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.tsx`
- Create: `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css`
- Test: `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.test.tsx`

`StatusSetEditor` is the shared name plan 4 uses in create mode. Its full props, final after Task 5:

| Prop | Type | Mode |
| --- | --- | --- |
| `value` | `ConceptStatus.SetValue` | both |
| `onChange` | `(value: ConceptStatus.SetValue) => void` | both |
| `savedStatuses` | `readonly ConceptStatus.T[]`, default `[]` | edit |
| `recordCounts` | `Partial<Record<ConceptStatus.Id, number>>`, default `{}` | edit |
| `replacements` | `StatusReplacements`, default `{}` | edit |
| `onReplacementsChange` | `(replacements: StatusReplacements) => void`, default no-op | edit |

`StatusReplacements` is `Partial<Record<ConceptStatus.Id, ConceptStatus.Id>>`, exported from `StatusSetEditor.types.ts`.

- [ ] **Step 1: Write the failing tests**

`src/components/caseStatuses/StatusSetEditor/StatusSetEditor.test.tsx`:

```tsx
/*
 * The status set editor is controlled, so these tests render it inside a
 * small stateful harness that feeds every change back in, the way the
 * create form and the Edit statuses modal do.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import { fireEvent, render, screen } from "@/test-utils";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

const ACTIVE_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const INACTIVE_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;

const ACTIVE: ConceptStatus.Draft = {
  id: ACTIVE_ID,
  name: "Active",
  description: "Open and being worked on.",
  color: "#40c057",
};
const INACTIVE: ConceptStatus.Draft = {
  id: INACTIVE_ID,
  name: "Inactive",
  description: "No longer being worked on.",
  color: "#637c95",
};
const DEFAULT_SET: ConceptStatus.SetValue = {
  statuses: [ACTIVE, INACTIVE],
  defaultStatusId: ACTIVE_ID,
};

type HarnessProps = {
  initialValue: ConceptStatus.SetValue;
  savedStatuses?: readonly ConceptStatus.T[];
  recordCounts?: Partial<Record<ConceptStatus.Id, number>>;
  onValueChange?: (value: ConceptStatus.SetValue) => void;
  onReplacementsChange?: (replacements: StatusReplacements) => void;
};

function StatusSetEditorHarness(props: Readonly<HarnessProps>): ReactNode {
  const [value, setValue] = useState(props.initialValue);
  const [replacements, setReplacements] = useState<StatusReplacements>({});
  return (
    <StatusSetEditor
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        props.onValueChange?.(nextValue);
      }}
      savedStatuses={props.savedStatuses}
      recordCounts={props.recordCounts}
      replacements={replacements}
      onReplacementsChange={(nextReplacements) => {
        setReplacements(nextReplacements);
        props.onReplacementsChange?.(nextReplacements);
      }}
    />
  );
}

function _getLastValue(
  onValueChange: ReturnType<typeof vi.fn>,
): ConceptStatus.SetValue {
  return onValueChange.mock.lastCall?.[0] as ConceptStatus.SetValue;
}

describe("StatusSetEditor", () => {
  it("labels the default radio group and names each row's controls after its status", () => {
    render(<StatusSetEditorHarness initialValue={DEFAULT_SET} />);

    expect(
      screen.getByRole("radiogroup", { name: "Default status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reorder Active" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Active color: Green" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Inactive" }),
    ).toBeInTheDocument();
  });

  it("adds a status in the first palette color the set does not use yet", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add status" }));

    const added = _getLastValue(onValueChange).statuses[2];
    expect(added?.name).toBe("");
    expect(added?.color).toBe("#228be6");
  });

  it("asks for a name on a status whose name is blank", () => {
    render(<StatusSetEditorHarness initialValue={DEFAULT_SET} />);

    fireEvent.click(screen.getByRole("button", { name: "Add status" }));

    expect(screen.getByText("Enter a name.")).toBeInTheDocument();
  });

  it("flags a status whose name repeats another one in a different case", () => {
    render(
      <StatusSetEditorHarness
        initialValue={{
          statuses: [ACTIVE, { ...INACTIVE, name: "active" }],
          defaultStatusId: ACTIVE_ID,
        }}
      />,
    );

    expect(
      screen.getAllByText("Another status has this name.").length,
    ).toBeGreaterThan(0);
  });

  it("makes the chosen status the default", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    );

    expect(_getLastValue(onValueChange).defaultStatusId).toBe(INACTIVE_ID);
    expect(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    ).toBeChecked();
  });

  it("moves the default to the first remaining status when the default is removed", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Active" }));

    expect(_getLastValue(onValueChange).defaultStatusId).toBe(INACTIVE_ID);
    expect(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    ).toBeChecked();
  });

  it("asks for at least one status once every status is removed", () => {
    render(<StatusSetEditorHarness initialValue={DEFAULT_SET} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Active" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));

    expect(screen.getByText("Add at least one status.")).toBeInTheDocument();
  });

  it("moves a status down one place with Alt and the down arrow on its reorder handle", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Active" }), {
      key: "ArrowDown",
      altKey: true,
    });

    expect(
      _getLastValue(onValueChange).statuses.map((status) => {
        return status.id;
      }),
    ).toEqual([INACTIVE_ID, ACTIVE_ID]);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm test:frontend src/components/caseStatuses/StatusSetEditor`
Expected: FAIL, `Failed to resolve import "@/components/caseStatuses/StatusSetEditor/StatusSetEditor"`.

- [ ] **Step 3: Write the shared types**

`src/components/caseStatuses/StatusSetEditor/StatusSetEditor.types.ts`:

```ts
/*
 * Types shared by the status set editor and the views that drive it in
 * edit mode.
 */
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * Where the records of each removed saved status move, keyed by the removed
 * status. A removed status with records needs an entry before the set can
 * be saved.
 */
export type StatusReplacements = Partial<
  Record<ConceptStatus.Id, ConceptStatus.Id>
>;

/** Every edit the status set editor can make to its value. */
export type StatusSetEditorActions = {
  addStatus: () => void;
  updateStatus: (status: ConceptStatus.Draft) => void;
  removeStatus: (statusId: ConceptStatus.Id) => void;
  makeDefault: (statusId: ConceptStatus.Id) => void;
  moveStatus: (options: {
    statusId: ConceptStatus.Id;
    offset: -1 | 1;
  }) => void;
  reorderStatuses: (statuses: ConceptStatus.Draft[]) => void;
};
```

- [ ] **Step 4: Write the editing actions**

`src/components/caseStatuses/StatusSetEditor/makeStatusSetEditorActions.ts`:

```ts
import { makeObjectFromEntries, objectEntries, prop } from "@avandar/utils";
import { arrayMove } from "@dnd-kit/helpers";
import { uuid } from "$/lib/uuid";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type {
  StatusReplacements,
  StatusSetEditorActions,
} from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";

type Options = {
  value: ConceptStatus.SetValue;
  onChange: (value: ConceptStatus.SetValue) => void;
  replacements: StatusReplacements;
  onReplacementsChange: (replacements: StatusReplacements) => void;
};

function _hasDefault(value: ConceptStatus.SetValue): boolean {
  return value.statuses.some((status) => {
    return status.id === value.defaultStatusId;
  });
}

function _addStatus(value: ConceptStatus.SetValue): ConceptStatus.SetValue {
  const newStatusId: ConceptStatus.Id = uuid();
  const newStatus: ConceptStatus.Draft = {
    id: newStatusId,
    name: "",
    description: "",
    color: ConceptStatus.getNextFreeColor(value.statuses.map(prop("color"))),
  };
  return {
    statuses: [...value.statuses, newStatus],
    // A set with no usable default gets one as soon as it has a status.
    defaultStatusId: _hasDefault(value) ? value.defaultStatusId : newStatusId,
  };
}

function _removeStatus(options: {
  value: ConceptStatus.SetValue;
  statusId: ConceptStatus.Id;
}): ConceptStatus.SetValue {
  const { value, statusId } = options;
  const statuses = value.statuses.filter((status) => {
    return status.id !== statusId;
  });
  const keepsDefault = value.defaultStatusId !== statusId && _hasDefault(value);
  return {
    statuses,
    defaultStatusId: keepsDefault ? value.defaultStatusId : statuses[0]?.id,
  };
}

function _moveStatus(options: {
  value: ConceptStatus.SetValue;
  statusId: ConceptStatus.Id;
  offset: -1 | 1;
}): ConceptStatus.SetValue {
  const { value, statusId, offset } = options;
  const fromIndex = value.statuses.findIndex((status) => {
    return status.id === statusId;
  });
  const toIndex = fromIndex + offset;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= value.statuses.length) {
    return value;
  }
  return {
    ...value,
    statuses: arrayMove([...value.statuses], fromIndex, toIndex),
  };
}

function _withoutReplacementsTo(options: {
  replacements: StatusReplacements;
  statusId: ConceptStatus.Id;
}): StatusReplacements {
  return makeObjectFromEntries(
    objectEntries(options.replacements).filter(([, replacementId]) => {
      return replacementId !== options.statusId;
    }),
  );
}

/**
 * The edits the status set editor makes, each one reported as a whole new
 * set value. Removing a status also forgets any replacement that pointed at
 * it, so a removed status's records never move to another removed status.
 *
 * @returns One callback per edit, bound to the current value.
 */
export function makeStatusSetEditorActions(
  options: Readonly<Options>,
): StatusSetEditorActions {
  const { value, onChange, replacements, onReplacementsChange } = options;
  return {
    addStatus: () => {
      onChange(_addStatus(value));
    },
    updateStatus: (updatedStatus) => {
      const statuses = value.statuses.map((status) => {
        return status.id === updatedStatus.id ? updatedStatus : status;
      });
      onChange({ ...value, statuses });
    },
    removeStatus: (statusId) => {
      onChange(_removeStatus({ value, statusId }));
      onReplacementsChange(_withoutReplacementsTo({ replacements, statusId }));
    },
    makeDefault: (statusId) => {
      onChange({ ...value, defaultStatusId: statusId });
    },
    moveStatus: ({ statusId, offset }) => {
      onChange(_moveStatus({ value, statusId, offset }));
    },
    reorderStatuses: (statuses) => {
      onChange({ ...value, statuses });
    },
  };
}
```

- [ ] **Step 5: Write the issue messages hook**

`src/components/caseStatuses/StatusSetEditor/useStatusSetIssueMessages.ts`. It is the only place a `ConceptStatus.SetIssue` becomes copy:

```ts
import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";

type Options = {
  value: ConceptStatus.SetValue;
  savedStatuses: readonly ConceptStatus.T[];
  recordCounts: Partial<Record<ConceptStatus.Id, number>>;
  replacements: StatusReplacements;
};

type StatusSetIssueMessages = {
  /** Problems that belong to one status, keyed by that status. */
  byStatusId: Partial<Record<ConceptStatus.Id, string>>;

  /** Problems with the set as a whole. */
  forSet: string[];
};

/**
 * Every problem `ConceptStatus.findSetIssues` finds in a status set, as
 * translated copy placed where the user can fix it: beside the status it
 * belongs to, or under the list for problems with the whole set.
 *
 * @returns Messages keyed by status, and messages about the whole set.
 */
export function useStatusSetIssueMessages(
  options: Readonly<Options>,
): StatusSetIssueMessages {
  const { t } = useLingui();
  const issues = ConceptStatus.findSetIssues({
    value: options.value,
    recordCounts: options.recordCounts,
    savedStatusIds: options.savedStatuses.map(prop("id")),
    replacements: options.replacements,
  });
  const byStatusId: Partial<Record<ConceptStatus.Id, string>> = {};
  const forSet: string[] = [];

  issues.forEach((issue) => {
    match(issue)
      .with({ type: "empty_set" }, () => {
        forSet.push(t`Add at least one status.`);
      })
      .with({ type: "default_required" }, () => {
        forSet.push(t`Choose a default status.`);
      })
      .with({ type: "name_required" }, ({ statusId }) => {
        byStatusId[statusId] = t`Enter a name.`;
      })
      .with({ type: "name_not_unique" }, ({ statusId }) => {
        byStatusId[statusId] = t`Another status has this name.`;
      })
      .with({ type: "replacement_required" }, ({ statusId }) => {
        byStatusId[statusId] = t`Choose a status for these records.`;
      })
      .exhaustive();
  });

  return { byStatusId, forSet };
}
```

- [ ] **Step 6: Write the drag handle**

`src/components/caseStatuses/StatusSetEditor/StatusDragHandle.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { useId } from "react";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { KeyboardEvent, ReactNode, Ref } from "react";

type Props = {
  statusName: string;
  handleRef: Ref<HTMLButtonElement>;
  isDragging: boolean;
  onMoveByOffset: (offset: -1 | 1) => void;
};

function _onMoveKeyDown(
  options: Readonly<{
    event: KeyboardEvent<HTMLButtonElement>;
    onMoveByOffset: Props["onMoveByOffset"];
  }>,
): void {
  const { event, onMoveByOffset } = options;
  if (!event.altKey) {
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    onMoveByOffset(-1);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    onMoveByOffset(1);
  }
}

/**
 * The reorder handle of one status row. Pointer users drag it. Keyboard users
 * either pick the row up with Space or Enter and move it with the arrow keys
 * (the drag and drop keyboard sensor), or hold Alt and press an arrow to move
 * it one place at once.
 */
export function StatusDragHandle({
  statusName,
  handleRef,
  isDragging,
  onMoveByOffset,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const instructionsId = useId();

  return (
    <>
      <button
        type="button"
        ref={handleRef}
        className={css.statusSetEditorHandle}
        aria-label={t`Reorder ${statusName}`}
        aria-describedby={instructionsId}
        aria-keyshortcuts="Space Enter Alt+ArrowUp Alt+ArrowDown"
        onKeyDown={(event) => {
          // While the keyboard sensor is carrying the row, the arrow keys
          // belong to it.
          if (!isDragging) {
            _onMoveKeyDown({ event, onMoveByOffset });
          }
        }}
      >
        <IconGripVertical size={14} stroke={2} aria-hidden />
      </button>
      <VisuallyHidden id={instructionsId}>
        {t`Press Space or Enter to pick up this status, move it with the arrow keys, then press Space or Enter to drop it. Or hold Alt and press the up or down arrow to move it one place.`}
      </VisuallyHidden>
    </>
  );
}
```

- [ ] **Step 7: Write the row fields**

`src/components/caseStatuses/StatusSetEditor/StatusSetEditorFields.tsx`. It returns three grid items of the row:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Radio, TextInput } from "@mantine/core";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusSetEditorActions } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  status: ConceptStatus.Draft;
  /** The name to announce, with a fallback for a status not named yet. */
  displayName: string;
  isDefault: boolean;
  radioName: string;
  nameError: string | undefined;
  actions: StatusSetEditorActions;
};

/**
 * The editable parts of one status row: its name, what it means, and
 * whether new records start in it.
 */
export function StatusSetEditorFields({
  status,
  displayName,
  isDefault,
  radioName,
  nameError,
  actions,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <>
      <TextInput
        size="xs"
        className={css.statusSetEditorName}
        aria-label={t`Status name`}
        placeholder={t`Status name`}
        value={status.name}
        error={nameError}
        onChange={(event) => {
          actions.updateStatus({ ...status, name: event.currentTarget.value });
        }}
      />
      <TextInput
        size="xs"
        className={css.statusSetEditorDescription}
        aria-label={t`Description`}
        placeholder={t`What this status means`}
        value={status.description}
        onChange={(event) => {
          actions.updateStatus({
            ...status,
            description: event.currentTarget.value,
          });
        }}
      />
      <div className={css.statusSetEditorDefault}>
        <Radio
          size="xs"
          name={radioName}
          value={status.id}
          checked={isDefault}
          label={t`Default`}
          aria-label={t`Make ${displayName} the default`}
          onChange={() => {
            actions.makeDefault(status.id);
          }}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 8: Write the row**

`src/components/caseStatuses/StatusSetEditor/StatusSetEditorRow.tsx`:

```tsx
import { ActionIcon } from "@avandar/ui";
import { useSortable } from "@dnd-kit/react/sortable";
import { useLingui } from "@lingui/react/macro";
import { IconTrash } from "@tabler/icons-react";
import { StatusColorPicker } from "@/components/caseStatuses/StatusColorPicker/StatusColorPicker";
import { StatusDragHandle } from "@/components/caseStatuses/StatusSetEditor/StatusDragHandle";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import { StatusSetEditorFields } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditorFields";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusSetEditorActions } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  status: ConceptStatus.Draft;
  index: number;
  isDefault: boolean;
  radioName: string;
  nameError: string | undefined;
  actions: StatusSetEditorActions;
};

/**
 * One status in the editor: a reorder handle, its color, its name and
 * description, the default radio, and a remove button. Every control is
 * named after the status, so a screen reader user knows which row it is in.
 */
export function StatusSetEditorRow({
  status,
  index,
  isDefault,
  radioName,
  nameError,
  actions,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { ref, handleRef, isDragging } = useSortable({ id: status.id, index });
  const displayName = status.name.trim() || t`Untitled status`;

  return (
    <li
      ref={ref}
      className={css.statusSetEditorRow}
      data-dragging={isDragging}
      aria-label={displayName}
    >
      <StatusDragHandle
        statusName={displayName}
        handleRef={handleRef}
        isDragging={isDragging}
        onMoveByOffset={(offset) => {
          actions.moveStatus({ statusId: status.id, offset });
        }}
      />
      <div className={css.statusSetEditorColor}>
        <StatusColorPicker
          color={status.color}
          statusName={displayName}
          onChange={(color) => {
            actions.updateStatus({ ...status, color });
          }}
        />
      </div>
      <StatusSetEditorFields
        {...{ status, displayName, isDefault, radioName, nameError, actions }}
      />
      <div className={css.statusSetEditorRemove}>
        <ActionIcon
          variant="subtle"
          color="neutral"
          tooltip={t`Remove ${displayName}`}
          aria-label={t`Remove ${displayName}`}
          onClick={() => {
            actions.removeStatus(status.id);
          }}
        >
          <IconTrash size={14} aria-hidden />
        </ActionIcon>
      </div>
    </li>
  );
}
```

- [ ] **Step 9: Write the stylesheet**

`src/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css`. The editor is a named container, so a narrow host (the chat draft card in plan 4) gets the stacked layout without the editor knowing where it is:

```css
.statusSetEditor {
  container: status-set-editor / inline-size;
}

.statusSetEditorList {
  list-style: none;
  margin: 0;
  padding: 0;
}

/*
 * One row is a grid so the inputs line up across rows. `start` alignment
 * keeps the controls on the first line when a name error adds a second.
 */
.statusSetEditorRow {
  align-items: start;
  background-color: var(--ava-surface-raised);
  column-gap: var(--mantine-spacing-xs);
  display: grid;
  grid-template-areas: "handle color name description default remove";
  grid-template-columns:
    auto auto minmax(7rem, 1fr)
    minmax(9rem, 2fr) auto auto;
  padding-block: var(--mantine-spacing-xxs);
  position: relative;
  row-gap: var(--mantine-spacing-xxs);
}

.statusSetEditorRow + .statusSetEditorRow {
  border-top: 1px solid var(--ava-border-default);
}

.statusSetEditorRow[data-dragging="true"] {
  box-shadow: var(--mantine-shadow-md);
  z-index: 1;
}

/* Every non-input cell is one `xs` input tall, so it centers on the input. */
.statusSetEditorHandle,
.statusSetEditorColor,
.statusSetEditorDefault,
.statusSetEditorRemove {
  align-items: center;
  display: flex;
  min-height: calc(1.875rem * var(--mantine-scale));
}

.statusSetEditorHandle {
  background: none;
  border: 0;
  border-radius: var(--mantine-radius-xs);
  color: var(--mantine-color-neutral-5);
  cursor: grab;
  grid-area: handle;
  justify-content: center;
  padding: 0 2px;
}

.statusSetEditorHandle:hover {
  color: var(--mantine-color-neutral-8);
}

.statusSetEditorHandle:focus-visible {
  outline-offset: -2px;
}

.statusSetEditorColor {
  grid-area: color;
}

.statusSetEditorName {
  grid-area: name;
  min-width: 0;
}

.statusSetEditorDescription {
  grid-area: description;
  min-width: 0;
}

.statusSetEditorDefault {
  grid-area: default;
}

.statusSetEditorRemove {
  grid-area: remove;
}

@container status-set-editor (width < 34rem) {
  .statusSetEditorRow {
    grid-template-areas:
      "handle color name default remove"
      ". . description description description";
    grid-template-columns: auto auto minmax(0, 1fr) auto auto;
  }
}
```

- [ ] **Step 10: Write the editor**

`src/components/caseStatuses/StatusSetEditor/StatusSetEditor.tsx`:

```tsx
import { noop } from "@avandar/utils";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useId } from "react";
import { makeStatusSetEditorActions } from "@/components/caseStatuses/StatusSetEditor/makeStatusSetEditorActions";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import { StatusSetEditorRow } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditorRow";
import { useStatusSetIssueMessages } from "@/components/caseStatuses/StatusSetEditor/useStatusSetIssueMessages";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

const NO_SAVED_STATUSES: readonly ConceptStatus.T[] = [];
const NO_RECORD_COUNTS: Partial<Record<ConceptStatus.Id, number>> = {};
const NO_REPLACEMENTS: StatusReplacements = {};

type Props = {
  /** The statuses being edited, in display order, and the default. */
  value: ConceptStatus.SetValue;

  onChange: (value: ConceptStatus.SetValue) => void;

  /** Edit mode: the statuses as saved. Leave unset when creating. */
  savedStatuses?: readonly ConceptStatus.T[];

  /** Edit mode: how many records hold each saved status. */
  recordCounts?: Partial<Record<ConceptStatus.Id, number>>;

  /** Edit mode: where each removed saved status's records move. */
  replacements?: StatusReplacements;

  onReplacementsChange?: (replacements: StatusReplacements) => void;
};

/**
 * Edits a case type's statuses: their order, color, name, and description,
 * and which one new records start in.
 *
 * It is controlled: every edit reports a whole new set value and nothing is
 * kept inside. Problems are shown where they can be fixed, never as a
 * blocking dialog, and the caller decides whether the set can be saved with
 * `ConceptStatus.findSetIssues`. In edit mode it also receives the saved
 * statuses and their record counts, so a removed status that still has
 * records can ask where those records go.
 */
export function StatusSetEditor({
  value,
  onChange,
  savedStatuses = NO_SAVED_STATUSES,
  recordCounts = NO_RECORD_COUNTS,
  replacements = NO_REPLACEMENTS,
  onReplacementsChange = noop,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const radioName = useId();
  const actions = makeStatusSetEditorActions({
    value,
    onChange,
    replacements,
    onReplacementsChange,
  });
  const issueMessages = useStatusSetIssueMessages({
    value,
    savedStatuses,
    recordCounts,
    replacements,
  });

  return (
    <Stack gap="sm" className={css.statusSetEditor}>
      <DragDropProvider
        onDragEnd={(event) => {
          actions.reorderStatuses(move([...value.statuses], event));
        }}
      >
        <div role="radiogroup" aria-label={t`Default status`}>
          <ul className={css.statusSetEditorList}>
            {value.statuses.map((status, index) => {
              return (
                <StatusSetEditorRow
                  key={status.id}
                  status={status}
                  index={index}
                  isDefault={status.id === value.defaultStatusId}
                  radioName={radioName}
                  nameError={issueMessages.byStatusId[status.id]}
                  actions={actions}
                />
              );
            })}
          </ul>
        </div>
      </DragDropProvider>
      {issueMessages.forSet.map((message) => {
        return (
          <Text key={message} size="sm" c="danger" role="alert">
            {message}
          </Text>
        );
      })}
      <div>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={actions.addStatus}
        >
          <Trans>Add status</Trans>
        </Button>
      </div>
    </Stack>
  );
}
```

- [ ] **Step 11: Run the tests and watch them pass**

Run: `pnpm test:frontend src/components/caseStatuses/StatusSetEditor`
Expected: PASS, 8 tests.

If "moves the default to the first remaining status" fails because the radio for Inactive is not checked, check that `_removeStatus` reads `value.defaultStatusId` before filtering. If "flags a status whose name repeats" fails, print `ConceptStatus.findSetIssues` for that value: the test only requires at least one row to be flagged.

- [ ] **Step 12: Type-check and commit**

Run: `pnpm type-check`
Expected: no errors.

```bash
git add src/components/caseStatuses/StatusSetEditor
git commit -m "feat(case-statuses): add the status set editor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: StatusSetEditor, removed statuses that still have records

**Files:**
- Create: `src/components/caseStatuses/StatusSetEditor/RemovedStatusRow.tsx`
- Create: `src/components/caseStatuses/StatusSetEditor/RemovedStatusList.tsx`
- Modify: `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.tsx`
- Modify: `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css`
- Test: `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to the imports of `StatusSetEditor.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";
```

Append at the end of the file:

```tsx
const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000e1" as Workspace.Id;

function _makeSavedStatus(
  draft: ConceptStatus.Draft,
  position: number,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: draft.id,
    workspaceId: WORKSPACE_ID,
    conceptId: CONCEPT_ID,
    name: draft.name,
    description: draft.description,
    color: draft.color,
    position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SAVED_STATUSES = [
  _makeSavedStatus(ACTIVE, 0),
  _makeSavedStatus(INACTIVE, 1),
];

describe("StatusSetEditor in edit mode", () => {
  it("asks where a removed status's records go", () => {
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        savedStatuses={SAVED_STATUSES}
        recordCounts={{ [INACTIVE_ID]: 2 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));

    expect(
      screen.getByRole("combobox", { name: "Move 2 records to" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose a status for these records."),
    ).toBeInTheDocument();
  });

  it("records the status chosen for a removed status's records", () => {
    const onReplacementsChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        savedStatuses={SAVED_STATUSES}
        recordCounts={{ [INACTIVE_ID]: 2 }}
        onReplacementsChange={onReplacementsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));
    pickMantineSelectOption("Move 2 records to", "Active");

    expect(onReplacementsChange).toHaveBeenLastCalledWith({
      [INACTIVE_ID]: ACTIVE_ID,
    });
    expect(screen.queryByText("Choose a status for these records.")).toBeNull();
  });

  it("drops a removed status that has no records without asking", () => {
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        savedStatuses={SAVED_STATUSES}
        recordCounts={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));

    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm test:frontend src/components/caseStatuses/StatusSetEditor`
Expected: FAIL on "asks where a removed status's records go" and "records the status chosen", with `Unable to find an accessible element with the role "combobox" and name "Move 2 records to"`. The other 9 pass.

- [ ] **Step 3: Write the removed row**

`src/components/caseStatuses/StatusSetEditor/RemovedStatusRow.tsx`:

```tsx
import { Select } from "@avandar/ui";
import { Plural, useLingui } from "@lingui/react/macro";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The saved status the user removed. */
  status: ConceptStatus.T;
  recordCount: number;
  /** The statuses still in the set, which the records can move to. */
  remainingStatuses: readonly ConceptStatus.Draft[];
  replacementId: ConceptStatus.Id | undefined;
  error: string | undefined;
  onReplacementChange: (replacementId: ConceptStatus.Id | undefined) => void;
};

/**
 * A removed status that records still hold: its badge, and where those
 * records move when the set is saved.
 */
export function RemovedStatusRow({
  status,
  recordCount,
  remainingStatuses,
  replacementId,
  error,
  onReplacementChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const options = remainingStatuses.map((remaining) => {
    return {
      value: remaining.id,
      label: remaining.name.trim() || t`Untitled status`,
    };
  });

  return (
    <li
      className={css.statusSetEditorRemovedRow}
      aria-label={t`Removed: ${status.name}`}
    >
      <StatusBadge name={status.name} color={status.color} withTooltip={false} />
      <Select<ConceptStatus.Id>
        size="xs"
        className={css.statusSetEditorReplacement}
        label={
          <Plural
            value={recordCount}
            one="Move # record to"
            other="Move # records to"
          />
        }
        placeholder={t`Choose a status`}
        data={options}
        value={replacementId ?? null}
        error={error}
        onChange={(nextReplacementId) => {
          onReplacementChange(nextReplacementId ?? undefined);
        }}
      />
    </li>
  );
}
```

- [ ] **Step 4: Write the removed list**

`src/components/caseStatuses/StatusSetEditor/RemovedStatusList.tsx`:

```tsx
import { prop } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { RemovedStatusRow } from "@/components/caseStatuses/StatusSetEditor/RemovedStatusRow";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  value: ConceptStatus.SetValue;
  savedStatuses: readonly ConceptStatus.T[];
  recordCounts: Partial<Record<ConceptStatus.Id, number>>;
  replacements: StatusReplacements;
  errorsByStatusId: Partial<Record<ConceptStatus.Id, string>>;
  onReplacementsChange: (replacements: StatusReplacements) => void;
};

/**
 * Saved statuses the user removed that records still hold. Each one asks
 * where its records go. A removed status with no records needs nothing and
 * is not listed.
 */
export function RemovedStatusList({
  value,
  savedStatuses,
  recordCounts,
  replacements,
  errorsByStatusId,
  onReplacementsChange,
}: Readonly<Props>): ReactNode {
  const removedWithRecords = useMemo(() => {
    const removedIds = new Set(
      ConceptStatus.getRemovedStatusIds({
        savedStatusIds: savedStatuses.map(prop("id")),
        statuses: value.statuses,
      }),
    );
    return savedStatuses.filter((status) => {
      return removedIds.has(status.id) && (recordCounts[status.id] ?? 0) > 0;
    });
  }, [savedStatuses, value.statuses, recordCounts]);

  if (removedWithRecords.length === 0) {
    return null;
  }

  return (
    <div className={css.statusSetEditorRemoved}>
      <Text size="xs" fw={600} c="neutral.7">
        <Trans>Removed statuses that records still use</Trans>
      </Text>
      <ul className={css.statusSetEditorRemovedList}>
        {removedWithRecords.map((status) => {
          return (
            <RemovedStatusRow
              key={status.id}
              status={status}
              recordCount={recordCounts[status.id] ?? 0}
              remainingStatuses={value.statuses}
              replacementId={replacements[status.id]}
              error={errorsByStatusId[status.id]}
              onReplacementChange={(replacementId) => {
                onReplacementsChange({
                  ...replacements,
                  [status.id]: replacementId,
                });
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Render the list in the editor**

In `StatusSetEditor.tsx`, add the import after the `makeStatusSetEditorActions` import:

```tsx
import { RemovedStatusList } from "@/components/caseStatuses/StatusSetEditor/RemovedStatusList";
```

Then replace:

```tsx
      </DragDropProvider>
      {issueMessages.forSet.map((message) => {
```

with:

```tsx
      </DragDropProvider>
      <RemovedStatusList
        value={value}
        savedStatuses={savedStatuses}
        recordCounts={recordCounts}
        replacements={replacements}
        errorsByStatusId={issueMessages.byStatusId}
        onReplacementsChange={onReplacementsChange}
      />
      {issueMessages.forSet.map((message) => {
```

- [ ] **Step 6: Style the removed rows**

Append to `StatusSetEditor.module.css`, above the `@container` block:

```css
.statusSetEditorRemoved {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-xs);
}

.statusSetEditorRemovedList {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

/* The badge sits on the select's input line, under its label. */
.statusSetEditorRemovedRow {
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: var(--mantine-spacing-sm);
}

.statusSetEditorReplacement {
  flex: 1;
  min-width: 12rem;
}
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `pnpm test:frontend src/components/caseStatuses/StatusSetEditor`
Expected: PASS, 11 tests.

- [ ] **Step 8: Commit**

```bash
git add src/components/caseStatuses/StatusSetEditor
git commit -m "feat(case-statuses): ask where a removed status's records go" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: The create form's Statuses section

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues.ts`
- Test: `src/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues.test.ts`
- Create: `src/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset/ConceptStatusesFieldset.tsx`
- Test: `src/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset/ConceptStatusesFieldset.test.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx`

The form already starts with the default set (`getDefaultConceptFormValues()`) and already sends `statuses` and `defaultStatusId` through `ConceptClient.create`. This task only shows and edits them, and blocks submit while the set has a problem. The form keeps its layout. A field the user names "status" by hand is plan 2's validation, not this task's.

- [ ] **Step 1: Write the failing helper test**

`getStatusSetValueFromFormValues.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getStatusSetValueFromFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

const ACTIVE: ConceptStatus.Draft = {
  id: "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id,
  name: "Active",
  description: "",
  color: "#40c057",
};
const REMOVED_STATUS_ID =
  "00000000-0000-4000-8000-0000000000a9" as ConceptStatus.Id;

describe("getStatusSetValueFromFormValues", () => {
  it("keeps the default when it names one of the statuses", () => {
    expect(
      getStatusSetValueFromFormValues({
        statuses: [ACTIVE],
        defaultStatusId: ACTIVE.id,
      }),
    ).toEqual({ statuses: [ACTIVE], defaultStatusId: ACTIVE.id });
  });

  it("drops a default that no longer names any status", () => {
    expect(
      getStatusSetValueFromFormValues({
        statuses: [ACTIVE],
        defaultStatusId: REMOVED_STATUS_ID,
      }).defaultStatusId,
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend getStatusSetValueFromFormValues`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the helper**

`getStatusSetValueFromFormValues.ts`:

```ts
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * The create form's statuses as a status set value.
 *
 * The form keeps its last default when every status is removed, because its
 * `defaultStatusId` cannot be empty. A default that no longer names a status
 * is dropped here, so the editor and the form's validation both see a set
 * with no default.
 *
 * @param values The form's `statuses` and `defaultStatusId`.
 * @returns The set value the status set editor edits.
 */
export function getStatusSetValueFromFormValues(
  values: Readonly<{
    statuses: readonly ConceptStatus.Draft[];
    defaultStatusId: ConceptStatus.Id | undefined;
  }>,
): ConceptStatus.SetValue {
  const { statuses, defaultStatusId } = values;
  const hasDefault = statuses.some((status) => {
    return status.id === defaultStatusId;
  });
  return { statuses, defaultStatusId: hasDefault ? defaultStatusId : undefined };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend getStatusSetValueFromFormValues`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write the failing fieldset test**

`ConceptStatusesFieldset.test.tsx`:

```tsx
import { useForm } from "@avandar/ui/hooks";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { ConceptStatusesFieldset } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset/ConceptStatusesFieldset";
import { getDefaultConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

type HarnessProps = {
  onReadValues: (values: ConceptFormValues) => void;
};

function FormHarness({ onReadValues }: Readonly<HarnessProps>): ReactNode {
  const conceptForm: FormType<ConceptFormValues> = useForm({
    mode: "uncontrolled",
    initialValues: getDefaultConceptFormValues(),
  });
  return (
    <>
      <ConceptStatusesFieldset conceptForm={conceptForm} />
      <button
        type="button"
        onClick={() => {
          onReadValues(conceptForm.getValues());
        }}
      >
        Read values
      </button>
    </>
  );
}

function _readValues(onReadValues: ReturnType<typeof vi.fn>): ConceptFormValues {
  fireEvent.click(screen.getByRole("button", { name: "Read values" }));
  return onReadValues.mock.lastCall?.[0] as ConceptFormValues;
}

describe("ConceptStatusesFieldset", () => {
  it("starts a new case type with the default statuses", () => {
    render(<FormHarness onReadValues={vi.fn()} />);

    expect(
      screen.getAllByRole("textbox", { name: "Status name" }).map((input) => {
        return (input as HTMLInputElement).value;
      }),
    ).toEqual(["Active", "Inactive"]);
  });

  it("writes an added status back into the case type form", () => {
    const onReadValues = vi.fn();
    render(<FormHarness onReadValues={onReadValues} />);

    fireEvent.click(screen.getByRole("button", { name: "Add status" }));

    expect(_readValues(onReadValues).statuses).toHaveLength(3);
  });

  it("moves the form's default when the default status is removed", () => {
    const onReadValues = vi.fn();
    render(<FormHarness onReadValues={onReadValues} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Active" }));

    const values = _readValues(onReadValues);
    expect(values.defaultStatusId).toBe(values.statuses[0]?.id);
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `pnpm test:frontend ConceptStatusesFieldset`
Expected: FAIL, `Failed to resolve import ".../ConceptStatusesFieldset/ConceptStatusesFieldset"`.

- [ ] **Step 7: Write the fieldset**

`ConceptStatusesFieldset.tsx`. `variant="unstyled"` keeps the `fieldset` grouping and its legend without drawing another box inside the form panel:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Fieldset, Stack, Text } from "@mantine/core";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import { getStatusSetValueFromFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

type Props = {
  conceptForm: FormType<ConceptFormValues>;
};

/**
 * The create form's statuses: the stages a new case type's records move
 * through, and the one they start in. Every edit goes straight back into
 * the form, which sends the set when the case type is created.
 */
export function ConceptStatusesFieldset({
  conceptForm,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { statuses, defaultStatusId } = conceptForm.getValues();
  const statusesError = conceptForm.errors.statuses;

  return (
    <Fieldset variant="unstyled" legend={t`Statuses`}>
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          <Trans>
            The stages a record moves through. New records start in the
            default status.
          </Trans>
        </Text>
        <StatusSetEditor
          value={getStatusSetValueFromFormValues({ statuses, defaultStatusId })}
          onChange={(nextValue) => {
            conceptForm.setFieldValue("statuses", nextValue.statuses);
            // The form's default cannot be empty. An emptied set keeps the
            // last one, and `getStatusSetValueFromFormValues` drops it.
            if (nextValue.defaultStatusId !== undefined) {
              conceptForm.setFieldValue(
                "defaultStatusId",
                nextValue.defaultStatusId,
              );
            }
            conceptForm.clearFieldError("statuses");
          }}
        />
        {statusesError ? (
          <Text size="sm" c="danger">
            {statusesError}
          </Text>
        ) : null}
      </Stack>
    </Fieldset>
  );
}
```

- [ ] **Step 8: Run it and watch it pass**

Run: `pnpm test:frontend ConceptStatusesFieldset`
Expected: PASS, 3 tests.

- [ ] **Step 9: Wire it into the create form**

In `src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx`, add these imports in their sorted places:

```tsx
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusesFieldset } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset/ConceptStatusesFieldset";
import { getStatusSetValueFromFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues";
```

Add this entry as the last key of the `validate` object passed to `useForm` (plan 2 may have added keys of its own; keep them):

```tsx
      // The editor shows each problem beside the status it belongs to. This
      // rule only stops the submit while any problem remains.
      statuses: (statuses, values) => {
        const issues = ConceptStatus.findSetIssues({
          value: getStatusSetValueFromFormValues({
            statuses,
            defaultStatusId: values.defaultStatusId,
          }),
        });
        return issues.length > 0
          ? t`Fix the statuses above before you create this case type.`
          : null;
      },
```

Then render the section right above the submit button. Replace:

```tsx
              <Box>
                <Button type="submit" loading={isSendConceptFormPending}>
```

with:

```tsx
              <ConceptStatusesFieldset conceptForm={conceptForm} />

              <Box>
                <Button type="submit" loading={isSendConceptFormPending}>
```

- [ ] **Step 10: Verify**

Run: `pnpm type-check`
Expected: no errors.

Run: `pnpm test:frontend src/views/OntologyDesignerApp`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptCreatorView/index.tsx src/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset src/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues
git commit -m "feat(case-statuses): edit statuses on the create-case-type form" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Task 7: One filter for the records list and its count

**Files:**
- Create: `src/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter.ts`
- Test: `src/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter.test.ts`
- Modify: `src/views/IndividualManagerApp/useConceptIndividuals.ts`
- Modify: `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx`

- [ ] **Step 1: Write the failing test**

`makeRecordsWhereFromStatusFilter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeRecordsWhereFromStatusFilter } from "@/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const SUSPECTED_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const CONFIRMED_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;

describe("makeRecordsWhereFromStatusFilter", () => {
  it("filters by case type alone when no status is chosen", () => {
    expect(
      makeRecordsWhereFromStatusFilter({ conceptId: CONCEPT_ID, statusIds: [] }),
    ).toEqual({ where: { concept_id: { eq: CONCEPT_ID } } });
  });

  it("lists the chosen statuses in one order however they were picked", () => {
    expect(
      makeRecordsWhereFromStatusFilter({
        conceptId: CONCEPT_ID,
        statusIds: [CONFIRMED_ID, SUSPECTED_ID],
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        status_id: { in: [SUSPECTED_ID, CONFIRMED_ID] },
      },
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend makeRecordsWhereFromStatusFilter`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the filter builder**

`makeRecordsWhereFromStatusFilter.ts`:

```ts
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { FiltersByColumn } from "@avandar/utils";

/**
 * The filter for one case type's records, narrowed to the chosen statuses
 * when any are chosen.
 *
 * The records list, its count, and both of their query keys use this one
 * filter, so the count in the list header always matches the rows under it.
 *
 * @param options.conceptId The case type.
 * @param options.statusIds The chosen statuses. Empty means every status.
 * @returns A `where` for `IndividualClient` queries.
 */
export function makeRecordsWhereFromStatusFilter(
  options: Readonly<{
    conceptId: Concept.Id;
    statusIds: readonly ConceptStatus.Id[];
  }>,
): { where: FiltersByColumn<Individual.T<"DBRead">> } {
  const { conceptId, statusIds } = options;
  if (statusIds.length === 0) {
    return { where: { concept_id: { eq: conceptId } } };
  }
  return {
    where: {
      concept_id: { eq: conceptId },
      // Sorted so one selection picked in a different order shares a query
      // key, and so a cache entry.
      status_id: { in: [...statusIds].sort() },
    },
  };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend makeRecordsWhereFromStatusFilter`
Expected: PASS, 2 tests.

- [ ] **Step 5: Filter the records list query**

Replace the whole of `src/views/IndividualManagerApp/useConceptIndividuals.ts` with:

```ts
import { prop } from "@avandar/utils";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { makeRecordsWhereFromStatusFilter } from "@/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";

const PAGE_SIZE = 20;

const NO_STATUS_IDS: readonly ConceptStatus.Id[] = [];

type ConceptIndividualsPage = {
  allIndividuals: Individual.T[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  fetchNextPage: () => unknown;
};

/**
 * Pages through one case type's records, narrowed to the given statuses when
 * any are given.
 *
 * The query key is the `getAll` key of the filter the records count also
 * uses, so the chosen statuses are part of the key, and a status change finds
 * every list of the case type by its `concept_id`. While a new filter loads,
 * the previous rows stay on screen rather than flashing to a loader.
 *
 * @param options.conceptId The case type.
 * @param options.statusIds The chosen statuses. Empty or unset means all.
 */
export function useConceptIndividuals(
  options: Readonly<{
    conceptId: Concept.Id;
    statusIds?: readonly ConceptStatus.Id[];
  }>,
): ConceptIndividualsPage {
  const { conceptId, statusIds = NO_STATUS_IDS } = options;
  const recordsWhere = makeRecordsWhereFromStatusFilter({ conceptId, statusIds });
  const query = useInfiniteQuery({
    queryKey: IndividualClient.QueryKeys.getAll(recordsWhere),
    queryFn: (ctx) => {
      return IndividualClient.getPage({
        pageSize: PAGE_SIZE,
        pageNum: ctx.pageParam,
        ...recordsWhere,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage;
    },
    initialPageParam: 0,
    placeholderData: keepPreviousData,
  });

  const allIndividuals = useMemo(() => {
    return query.data ? query.data.pages.flatMap(prop("rows")) : [];
  }, [query.data]);

  return {
    allIndividuals,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    fetchNextPage: query.fetchNextPage,
  };
}
```

- [ ] **Step 6: Update the other caller**

In `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx`, replace:

```tsx
  const { allIndividuals, isLoading } = useConceptIndividuals(concept.id);
```

with:

```tsx
  const { allIndividuals, isLoading } = useConceptIndividuals({
    conceptId: concept.id,
  });
```

In `src/views/IndividualManagerApp/IndividualNavbar.tsx`, make the same change to its call (Task 11 rewrites this file, but every commit should type-check):

```tsx
  } = useConceptIndividuals({ conceptId: concept.id });
```

- [ ] **Step 7: Verify and commit**

Run: `pnpm type-check`
Expected: no errors.

```bash
git add src/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter src/views/IndividualManagerApp/useConceptIndividuals.ts src/views/IndividualManagerApp/IndividualNavbar.tsx 'src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/index.tsx'
git commit -m "feat(case-statuses): filter the records list query by status" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 8: Cache invalidation for status changes

**Files:**
- Create: `src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.ts`
- Test: `src/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries.test.ts`

This is spec §11 in one place. The record page and the Edit statuses modal both call it. It runs against a real `QueryClient` in the test: each case seeds the cache with the keys the screens really build, then checks `isInvalidated`.

- [ ] **Step 1: Write the failing test**

`invalidateCaseStatusQueries.test.ts`:

```ts
import { where } from "@avandar/utils";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { RAW_SQL_KEY_MARKER } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import { makeRecordsWhereFromStatusFilter } from "@/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { QueryKey } from "@tanstack/react-query";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const OTHER_CONCEPT_ID = "00000000-0000-4000-8000-0000000000c2" as Concept.Id;
const STATUS_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;

type SeededKeys = {
  filteredRecords: QueryKey;
  recordCount: QueryKey;
  otherCaseTypeRecords: QueryKey;
  statuses: QueryKey;
  statusRecordCounts: QueryKey;
  caseType: QueryKey;
  dataQuery: QueryKey;
};

function _makeSeededCache(): { queryClient: QueryClient; keys: SeededKeys } {
  const queryClient = new QueryClient();
  const keys: SeededKeys = {
    filteredRecords: IndividualClient.QueryKeys.getAll(
      makeRecordsWhereFromStatusFilter({
        conceptId: CONCEPT_ID,
        statusIds: [STATUS_ID],
      }),
    ),
    recordCount: IndividualClient.QueryKeys.getCount(
      makeRecordsWhereFromStatusFilter({ conceptId: CONCEPT_ID, statusIds: [] }),
    ),
    otherCaseTypeRecords: IndividualClient.QueryKeys.getAll(
      makeRecordsWhereFromStatusFilter({
        conceptId: OTHER_CONCEPT_ID,
        statusIds: [],
      }),
    ),
    statuses: ConceptStatusClient.QueryKeys.getAll(
      where("concept_id", "eq", CONCEPT_ID),
    ),
    statusRecordCounts: ConceptStatusClient.QueryKeys.getRecordCounts({
      conceptId: CONCEPT_ID,
    }),
    caseType: ConceptClient.QueryKeys.getById({ id: CONCEPT_ID }),
    dataQuery: [
      { auth: "workspace", workspaceId: "w1" },
      undefined,
      RAW_SQL_KEY_MARKER,
      "select 1",
    ],
  };
  Object.values(keys).forEach((queryKey) => {
    queryClient.setQueryData(queryKey, "cached");
  });
  return { queryClient, keys };
}

function _isStale(queryClient: QueryClient, queryKey: QueryKey): boolean {
  return queryClient.getQueryState(queryKey)?.isInvalidated === true;
}

function _makeRouter(): { invalidate: ReturnType<typeof vi.fn> } {
  return {
    invalidate: vi.fn(() => {
      return Promise.resolve();
    }),
  };
}

describe("invalidateCaseStatusQueries", () => {
  it("marks the case type's record lists, record count, and status counts stale after a record's status changes", async () => {
    const { queryClient, keys } = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(_isStale(queryClient, keys.filteredRecords)).toBe(true);
    expect(_isStale(queryClient, keys.recordCount)).toBe(true);
    expect(_isStale(queryClient, keys.statusRecordCounts)).toBe(true);
  });

  it("leaves another case type's records alone", async () => {
    const { queryClient, keys } = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(_isStale(queryClient, keys.otherCaseTypeRecords)).toBe(false);
  });

  it("marks every Data Explorer query stale, since a query can group by status", async () => {
    const { queryClient, keys } = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(_isStale(queryClient, keys.dataQuery)).toBe(true);
  });

  it("reloads the open route's loader data", async () => {
    const { queryClient } = _makeSeededCache();
    const router = _makeRouter();

    await invalidateCaseStatusQueries({
      queryClient,
      router,
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(router.invalidate).toHaveBeenCalledTimes(1);
  });

  it("marks the case type and its statuses stale only when its status set is saved", async () => {
    const recordChange = _makeSeededCache();
    const setSave = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient: recordChange.queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });
    await invalidateCaseStatusQueries({
      queryClient: setSave.queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "statusSet",
    });

    expect(_isStale(recordChange.queryClient, recordChange.keys.caseType)).toBe(
      false,
    );
    expect(_isStale(setSave.queryClient, setSave.keys.caseType)).toBe(true);
    expect(_isStale(setSave.queryClient, setSave.keys.statuses)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend invalidateCaseStatusQueries`
Expected: FAIL, `Failed to resolve import ".../invalidateCaseStatusQueries/invalidateCaseStatusQueries"`.

- [ ] **Step 3: Write the helper**

`invalidateCaseStatusQueries.ts`:

```ts
import { isPlainObject } from "@avandar/utils";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { isDataQueryKey } from "@/views/DataExplorerApp/useDataQuery/isDataQueryKey";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";

type Options = {
  queryClient: QueryClient;

  /** The app router. Its `invalidate` reloads the open route's loader. */
  router: Pick<AnyRouter, "invalidate">;

  conceptId: Concept.Id;

  /**
   * `recordStatus` after one record's status changes, `statusSet` after a
   * case type's statuses are saved.
   */
  change: "recordStatus" | "statusSet";
};

/**
 * Whether a client query reads one case type: either its params name the
 * case type (`{ conceptId }`) or its `where` filters on it, whatever else
 * the `where` narrows by, such as a status filter.
 */
function _isQueryForCaseType(
  options: Readonly<{
    queryKey: QueryKey;
    clientName: string;
    conceptId: Concept.Id;
  }>,
): boolean {
  const [keyClientName, , params] = options.queryKey;
  if (keyClientName !== options.clientName || !isPlainObject(params)) {
    return false;
  }
  if (params.conceptId === options.conceptId) {
    return true;
  }
  const { where } = params;
  return (
    isPlainObject(where) &&
    isPlainObject(where.concept_id) &&
    where.concept_id.eq === options.conceptId
  );
}

function _invalidateCaseTypeQueries(
  options: Readonly<{
    queryClient: QueryClient;
    clientName: string;
    conceptId: Concept.Id;
  }>,
): Promise<void> {
  const { queryClient, clientName, conceptId } = options;
  return queryClient.invalidateQueries({
    predicate: (query) => {
      return _isQueryForCaseType({
        queryKey: query.queryKey,
        clientName,
        conceptId,
      });
    },
  });
}

/**
 * Marks stale every query that shows a case type's statuses or the status
 * of one of its records, and reloads the open route.
 *
 * Both kinds of change refresh the case type's record lists and counts
 * (whatever status filter they use), its statuses and their record counts,
 * every Data Explorer query, and the route loader, which holds the open
 * record and the open case type. A data query's key names its SQL, not the
 * case types the SQL reads, so all of them are marked. Saving a status set
 * also refreshes the case type itself, whose default status may have moved.
 */
export async function invalidateCaseStatusQueries(
  options: Readonly<Options>,
): Promise<void> {
  const { queryClient, router, conceptId, change } = options;
  const invalidations = [
    _invalidateCaseTypeQueries({
      queryClient,
      clientName: IndividualClient.getClientName(),
      conceptId,
    }),
    _invalidateCaseTypeQueries({
      queryClient,
      clientName: ConceptStatusClient.getClientName(),
      conceptId,
    }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        return isDataQueryKey(query.queryKey);
      },
    }),
    router.invalidate(),
  ];
  if (change === "statusSet") {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: [ConceptClient.getClientName()],
      }),
    );
  }
  await Promise.all(invalidations);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend invalidateCaseStatusQueries`
Expected: PASS, 5 tests.

If `statusRecordCounts` is not marked, print `ConceptStatusClient.QueryKeys.getRecordCounts({ conceptId: CONCEPT_ID })`: the third element must be `{ conceptId }`. If plan 2 registered `getRecordCounts` with a different param shape, match it in `_isQueryForCaseType` and keep the test as written.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/invalidateCaseStatusQueries
git commit -m "feat(case-statuses): invalidate status-dependent queries in one place" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 9: Layout hooks for the status screens

**Files:**
- Modify: `src/components/layouts/AppView/AppViewHeader/AppViewHeader.tsx`
- Modify: `src/components/layouts/AppView/AppViewHeader/AppViewHeader.module.css`
- Test: `src/components/layouts/AppView/AppViewHeader/AppViewHeader.test.tsx`
- Modify: `src/components/layouts/AppListPane/AppListPane.tsx`

Read `docs/design/app-view-layout.md` first: these are shared layout primitives.

- [ ] **Step 1: Write the failing test**

`src/components/layouts/AppView/AppViewHeader/AppViewHeader.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { render, screen } from "@/test-utils";

describe("AppViewHeader", () => {
  it("shows the title accessory beside the name without adding it to the heading's name", () => {
    render(
      <AppViewHeader
        title="Case 001"
        titleAccessory={<button type="button">Status: Suspected</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Case 001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Status: Suspected" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend AppViewHeader`
Expected: FAIL, `Unable to find an accessible element with the role "button" and name "Status: Suspected"`. The prop does not exist yet, so nothing renders it.

- [ ] **Step 3: Add `titleAccessory`**

In `AppViewHeader.tsx`, add this prop to `Props` right after `title`:

```tsx
  /**
   * A control that belongs to the title rather than to the whole view, such
   * as a record's status. It sits right after the name, outside the heading,
   * so the heading's accessible name stays the name alone.
   */
  titleAccessory?: ReactNode;
```

Add `titleAccessory,` to the destructured props after `title,`. Then replace:

```tsx
          <div role="heading" aria-level={3} className={css.appViewHeaderTitle}>
            {title}
          </div>
        )}
        {actions ? (
```

with:

```tsx
          <div role="heading" aria-level={3} className={css.appViewHeaderTitle}>
            {title}
          </div>
        )}
        {titleAccessory ? (
          <div className={css.appViewHeaderTitleAccessory}>
            {titleAccessory}
          </div>
        ) : null}
        {actions ? (
```

In `AppViewHeader.module.css`, add after the `.appViewHeaderTitle` block:

```css
.appViewHeaderTitleAccessory {
  flex-shrink: 0;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend AppViewHeader`
Expected: PASS, 1 test.

- [ ] **Step 5: Add `bodyRef` to `AppListPane`**

This only forwards a ref, so it has no unit test of its own. The records list in Task 11 depends on it, and `case-statuses-list-filter.spec.ts` covers it end to end.

In `AppListPane.tsx`, change the type import to:

```tsx
import type { ReactNode, Ref } from "react";
```

Add to `Props`, after `filter`:

```tsx
  /**
   * The scrolling body, for a virtualized list that has to measure the
   * element it scrolls inside.
   */
  bodyRef?: Ref<HTMLDivElement>;
```

Add `bodyRef,` to the destructured props after `filter,`, and replace:

```tsx
      <div className={css.appListPaneBody}>{children}</div>
```

with:

```tsx
      <div ref={bodyRef} className={css.appListPaneBody}>
        {children}
      </div>
```

- [ ] **Step 6: Verify**

Run: `pnpm test:frontend src/components/layouts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/layouts/AppView/AppViewHeader src/components/layouts/AppListPane/AppListPane.tsx
git commit -m "feat(layouts): add a header title accessory and a list pane body ref" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 10: The records list status filter

**Files:**
- Create: `src/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter.tsx`
- Create: `src/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilterOption.tsx`
- Test: `src/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter.test.tsx`

- [ ] **Step 1: Write the failing test**

`StatusFilter.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { StatusFilter } from "@/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

function _makeStatus(
  options: Readonly<{ id: string; name: string; position: number }>,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: options.id as ConceptStatus.Id,
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
    conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
    name: options.name,
    description: undefined,
    color: "#228be6",
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SUSPECTED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Suspected",
  position: 0,
});
const CONFIRMED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "Confirmed",
  position: 1,
});

describe("StatusFilter", () => {
  it("reports the statuses picked in the filter", async () => {
    const onChange = vi.fn();
    render(
      <StatusFilter
        statuses={[SUSPECTED, CONFIRMED]}
        selectedStatusIds={[]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Confirmed" }));

    expect(onChange).toHaveBeenCalledWith([CONFIRMED.id]);
  });

  it("says every status shows while none is picked", () => {
    render(
      <StatusFilter
        statuses={[SUSPECTED, CONFIRMED]}
        selectedStatusIds={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("All statuses")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend StatusFilter`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the option**

`StatusFilterOption.tsx`:

```tsx
import { Tooltip } from "@avandar/ui";
import { Group, Text } from "@mantine/core";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  status: ConceptStatus.T | undefined;
};

/**
 * One status in the records filter: its color and name, with what it means
 * in a tooltip when the case type designer wrote a description.
 */
export function StatusFilterOption({ status }: Readonly<Props>): ReactNode {
  if (!status) {
    return null;
  }
  return (
    <Tooltip
      label={status.description}
      disabled={!status.description}
      position="right"
      multiline
      maw={260}
    >
      <Group gap="xs" wrap="nowrap">
        <StatusDot color={status.color} />
        <Text size="sm" span>
          {status.name}
        </Text>
      </Group>
    </Tooltip>
  );
}
```

- [ ] **Step 4: Write the filter**

`StatusFilter.tsx`:

```tsx
import { makeIdLookupMap } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { MultiSelect } from "@mantine/core";
import { useMemo } from "react";
import { StatusFilterOption } from "@/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilterOption";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  selectedStatusIds: readonly ConceptStatus.Id[];
  onChange: (statusIds: ConceptStatus.Id[]) => void;
};

/**
 * Narrows the records list to the statuses picked. Picking none shows
 * every record.
 */
export function StatusFilter({
  statuses,
  selectedStatusIds,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const statusesById = useMemo(() => {
    return makeIdLookupMap(statuses);
  }, [statuses]);
  const options = useMemo(() => {
    return statuses.map((status) => {
      return { value: status.id, label: status.name };
    });
  }, [statuses]);

  return (
    <MultiSelect<ConceptStatus.Id>
      size="xs"
      searchable
      clearable
      aria-label={t`Filter by status`}
      clearButtonProps={{ "aria-label": t`Show every status` }}
      placeholder={selectedStatusIds.length === 0 ? t`All statuses` : undefined}
      data={options}
      value={[...selectedStatusIds]}
      onChange={onChange}
      renderOption={({ option }) => {
        return <StatusFilterOption status={statusesById.get(option.value)} />;
      }}
    />
  );
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm test:frontend StatusFilter`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/views/IndividualManagerApp/IndividualNavbar/StatusFilter
git commit -m "feat(case-statuses): add the records status filter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 11: The records list on AppListPane

> **Load the `impeccable` skill before this task.** It replaces an existing surface. Run its detector on every file this task touches before committing.

**Files:**
- Move and rewrite: `src/views/IndividualManagerApp/IndividualNavbar.tsx` to `src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.tsx`
- Move and rewrite: `src/views/IndividualManagerApp/IndividualNavbar.module.css` to `src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.module.css`
- Create: `src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbarRows.tsx`
- Move and modify: `src/views/IndividualManagerApp/useVirtualIndividualLinks.ts` to `src/views/IndividualManagerApp/useVirtualIndividualLinks.tsx`
- Modify: `src/views/IndividualManagerApp/index.tsx`

The rows and the count are covered end to end by `case-statuses-list-filter.spec.ts` (Task 24). The filter has its unit test from Task 10.

- [ ] **Step 1: Move the files**

```bash
mkdir -p src/views/IndividualManagerApp/IndividualNavbar
git mv src/views/IndividualManagerApp/IndividualNavbar.tsx src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.tsx
git mv src/views/IndividualManagerApp/IndividualNavbar.module.css src/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.module.css
git mv src/views/IndividualManagerApp/useVirtualIndividualLinks.ts src/views/IndividualManagerApp/useVirtualIndividualLinks.tsx
```

`useVirtualIndividualLinks` becomes `.tsx` because each row now renders a `StatusDot`.

- [ ] **Step 2: Put the status dot on each row**

Replace the whole of `src/views/IndividualManagerApp/useVirtualIndividualLinks.tsx` with:

```tsx
import { constant } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { NavLinkProps } from "@avandar/ui";
import type { CSSProperties, RefObject } from "react";

const ROW_HEIGHT_PX = 50;

/**
 * One row of the virtualized records list: a record link, the trailing
 * loader row while another page exists, or nothing for a row whose record
 * has not arrived.
 */
export type VirtualIndividualLink =
  | (NavLinkProps & { key: string; style: CSSProperties })
  | { loadingText: string; style: CSSProperties }
  | undefined;

type Options = {
  concept: Concept.T;
  statusesById: ReadonlyMap<ConceptStatus.Id, ConceptStatus.T>;
  allIndividuals: readonly Individual.T[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
};

type MakeVirtualLinkOptions = {
  virtualRow: { index: number; size: number; start: number };
  allIndividuals: readonly Individual.T[];
  statusesById: ReadonlyMap<ConceptStatus.Id, ConceptStatus.T>;
  concept: Concept.T;
  workspaceSlug: string;
  loadingText: string;
};

function _makeVirtualLink(
  options: Readonly<MakeVirtualLinkOptions>,
): VirtualIndividualLink {
  const { virtualRow, allIndividuals, statusesById, concept } = options;
  const style: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: `${virtualRow.size}px`,
    transform: `translateY(${virtualRow.start}px)`,
  };
  if (virtualRow.index >= allIndividuals.length) {
    return { style, loadingText: options.loadingText };
  }
  const individual = allIndividuals[virtualRow.index];
  if (!individual) {
    return undefined;
  }
  const status = statusesById.get(individual.statusId);
  const appLink = AppLinks.individualManagerIndividualView({
    workspaceSlug: options.workspaceSlug,
    conceptId: concept.id,
    individualId: individual.id,
    individualName: individual.name,
  });
  return {
    ...appLink,
    label: appLink.label(),
    // The dot is the row's only mark of its status, so it is announced by
    // the status name.
    leftSection: status ? (
      <StatusDot color={status.color} label={status.name} />
    ) : undefined,
    style,
  };
}

/**
 * Virtualized nav rows for a case type's records, each marked with its
 * status color, plus the trailing loader row while another page exists.
 *
 * Attach `parentRef` to the element the list scrolls inside.
 */
export function useVirtualIndividualLinks(options: Readonly<Options>): {
  parentRef: RefObject<HTMLDivElement | null>;
  individualLinks: VirtualIndividualLink[];
  listHeight: number;
} {
  const { allIndividuals, hasNextPage, isFetchingNextPage, fetchNextPage } =
    options;
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allIndividuals.length + 1 : allIndividuals.length,
    getScrollElement: () => {
      return parentRef.current;
    },
    estimateSize: constant(ROW_HEIGHT_PX),
    overscan: 5,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1];
    if (
      lastItem &&
      lastItem.index >= allIndividuals.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    virtualRows,
    allIndividuals.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const { concept, statusesById } = options;
  const individualLinks = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      return _makeVirtualLink({
        virtualRow,
        allIndividuals,
        statusesById,
        concept,
        workspaceSlug: workspace.slug,
        loadingText: t`Loading more...`,
      });
    });
  }, [virtualRows, allIndividuals, statusesById, concept, workspace.slug, t]);

  return {
    parentRef,
    individualLinks,
    listHeight: rowVirtualizer.getTotalSize(),
  };
}
```

- [ ] **Step 3: Write the stylesheet**

Replace the whole of `IndividualNavbar/IndividualNavbar.module.css` with:

```css
/* The virtualized rows are absolutely placed inside this box. */
.individualNavbarList {
  min-height: 0;
  position: relative;
}

.individualNavbarEmptyIcon {
  color: var(--mantine-color-neutral-5);
}
```

- [ ] **Step 4: Write the rows**

`IndividualNavbar/IndividualNavbarRows.tsx`:

```tsx
import { NavLinkList } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Skeleton, Stack, Text } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import css from "@/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar.module.css";
import type { VirtualIndividualLink } from "@/views/IndividualManagerApp/useVirtualIndividualLinks";
import type { ReactNode } from "react";

type Props = {
  isLoading: boolean;
  hasRecords: boolean;
  /** Whether a status filter is narrowing the list. */
  isFiltered: boolean;
  links: readonly VirtualIndividualLink[];
  listHeight: number;
};

/**
 * The body of the records list: a skeleton while the first page loads, an
 * empty state that says whether the filter or the case type is empty, or the
 * virtualized rows.
 */
export function IndividualNavbarRows({
  isLoading,
  hasRecords,
  isFiltered,
  links,
  listHeight,
}: Readonly<Props>): ReactNode {
  if (isLoading && !hasRecords) {
    return (
      <Stack gap={6} pt="xxs">
        <Skeleton height={28} radius="sm" />
        <Skeleton height={28} radius="sm" width="80%" />
        <Skeleton height={28} radius="sm" width="65%" />
      </Stack>
    );
  }

  if (!hasRecords) {
    return (
      <Stack gap="xs" align="center" py="lg" px="xs" ta="center">
        <IconInbox
          size={22}
          stroke={1.5}
          aria-hidden
          className={css.individualNavbarEmptyIcon}
        />
        <Text size="sm" c="dimmed">
          {isFiltered ? (
            <Trans>No records have these statuses</Trans>
          ) : (
            <Trans>No records yet</Trans>
          )}
        </Text>
      </Stack>
    );
  }

  return (
    <NavLinkList
      links={links}
      gap="xs"
      inactiveHoverColor="neutral.1"
      className={css.individualNavbarList}
      // The virtualizer measures the list; its height cannot be static.
      style={{ height: listHeight }}
    />
  );
}
```

- [ ] **Step 5: Write the list pane**

Replace the whole of `IndividualNavbar/IndividualNavbar.tsx` with:

```tsx
import { makeIdLookupMap, where } from "@avandar/utils";
import { Loader } from "@mantine/core";
import { keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { AppListPane } from "@/components/layouts/AppListPane/AppListPane";
import { IndividualNavbarRows } from "@/views/IndividualManagerApp/IndividualNavbar/IndividualNavbarRows";
import { StatusFilter } from "@/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter";
import { makeRecordsWhereFromStatusFilter } from "@/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter";
import { useConceptIndividuals } from "@/views/IndividualManagerApp/useConceptIndividuals";
import { useVirtualIndividualLinks } from "@/views/IndividualManagerApp/useVirtualIndividualLinks";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

const NO_STATUSES: readonly ConceptStatus.T[] = [];

type Props = {
  concept: Concept.T;
};

/**
 * The master pane of the records workspace: one case type's records, each
 * marked with its status, narrowed by a status filter.
 *
 * The filter always shows. Unlike a dataset list, narrowing by status is
 * what this list is for, so it does not wait for the list to grow long. Its
 * state lives here, and this pane stays mounted while the user moves between
 * records, so the filter survives those clicks. The header count is the
 * number of records the filter matches, read with the same filter the rows
 * use.
 */
export function IndividualNavbar({ concept }: Readonly<Props>): ReactNode {
  const [statusIds, setStatusIds] = useState<ConceptStatus.Id[]>([]);
  const [statuses = NO_STATUSES] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const sortedStatuses = useMemo(() => {
    return ConceptStatus.sortByPosition(statuses);
  }, [statuses]);
  const statusesById = useMemo(() => {
    return makeIdLookupMap(sortedStatuses);
  }, [sortedStatuses]);
  const [matchingCount] = IndividualClient.useGetCount({
    ...makeRecordsWhereFromStatusFilter({ conceptId: concept.id, statusIds }),
    useQueryOptions: { placeholderData: keepPreviousData },
  });
  const records = useConceptIndividuals({ conceptId: concept.id, statusIds });
  const { parentRef, individualLinks, listHeight } = useVirtualIndividualLinks(
    { concept, statusesById, ...records },
  );

  return (
    <AppListPane
      title={concept.name}
      count={matchingCount ?? undefined}
      action={records.isLoading ? <Loader size={14} /> : null}
      bodyRef={parentRef}
      filter={
        <StatusFilter
          statuses={sortedStatuses}
          selectedStatusIds={statusIds}
          onChange={setStatusIds}
        />
      }
    >
      <IndividualNavbarRows
        isLoading={records.isLoading}
        hasRecords={records.allIndividuals.length > 0}
        isFiltered={statusIds.length > 0}
        links={individualLinks}
        listHeight={listHeight}
      />
    </AppListPane>
  );
}
```

- [ ] **Step 6: Let the record view own its scrolling**

In `src/views/IndividualManagerApp/index.tsx`, replace:

```tsx
import { Flex, ScrollArea } from "@mantine/core";
```

with:

```tsx
import { Flex } from "@mantine/core";
```

Replace:

```tsx
import { IndividualNavbar } from "@/views/IndividualManagerApp/IndividualNavbar";
```

with:

```tsx
import { IndividualNavbar } from "@/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar";
```

Replace:

```tsx
      <Flex align="stretch" h="100%">
        <IndividualNavbar concept={concept} miw={240} />
        <ScrollArea h="100%" w="100%">
          <Outlet />
        </ScrollArea>
      </Flex>
```

with:

```tsx
      {
        // The record view owns its own scrolling so its header band stays
        // put while the content moves under it. The list pane is keyed by
        // case type so its status filter starts empty for each one: the
        // route keeps this component mounted when only the case type in the
        // URL changes.
      }
      <Flex align="stretch" h="100%" mih={0}>
        <IndividualNavbar key={concept.id} concept={concept} />
        <Flex direction="column" flex={1} miw={0} mih={0}>
          <Outlet />
        </Flex>
      </Flex>
```

Keep anything plan 1 added to this file (for example a permission gate on `EditCaseTypeButton`).

- [ ] **Step 7: Find stale imports**

Run: `grep -rn "IndividualManagerApp/IndividualNavbar\"" src`
Expected: no output.

- [ ] **Step 8: Verify**

Run: `pnpm type-check`
Expected: no errors.

Run: `pnpm test:frontend src/views/IndividualManagerApp`
Expected: PASS.

Run: `.claude/skills/impeccable/scripts/impeccable detect --json src/views/IndividualManagerApp/IndividualNavbar src/views/IndividualManagerApp/index.tsx`
Expected: no findings. Fix any before committing.

- [ ] **Step 9: Commit**

```bash
git add src/views/IndividualManagerApp/IndividualNavbar src/views/IndividualManagerApp/useVirtualIndividualLinks.tsx src/views/IndividualManagerApp/index.tsx
git add -u src/views/IndividualManagerApp
git commit -m "feat(case-statuses): rebuild the records list with a status filter and count" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`git add -u src/views/IndividualManagerApp` stages the removal side of the two moves. Check `git status` shows `supabase/config.toml` still unstaged.

---
## Task 12: The record status control

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl.tsx`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusMenu.tsx`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl.module.css`
- Test: `src/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl.test.tsx`

- [ ] **Step 1: Write the failing test**

`RecordStatusControl.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { RecordStatusControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

const SUSPECTED_DESCRIPTION = "Reported but not yet tested.";
const CONFIRMED_DESCRIPTION = "A lab test came back positive.";

function _makeStatus(
  options: Readonly<{
    id: string;
    name: string;
    description: string;
    position: number;
  }>,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: options.id as ConceptStatus.Id,
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
    conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
    name: options.name,
    description: options.description,
    color: "#fab005",
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SUSPECTED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Suspected",
  description: SUSPECTED_DESCRIPTION,
  position: 0,
});
const CONFIRMED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "Confirmed",
  description: CONFIRMED_DESCRIPTION,
  position: 1,
});
const STATUSES = [SUSPECTED, CONFIRMED];

function _expectInTooltip(text: string): void {
  expect(screen.getByText(text).closest("[role='tooltip']")).not.toBeNull();
}

describe("RecordStatusControl", () => {
  it("reports the status picked from the status menu", async () => {
    const onChange = vi.fn();
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status: Suspected" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Confirmed" }));

    expect(onChange).toHaveBeenCalledWith(CONFIRMED.id);
  });

  it("shows what a status means when its menu option has focus", async () => {
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status: Suspected" }));
    const confirmedOption = await screen.findByRole("menuitem", {
      name: "Confirmed",
    });
    act(() => {
      confirmedOption.focus();
    });

    await waitFor(() => {
      _expectInTooltip(CONFIRMED_DESCRIPTION);
    });
  });

  it("shows what the current status means when the status button has focus", async () => {
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit
        onChange={vi.fn()}
      />,
    );

    act(() => {
      screen.getByRole("button", { name: "Status: Suspected" }).focus();
    });

    await waitFor(() => {
      _expectInTooltip(SUSPECTED_DESCRIPTION);
    });
  });

  it("shows a badge and no status menu to a user who cannot change statuses", () => {
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Suspected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Status:/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend RecordStatusControl`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the stylesheet**

`RecordStatusControl.module.css`:

```css
/*
 * The trigger reads as the badge itself plus a chevron. The fill only
 * appears on hover and while the menu is open, like a subtle button.
 */
.recordStatusControlTrigger {
  align-items: center;
  border-radius: var(--mantine-radius-sm);
  display: inline-flex;
  gap: var(--mantine-spacing-xxs);
  padding: 2px var(--mantine-spacing-xxs) 2px 2px;
  transition: var(--ava-transition-interactive);
}

.recordStatusControlTrigger:hover,
.recordStatusControlTrigger[data-expanded] {
  background-color: var(--mantine-color-neutral-1);
}

.recordStatusControlChevron {
  color: var(--mantine-color-neutral-6);
}
```

- [ ] **Step 4: Write the menu**

`RecordStatusMenu.tsx`:

```tsx
import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, UnstyledButton } from "@mantine/core";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  currentStatus: ConceptStatus.T;
  onChange: (statusId: ConceptStatus.Id) => void;
};

/**
 * The status picker for a user who may change a record's status: the
 * current status as a badge, opening a menu of every status.
 *
 * A menu rather than a `Select`: menu items take real focus, which is what
 * lets each status's description open on keyboard focus as well as on
 * hover. Combobox options are only highlighted, never focused.
 */
export function RecordStatusMenu({
  statuses,
  currentStatus,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <Menu position="bottom-start" width={260}>
      <Tooltip
        label={currentStatus.description}
        disabled={!currentStatus.description}
        multiline
        maw={280}
      >
        <Menu.Target>
          <UnstyledButton
            className={css.recordStatusControlTrigger}
            aria-label={t`Status: ${currentStatus.name}`}
          >
            <StatusBadge
              name={currentStatus.name}
              color={currentStatus.color}
              withTooltip={false}
            />
            <IconChevronDown
              size={14}
              aria-hidden
              className={css.recordStatusControlChevron}
            />
          </UnstyledButton>
        </Menu.Target>
      </Tooltip>
      <Menu.Dropdown>
        <Menu.Label>
          <Trans>Change status</Trans>
        </Menu.Label>
        {statuses.map((status) => {
          const isCurrent = status.id === currentStatus.id;
          return (
            <Tooltip
              key={status.id}
              label={status.description}
              disabled={!status.description}
              position="right"
              multiline
              maw={280}
            >
              <Menu.Item
                aria-current={isCurrent}
                rightSection={
                  isCurrent ? <IconCheck size={14} aria-hidden /> : null
                }
                onClick={() => {
                  onChange(status.id);
                }}
              >
                <StatusBadge
                  name={status.name}
                  color={status.color}
                  withTooltip={false}
                />
              </Menu.Item>
            </Tooltip>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
```

- [ ] **Step 5: Write the control**

`RecordStatusControl.tsx`:

```tsx
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import { RecordStatusMenu } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusMenu";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  currentStatusId: ConceptStatus.Id;
  /** Whether the user may change a record's status. */
  canEdit: boolean;
  onChange: (statusId: ConceptStatus.Id) => void;
};

/**
 * A record's status beside its name. A user who may change it gets a menu
 * of every status; everyone else gets the badge. Both show what the status
 * means on hover and focus. The control is hidden rather than disabled for
 * a user who cannot change it.
 */
export function RecordStatusControl({
  statuses,
  currentStatusId,
  canEdit,
  onChange,
}: Readonly<Props>): ReactNode {
  const currentStatus = statuses.find((status) => {
    return status.id === currentStatusId;
  });
  if (!currentStatus) {
    return null;
  }
  return canEdit ? (
    <RecordStatusMenu
      statuses={statuses}
      currentStatus={currentStatus}
      onChange={onChange}
    />
  ) : (
    <StatusBadge
      name={currentStatus.name}
      color={currentStatus.color}
      description={currentStatus.description}
    />
  );
}
```

- [ ] **Step 6: Run it and watch it pass**

Run: `pnpm test:frontend RecordStatusControl`
Expected: PASS, 4 tests.

If "shows what the current status means when the status button has focus" fails, the tooltip is not reaching the button through `Menu.Target`. Confirm the nesting is `Tooltip > Menu.Target > UnstyledButton` (the tooltip clones `Menu.Target`, which forwards the tooltip's ref and focus handlers to the button through `Popover.Target`), not `Menu.Target > Tooltip`.

- [ ] **Step 7: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl
git commit -m "feat(case-statuses): add the record status control" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 13: Saving a record's status

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange.ts`
- Test: `src/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange.test.tsx`

The change saves immediately with `IndividualClient.update`. The picked status shows at once, the previous one comes back if the save fails, and a refusal from `tr_individuals__check_status_change` (errcode `42501`, hint `case_records_editor_required`) gets its own copy.

- [ ] **Step 1: Write the failing test**

`useRecordStatusChange.test.tsx`:

```tsx
import { PostgrestError } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import { useRecordStatusChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type UpdateOptions = {
  onSuccess: () => Promise<void>;
  onError: (error: unknown) => void;
};

const { updateMock, invalidateMock, notifyErrorMock, updateOptionsRef } =
  vi.hoisted(() => {
    return {
      updateMock: vi.fn(),
      invalidateMock: vi.fn(),
      notifyErrorMock: vi.fn(),
      updateOptionsRef: { current: undefined as UpdateOptions | undefined },
    };
  });

vi.mock("@/clients/ontology/IndividualClient", () => {
  return {
    IndividualClient: {
      useUpdate: (options: UpdateOptions) => {
        updateOptionsRef.current = options;
        return [updateMock, false];
      },
    },
  };
});

vi.mock(
  "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries",
  () => {
    return { invalidateCaseStatusQueries: invalidateMock };
  },
);

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: notifyErrorMock, notifySuccess: vi.fn() };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useRouter: () => {
      return { invalidate: vi.fn() };
    },
  };
});

const SUSPECTED_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const CONFIRMED_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;

const RECORD: Individual.T = {
  assignedTo: undefined,
  conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
  createdAt: "2026-10-20T12:00:00.000Z",
  externalId: "CH-0001",
  id: "00000000-0000-4000-8000-0000000000d1" as Individual.Id,
  missingFromSourceAt: undefined,
  name: "Case 001",
  statusId: SUSPECTED_ID,
  updatedAt: "2026-10-24T12:00:00.000Z",
  workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
};

function _makeWrapper(): (props: { children: ReactNode }) => JSX.Element {
  const queryClient = new QueryClient();
  return ({ children }) => {
    return createElement(
      TestProviders,
      null,
      createElement(QueryClientProvider, { client: queryClient }, children),
    );
  };
}

type StatusChangeResult = {
  current: ReturnType<typeof useRecordStatusChange>;
};

function _renderStatusChange(): StatusChangeResult {
  const { result } = renderHook(
    () => {
      return useRecordStatusChange(RECORD);
    },
    { wrapper: _makeWrapper() },
  );
  act(() => {
    result.current.changeStatus(CONFIRMED_ID);
  });
  return result;
}

describe("useRecordStatusChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateMock.mockResolvedValue(undefined);
  });

  it("shows the picked status while the change is being saved", () => {
    const result = _renderStatusChange();

    expect(result.current.displayedStatusId).toBe(CONFIRMED_ID);
    expect(updateMock).toHaveBeenCalledWith({
      id: RECORD.id,
      data: { statusId: CONFIRMED_ID },
    });
  });

  it("goes back to the saved status and says so when the change fails", () => {
    const result = _renderStatusChange();

    act(() => {
      updateOptionsRef.current?.onError(new Error("network down"));
    });

    expect(result.current.displayedStatusId).toBe(SUSPECTED_ID);
    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "The record keeps its previous status. Try again in a moment.",
      }),
    );
  });

  it("explains a refused change in terms of the Case Records editor role", () => {
    _renderStatusChange();

    act(() => {
      updateOptionsRef.current?.onError(
        new PostgrestError({
          message: "permission denied to change a record's status",
          details: "",
          hint: "case_records_editor_required",
          code: "42501",
        }),
      );
    });

    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "You need Case Records editor access to change a record's status.",
      }),
    );
  });

  it("refreshes every view of the case type's statuses once the change is saved", async () => {
    _renderStatusChange();

    await act(async () => {
      await updateOptionsRef.current?.onSuccess();
    });

    expect(invalidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: RECORD.conceptId,
        change: "recordStatus",
      }),
    );
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend useRecordStatusChange`
Expected: FAIL, `Failed to resolve import ".../useRecordStatusChange/useRecordStatusChange"`.

- [ ] **Step 3: Write the hook**

`useRecordStatusChange.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";

/** The hint the status-change trigger raises for a non-editor. */
const RECORDS_EDITOR_REQUIRED_HINT = "case_records_editor_required";

type RecordStatusChange = {
  /** The status to show: the one being saved while a save is in flight. */
  displayedStatusId: ConceptStatus.Id;
  changeStatus: (statusId: ConceptStatus.Id) => void;
};

function _isRecordsEditorRequired(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "hint" in error &&
    error.hint === RECORDS_EDITOR_REQUIRED_HINT
  );
}

/**
 * Changes a record's status the moment the user picks one.
 *
 * The picked status shows at once. On success every view of the case type's
 * statuses is refreshed, including the route loader that holds this record,
 * and the record's own value takes over again. On failure the record goes
 * back to the status it had and a toast says so, without the database's own
 * message.
 *
 * @param individual The record, as the route loader read it.
 */
export function useRecordStatusChange(
  individual: Individual.T,
): RecordStatusChange {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pendingStatusId, setPendingStatusId] = useState<
    ConceptStatus.Id | undefined
  >();
  const [updateIndividual] = IndividualClient.useUpdate({
    onSuccess: async () => {
      await invalidateCaseStatusQueries({
        queryClient,
        router,
        conceptId: individual.conceptId,
        change: "recordStatus",
      });
      setPendingStatusId(undefined);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Changing a record's status failed" });
      setPendingStatusId(undefined);
      notifyError({
        title: t`Status not changed`,
        message: _isRecordsEditorRequired(error)
          ? t`You need Case Records editor access to change a record's status.`
          : t`The record keeps its previous status. Try again in a moment.`,
      });
    },
  });
  const displayedStatusId = pendingStatusId ?? individual.statusId;

  return {
    displayedStatusId,
    changeStatus: (statusId) => {
      if (statusId === displayedStatusId) {
        return;
      }
      setPendingStatusId(statusId);
      updateIndividual({ id: individual.id, data: { statusId } });
    },
  };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend useRecordStatusChange`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange
git commit -m "feat(case-statuses): save a record's status optimistically" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 14: The record rail

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordRail/RecordRail.tsx`
- Test: `src/views/IndividualManagerApp/SingleIndividualView/RecordRail/RecordRail.test.tsx`

- [ ] **Step 1: Write the failing test**

`RecordRail.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { RecordRail } from "@/views/IndividualManagerApp/SingleIndividualView/RecordRail/RecordRail";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000e1" as Workspace.Id;
const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const STATUS_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;

const CONCEPT: Concept.T = Model.make("Concept", {
  id: CONCEPT_ID,
  workspaceId: WORKSPACE_ID,
  ownerId: "00000000-0000-4000-8000-0000000000f1" as User.Id,
  name: "Cholera case",
  description: undefined,
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
  allowManualCreation: false,
  defaultStatusId: STATUS_ID,
});

const RECORD: Individual.T = {
  assignedTo: undefined,
  conceptId: CONCEPT_ID,
  createdAt: "2026-10-20T12:00:00.000Z",
  externalId: "CH-0001",
  id: "00000000-0000-4000-8000-0000000000d1" as Individual.Id,
  missingFromSourceAt: undefined,
  name: "Case 001",
  statusId: STATUS_ID,
  updatedAt: "2026-10-24T12:00:00.000Z",
  workspaceId: WORKSPACE_ID,
};

describe("RecordRail", () => {
  it("omits the missing-from-source fact while the record is still in its source", () => {
    render(<RecordRail concept={CONCEPT} individual={RECORD} />);

    expect(screen.getByText("CH-0001")).toBeInTheDocument();
    expect(screen.queryByText("Missing from source since")).toBeNull();
  });

  it("shows the day the record went missing from its source", () => {
    render(
      <RecordRail
        concept={CONCEPT}
        individual={{
          ...RECORD,
          missingFromSourceAt: "2026-10-25T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Missing from source since")).toBeInTheDocument();
    expect(screen.getByText("Oct 25, 2026")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend RecordRail`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the rail**

`RecordRail.tsx`:

```tsx
import { formatDate } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  individual: Individual.T;
};

function _formatDay(date: string): string {
  return formatDate(date, { format: "MMM D, YYYY" });
}

/**
 * Reference facts about a record: its case type, its ID in the source data,
 * and when it was created, last changed, and (only when it happened) found
 * missing from its source. A fact with no value is omitted.
 */
export function RecordRail({ concept, individual }: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Record</Trans>}>
        <AppViewRail.Fact label={t`Case type`}>{concept.name}</AppViewRail.Fact>
        <AppViewRail.Fact label={t`Source ID`}>
          {individual.externalId}
        </AppViewRail.Fact>
        <AppViewRail.Fact label={t`Created`}>
          {_formatDay(individual.createdAt)}
        </AppViewRail.Fact>
        <AppViewRail.Fact label={t`Updated`}>
          {_formatDay(individual.updatedAt)}
        </AppViewRail.Fact>
        {individual.missingFromSourceAt ? (
          <AppViewRail.Fact label={t`Missing from source since`}>
            {_formatDay(individual.missingFromSourceAt)}
          </AppViewRail.Fact>
        ) : null}
      </AppViewRail.Group>
    </AppViewRail>
  );
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm test:frontend RecordRail`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView/RecordRail
git commit -m "feat(case-statuses): add the record page rail" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 15: The record page on AppView

> **Load the `impeccable` skill before this task.** It replaces an existing surface. Run its detector on every file this task touches before committing.

**Files:**
- Create: `src/views/IndividualManagerApp/SingleIndividualView/useHydratedIndividual.ts`
- Create: `src/views/IndividualManagerApp/SingleIndividualView/RecordDetailsSection.tsx`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/index.tsx`
- Modify: `src/views/IndividualManagerApp/SingleIndividualView/ActivityBlock.tsx`
- Modify: `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx`

The page's behavior is covered by `RecordStatusControl.test.tsx`, `useRecordStatusChange.test.tsx`, `RecordRail.test.tsx`, and end to end by `case-statuses-record.spec.ts` (Task 22).

- [ ] **Step 1: Move the hydration hook out of the view, unchanged**

Create `useHydratedIndividual.ts` with the `HydratedIndividual` type and the `useHydratedIndividual` function cut from `index.tsx`. Only `export` is added to both:

```ts
import {
  isNonNullish,
  makeIdLookupMap,
  makeMap,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AttributeAssertionClient } from "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { AttributeAssertion } from "$/models/ontology/AttributeAssertion/AttributeAssertion";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Individual } from "$/models/ontology/Individual/Individual";

/** A record with its case type's attributes and its attribute values. */
export type HydratedIndividual = Individual.T & {
  identifierAttribute?: ConceptAttribute.T;
  labelAttribute?: ConceptAttribute.T;
  attributes?: ConceptAttribute.T[];
  assertions?: Array<
    AttributeAssertion.T & {
      attributeName?: string;
      sourceType?: DatasetSource.SourceType;
      sourceName?: string;
    }
  >;
  labelValue?: AttributeAssertion.T;
};

/**
 * Hydrates an individual with its concept attributes and their assertions.
 */
export function useHydratedIndividual({
  concept,
  individual,
}: {
  concept: Concept.T;
  individual: Individual.T;
}): [HydratedIndividual, boolean] {
  // TODO(jpsyx): move this to a generalized implementation of useHydration
  const [conceptAttributes, isLoadingConceptAttributes] =
    ConceptAttributeClient.useGetAll({
      where: { concept_id: { eq: concept.id } },
    });
  const [attributeAssertions, isLoadingAttributeAssertions] =
    AttributeAssertionClient.withLogger().useGetAttributeAssertions({
      workspaceId: individual.workspaceId,
      individualId: individual.id,
      conceptAttributes: conceptAttributes ?? [],
    });

  const datasetIds = useMemo(() => {
    return [
      ...new Set(
        (attributeAssertions ?? []).map(prop("datasetId")).filter(isNonNullish),
      ),
    ];
  }, [attributeAssertions]);

  const [datasets] = DatasetClient.useGetAll(where("id", "in", datasetIds));

  const datasetsMap = useMemo(() => {
    return datasets ? makeMap(datasets, { keyFn: prop("id") }) : undefined;
  }, [datasets]);

  // TODO(jpsyx): move this to a module that can also use cacheing.
  const hydratedIndividual = useMemo(() => {
    let configInfo = undefined;
    let assertionsInfo = undefined;
    let attributesById:
      | Map<ConceptAttribute.Id, ConceptAttribute.T>
      | undefined = undefined;

    if (conceptAttributes) {
      const identifierAttribute = conceptAttributes.find(
        propEq("isIdentifier", true),
      );
      const labelAttribute = conceptAttributes.find(propEq("isLabel", true));
      attributesById = makeIdLookupMap(conceptAttributes);
      configInfo = {
        identifierAttribute,
        labelAttribute,
        attributes: conceptAttributes,
      };
    }

    if (attributeAssertions) {
      const assertionsByAttributeId = makeMap(attributeAssertions, {
        keyFn: prop("conceptAttributeId"),
        valueFn: (assertion) => {
          const config = attributesById?.get(assertion.conceptAttributeId);
          const dataset = assertion.datasetId
            ? datasetsMap?.get(assertion.datasetId)
            : undefined;
          return {
            ...assertion,
            attributeName: config?.name,
            sourceType: dataset?.sourceType ?? dataset?.sourceType,
            sourceName: dataset?.name,
          };
        },
      });

      const labelAttributeId = configInfo?.labelAttribute?.id;

      assertionsInfo = {
        assertions: [...assertionsByAttributeId.values()],
        labelValue: labelAttributeId
          ? assertionsByAttributeId.get(labelAttributeId)
          : undefined,
      };
    }

    return {
      ...individual,
      ...configInfo,
      ...assertionsInfo,
    };
  }, [individual, conceptAttributes, attributeAssertions, datasetsMap]);

  return [
    hydratedIndividual,
    isLoadingConceptAttributes || isLoadingAttributeAssertions,
  ];
}
```

If `git diff` shows the moved body differs from what `index.tsx` had (plan 2 may have touched it), keep `index.tsx`'s version of the body.

- [ ] **Step 2: Write the Details section**

`RecordDetailsSection.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Skeleton } from "@mantine/core";
import { useMemo } from "react";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { RecordAttributesList } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";
import type { RecordAttributeRow } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";
import type { HydratedIndividual } from "@/views/IndividualManagerApp/SingleIndividualView/useHydratedIndividual";
import type { ReactNode } from "react";

type Props = {
  hydratedIndividual: HydratedIndividual;
};

/** A record's attribute values, under a Details heading with their count. */
export function RecordDetailsSection({
  hydratedIndividual,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const attributeRows: RecordAttributeRow[] | undefined = useMemo(() => {
    if (!hydratedIndividual.assertions) {
      return undefined;
    }
    return hydratedIndividual.assertions.map((assertion) => {
      return {
        name: assertion.attributeName ?? t`Loading...`,
        value: assertion.value,
        sourceType: assertion.sourceType,
        sourceName: assertion.sourceName,
      };
    });
  }, [hydratedIndividual.assertions, t]);

  return (
    <AppViewSection title={<Trans>Details</Trans>} meta={attributeRows?.length}>
      {attributeRows === undefined ? (
        <Skeleton height={120} radius="sm" />
      ) : (
        <RecordAttributesList attributes={attributeRows} />
      )}
    </AppViewSection>
  );
}
```

- [ ] **Step 3: Rewrite the view**

Replace the whole of `SingleIndividualView/index.tsx` with:

```tsx
import { where } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { ActivityBlock } from "@/views/IndividualManagerApp/SingleIndividualView/ActivityBlock";
import { RecordDetailsSection } from "@/views/IndividualManagerApp/SingleIndividualView/RecordDetailsSection";
import { RecordRail } from "@/views/IndividualManagerApp/SingleIndividualView/RecordRail/RecordRail";
import { RecordStatusControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl";
import { useHydratedIndividual } from "@/views/IndividualManagerApp/SingleIndividualView/useHydratedIndividual";
import { useRecordStatusChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  individual: Individual.T;
};

/**
 * One record: its name with its status beside it, its attribute values, and
 * its activity, with where it came from in the rail.
 *
 * The status control is a menu for a Case Records editor and a badge for
 * everyone else. A change saves at once and refreshes every view that shows
 * the record's status, this page's loader included.
 */
export function SingleIndividualView({
  concept,
  individual,
}: Readonly<Props>): ReactNode {
  const [hydratedIndividual] = useHydratedIndividual({ concept, individual });
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const canChangeStatus = useHasPermission("case_records__can_edit_record");
  const { displayedStatusId, changeStatus } = useRecordStatusChange(individual);
  const sortedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);

  return (
    <AppView>
      <AppViewHeader
        title={individual.name}
        titleAccessory={
          sortedStatuses ? (
            <RecordStatusControl
              statuses={sortedStatuses}
              currentStatusId={displayedStatusId}
              canEdit={canChangeStatus}
              onChange={changeStatus}
            />
          ) : null
        }
      />
      <AppViewBody rail={<RecordRail concept={concept} individual={individual} />}>
        <Stack gap="xl">
          <RecordDetailsSection hydratedIndividual={hydratedIndividual} />
          <AppViewSection title={<Trans>Activity</Trans>}>
            <ActivityBlock />
          </AppViewSection>
        </Stack>
      </AppViewBody>
    </AppView>
  );
}
```

- [ ] **Step 4: Let the section name the activity block**

Replace the whole of `SingleIndividualView/ActivityBlock.tsx` with (the only change is that its own "Notes" heading is gone, since the Activity section now heads it):

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Flex, Stack } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { notifyNotImplemented } from "@/utils/notifications/notifyNotImplemented";
import type { ReactNode } from "react";

/**
 * Note composer on a record, under the record page's Activity heading.
 * Notes are not saved yet.
 */
export function ActivityBlock(): ReactNode {
  const { t } = useLingui();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Highlight,
      Placeholder.configure({
        placeholder: t`Add a note`,
      }),
    ],
    content: "",
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        notifyNotImplemented();
      }}
    >
      <Stack gap="sm">
        <RichTextEditor editor={editor}>
          <RichTextEditor.Toolbar>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.BulletList />
              <RichTextEditor.Link />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
        </RichTextEditor>
        <Flex justify="flex-end">
          <Button type="submit" variant="light" size="compact-sm">
            <Trans>Add note</Trans>
          </Button>
        </Flex>
      </Stack>
    </form>
  );
}
```

- [ ] **Step 5: Key the view by record**

The route keeps `SingleIndividualView` mounted when only the record in the URL changes, so an in-flight status change would otherwise carry over to the next record. In `src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx`, replace:

```tsx
  return <SingleIndividualView concept={concept} individual={individual} />;
```

with:

```tsx
  return (
    <SingleIndividualView
      key={individual.id}
      concept={concept}
      individual={individual}
    />
  );
```

Keep any `beforeLoad` guard plan 1 added to this route.

- [ ] **Step 6: Verify**

Run: `pnpm type-check`
Expected: no errors.

Run: `pnpm test:frontend src/views/IndividualManagerApp`
Expected: PASS.

Run: `.claude/skills/impeccable/scripts/impeccable detect --json src/views/IndividualManagerApp/SingleIndividualView`
Expected: no findings. Fix any before committing.

- [ ] **Step 7: Commit**

```bash
git add src/views/IndividualManagerApp/SingleIndividualView 'src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx'
git commit -m "feat(case-statuses): rebuild the record page with a status control" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Task 16: The case type page's status list

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList.tsx`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList.module.css`
- Test: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList.test.tsx`

- [ ] **Step 1: Write the failing test**

`CaseTypeStatusList.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@/test-utils";
import { CaseTypeStatusList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

function _makeStatus(
  options: Readonly<{
    id: string;
    name: string;
    description: string;
    position: number;
  }>,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: options.id as ConceptStatus.Id,
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
    conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
    name: options.name,
    description: options.description,
    color: "#40c057",
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const ACTIVE = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Active",
  description: "Open and being worked on.",
  position: 0,
});
const INACTIVE = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "Inactive",
  description: "No longer being worked on.",
  position: 1,
});

describe("CaseTypeStatusList", () => {
  it("marks the default status and counts the records in each status", () => {
    render(
      <CaseTypeStatusList
        statuses={[ACTIVE, INACTIVE]}
        defaultStatusId={ACTIVE.id}
        recordCounts={{ [ACTIVE.id]: 3 }}
      />,
    );

    const rows = within(
      screen.getByRole("list", { name: "Statuses" }),
    ).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Default");
    expect(rows[0]).toHaveTextContent("3 records");
    expect(rows[1]).not.toHaveTextContent("Default");
    expect(rows[1]).toHaveTextContent("0 records");
  });

  it("shows what each status means", () => {
    render(
      <CaseTypeStatusList
        statuses={[ACTIVE, INACTIVE]}
        defaultStatusId={ACTIVE.id}
        recordCounts={undefined}
      />,
    );

    expect(screen.getByText("Open and being worked on.")).toBeInTheDocument();
    expect(screen.getByText("No longer being worked on.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend CaseTypeStatusList`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the stylesheet**

`CaseTypeStatusList.module.css`. It matches `CaseTypeAttributesList.module.css`, its neighbor on the page, so the two lists read as one family:

```css
.caseTypeStatusList {
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-md);
  list-style: none;
  margin: 0;
  overflow: hidden;
  padding: 0;
}

/* Name, meaning, count: the count keeps its column even with no meaning. */
.caseTypeStatusListRow {
  align-items: baseline;
  border-bottom: 1px solid var(--ava-border-default);
  column-gap: var(--mantine-spacing-md);
  display: grid;
  grid-template-columns: minmax(8rem, max-content) minmax(0, 1fr) auto;
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-md);
}

.caseTypeStatusListRow:last-child {
  border-bottom: none;
}

.caseTypeStatusListName {
  align-items: center;
  display: flex;
  gap: var(--mantine-spacing-xs);
}

.caseTypeStatusListCount {
  font-variant-numeric: tabular-nums;
  grid-column: 3;
  white-space: nowrap;
}
```

- [ ] **Step 4: Write the list**

`CaseTypeStatusList.tsx`:

```tsx
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Badge, Text } from "@mantine/core";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import css from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  defaultStatusId: ConceptStatus.Id;
  /** Records per status. Unset while the counts load. */
  recordCounts: Partial<Record<ConceptStatus.Id, number>> | undefined;
};

/**
 * A case type's statuses as the people working its records meet them: each
 * one's badge and meaning, how many records hold it, and which one new
 * records start in.
 */
export function CaseTypeStatusList({
  statuses,
  defaultStatusId,
  recordCounts,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <ul className={css.caseTypeStatusList} aria-label={t`Statuses`}>
      {statuses.map((status) => {
        return (
          <li key={status.id} className={css.caseTypeStatusListRow}>
            <div className={css.caseTypeStatusListName}>
              <StatusBadge
                name={status.name}
                color={status.color}
                withTooltip={false}
              />
              {status.id === defaultStatusId ? (
                <Badge
                  variant="outline"
                  color="neutral"
                  radius="sm"
                  size="sm"
                  tt="none"
                  fw={500}
                >
                  <Trans>Default</Trans>
                </Badge>
              ) : null}
            </div>
            {status.description ? (
              <Text size="sm" c="dimmed">
                {status.description}
              </Text>
            ) : null}
            {recordCounts === undefined ? null : (
              <Text size="sm" c="dimmed" className={css.caseTypeStatusListCount}>
                <Plural
                  value={recordCounts[status.id] ?? 0}
                  one="# record"
                  other="# records"
                />
              </Text>
            )}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm test:frontend CaseTypeStatusList`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList
git commit -m "feat(case-statuses): list a case type's statuses with their record counts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 17: The Edit statuses form

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/RenameWarning.tsx`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/SaveErrorCallout.tsx`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/EditStatusesForm.tsx`
- Test: `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/EditStatusesForm.test.tsx`

The form is presentational: it holds the edited set and the replacements, and hands a built `ConceptStatus.SavePayload` to `onSave`. Loading and saving live in the modal (Task 18).

- [ ] **Step 1: Write the failing test**

`EditStatusesForm.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { EditStatusesForm } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/EditStatusesForm";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const ACTIVE_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const INACTIVE_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;

function _makeStatus(
  options: Readonly<{
    id: ConceptStatus.Id;
    name: string;
    color: string;
    position: number;
  }>,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: options.id,
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
    conceptId: CONCEPT_ID,
    name: options.name,
    description: undefined,
    color: options.color,
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SAVED_STATUSES = [
  _makeStatus({ id: ACTIVE_ID, name: "Active", color: "#40c057", position: 0 }),
  _makeStatus({
    id: INACTIVE_ID,
    name: "Inactive",
    color: "#637c95",
    position: 1,
  }),
];

function _renderForm(
  options: Readonly<{
    onSave?: (payload: ConceptStatus.SavePayload) => void;
    saveError?: unknown;
  }> = {},
): void {
  render(
    <EditStatusesForm
      conceptId={CONCEPT_ID}
      savedStatuses={SAVED_STATUSES}
      defaultStatusId={ACTIVE_ID}
      recordCounts={{ [INACTIVE_ID]: 2 }}
      isSaving={false}
      saveError={options.saveError}
      onCancel={vi.fn()}
      onSave={options.onSave ?? vi.fn()}
    />,
  );
}

describe("EditStatusesForm", () => {
  it("saves only once a removed status's records have somewhere to go", () => {
    const onSave = vi.fn();
    _renderForm({ onSave });

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));
    expect(screen.getByRole("button", { name: "Save statuses" })).toBeDisabled();

    pickMantineSelectOption("Move 2 records to", "Active");
    fireEvent.click(screen.getByRole("button", { name: "Save statuses" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: CONCEPT_ID,
        defaultStatusId: ACTIVE_ID,
        replacements: { [INACTIVE_ID]: ACTIVE_ID },
      }),
    );
  });

  it("warns that saved filters stop matching a renamed status", () => {
    _renderForm();

    const [activeName] = screen.getAllByRole("textbox", { name: "Status name" });
    fireEvent.change(activeName!, { target: { value: "Open" } });

    expect(
      screen.getByText(/find records by status name/),
    ).toBeInTheDocument();
  });

  it("explains a refused save without showing the database's message", () => {
    _renderForm({
      saveError: new PostgrestError({
        message: "duplicate key value violates unique constraint",
        details: "",
        hint: "status_names_not_unique",
        code: "P0001",
      }),
    });

    expect(
      screen.getByText(
        "Two statuses have the same name. Give each one its own name.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:frontend EditStatusesForm`
Expected: FAIL, `Failed to resolve import`.

- [ ] **Step 3: Write the rename warning**

`RenameWarning.tsx`. Spec §9.3: a saved filter matches a status by its name, so renaming one silently empties every filter on the old name:

```tsx
import { Callout } from "@avandar/ui";
import { makeIdLookupMap, prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo } from "react";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  savedStatuses: readonly ConceptStatus.T[];
  statuses: readonly ConceptStatus.Draft[];
};

/**
 * Warns before a saved status is renamed. Saved filters and dashboards match
 * a status by its name, so a filter on the old name stops finding records
 * once the new name is saved.
 */
export function RenameWarning({
  savedStatuses,
  statuses,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const renamedNames = useMemo(() => {
    const draftsById = makeIdLookupMap(statuses);
    return savedStatuses
      .filter((saved) => {
        const draft = draftsById.get(saved.id);
        return draft !== undefined && draft.name.trim() !== saved.name;
      })
      .map(prop("name"));
  }, [savedStatuses, statuses]);

  if (renamedNames.length === 0) {
    return null;
  }

  const renamedList = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(renamedNames);
  return (
    <Callout
      color="warning"
      icon={<IconAlertTriangle size={18} aria-hidden />}
      messageSize="sm"
      message={t`Saved filters and dashboards find records by status name. Filters that use ${renamedList} will stop finding records once you save.`}
    />
  );
}
```

- [ ] **Step 4: Write the save error callout**

`SaveErrorCallout.tsx`:

```tsx
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconAlertCircle } from "@tabler/icons-react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The last save's failure, or `undefined` when there is none. */
  saveError: unknown;
};

/**
 * Explains why the last save failed, in the user's terms. The database's own
 * message never reaches the screen: the save raises a stable hint for each
 * failure, and every hint has its own copy here.
 */
export function SaveErrorCallout({ saveError }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  if (saveError === undefined || saveError === null) {
    return null;
  }

  const messagesByHint: Record<ConceptStatus.SaveErrorHint, string> = {
    case_types_editor_required: t`You need Case Types editor access to change these statuses.`,
    status_set_empty: t`Add at least one status.`,
    status_name_required: t`Every status needs a name.`,
    status_names_not_unique: t`Two statuses have the same name. Give each one its own name.`,
    status_color_invalid: t`One of the colors is not in the palette. Pick another color.`,
    status_not_in_case_type: t`These statuses changed somewhere else. Close this window and try again.`,
    status_default_not_in_set: t`Choose a default status from this list.`,
    status_replacement_required: t`Choose where the records of each removed status go.`,
    status_replacement_not_in_set: t`Records can only move to a status in this list.`,
  };
  const hint = ConceptStatus.toSaveErrorHint(saveError);
  return (
    <Callout
      icon={<IconAlertCircle size={18} aria-hidden />}
      messageSize="sm"
      message={
        hint === undefined
          ? t`Your statuses were not saved. Try again in a moment.`
          : messagesByHint[hint]
      }
    />
  );
}
```

- [ ] **Step 5: Write the form**

`EditStatusesForm.tsx`:

```tsx
import { prop } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import { RenameWarning } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/RenameWarning";
import { SaveErrorCallout } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/SaveErrorCallout";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  conceptId: Concept.Id;
  /** The saved statuses, in position order. */
  savedStatuses: readonly ConceptStatus.T[];
  defaultStatusId: ConceptStatus.Id;
  recordCounts: Partial<Record<ConceptStatus.Id, number>>;
  isSaving: boolean;
  /** The last save's failure, shown as translated copy. */
  saveError: unknown;
  onCancel: () => void;
  onSave: (payload: ConceptStatus.SavePayload) => void;
};

/**
 * Edits a saved case type's statuses. It starts from the saved set, keeps
 * the edits and the replacements for removed statuses, and only offers Save
 * once `ConceptStatus.findSetIssues` finds nothing to fix.
 */
export function EditStatusesForm({
  conceptId,
  savedStatuses,
  defaultStatusId,
  recordCounts,
  isSaving,
  saveError,
  onCancel,
  onSave,
}: Readonly<Props>): ReactNode {
  const [value, setValue] = useState<ConceptStatus.SetValue>(() => {
    return { statuses: ConceptStatus.toDrafts(savedStatuses), defaultStatusId };
  });
  const [replacements, setReplacements] = useState<StatusReplacements>({});
  const savedStatusIds = useMemo(() => {
    return savedStatuses.map(prop("id"));
  }, [savedStatuses]);
  const canSave =
    ConceptStatus.findSetIssues({
      value,
      recordCounts,
      savedStatusIds,
      replacements,
    }).length === 0;

  return (
    <Stack gap="md">
      <StatusSetEditor
        value={value}
        onChange={setValue}
        savedStatuses={savedStatuses}
        recordCounts={recordCounts}
        replacements={replacements}
        onReplacementsChange={setReplacements}
      />
      <RenameWarning savedStatuses={savedStatuses} statuses={value.statuses} />
      <SaveErrorCallout saveError={saveError} />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          loading={isSaving}
          disabled={!canSave}
          onClick={() => {
            onSave(
              ConceptStatus.buildSavePayload({
                conceptId,
                value,
                savedStatusIds,
                replacements,
              }),
            );
          }}
        >
          <Trans>Save statuses</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
```

- [ ] **Step 6: Run it and watch it pass**

Run: `pnpm test:frontend EditStatusesForm`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm
git commit -m "feat(case-statuses): add the Edit statuses form" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 18: The Edit statuses modal and the Statuses section

> **Load the `impeccable` skill before this task.** It adds a modal and a section to a surface this plan replaces. Run its detector on every file this task touches before committing.

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/useSaveCaseTypeStatuses.ts`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesModal.tsx`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusesSection.tsx`

These wire tested pieces (`EditStatusesForm`, `CaseTypeStatusList`, `invalidateCaseStatusQueries`) to the clients. `case-statuses-edit.spec.ts` (Task 23) drives them end to end.

- [ ] **Step 1: Write the save hook**

`useSaveCaseTypeStatuses.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { Logger } from "@/utils/Logger";
import { notifySuccess } from "@/utils/notifications/notify";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

type SaveCaseTypeStatuses = {
  saveStatusSet: (payload: ConceptStatus.SavePayload) => void;
  isSaving: boolean;
  /** The last save's failure, until the next save or `resetSaveError`. */
  saveError: unknown;
  resetSaveError: () => void;
};

/**
 * Saves a case type's status set in one call, then refreshes every view of
 * its statuses and records.
 *
 * A failure is logged, not toasted: the Edit statuses form shows it as
 * translated copy above its Save button, next to what needs fixing.
 *
 * @param options.conceptId The case type.
 * @param options.onSaved Called after a save and its refresh succeed.
 */
export function useSaveCaseTypeStatuses(
  options: Readonly<{ conceptId: Concept.Id; onSaved: () => void }>,
): SaveCaseTypeStatuses {
  const { conceptId, onSaved } = options;
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [saveStatusSet, isSaving, mutation] =
    ConceptStatusClient.useSaveStatusSet({
      onSuccess: async () => {
        await invalidateCaseStatusQueries({
          queryClient,
          router,
          conceptId,
          change: "statusSet",
        });
        notifySuccess(t`Statuses saved`);
        onSaved();
      },
      onError: (error) => {
        Logger.error(error, { devMsg: "Saving case type statuses failed" });
      },
    });

  return {
    saveStatusSet,
    isSaving,
    saveError: mutation.error ?? undefined,
    resetSaveError: mutation.reset,
  };
}
```

- [ ] **Step 2: Write the modal**

`EditStatusesModal.tsx`. It reads the same two queries the Statuses section reads, so they come from the cache:

```tsx
import { Modal } from "@avandar/ui";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@mantine/core";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { EditStatusesForm } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/EditStatusesForm";
import { useSaveCaseTypeStatuses } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/useSaveCaseTypeStatuses";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  opened: boolean;
  onClose: () => void;
};

/**
 * Edits a case type's statuses in a modal. The form starts from the saved
 * set each time the modal opens, because the modal unmounts it on close.
 */
export function EditStatusesModal({
  concept,
  opened,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const [recordCounts] = ConceptStatusClient.useGetRecordCounts({
    conceptId: concept.id,
  });
  const { saveStatusSet, isSaving, saveError, resetSaveError } =
    useSaveCaseTypeStatuses({ conceptId: concept.id, onSaved: onClose });
  const savedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);
  const onCloseModal = (): void => {
    resetSaveError();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onCloseModal}
      title={t`Edit statuses`}
      size="xl"
    >
      {savedStatuses && recordCounts ? (
        <EditStatusesForm
          conceptId={concept.id}
          savedStatuses={savedStatuses}
          defaultStatusId={concept.defaultStatusId}
          recordCounts={recordCounts}
          isSaving={isSaving}
          saveError={saveError}
          onCancel={onCloseModal}
          onSave={saveStatusSet}
        />
      ) : (
        <Skeleton height={160} radius="sm" />
      )}
    </Modal>
  );
}
```

- [ ] **Step 3: Write the section**

`CaseTypeStatusesSection.tsx`:

```tsx
import { where } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Skeleton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { CaseTypeStatusList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList";
import { EditStatusesModal } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesModal";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
};

/**
 * The case type page's Statuses section. A Case Types editor gets an Edit
 * statuses action, which is hidden rather than disabled for everyone else.
 */
export function CaseTypeStatusesSection({
  concept,
}: Readonly<Props>): ReactNode {
  const canEditStatuses = useHasPermission("case_types__can_edit_case_type");
  const [isEditing, editing] = useDisclosure(false);
  const [statuses] = ConceptStatusClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const [recordCounts] = ConceptStatusClient.useGetRecordCounts({
    conceptId: concept.id,
  });
  const sortedStatuses = useMemo(() => {
    return statuses ? ConceptStatus.sortByPosition(statuses) : undefined;
  }, [statuses]);

  return (
    <AppViewSection
      title={<Trans>Statuses</Trans>}
      meta={sortedStatuses?.length}
      actions={
        canEditStatuses ? (
          <Button variant="default" size="compact-sm" onClick={editing.open}>
            <Trans>Edit statuses</Trans>
          </Button>
        ) : null
      }
    >
      {sortedStatuses ? (
        <CaseTypeStatusList
          statuses={sortedStatuses}
          defaultStatusId={concept.defaultStatusId}
          recordCounts={recordCounts}
        />
      ) : (
        <Skeleton height={96} radius="sm" />
      )}
      {canEditStatuses ? (
        <EditStatusesModal
          concept={concept}
          opened={isEditing}
          onClose={editing.close}
        />
      ) : null}
    </AppViewSection>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm type-check`
Expected: no errors.

Run: `.claude/skills/impeccable/scripts/impeccable detect --json src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusesSection.tsx src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList`
Expected: no findings. Fix any before committing.

- [ ] **Step 5: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusesSection.tsx
git commit -m "feat(case-statuses): edit a case type's statuses in a modal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 19: The case type page on AppView

> **Load the `impeccable` skill before this task.** It replaces an existing surface. Run its detector on every file this task touches before committing.

**Files:**
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/RefreshRecordsButton.tsx`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActionsMenu.tsx`
- Create: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeRail.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.tsx`
- Test: `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.test.tsx` (created by plan 1)
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/ViewRecordsButton.tsx`
- Modify: `src/views/OntologyDesignerApp/ConceptMetaView/index.tsx`
- Modify: `src/views/OntologyDesignerApp/index.tsx`

Plan 1 already hides Refresh records and Delete case type behind permissions in the current `CaseTypeActions.tsx`. Read that file before replacing it. The version below keeps the same gates with the overview's keys. If plan 1 used a different permission expression for a gate, keep plan 1's expression in the matching place below.

- [ ] **Step 1: Update plan 1's action tests**

Plan 1 created `src/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions.test.tsx`. Two of its tests look for a "Delete" button, which this task moves into an overflow menu as "Delete case type". Refresh records now also reads the query client, so the render needs a `QueryClientProvider`.

In that file, add:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
```

and change the `@/test-utils` import to:

```tsx
import {
  fireEvent,
  makeHasPermissionFromAppRoles,
  render,
  screen,
} from "@/test-utils";
```

In `_renderActionsFor`, replace:

```tsx
  render(<CaseTypeActions concept={concept} fullConcept={concept} />);
```

with:

```tsx
  const queryClient = new QueryClient();
  render(<CaseTypeActions concept={concept} fullConcept={concept} />, {
    wrapper: ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
```

Replace the two Delete tests:

```tsx
  it("hides Delete from a case_types editor", () => {
    _renderActionsFor({ case_types: "editor" });

    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("shows Delete to a case_types admin", () => {
    _renderActionsFor({ case_types: "admin" });

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
```

with:

```tsx
  it("hides the menu holding Delete case type from a case_types editor", () => {
    _renderActionsFor({ case_types: "editor" });

    expect(
      screen.queryByRole("button", { name: "More case type actions" }),
    ).not.toBeInTheDocument();
  });

  it("offers Delete case type to a case_types admin from the actions menu", async () => {
    _renderActionsFor({ case_types: "admin" });

    fireEvent.click(
      screen.getByRole("button", { name: "More case type actions" }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Delete case type" }),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them and watch the admin case fail**

Run: `pnpm test:frontend CaseTypeActions`
Expected: FAIL on "offers Delete case type to a case_types admin from the actions menu", with `Unable to find an accessible element with the role "button" and name "More case type actions"`. The other cases pass.

- [ ] **Step 3: Split out Refresh records**

`RefreshRecordsButton.tsx`. Its copy is unchanged from the current `SyncRecordsButton`, so its translations carry over:

```tsx
import { hasDefinedProps } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import {
  generateIndividuals,
  getAttributesWithMapping,
} from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  fullConcept: Concept.T<"Full">;
};

/**
 * Re-reads a case type's records from its source datasets. Afterwards every
 * record list and count is marked stale, so the page's record count shows
 * what the sync produced.
 */
export function RefreshRecordsButton({
  concept,
  fullConcept,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async (): Promise<void> => {
    if (!hasDefinedProps(fullConcept, ["datasets", "attributes"])) {
      notifyError({
        title: t`Cannot sync this case type`,
        message: t`No attributes or dataset are configured.`,
      });
      return;
    }
    setIsRefreshing(true);
    try {
      await generateIndividuals({
        ...fullConcept,
        attributes: getAttributesWithMapping(fullConcept.attributes),
      });
      await queryClient.invalidateQueries({
        queryKey: [IndividualClient.getClientName()],
      });
      notifySuccess(t`Finished syncing ${concept.name} records`);
    } catch (error) {
      Logger.error(error, { msg: "Failed to sync case type records" });
      notifyError({
        title: t`Could not sync ${concept.name} records`,
        message:
          error instanceof Error
            ? error.message
            : t`An unexpected error occurred.`,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="default"
      size="compact-sm"
      leftSection={<IconRefresh size={14} aria-hidden />}
      loading={isRefreshing}
      onClick={onRefresh}
    >
      {t`Refresh ${concept.name} records`}
    </Button>
  );
}
```

- [ ] **Step 4: Move Delete into an overflow menu**

`CaseTypeActionsMenu.tsx`. Destructive actions live in an overflow menu, coloured `danger`, behind a confirm (`docs/design/app-view-layout.md`, Actions):

```tsx
import { ActionIcon } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifySuccess } from "@/utils/notifications/notify";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
};

/**
 * The case type's overflow menu. It holds Delete case type, which asks for
 * confirmation and then returns to the Case Manager home.
 */
export function CaseTypeActionsMenu({ concept }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [deleteCaseType] = ConceptClient.useDelete({
    queriesToInvalidate: [ConceptClient.QueryKeys.getAll()],
    onSuccess: () => {
      navigate(AppLinks.ontologyDesignerHome(workspace.slug));
      notifySuccess({
        title: t`Case type deleted`,
        message: t`${concept.name} deleted successfully`,
      });
    },
  });

  const onDelete = (): void => {
    modals.openConfirmModal({
      title: t`Delete case type`,
      children: (
        <Text>
          <Trans>
            Are you sure you want to delete {concept.name}? This cannot be
            undone.
          </Trans>
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        deleteCaseType({ id: concept.id });
      },
    });
  };

  return (
    <Menu position="bottom-end" width={220}>
      <Menu.Target>
        <ActionIcon
          variant="default"
          color="neutral"
          tooltip={t`More case type actions`}
          aria-label={t`More case type actions`}
        >
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="danger"
          leftSection={<IconTrash size={16} />}
          onClick={onDelete}
        >
          <Trans>Delete case type</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

- [ ] **Step 5: Replace the header actions**

Replace the whole of `CaseTypeActions.tsx` with:

```tsx
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { CaseTypeActionsMenu } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActionsMenu";
import { RefreshRecordsButton } from "@/views/OntologyDesignerApp/ConceptMetaView/RefreshRecordsButton";
import { ViewRecordsButton } from "@/views/OntologyDesignerApp/ConceptMetaView/ViewRecordsButton";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  fullConcept: Concept.T<"Full">;
};

/**
 * The case type page's header actions. Each is hidden, not disabled, from a
 * user whose roles do not allow it: refreshing records takes editor access
 * to Case Types or to Case Records, opening the records takes Case Records
 * access, and deleting the case type takes Case Types admin.
 */
export function CaseTypeActions({
  concept,
  fullConcept,
}: Readonly<Props>): ReactNode {
  const canSyncAsCaseTypesEditor = useHasPermission(
    "case_types__can_sync_records",
  );
  const canSyncAsRecordsEditor = useHasPermission(
    "case_records__can_sync_records",
  );
  const canViewRecords = useHasPermission("case_records__can_view_record");
  const canDeleteCaseType = useHasPermission("case_types__can_delete_case_type");

  return (
    <>
      {canSyncAsCaseTypesEditor || canSyncAsRecordsEditor ? (
        <RefreshRecordsButton concept={concept} fullConcept={fullConcept} />
      ) : null}
      {canViewRecords ? <ViewRecordsButton concept={concept} /> : null}
      {canDeleteCaseType ? <CaseTypeActionsMenu concept={concept} /> : null}
    </>
  );
}
```

- [ ] **Step 6: Make View records the primary action**

In `ViewRecordsButton.tsx`, replace:

```tsx
      variant="light"
```

with:

```tsx
      variant="filled"
```

and replace its docstring:

```tsx
/**
 * Opens the records workspace for this case type.
 */
```

with:

```tsx
/**
 * Opens the records workspace for this case type. It is the case type
 * page's one primary action.
 */
```

- [ ] **Step 7: Write the rail**

`CaseTypeRail.tsx`:

```tsx
import { formatDate } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  /** The datasets its records come from. Unset while they load. */
  datasets: readonly Dataset.T[] | undefined;
};

/**
 * Reference facts about a case type: the datasets its records come from,
 * whether records may be added by hand, who owns it, and when it was made.
 * A fact with no value is omitted.
 */
export function CaseTypeRail({ concept, datasets }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [members] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: workspace.id,
  });
  const owner = members?.find((member) => {
    return member.userId === concept.ownerId;
  });

  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Case type</Trans>}>
        {datasets && datasets.length > 0 ? (
          <AppViewRail.Fact label={t`Source data`}>
            <Stack component="span" gap={2}>
              {datasets.map((dataset) => {
                return <span key={dataset.id}>{dataset.name}</span>;
              })}
            </Stack>
          </AppViewRail.Fact>
        ) : null}
        <AppViewRail.Fact label={t`Records added by hand`}>
          {concept.allowManualCreation ? t`Allowed` : t`Not allowed`}
        </AppViewRail.Fact>
        {owner ? (
          <AppViewRail.Fact label={t`Owner`}>{owner.displayName}</AppViewRail.Fact>
        ) : null}
        <AppViewRail.Fact label={t`Created`}>
          {formatDate(concept.createdAt, { format: "MMM D, YYYY" })}
        </AppViewRail.Fact>
      </AppViewRail.Group>
    </AppViewRail>
  );
}
```

- [ ] **Step 8: Rewrite the page**

Replace the whole of `ConceptMetaView/index.tsx` with:

```tsx
import { formatDate, where } from "@avandar/utils";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { CaseTypeActions } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions";
import { CaseTypeAttributesList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList";
import { CaseTypeRail } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeRail";
import { CaseTypeStatusesSection } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusesSection";
import { useHydratedConcept } from "@/views/OntologyDesignerApp/ConceptMetaView/useHydratedConcept";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
};

/**
 * One case type: what it is, the attributes its records carry, and the
 * statuses they move through, with its provenance in the rail.
 *
 * The header states the counts a user scans for (records, attributes) and
 * holds the actions on the whole case type, each hidden from a user whose
 * roles do not allow it. Statuses are the only part editable after
 * creation, through the Statuses section's Edit statuses modal.
 */
export function ConceptMetaView({ concept }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [fullConcept] = useHydratedConcept({ concept });
  const [recordCount] = IndividualClient.useGetCount(
    where("concept_id", "eq", concept.id),
  );
  const attributeCount = fullConcept.attributes?.length;

  return (
    <AppView>
      <AppViewHeader
        title={concept.name}
        facts={[
          recordCount === undefined || recordCount === null ? undefined : (
            <Plural value={recordCount} one="# record" other="# records" />
          ),
          attributeCount === undefined ? undefined : (
            <Plural
              value={attributeCount}
              one="# attribute"
              other="# attributes"
            />
          ),
          t`Created ${formatDate(concept.createdAt, { format: "MMM D, YYYY" })}`,
        ]}
        actions={<CaseTypeActions concept={concept} fullConcept={fullConcept} />}
      />
      <AppViewBody
        rail={<CaseTypeRail concept={concept} datasets={fullConcept.datasets} />}
      >
        <Stack gap="xl">
          {concept.description ? (
            <AppViewSection title={<Trans>Description</Trans>}>
              <Text maw="72ch">{concept.description}</Text>
            </AppViewSection>
          ) : null}
          <AppViewSection title={<Trans>Attributes</Trans>} meta={attributeCount}>
            <CaseTypeAttributesList
              attributes={fullConcept.attributes}
              datasets={fullConcept.datasets}
            />
          </AppViewSection>
          <CaseTypeStatusesSection concept={concept} />
        </Stack>
      </AppViewBody>
    </AppView>
  );
}
```

- [ ] **Step 9: Let the case type page own its scrolling**

In `src/views/OntologyDesignerApp/index.tsx`, after the line `const showMasterDetail = isCreatorRoute || isConceptRoute;`, add:

```tsx
  // `$conceptId` also matches the creator's path segment, so the creator is
  // excluded by name. The case type page is an `AppView`, which scrolls its
  // own body so its header band stays put; the creator form still scrolls
  // as a whole.
  const isCaseTypeRoute = isConceptRoute && !isCreatorRoute;
```

Then replace:

```tsx
        <Flex align="stretch" h="100%">
```

with:

```tsx
        <Flex align="stretch" h="100%" mih={0}>
```

and replace:

```tsx
          <ScrollArea h="100%" w="100%">
            <Outlet />
          </ScrollArea>
```

with:

```tsx
          {isCaseTypeRoute ? (
            <Flex direction="column" flex={1} miw={0} mih={0}>
              <Outlet />
            </Flex>
          ) : (
            <ScrollArea h="100%" w="100%">
              <Outlet />
            </ScrollArea>
          )}
```

Leave plan 1's gate on `NewCaseTypeButton` (Create case type) exactly as it is.

- [ ] **Step 10: Verify**

Run: `pnpm type-check`
Expected: no errors.

Run: `pnpm test:frontend src/views/OntologyDesignerApp`
Expected: PASS, including all of `CaseTypeActions.test.tsx`.

Run: `.claude/skills/impeccable/scripts/impeccable detect --json src/views/OntologyDesignerApp/ConceptMetaView src/views/OntologyDesignerApp/index.tsx`
Expected: no findings. Fix any before committing.

- [ ] **Step 11: Commit**

```bash
git add src/views/OntologyDesignerApp/ConceptMetaView src/views/OntologyDesignerApp/index.tsx
git commit -m "feat(case-statuses): rebuild the case type page with a Statuses section" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 20: Translation catalogs

**Files:**
- Modify: `src/i18n/locales/*/messages.po`
- Modify: `src/i18n/locales/*/messages.ts`

- [ ] **Step 1: Extract and compile**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: both succeed. `src/i18n/locales/en/messages.po` gains `#:` references for the new files, including `src/components/caseStatuses/StatusSetEditor/useStatusSetIssueMessages.ts` and `src/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/SaveErrorCallout.tsx`.

- [ ] **Step 2: Check no string was missed**

Run: `grep -c "Move # records to\|You need Case Records editor access" src/i18n/locales/en/messages.po`
Expected: `2` or more.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales
git commit -m "chore(case-statuses): extract and compile status screen messages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Run the catalog gate**

Run: `pnpm i18n:check`
Expected: exit 0. A diff means a string changed after Step 1: rerun Steps 1 and 3.

---
## Task 21: E2E seed helper for a case type with statuses and records

**Files:**
- Create: `tests/e2e/helpers/insertE2ECaseTypeWithRecords.ts`

Plan 1 created `tests/e2e/helpers/insertE2ECaseType.ts` (`insertE2ECaseType`, `deleteE2ECaseTypes`) and plan 2 moved it onto `rpc_concepts__create`. It seeds the default Active and Inactive statuses and no records. The status specs need their own statuses and records, so this task adds a sibling helper that follows the same conventions (owner from `workspaces.owner_id`, the same RPC and status payload shape) and reuses `deleteE2ECaseTypes` for cleanup.

Spec §12 allows the role assignment and the initial case type to be seeded directly. The helper runs before the first page load with the service-role client; the specs drive everything under test through the UI. Records are inserted with an explicit `status_id`, which the status-change trigger allows for `service_role`.

- [ ] **Step 1: Check the switch**

Run: `ava supabase status`
Expected: the first line is green and names the `feat-statuses` project.

- [ ] **Step 2: Write the helper**

`tests/e2e/helpers/insertE2ECaseTypeWithRecords.ts`:

```ts
import { makeObjectFromEntries } from "@avandar/utils";
import { randomUUID } from "node:crypto";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** A status to seed. */
export type E2ECaseTypeStatus = Readonly<{
  name: string;
  description: string;
  /** A palette `#rrggbb`. */
  color: string;
}>;

/** A record to seed, named by the status it starts in. */
export type E2ECaseTypeRecord = Readonly<{
  name: string;
  statusName: string;
}>;

/** What `insertE2ECaseTypeWithRecords` created, for assertions. */
export type E2ECaseTypeWithRecords = Readonly<{
  id: string;
  name: string;
  statusIdsByName: Readonly<Record<string, string>>;
  recordIdsByName: Readonly<Record<string, string>>;
}>;

type InsertOptions = Readonly<{
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  name: string;
  /** In display order. The first status is the case type's default. */
  statuses: readonly E2ECaseTypeStatus[];
  records: readonly E2ECaseTypeRecord[];
}>;

type StatusRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  position: number;
};

async function _getWorkspaceOwnerId(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
  }>,
): Promise<string> {
  const { data: workspaceRow } = await options.supabaseAdminClient
    .from("workspaces")
    .select("owner_id")
    .eq("id", options.workspaceId)
    .single()
    .throwOnError();
  return workspaceRow.owner_id;
}

async function _createCaseType(
  options: InsertOptions &
    Readonly<{ caseTypeId: string; statusRows: readonly StatusRow[] }>,
): Promise<void> {
  const defaultStatus = options.statusRows[0];
  if (!defaultStatus) {
    throw new Error("[e2e] a seeded case type needs at least one status");
  }
  const ownerId = await _getWorkspaceOwnerId(options);
  // A case type and its default status reference each other, so they are
  // created together in one transaction.
  await options.supabaseAdminClient
    .rpc("rpc_concepts__create", {
      p_concept: {
        id: options.caseTypeId,
        workspace_id: options.workspaceId,
        owner_id: ownerId,
        name: options.name,
        description: null,
        allow_manual_creation: false,
        default_status_id: defaultStatus.id,
      },
      p_statuses: [...options.statusRows],
      p_attributes: [],
      p_dataset_column_mappings: [],
      p_manual_entry_mappings: [],
    })
    .throwOnError();
}

async function _insertRecords(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
    caseTypeId: string;
    records: readonly E2ECaseTypeRecord[];
    statusIdsByName: Readonly<Record<string, string>>;
  }>,
): Promise<Record<string, string>> {
  const rows = options.records.map((record, index) => {
    const statusId = options.statusIdsByName[record.statusName];
    if (statusId === undefined) {
      throw new Error(`[e2e] no seeded status named "${record.statusName}"`);
    }
    return {
      id: randomUUID(),
      workspace_id: options.workspaceId,
      concept_id: options.caseTypeId,
      external_id: `e2e-record-${index + 1}`,
      name: record.name,
      status_id: statusId,
    };
  });
  if (rows.length > 0) {
    await options.supabaseAdminClient
      .from("individuals")
      .insert(rows)
      .throwOnError();
  }
  return makeObjectFromEntries(
    rows.map((row) => {
      return [row.name, row.id] as const;
    }),
  );
}

/**
 * Inserts a case type with the given statuses and records, owned by the
 * workspace owner, for a spec that needs them before the page loads. Delete
 * it with `deleteE2ECaseTypes` in `finally`; its statuses and records go
 * with it through `on delete cascade`.
 *
 * @returns The case type, and its statuses' and records' ids by name.
 */
export async function insertE2ECaseTypeWithRecords(
  options: InsertOptions,
): Promise<E2ECaseTypeWithRecords> {
  const caseTypeId = randomUUID();
  const statusRows = options.statuses.map((status, position) => {
    return { id: randomUUID(), ...status, position };
  });
  await _createCaseType({ ...options, caseTypeId, statusRows });
  const statusIdsByName = makeObjectFromEntries(
    statusRows.map((row) => {
      return [row.name, row.id] as const;
    }),
  );
  const recordIdsByName = await _insertRecords({
    supabaseAdminClient: options.supabaseAdminClient,
    workspaceId: options.workspaceId,
    caseTypeId,
    records: options.records,
    statusIdsByName,
  });
  return {
    id: caseTypeId,
    name: options.name,
    statusIdsByName,
    recordIdsByName,
  };
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: no errors. A type error on `.rpc("rpc_concepts__create", ...)` means the generated database types are stale: plan 2's `pnpm db:gen-types` output is missing.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers/insertE2ECaseTypeWithRecords.ts
git commit -m "test(case-statuses): seed a case type with statuses and records for E2E specs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 22: E2E, changing a record's status

**Files:**
- Create: `tests/e2e/case-statuses-record.spec.ts`

- [ ] **Step 1: Write the spec**

`tests/e2e/case-statuses-record.spec.ts`:

```ts
/*
 * Changing a record's status from the record page. A Case Records editor
 * changes it and reads each status's meaning on the way; a viewer sees the
 * status and its meaning and has no control to change it. The case type,
 * its record, and the member's role are seeded before sign-in. Everything
 * the user does goes through the UI.
 */
import { Permissions } from "$/models/Permissions/Permissions";
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberCustomMatrix,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteE2ECaseTypes } from "./helpers/insertE2ECaseType";
import { insertE2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { E2EGlobalViewerMembership } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import type { E2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import type { Page } from "@playwright/test";

const CASE_TYPE_NAME = "E2E record status cases";
const RECORD_NAME = "Case 001";
const SUSPECTED_DESCRIPTION = "Reported but not yet tested.";
const CONFIRMED_DESCRIPTION = "A lab test came back positive.";

type AssignResult = Awaited<
  ReturnType<typeof assignE2ESecondaryMemberCustomMatrix>
>;

function _insertCaseType(
  membership: E2EGlobalViewerMembership,
): Promise<E2ECaseTypeWithRecords> {
  return insertE2ECaseTypeWithRecords({
    supabaseAdminClient: membership.admin,
    workspaceId: membership.workspaceId,
    name: CASE_TYPE_NAME,
    statuses: [
      {
        name: "Suspected",
        description: SUSPECTED_DESCRIPTION,
        color: "#fab005",
      },
      {
        name: "Confirmed",
        description: CONFIRMED_DESCRIPTION,
        color: "#fa5252",
      },
    ],
    records: [{ name: RECORD_NAME, statusName: "Suspected" }],
  });
}

async function _openRecordFromSidebar(page: Page): Promise<void> {
  await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
  await page.getByRole("link", { name: new RegExp(`${RECORD_NAME}$`) }).click();
  await expect(
    page.getByRole("heading", { name: RECORD_NAME, level: 3 }),
  ).toBeVisible({ timeout: LONG_WAIT });
}

test.describe("record status", () => {
  test("saves a Case Records editor's status change and explains each status on its option", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    let caseType: E2ECaseTypeWithRecords | undefined;
    let assignResult: AssignResult | undefined;
    try {
      caseType = await _insertCaseType(e2eViewerMembership);
      assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: {
          ...Permissions.RolesMatrix.Builtins.GlobalViewer,
          case_records: "editor",
        },
      });
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.secondaryUser.email,
        password: e2eWorkerDb.secondaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await _openRecordFromSidebar(page);

      await page.getByRole("button", { name: "Status: Suspected" }).click();
      const confirmedOption = page.getByRole("menuitem", { name: "Confirmed" });
      await confirmedOption.hover();
      await expect(
        page.getByRole("tooltip").filter({ hasText: CONFIRMED_DESCRIPTION }),
      ).toBeVisible();
      await confirmedOption.click();

      await expect(
        page.getByRole("button", { name: "Status: Confirmed" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("link", { name: new RegExp(`${RECORD_NAME}$`) })
          .getByRole("img", { name: "Confirmed" }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      // Oracle: the change reached the database, not only the screen.
      const { data: savedRecord } = await e2eViewerMembership.admin
        .from("individuals")
        .select("status_id")
        .eq("id", caseType.recordIdsByName[RECORD_NAME]!)
        .single()
        .throwOnError();
      expect(savedRecord.status_id).toBe(caseType.statusIdsByName.Confirmed);
    } finally {
      if (assignResult) {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: e2eViewerMembership.admin,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
      if (caseType) {
        await deleteE2ECaseTypes({
          supabaseAdminClient: e2eViewerMembership.admin,
          ids: [caseType.id],
        });
      }
    }
  });

  test("shows a records viewer the status and its meaning with no way to change it", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    let caseType: E2ECaseTypeWithRecords | undefined;
    try {
      caseType = await _insertCaseType(e2eViewerMembership);
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.secondaryUser.email,
        password: e2eWorkerDb.secondaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await _openRecordFromSidebar(page);

      const recordHeader = page.locator("header").filter({
        has: page.getByRole("heading", { name: RECORD_NAME, level: 3 }),
      });
      const statusBadge = recordHeader.getByText("Suspected", { exact: true });
      await expect(statusBadge).toBeVisible();
      await expect(page.getByRole("button", { name: /^Status:/ })).toHaveCount(
        0,
      );

      await statusBadge.hover();
      await expect(
        page.getByRole("tooltip").filter({ hasText: SUSPECTED_DESCRIPTION }),
      ).toBeVisible();
    } finally {
      if (caseType) {
        await deleteE2ECaseTypes({
          supabaseAdminClient: e2eViewerMembership.admin,
          ids: [caseType.id],
        });
      }
    }
  });
});
```

The viewer case uses the fixture's Global Viewer membership, which plan 1 gives `case_records: "viewer"`.

- [ ] **Step 2: Run it**

Run: `ava supabase status` (green, `feat-statuses`), then `pnpm test:e2e case-statuses-record.spec.ts`
Expected: PASS, 2 tests.

A failure at `getByRole("link", { name: CASE_TYPE_NAME })` means the sidebar does not list the case type for this member: check plan 1's navbar gating gives Global Viewer the `case_records` link. A failure at the oracle with the badge already showing "Confirmed" means the optimistic state showed but the save failed: the toast says why.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/case-statuses-record.spec.ts
git commit -m "test(case-statuses): cover changing a record's status end to end" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 23: E2E, editing a case type's statuses

**Files:**
- Create: `tests/e2e/case-statuses-edit.spec.ts`

- [ ] **Step 1: Write the spec**

`tests/e2e/case-statuses-edit.spec.ts`:

```ts
/*
 * A Case Types editor edits a case type's statuses in one save: adds one,
 * renames one, reorders with the keyboard, changes the default, and removes
 * a status that records use by moving them to another. The case type, its
 * records, and the member's role are seeded before sign-in. Everything the
 * user does goes through the UI.
 */
import { makeObjectFromEntries } from "@avandar/utils";
import { Permissions } from "$/models/Permissions/Permissions";
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberCustomMatrix,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteE2ECaseTypes } from "./helpers/insertE2ECaseType";
import { insertE2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import type { Locator, Page } from "@playwright/test";

const CASE_TYPE_NAME = "E2E editable statuses";

type AssignResult = Awaited<
  ReturnType<typeof assignE2ESecondaryMemberCustomMatrix>
>;

async function _openEditStatuses(page: Page): Promise<Locator> {
  await page.getByRole("link", { name: "Case Manager" }).click();
  await page.getByRole("button", { name: `Open ${CASE_TYPE_NAME}` }).click();
  await page.getByRole("button", { name: "Edit statuses" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit statuses" });
  await expect(dialog).toBeVisible({ timeout: LONG_WAIT });
  return dialog;
}

async function _editEveryWay(
  options: Readonly<{ page: Page; dialog: Locator }>,
): Promise<void> {
  const { page, dialog } = options;
  const nameInputs = dialog.getByRole("textbox", { name: "Status name" });

  await dialog.getByRole("button", { name: "Add status" }).click();
  await nameInputs.nth(3).fill("Escalated");
  await dialog
    .getByRole("textbox", { name: "Description" })
    .nth(3)
    .fill("Needs a supervisor's review.");
  await nameInputs.nth(0).fill("Open");

  // Escalated moves one place up, above Closed.
  await dialog
    .getByRole("button", { name: "Reorder Escalated" })
    .press("Alt+ArrowUp");
  await expect(nameInputs.nth(2)).toHaveValue("Escalated");

  await dialog
    .getByRole("radio", { name: "Make Inactive the default" })
    .check();

  await dialog.getByRole("button", { name: "Remove Closed" }).click();
  await dialog
    .getByRole("listitem", { name: "Removed: Closed" })
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: "Escalated" }).click();
}

async function _readStatusIdsByName(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    caseTypeId: string;
  }>,
): Promise<Record<string, string>> {
  const { data: statuses } = await options.supabaseAdminClient
    .from("concept_statuses")
    .select("id, name")
    .eq("concept_id", options.caseTypeId)
    .throwOnError();
  return makeObjectFromEntries(
    statuses.map((status) => {
      return [status.name, status.id] as const;
    }),
  );
}

async function _expectSavedInDatabase(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    caseType: E2ECaseTypeWithRecords;
  }>,
): Promise<void> {
  const { supabaseAdminClient, caseType } = options;
  const statusIdsByName = await _readStatusIdsByName({
    supabaseAdminClient,
    caseTypeId: caseType.id,
  });
  expect(Object.keys(statusIdsByName).sort()).toEqual([
    "Escalated",
    "Inactive",
    "Open",
  ]);
  const { data: savedCaseType } = await supabaseAdminClient
    .from("concepts")
    .select("default_status_id")
    .eq("id", caseType.id)
    .single()
    .throwOnError();
  expect(savedCaseType.default_status_id).toBe(
    caseType.statusIdsByName.Inactive,
  );
  const { data: movedRecords } = await supabaseAdminClient
    .from("individuals")
    .select("status_id")
    .in("id", [
      caseType.recordIdsByName["Case B"]!,
      caseType.recordIdsByName["Case C"]!,
    ])
    .throwOnError();
  expect(
    movedRecords.map((record) => {
      return record.status_id;
    }),
  ).toEqual([statusIdsByName.Escalated, statusIdsByName.Escalated]);
}

test.describe("editing statuses", () => {
  test("saves added, renamed, and reordered statuses, a new default, and a removed status's records moved to its replacement", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const supabaseAdminClient = e2eViewerMembership.admin;
    let caseType: E2ECaseTypeWithRecords | undefined;
    let assignResult: AssignResult | undefined;
    try {
      caseType = await insertE2ECaseTypeWithRecords({
        supabaseAdminClient,
        workspaceId: e2eViewerMembership.workspaceId,
        name: CASE_TYPE_NAME,
        statuses: [
          {
            name: "Active",
            description: "Open and being worked on.",
            color: "#40c057",
          },
          {
            name: "Inactive",
            description: "No longer being worked on.",
            color: "#637c95",
          },
          {
            name: "Closed",
            description: "Finished and filed.",
            color: "#fa5252",
          },
        ],
        records: [
          { name: "Case A", statusName: "Active" },
          { name: "Case B", statusName: "Closed" },
          { name: "Case C", statusName: "Closed" },
        ],
      });
      assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: {
          ...Permissions.RolesMatrix.Builtins.GlobalViewer,
          case_types: "editor",
        },
      });
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.secondaryUser.email,
        password: e2eWorkerDb.secondaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      const dialog = await _openEditStatuses(page);
      await _editEveryWay({ page, dialog });
      await expect(
        dialog.getByText(/find records by status name/),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Save statuses" }).click();
      await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });

      const rows = page
        .getByRole("list", { name: "Statuses" })
        .getByRole("listitem");
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Open");
      await expect(rows.nth(1)).toContainText("Inactive");
      await expect(rows.nth(1)).toContainText("Default");
      await expect(rows.nth(2)).toContainText("Escalated");
      await expect(rows.nth(2)).toContainText("2 records");

      // Oracle: the set, the default, and the moved records are saved.
      await _expectSavedInDatabase({ supabaseAdminClient, caseType });
    } finally {
      if (assignResult) {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
      if (caseType) {
        await deleteE2ECaseTypes({ supabaseAdminClient, ids: [caseType.id] });
      }
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `ava supabase status` (green), then `pnpm test:e2e case-statuses-edit.spec.ts`
Expected: PASS, 1 test.

If "Save statuses" stays disabled, a set issue is still showing in the dialog: the failure screenshot shows which message. If the dialog closes but the rows keep the old default, the route loader was not reloaded: check `useSaveCaseTypeStatuses` awaits `invalidateCaseStatusQueries`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/case-statuses-edit.spec.ts
git commit -m "test(case-statuses): cover editing a case type's statuses end to end" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 24: E2E, filtering the records list by status

**Files:**
- Create: `tests/e2e/case-statuses-list-filter.spec.ts`

- [ ] **Step 1: Write the spec**

`tests/e2e/case-statuses-list-filter.spec.ts`:

```ts
/*
 * The records list's status filter narrows both the rows and the count in
 * the list header. The case type and its records are seeded before sign-in
 * as the workspace owner. Everything the user does goes through the UI.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteE2ECaseTypes } from "./helpers/insertE2ECaseType";
import { insertE2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";
import type { E2ECaseTypeWithRecords } from "./helpers/insertE2ECaseTypeWithRecords";
import type { Locator, Page } from "@playwright/test";

const CASE_TYPE_NAME = "E2E filtered records";

function _recordLink(page: Page, recordName: string): Locator {
  // A row's name starts with its status dot's label, so match the end.
  return page.getByRole("link", { name: new RegExp(`${recordName}$`) });
}

/**
 * The count beside the list title. `AppListPane` renders it as the
 * paragraph right after its `h3` title.
 */
function _recordCount(page: Page): Locator {
  return page
    .getByRole("heading", { name: CASE_TYPE_NAME, level: 3, exact: true })
    .locator("xpath=following-sibling::p[1]");
}

async function _toggleStatus(
  options: Readonly<{ page: Page; statusName: string }>,
): Promise<void> {
  const { page, statusName } = options;
  const statusFilter = page.getByRole("combobox", { name: "Filter by status" });
  await statusFilter.click();
  await page.getByRole("option", { name: statusName }).click();
  await statusFilter.press("Escape");
}

test.describe("records status filter", () => {
  test("narrows the records list and its count to the chosen statuses", async ({
    page,
    e2eWorkerDb,
  }) => {
    const supabaseAdminClient = createSupabaseAdminClient();
    let caseType: E2ECaseTypeWithRecords | undefined;
    try {
      caseType = await insertE2ECaseTypeWithRecords({
        supabaseAdminClient,
        workspaceId: await getWorkspaceIdBySlug({
          supabaseAdminClient,
          slug: e2eWorkerDb.workspaceSlug,
        }),
        name: CASE_TYPE_NAME,
        statuses: [
          {
            name: "Suspected",
            description: "Not yet tested.",
            color: "#fab005",
          },
          {
            name: "Confirmed",
            description: "Tested positive.",
            color: "#fa5252",
          },
          {
            name: "Ruled out",
            description: "Tested negative.",
            color: "#637c95",
          },
        ],
        records: [
          { name: "Case A", statusName: "Suspected" },
          { name: "Case B", statusName: "Confirmed" },
          { name: "Case C", statusName: "Confirmed" },
          { name: "Case D", statusName: "Ruled out" },
        ],
      });
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await page
        .getByRole("link", { name: CASE_TYPE_NAME, exact: true })
        .click();
      await expect(_recordCount(page)).toHaveText("4", { timeout: LONG_WAIT });

      await _toggleStatus({ page, statusName: "Confirmed" });
      await expect(_recordCount(page)).toHaveText("2");
      await expect(_recordLink(page, "Case B")).toBeVisible();
      await expect(_recordLink(page, "Case C")).toBeVisible();
      await expect(_recordLink(page, "Case A")).toHaveCount(0);
      await expect(_recordLink(page, "Case D")).toHaveCount(0);

      await _toggleStatus({ page, statusName: "Ruled out" });
      await expect(_recordCount(page)).toHaveText("3");
      await expect(_recordLink(page, "Case D")).toBeVisible();
      await expect(_recordLink(page, "Case A")).toHaveCount(0);
    } finally {
      if (caseType) {
        await deleteE2ECaseTypes({ supabaseAdminClient, ids: [caseType.id] });
      }
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `ava supabase status` (green), then `pnpm test:e2e case-statuses-list-filter.spec.ts`
Expected: PASS, 1 test.

If the count matches but the rows do not, the list and the count are not using the same filter: both must go through `makeRecordsWhereFromStatusFilter`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/case-statuses-list-filter.spec.ts
git commit -m "test(case-statuses): cover filtering the records list by status end to end" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 25: Update the ontology architecture doc

**Files:**
- Modify: `docs/ontology-architecture.md` (section 9, and item 5 of the layer list in section 13)

Plan 2 owns sections 4, 5, 10, 11, 12, 16, and section 13's diagram and item 8. Plan 4 owns the QETL and chat parts. Touch only section 9 and section 13 item 5. Read the doc first and match its voice: plain statements of what the code does, file paths in backticks, no history.

- [ ] **Step 1: Update the UI map rows**

In section 9's table, replace the `ontology-designer/$conceptId.tsx` row:

```markdown
| `ontology-designer/$conceptId.tsx` | Case type detail: attributes, View records, Sync records, Delete (read-only, no edit) | `src/views/OntologyDesignerApp/ConceptMetaView/` (`CaseTypeActions.tsx`, `CaseTypeAttributesList.tsx`, `useHydratedConcept.ts`) |
```

with:

```markdown
| `ontology-designer/$conceptId.tsx` | Case type page (`AppView`): record and attribute counts, Description, Attributes, and Statuses with a record count per status. Refresh records, View records, and Delete (in the overflow menu) are each hidden without the permission they need. Statuses are the only part editable after creation, through the Edit statuses modal | `src/views/OntologyDesignerApp/ConceptMetaView/` (`CaseTypeActions.tsx`, `CaseTypeStatusesSection.tsx`, `CaseTypeStatusList/`, `EditStatusesModal/`, `CaseTypeRail.tsx`, `useHydratedConcept.ts`) |
```

Replace the `ontology-designer/concept-creator.tsx` row:

```markdown
| `ontology-designer/concept-creator.tsx` | Concept creator form | `src/views/OntologyDesignerApp/ConceptCreatorView/` |
```

with:

```markdown
| `ontology-designer/concept-creator.tsx` | Concept creator form, with a Statuses section that starts from the default set | `src/views/OntologyDesignerApp/ConceptCreatorView/` (`ConceptStatusesFieldset/`) |
```

Replace the `individual-manager/$conceptId/route.tsx` row:

```markdown
| `individual-manager/$conceptId/route.tsx` | Records slate: list pane plus outlet | `src/views/IndividualManagerApp/index.tsx`, `IndividualNavbar.tsx`, `useConceptIndividuals.ts`, `useVirtualIndividualLinks.ts`, `EditCaseTypeButton.tsx` |
```

with:

```markdown
| `individual-manager/$conceptId/route.tsx` | Records slate: an `AppListPane` with a status filter and the count of records it matches, each row marked with its status color, plus the outlet | `src/views/IndividualManagerApp/index.tsx`, `IndividualNavbar/` (`StatusFilter/`), `makeRecordsWhereFromStatusFilter/`, `useConceptIndividuals.ts`, `useVirtualIndividualLinks.tsx`, `EditCaseTypeButton.tsx` |
```

Replace the `individual-manager/$conceptId/$individualId.tsx` row:

```markdown
| `individual-manager/$conceptId/$individualId.tsx` | Record page: Details and Notes | `src/views/IndividualManagerApp/SingleIndividualView/` (`RecordAttributesList.tsx`, `ActivityBlock.tsx`) |
```

with:

```markdown
| `individual-manager/$conceptId/$individualId.tsx` | Record page (`AppView`): the status beside the name (a menu for a Case Records editor, a badge for everyone else, each status's description on hover and focus), Details, Activity, and a rail of record facts | `src/views/IndividualManagerApp/SingleIndividualView/` (`RecordStatusControl/`, `useRecordStatusChange/`, `RecordRail/`, `RecordDetailsSection.tsx`, `RecordAttributesList.tsx`, `ActivityBlock.tsx`) |
```

If plan 2 already changed any of these rows, merge: keep plan 2's facts and add these.

- [ ] **Step 2: Add the shared pieces under "Outside the routes"**

Add these two bullets after the "Chat draft card" bullet:

```markdown
- **Status components**: `src/components/caseStatuses/` holds `StatusSetEditor`
  (the controlled status set editor), `StatusBadge`, `StatusDot`, and
  `StatusColorPicker`. The create form and the Edit statuses modal use the
  editor.
- **Status cache invalidation**: `invalidateCaseStatusQueries`
  (`src/views/IndividualManagerApp/invalidateCaseStatusQueries/`) is the one
  place a record's status change or a status set save marks queries stale:
  the case type's record lists and counts, its statuses, every Data Explorer
  query, and the route loader.
```

- [ ] **Step 3: Update section 13, item 5**

Replace:

```markdown
5. **A list or grid view** to filter by the new state; the records list pane has
   no ordering, filtering or search.
```

with:

```markdown
5. **A list or grid view** to filter by the new state. The records list pane
   filters by status: `StatusFilter` picks the statuses, and
   `makeRecordsWhereFromStatusFilter` builds the one `where` that both the
   page query and the count use. A new filter follows the same path. The pane
   still has no ordering or search.
```

- [ ] **Step 4: Check the voice rules**

Run: `perl -CSD -ne 'print "$.: $_" if /\x{2014}/' docs/ontology-architecture.md` (U+2014 is the em dash)
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add docs/ontology-architecture.md
git commit -m "docs(case-statuses): map the status screens in the ontology architecture doc" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Verification checklist

- [ ] `pnpm test:frontend` passes, including the new suites: `StatusDot`, `StatusBadge`, `StatusColorPicker`, `StatusSetEditor` (11), `getStatusSetValueFromFormValues`, `ConceptStatusesFieldset`, `makeRecordsWhereFromStatusFilter`, `invalidateCaseStatusQueries`, `AppViewHeader`, `StatusFilter`, `RecordStatusControl`, `useRecordStatusChange`, `RecordRail`, `CaseTypeStatusList`, `EditStatusesForm`.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm lint` passes (ESLint, stylelint with alphabetical properties, react-doctor on changed files).
- [ ] `pnpm i18n:check` exits 0.
- [ ] `ava supabase status` reads green, then each E2E spec passes on its own:
  - `pnpm test:e2e case-statuses-record.spec.ts`
  - `pnpm test:e2e case-statuses-edit.spec.ts`
  - `pnpm test:e2e case-statuses-list-filter.spec.ts`
- [ ] The design detector is clean: `.claude/skills/impeccable/scripts/impeccable detect --json src/components/caseStatuses src/views/OntologyDesignerApp/ConceptMetaView src/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset src/views/IndividualManagerApp src/components/layouts/AppView/AppViewHeader src/components/layouts/AppListPane`.
- [ ] Headless visual check. Run `pnpm dev`, then drive a headless browser with the Playwright MCP, signed in with `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, and `TEST_WORKSPACE_SLUG` from `seed/SeedData.ts` (never the E2E accounts). If the seeded workspace has no case type, create one through the create form from a seeded dataset, which also exercises the Statuses section. Save each screenshot to `.temp/feat-statuses/`:
  - `create-form-statuses.png`: the create form's Statuses section with a third status added.
  - `case-type-page.png`: header facts, one filled primary action, Attributes and Statuses sections, rail on the trailing edge.
  - `edit-statuses-modal.png`: the modal with a removed status asking where its records go, and the rename warning.
  - `record-status-menu.png`: the record page with the status menu open and an option's description tooltip showing.
  - `records-list-filtered.png`: the records list with one status picked, the count and the rows agreeing.
  - `case-type-page-1024.png`: the case type page at 1024 px wide, rail flowed under the content.
  Against `docs/design/app-view-layout.md`: no `Paper`, `Card`, or `Container` between the slate and the content; no `Callout color="info"`; one primary action per view; the rail holds no actions; every heading has more space above it than below.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] No em dash (U+2014) in any line this plan added: `git diff develop -U0 | perl -CSD -ne 'print if /^\+/ && /\x{2014}/'` prints nothing.
- [ ] Nothing ran against production.
