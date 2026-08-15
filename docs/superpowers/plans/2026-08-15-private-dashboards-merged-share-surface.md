# Private dashboards merged share surface (P3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a user one place to choose a dashboard's audience, including "only my workspace", by merging publishing into the share modal, and make published dashboards findable.

**Architecture:** `ShareResourceModal` stays resource-generic and grows one optional `publishing` prop that only dashboards supply. General access grows a fourth value, "Anyone with the link", which selects a *target* visibility rather than writing it; the Publish and Unpublish buttons in the modal footer are what call P2's `publishDashboard` / `unpublishDashboard`. Publishing publicly becomes an admin-tier permission enforced by a Postgres trigger on the transition. The dashboards index stops filtering on `owner_id` and lets RLS decide, and cards gain audience badges.

**Tech Stack:** TypeScript, React, Mantine, TanStack Router, Lingui, Vitest, Playwright, Postgres / Supabase (declarative schema in `supabase/schemas/`), pgTAP.

**Spec:** `docs/superpowers/specs/2026-08-15-private-dashboards-merged-share-surface-design.md`

---

## Before you start

Read the spec. This plan implements it and does not repeat its reasoning.

**What P2 already built that you are calling, not writing:**

- `DashboardClient.publishDashboard({ dashboardId, visibility, slug?, publishConfig })`
  and `DashboardClient.unpublishDashboard({ dashboardId })`, both tested, the
  second with no caller yet. This plan is its caller.
- `DashboardClient.validateDashboardSlug({ slug, visibility, dashboardId? })`,
  already namespace-aware.
- The viewer routes `/d/$slugOrId` and `/$workspaceSlug/d/$slugOrId`, and
  `DashboardAccessDeniedView`.
- The editor route's `beforeLoad`, which already sends sub-editor users to
  `/$workspaceSlug/dashboards/preview/$dashboardId`.

**Three conventions in this repo that will bite you:**

1. **Schema changes are declarative.** Edit `supabase/schemas/*.sql` and
   generate the migration with `pnpm db:new-migration <name>`. Never hand-write
   a migration for `public` or `private` schema objects. This plan touches no
   storage objects, so the hand-written `_STORAGE` rules from P2 do not apply.
2. **Every user-visible string goes through Lingui.** `pnpm i18n:extract` after
   any copy change, and commit the catalogs. `pnpm i18n:check` fails the build
   otherwise.
3. **Mantine `Select` dropdowns cannot be opened in jsdom.** Which options
   exist and which are disabled is asserted in the pure module's test, never by
   clicking the combobox. `ShareGeneralAccess.test.tsx:11` documents this; do
   not fight it.

**Local setup**

```bash
pnpm install
supabase start
pnpm db:reset
```

**Command reference used throughout**

| Command | What it does |
| --- | --- |
| `pnpm db:new-migration <name>` | `supabase stop` then `db diff -f <name>`; generates a migration from `supabase/schemas/` |
| `pnpm db:reset` | Rebuilds the local DB from migrations, then replays `[db.seed] sql_paths` |
| `pnpm test:db` | Runs pgTAP (`supabase test db`) |
| `pnpm type-check` | `tsc -b --noEmit` across the monorepo |
| `pnpm test:frontend` | Vitest |
| `pnpm test:frontend <path>` | Vitest for one file |
| `pnpm test:e2e` | Playwright |
| `pnpm lint` | ESLint plus the react-doctor rules |
| `pnpm i18n:extract` | Extracts Lingui strings |
| `pnpm i18n:check` | Fails when extracted strings are not committed |

---

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `src/views/DashboardApp/DashboardShareModal/DashboardShareModal.tsx` | Dashboard-only wrapper: owns publishing state, renders `ShareResourceModal` with the `publishing` prop |
| `src/views/DashboardApp/DashboardShareModal/DashboardShareButton.tsx` | Toolbar entry point; replaces both `ShareResourceButton` and `PublishDashboardButton` for dashboards |
| `src/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule.ts` | Pure: access value to target visibility, and target plus persisted visibility to the primary action kind |
| `src/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule.test.ts` | Vitest for both mappings |
| `src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.ts` | Target visibility, slug input and validation, publish config, and the two mutations |
| `src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.test.tsx` | Vitest: which mutation each action kind calls |
| `src/views/DashboardApp/DashboardShareModal/PublishingSection.tsx` | Composes status, slug field, slice section, and share links |
| `src/views/DashboardApp/DashboardShareModal/PublishingActions.tsx` | The primary button and Unpublish, with the offline and unsaved-changes gates |
| `src/views/DashboardApp/DashboardShareModal/PublishingActions.test.tsx` | Vitest: labels and disabled states per action kind |
| `src/components/permissions/ShareResourceModal/ShareResourceModal.types.ts` | The `ShareResourcePublishing` prop type, shared by the modal and its dashboard caller |
| `src/components/permissions/useShareButtonState/useShareButtonState.ts` | The admin-on-resource gate and tooltip copy, extracted so two buttons share one rule |
| `supabase/tests/database/dashboards/publish_publicly_permission.test.sql` | pgTAP for the transition trigger |
| `tests/e2e/dashboard-workspace-publishing.spec.ts` | Playwright: publish to workspace, colleague reads it, signed-out does not |
| `tests/e2e/dashboard-discovery.spec.ts` | Playwright: a shared dashboard appears in the index with its badge |

**Modified**

| File | Change |
| --- | --- |
| `src/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule.ts` | Fourth value, `fromResourceState`, availability and disabled flags on the options |
| `src/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule.test.ts` | Covers the fourth value |
| `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.tsx` | Renders the fourth option, its tooltip, and the disabled reason |
| `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.test.tsx` | Covers the fourth option |
| `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx` | Optional `publishing` prop; renders the section and actions |
| `src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx` | Adds the with-publishing cases; existing cases unchanged |
| `src/components/permissions/ShareResourceModal/useGeneralAccessControl.ts` | Accepts the target visibility; `public` writes no shares |
| `src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.ts` | Publication span |
| `src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.test.ts` | Covers the publication span |
| `src/components/permissions/ShareResourceModal/copy/makePrivateConfirmCopy.ts` | The extra line when the dashboard is public |
| `src/components/permissions/ShareResourceModal/openMakePrivateConfirmModal.tsx` | Passes it through |
| `src/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton.tsx` | Uses `useShareButtonState` |
| `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts` | `dashboards__can_publish_publicly` at the admin tier |
| `shared/models/Permissions/PermissionsModule/PermissionsModule.test.ts` | Asserts the new key's tier |
| `supabase/schemas/10.dashboards.sql` | The publish-publicly trigger and its function |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts` | Adds `dashboard.unpublished`; deletes the reservation comment |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` | `visibility` on both publish payloads; the unpublish payload |
| `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.ts` | Branches on `visibility`, emits it (moves in Task 6) |
| `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx` | Toolbar loses `PublishDashboardButton`, `ShareResourceButton` becomes `DashboardShareButton` |
| `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.test.tsx` | Mocks the new button |
| `src/routes/_auth/$workspaceSlug/dashboards/index.tsx` | Drops the `owner_id` filter |
| `src/views/DashboardApp/DashboardListView/DashboardListView.tsx` | Owner-first ordering; passes the current user id |
| `src/views/DashboardApp/DashboardListView/DashboardCard.tsx` | Audience badges |
| `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx` | Denies viewers on a draft |
| `src/routes/_auth/$workspaceSlug/dashboards/preview/-$dashboardId.test.tsx` | Covers the new branch |
| `docs/permissions-architecture.md` | Records the viewer/editor discovery asymmetry |
| `docs/superpowers/specs/2026-08-13-private-dashboards-design.md` | Marks P3 landed |

**Moved** (Task 6, `git mv`, no behavior change in that task)

| From `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/` | To `src/views/DashboardApp/DashboardShareModal/` |
| --- | --- |
| `VanitySlugField/` | `VanitySlugField/` |
| `PublishDashboardStatus/` | `PublishDashboardStatus/` |
| `PublishedShareLinks.tsx`, `ShareUrlRow.tsx` | same names |
| `PublishSliceSection.tsx`, `PublishSliceSection.types.ts`, `PublishSliceRowFilter.tsx`, `SliceModeEditor.tsx`, `CustomSliceEditor.tsx`, `AddRowFilterMenu.tsx`, `QueriedSlicePreview.tsx` | same names |
| `buildShareUrls.ts`, `toVanitySlug/` | same names |
| `makeDashboardPublishAnalyticsEventFromDashboards/` | same name |

**Deleted** (Task 9)

| File | Why |
| --- | --- |
| `.../PublishDashboardModal/PublishDashboardModal.tsx` | Replaced by `DashboardShareModal` |
| `.../PublishDashboardModal/PublishDashboardModal.test.tsx` | Its behavior is covered by the new hook and action tests |
| `.../PublishDashboardModal/PublishDashboardModalContent.tsx` | Replaced by `PublishingSection` plus `PublishingActions` |
| `.../DashboardEditorView/PublishDashboardButton.tsx` | The toolbar has one Share button now |

---

## Task 1: The fourth General access value

`GeneralAccessModule` is the pure module the dropdown and the summary both read.
It must stay resource-generic, so it never imports a Dashboard type: the caller
passes a boolean.

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule.ts`
- Test: `src/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the existing top-level `describe` in
`GeneralAccessModule.test.ts`:

```ts
describe("fromResourceState", () => {
  const ownerId = "user-1";
  const restrictedNoShares = {
    isRestricted: true,
    shares: [],
    ownerId,
  };

  it("returns public when the resource is published publicly, whatever the shares say", () => {
    expect(
      GeneralAccessModule.fromResourceState({
        ...restrictedNoShares,
        isPubliclyPublished: true,
      }),
    ).toBe("public");
  });

  it("falls back to the share-derived value when it is not published publicly", () => {
    expect(
      GeneralAccessModule.fromResourceState({
        ...restrictedNoShares,
        isPubliclyPublished: false,
      }),
    ).toBe("private");
  });
});

describe("makeDropdownOptionsFromLabels", () => {
  const labels = {
    private: "Only me",
    restricted: "Restricted",
    workspace: "Anyone in Dashboards",
    public: "Anyone with the link",
  };

  it("omits the public option when the resource has no published form", () => {
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: true,
      labels,
      isPublicOptionAvailable: false,
      isPublicOptionDisabled: false,
    });
    expect(options.map((option) => option.value)).toEqual([
      "private",
      "restricted",
      "workspace",
    ]);
  });

  it("renders the public option disabled when the caller cannot publish publicly", () => {
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: true,
      labels,
      isPublicOptionAvailable: true,
      isPublicOptionDisabled: true,
    });
    expect(options.at(-1)).toEqual({
      value: "public",
      label: "Anyone with the link",
      disabled: true,
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule.test.ts`

Expected: FAIL with `GeneralAccessModule.fromResourceState is not a function`.

- [ ] **Step 3: Implement**

In `GeneralAccessModule.ts`, widen the values and add the two functions:

```ts
const _GENERAL_ACCESS_VALUES = [
  "private",
  "restricted",
  "workspace",
  "public",
] as const;
```

Add above `_makeDropdownOptionsFromLabels`:

```ts
/**
 * Resolves the value the dropdown shows for a resource that may also have a
 * published form.
 *
 * A publicly published resource displays "Anyone with the link" no matter what
 * its share rows say, because public reads never consult `resource_shares`:
 * the anon policy and the `is_public` short-circuit in
 * `util__auth_user_may_select_dashboard` both fire first. Showing the derived
 * share value here would tell an owner their dashboard is Restricted while the
 * whole internet can read it.
 *
 * `isPubliclyPublished` is a boolean rather than a visibility so this module
 * stays resource-generic; datasets have no published form and pass `false`.
 */
function _getGeneralAccessValueFromResourceState(
  options: Readonly<{
    isRestricted: boolean;
    shares: readonly ResourceShareRow[];
    ownerId: string;
    isPubliclyPublished: boolean;
  }>,
): GeneralAccessValue {
  if (options.isPubliclyPublished) {
    return "public";
  }
  return _getGeneralAccessValueFromShareState(options);
}
```

Replace `_makeDropdownOptionsFromLabels` with:

```ts
function _makeDropdownOptionsFromLabels(
  options: Readonly<{
    isOwner: boolean;
    labels: Record<GeneralAccessValue, string>;
    /** False for every resource type with no published form. */
    isPublicOptionAvailable: boolean;
    /** True when the caller may not publish publicly. */
    isPublicOptionDisabled: boolean;
  }>,
): Array<{
  value: GeneralAccessValue;
  label: string;
  disabled: boolean;
}> {
  return [
    {
      value: "private",
      label: options.labels.private,
      disabled: !options.isOwner,
    },
    { value: "restricted", label: options.labels.restricted, disabled: false },
    { value: "workspace", label: options.labels.workspace, disabled: false },
    ...(options.isPublicOptionAvailable ?
      [
        {
          value: "public" as const,
          label: options.labels.public,
          disabled: options.isPublicOptionDisabled,
        },
      ]
    : []),
  ];
}
```

Export the new function from the frozen object, keeping `fromShareState`
exactly as it is because `buildShareSummary` and the P1.5 confirmation flow
already reason about it:

```ts
  /** Maps persisted sharing state to its General access value. */
  fromShareState: _getGeneralAccessValueFromShareState,

  /** Maps sharing state plus publication state to its General access value. */
  fromResourceState: _getGeneralAccessValueFromResourceState,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule.test.ts`

Expected: PASS.

- [ ] **Step 5: Run type-check**

Run: `pnpm type-check`

Expected: FAIL, in `ShareGeneralAccess.tsx` only, because
`makeDropdownOptionsFromLabels` now needs two more arguments and a `public`
label. Task 2 fixes it. If anything *else* fails, a caller you have not
accounted for exists; find it before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/components/permissions/ShareResourceModal/GeneralAccessModule
git commit -m "feat(permissions): add the public General access value"
```

---

## Task 2: The dropdown renders the fourth option

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.tsx`
- Test: `src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `ShareGeneralAccess.test.tsx`:

```ts
it("selects Anyone with the link when the value is public", () => {
  render(
    <ShareGeneralAccess
      resourceType="dashboard"
      value="public"
      isOwner
      isBusy={false}
      workspaceShareRole={null}
      isPublicOptionAvailable
      publicOptionDisabledReason={undefined}
      onChange={vi.fn()}
      onWorkspaceRoleChange={vi.fn()}
    />,
  );
  expect(findComboboxByAriaLabel("General access")).toHaveValue(
    "Anyone with the link",
  );
});

it("keeps the workspace-role picker hidden for the public value", () => {
  // The role picker configures the workspace share row, which "Anyone with
  // the link" does not write. Rendering it would imply public viewers get a
  // role, and they get no row at all.
  render(
    <ShareGeneralAccess
      resourceType="dashboard"
      value="public"
      isOwner
      isBusy={false}
      workspaceShareRole="viewer"
      isPublicOptionAvailable
      publicOptionDisabledReason={undefined}
      onChange={vi.fn()}
      onWorkspaceRoleChange={vi.fn()}
    />,
  );
  expect(
    findComboboxByAriaLabel("Role for everyone in the workspace"),
  ).toBeUndefined();
});

it("explains why the public option is unavailable", () => {
  render(
    <ShareGeneralAccess
      resourceType="dashboard"
      value="restricted"
      isOwner
      isBusy={false}
      workspaceShareRole={null}
      isPublicOptionAvailable
      publicOptionDisabledReason="Only workspace admins can publish to the web."
      onChange={vi.fn()}
      onWorkspaceRoleChange={vi.fn()}
    />,
  );
  expect(
    screen.getByText("Only workspace admins can publish to the web."),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.test.tsx`

Expected: FAIL. The first two fail on the unknown props; the third fails
because the reason is not rendered.

- [ ] **Step 3: Implement**

In `ShareGeneralAccess.tsx`, widen `Props`:

```ts
type Props = {
  resourceType: ResourceType;
  value: GeneralAccessValue;
  isOwner: boolean;
  isBusy: boolean;
  workspaceShareRole: RoleLevel | null;
  /** False for resource types with no published form; hides the option. */
  isPublicOptionAvailable: boolean;
  /** Set when the option is visible but not selectable. */
  publicOptionDisabledReason: string | undefined;
  onChange: (nextValue: GeneralAccessValue) => void;
  onWorkspaceRoleChange: (role: RoleLevel) => void;
};
```

Pass the new arguments and label:

```ts
  const generalOptions = GeneralAccessModule.makeDropdownOptionsFromLabels({
    isOwner,
    labels: {
      private: t`Only me`,
      restricted: t`Restricted`,
      workspace: t`Anyone in ${app}`,
      public: t`Anyone with the link`,
    },
    isPublicOptionAvailable,
    isPublicOptionDisabled: publicOptionDisabledReason !== undefined,
  });
```

Add the fourth tooltip branch (`matchLiteral` is exhaustive, so this will not
compile without it):

```ts
    public: () => {
      return t`Anyone with the link can view this ${resource}, with no Avandar account. People and groups below still control who can edit it.`;
    },
```

Render the reason under the dropdown, before the existing dimmed helper text:

```tsx
      {publicOptionDisabledReason ?
        <Text size="xs" c="dimmed">
          {publicOptionDisabledReason}
        </Text>
      : null}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess.test.tsx`

Expected: PASS, including the six pre-existing cases. The pre-existing cases
now need the two new props; add `isPublicOptionAvailable={false}` and
`publicOptionDisabledReason={undefined}` to each of them.

- [ ] **Step 5: Extract strings and commit**

```bash
pnpm i18n:extract
git add src/components/permissions/ShareResourceModal/ShareGeneralAccess src/i18n
git commit -m "feat(permissions): render the public General access option"
```

---

## Task 3: The publication span in the summary line

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.ts`
- Test: `src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `buildShareSummary.test.ts`:

```ts
describe("publication", () => {
  const base = {
    shares: [],
    isRestricted: true,
    workspaceShareRole: null,
    resourceType: "dashboard" as const,
    workspaceName: "Acme",
    userById: {},
    groupById: {},
  };

  it("says nothing about publication when the resource has none", () => {
    const spans = buildShareSummary({ ...base, publication: undefined });
    expect(spans.map((span) => span.kind === "text" && span.text).join("")).not.toContain(
      "Published",
    );
  });

  it("reports a draft dashboard as not published", () => {
    const spans = buildShareSummary({ ...base, publication: "draft" });
    expect(spans.at(-1)).toEqual({
      kind: "text",
      text: " Not published yet.",
    });
  });

  it("names the workspace for an internally published dashboard", () => {
    const spans = buildShareSummary({ ...base, publication: "workspace" });
    expect(spans.at(-2)).toEqual({
      kind: "pill",
      label: "Acme",
      variant: "workspace",
    });
  });

  it("warns that the people list stops governing reads once public", () => {
    const spans = buildShareSummary({ ...base, publication: "public" });
    expect(
      spans.map((span) => (span.kind === "text" ? span.text : "")).join(""),
    ).toContain("Anyone with the link can view it");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.test.ts`

Expected: FAIL with a type error on `publication`, then failing assertions.

- [ ] **Step 3: Implement**

Add to `BuildShareSummaryOptions`:

```ts
  /**
   * Publication state, for resource types that have one. `undefined` means the
   * resource has no published form at all, which is every type except
   * dashboards today, and produces no publication span.
   */
  publication?: "draft" | "workspace" | "public";
```

Add this helper at the bottom of the file:

```ts
/**
 * The publication sentence appended to every summary for a resource that can
 * be published.
 *
 * The public case carries the warning deliberately: while a dashboard is
 * public, the people list below governs who can EDIT it, not who can read it.
 * That is the one place the two axes of this modal stop being independent, and
 * it is worth a sentence rather than a footnote.
 */
function buildPublicationSpans(
  publication: "draft" | "workspace" | "public",
  workspaceName: string,
): SummarySpan[] {
  if (publication === "draft") {
    return [{ kind: "text", text: t` Not published yet.` }];
  }
  if (publication === "workspace") {
    return [
      { kind: "text", text: t` Published to ` },
      { kind: "pill", label: workspaceName, variant: "workspace" },
      { kind: "text", text: "." },
    ];
  }
  return [
    {
      kind: "text",
      text: t` Published on the web: anyone with the link can view it, and the list above controls editing only.`,
    },
  ];
}
```

Wrap both `return` paths of `buildShareSummary` so the spans are appended in
every branch. Replace the early `if (!hasAnyShares)` block's returns and the
final return with a single tail:

```ts
  const publicationSpans =
    opts.publication ?
      buildPublicationSpans(opts.publication, opts.workspaceName)
    : [];
```

and append `...publicationSpans` to each returned array.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/buildShareSummary/buildShareSummary.test.ts`

Expected: PASS, including the pre-existing cases, which pass no `publication`
and therefore get no new spans.

- [ ] **Step 5: Extract strings and commit**

```bash
pnpm i18n:extract
git add src/components/permissions/ShareResourceModal/buildShareSummary src/i18n
git commit -m "feat(permissions): add the publication span to the share summary"
```

---

## Task 4: The publish-publicly permission key

**Files:**
- Modify: `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts:56-67`
- Test: `shared/models/Permissions/PermissionsModule/PermissionsModule.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the existing describe block in `PermissionsModule.test.ts`:

```ts
it("grants dashboards__can_publish_publicly at the admin tier only", () => {
  // Publishing to your own workspace is ordinary editor work. Putting a slice
  // of workspace data on the open internet is not, so the two are separate
  // capabilities rather than one.
  expect(PermissionRegistry.dashboards.viewer).not.toContain(
    "dashboards__can_publish_publicly",
  );
  expect(PermissionRegistry.dashboards.editor).not.toContain(
    "dashboards__can_publish_publicly",
  );
  expect(PermissionRegistry.dashboards.admin).toContain(
    "dashboards__can_publish_publicly",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend shared/models/Permissions/PermissionsModule/PermissionsModule.test.ts`

Expected: FAIL on the third assertion.

- [ ] **Step 3: Implement**

In `PermissionRegistry.ts`, the `dashboards.admin` array becomes:

```ts
    admin: [
      "dashboards__can_view_dashboard",
      "dashboards__can_edit_dashboard",
      "dashboards__can_manage_dashboards",
      // Server-side counterpart:
      // util__auth_user_meets_min_app_role(workspace_id, 'dashboards', 'admin'),
      // enforced by tr__dashboards__enforce_publish_publicly. Keep the two in
      // step: this registry is a UI catalog and grants nothing on its own.
      "dashboards__can_publish_publicly",
    ] as const,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend shared/models/Permissions/PermissionsModule/PermissionsModule.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/models/Permissions/PermissionsModule
git commit -m "feat(permissions): add dashboards__can_publish_publicly"
```

---

## Task 5: The transition trigger

The rule is about a *transition* into `public`, so it cannot be an RLS
`with check`, which has no `OLD`. A `with check` would also reject an editor
re-saving a dashboard an admin published, which works today.

**Files:**
- Modify: `supabase/schemas/10.dashboards.sql` (append after the
  `tr__dashboards__prevent_workspace_id_change` trigger, before the indexes)
- Create: `supabase/migrations/<timestamp>_dashboards_enforce_publish_publicly.sql` (generated)
- Test: `supabase/tests/database/dashboards/publish_publicly_permission.test.sql`

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/dashboards/publish_publicly_permission.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Publishing a dashboard publicly is an admin-tier act. The rule is about the
-- TRANSITION into `public`, not about the state: an editor who owns a
-- dashboard an admin published must still be able to save and republish it.
--
-- See docs/superpowers/specs/2026-08-15-private-dashboards-merged-share-surface-design.md
-- section 5.

insert into auth.users (id, email, aud, role)
values
  ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3_editor@test.dev', 'authenticated', 'authenticated'),
  ('d3000002-0000-4000-8000-000000000002'::uuid, 'd3_admin@test.dev', 'authenticated', 'authenticated'),
  ('d3000003-0000-4000-8000-000000000003'::uuid, 'd3_owner@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'd3001001-0000-4000-8000-000000000001'::uuid,
  'd3000003-0000-4000-8000-000000000003'::uuid,
  'd3 workspace',
  'd3-publish-publicly-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('d300cf01-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3 editors', false),
  ('d300cf02-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3 admins', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('d300cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'editor'::public.role_level),
  ('d300cf02-0000-4000-8000-000000000002'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('d3002001-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd300cf01-0000-4000-8000-000000000001'::uuid),
  ('d3002002-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000002-0000-4000-8000-000000000002'::uuid, 'd300cf02-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d3003001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3002001-0000-4000-8000-000000000001'::uuid, 'D3 Editor', 'D3 Editor'),
  ('d3003002-0000-4000-8000-000000000002'::uuid, 'd3000002-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3002002-0000-4000-8000-000000000002'::uuid, 'D3 Admin', 'D3 Admin');

-- Three dashboards owned by the editor: one draft, one workspace-published,
-- one already public.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
  snapshot_revision
)
values
  ('d3005001-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3003001-0000-4000-8000-000000000001'::uuid, 'd3 draft', '{}'::jsonb, 'draft', null),
  ('d3005002-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3003001-0000-4000-8000-000000000001'::uuid, 'd3 internal', '{}'::jsonb, 'workspace', 'd3005002-0000-4000-8000-000000000002'::uuid),
  ('d3005003-0000-4000-8000-000000000003'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3003001-0000-4000-8000-000000000001'::uuid, 'd3 public', '{}'::jsonb, 'public', 'd3005003-0000-4000-8000-000000000003'::uuid);

select plan(5);

-- The editor ----------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d3000001-0000-4000-8000-000000000001"}',
  true
);

select throws_ok(
  $$update public.dashboards
       set visibility = 'public'
     where id = 'd3005001-0000-4000-8000-000000000001'::uuid$$,
  '42501',
  null,
  'an editor cannot publish a draft publicly'
);

select throws_ok(
  $$update public.dashboards
       set visibility = 'public'
     where id = 'd3005002-0000-4000-8000-000000000002'::uuid$$,
  '42501',
  null,
  'an editor cannot upgrade a workspace dashboard to public'
);

select lives_ok(
  $$update public.dashboards
       set visibility = 'workspace', snapshot_revision = gen_random_uuid()
     where id = 'd3005001-0000-4000-8000-000000000001'::uuid$$,
  'an editor CAN publish to the workspace'
);

select lives_ok(
  $$update public.dashboards
       set name = 'd3 public renamed'
     where id = 'd3005003-0000-4000-8000-000000000003'::uuid$$,
  'an editor CAN still edit a dashboard that is already public'
);

-- The admin -----------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d3000002-0000-4000-8000-000000000002"}',
  true
);

select lives_ok(
  $$update public.dashboards
       set visibility = 'public'
     where id = 'd3005002-0000-4000-8000-000000000002'::uuid$$,
  'a dashboards admin CAN upgrade a workspace dashboard to public'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:db`

Expected: FAIL. The two `throws_ok` cases fail because nothing raises: the
update succeeds.

- [ ] **Step 3: Implement the trigger**

Append to `supabase/schemas/10.dashboards.sql`, directly after the
`tr__dashboards__prevent_workspace_id_change` trigger:

```sql
/**
 * Blocks a transition into `public` for callers below the Dashboards admin
 * tier.
 *
 * This is the server-side counterpart of the `dashboards__can_publish_publicly`
 * permission key in `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`.
 * That registry is a UI catalog and grants nothing on its own, so without this
 * trigger the client gate would be the only thing between an editor and the
 * open internet.
 *
 * It is a trigger rather than an RLS `with check` because the rule is about the
 * TRANSITION, and `with check` cannot see OLD. A state-based check would reject
 * an editor re-saving a dashboard an admin published, which is a working flow.
 *
 * @returns NEW, or raises 42501 (insufficient_privilege).
 */
create or replace function private.dashboards__enforce_publish_publicly () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  -- `auth.uid()` is null for the service role and for direct psql writes
  -- (migrations, seeds, pgTAP setup). Those already bypass RLS entirely, so
  -- gating them here would break trusted paths without adding a boundary.
  if auth.uid () is null then
    return new;
  end if;

  if new.visibility = 'public'::public.dashboard_visibility
    and old.visibility is distinct from 'public'::public.dashboard_visibility
    and not public.util__auth_user_meets_min_app_role (
      new.workspace_id,
      'dashboards'::public.app_type,
      'admin'::public.role_level
    ) then
    raise exception 'Publishing a dashboard publicly requires the Dashboards admin role'
    using errcode = '42501';
  end if;

  return new;
end;
$$;

-- `update of visibility` narrows the trigger to statements that mention the
-- column at all; the OLD comparison above is what makes it exact.
create trigger tr__dashboards__enforce_publish_publicly before
update of visibility on public.dashboards for each row
execute function private.dashboards__enforce_publish_publicly ();
```

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:new-migration dashboards_enforce_publish_publicly`

Expected: a migration containing the function and the trigger, and nothing
else. If it also contains unrelated statements, your local schema has drifted;
resolve that before continuing.

- [ ] **Step 5: Apply and run the whole DB suite**

Run: `supabase start && pnpm db:reset && pnpm test:db`

Expected: PASS, including
`dashboard_visibility_slug_namespaces.test.sql`, which flips a dashboard to
`public` as the postgres role. It passes because of the `auth.uid() is null`
exemption in Step 3. If it fails with 42501, you dropped that guard.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/10.dashboards.sql \
        supabase/migrations/*_dashboards_enforce_publish_publicly.sql \
        supabase/tests/database/dashboards/publish_publicly_permission.test.sql
git commit -m "feat(db): gate public publishing on the dashboards admin role"
```

---

## Task 6: Move the publishing surface, unchanged

A pure move plus import rewrites. Doing it in its own commit is what makes the
next four tasks reviewable: after this task `git log --follow` still reaches
the history of every moved file, and the diffs in Tasks 7 to 10 are behavior,
not relocation.

**Files:**
- Move: the whole "Moved" table in File Structure
- Modify: every file that imports a moved path

- [ ] **Step 1: Move the files**

```bash
cd src/views/DashboardApp
mkdir -p DashboardShareModal
git mv DashboardEditorView/PublishDashboardModal/VanitySlugField DashboardShareModal/
git mv DashboardEditorView/PublishDashboardModal/PublishDashboardStatus DashboardShareModal/
git mv DashboardEditorView/PublishDashboardModal/toVanitySlug DashboardShareModal/
git mv DashboardEditorView/PublishDashboardModal/makeDashboardPublishAnalyticsEventFromDashboards DashboardShareModal/
for f in PublishedShareLinks.tsx ShareUrlRow.tsx PublishSliceSection.tsx \
         PublishSliceSection.types.ts PublishSliceRowFilter.tsx \
         SliceModeEditor.tsx CustomSliceEditor.tsx AddRowFilterMenu.tsx \
         QueriedSlicePreview.tsx buildShareUrls.ts; do
  git mv "DashboardEditorView/PublishDashboardModal/$f" DashboardShareModal/
done
cd -
```

- [ ] **Step 2: Rewrite the imports**

Run:

```bash
grep -rl "DashboardEditorView/PublishDashboardModal/" src \
  | xargs sed -i '' 's|DashboardEditorView/PublishDashboardModal/|DashboardShareModal/|g'
```

Then check what is left:

Run: `grep -rn "PublishDashboardModal/" src | grep -v "PublishDashboardModal/PublishDashboardModal"`

Expected: only `PublishDashboardModal.tsx`, `PublishDashboardModalContent.tsx`,
and `PublishDashboardModal.test.tsx`, which stay put until Task 9 deletes them
and which now import from the new location.

- [ ] **Step 3: Verify nothing changed but paths**

Run: `pnpm type-check && pnpm test:frontend`

Expected: PASS, both. This task changes no behavior, so a failure means a
rewritten import points at the wrong place.

- [ ] **Step 4: Commit**

```bash
git add -A src/views/DashboardApp
git commit -m "refactor(dashboards): move the publishing surface under DashboardShareModal"
```

---

## Task 7: Audience-aware URLs and slug prefix

P2 split the URL by audience. The slug field and the share links still speak
only the public dialect.

**Files:**
- Modify: `src/views/DashboardApp/DashboardShareModal/buildShareUrls.ts`
- Modify: `src/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField.tsx`
- Test: `src/views/DashboardApp/DashboardShareModal/buildShareUrls.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/views/DashboardApp/DashboardShareModal/buildShareUrls.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildShareUrls } from "@/views/DashboardApp/DashboardShareModal/buildShareUrls";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const dashboardId = "11111111-2222-4333-8444-555555555555" as Dashboard.Id;

describe("buildShareUrls", () => {
  it("uses the global namespace for a public target", () => {
    expect(
      buildShareUrls({
        workspaceSlug: "acme",
        dashboardId,
        slug: "q3-revenue",
        visibility: "public",
      }),
    ).toEqual({
      canonical: `${window.location.origin}/d/${dashboardId}`,
      vanity: `${window.location.origin}/d/q3-revenue`,
    });
  });

  it("scopes both URLs to the workspace for a workspace target", () => {
    expect(
      buildShareUrls({
        workspaceSlug: "acme",
        dashboardId,
        slug: "q3-revenue",
        visibility: "workspace",
      }),
    ).toEqual({
      canonical: `${window.location.origin}/acme/d/${dashboardId}`,
      vanity: `${window.location.origin}/acme/d/q3-revenue`,
    });
  });

  it("returns no vanity URL without a slug", () => {
    expect(
      buildShareUrls({
        workspaceSlug: "acme",
        dashboardId,
        slug: undefined,
        visibility: "workspace",
      }).vanity,
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/buildShareUrls.test.ts`

Expected: FAIL, a type error on the unknown `visibility` option.

- [ ] **Step 3: Implement**

Replace the body of `buildShareUrls.ts` below the `ShareUrls` type:

```ts
type Options = {
  workspaceSlug: string;
  dashboardId: Dashboard.Id;
  slug: string | undefined;
  /** The audience the URLs are for, which is the publish TARGET while editing. */
  visibility: PublishedVisibility;
};

/**
 * Builds the canonical and optional vanity URLs for a published dashboard.
 *
 * The two audiences have separate URL namespaces (P2 D-P2-3): a public
 * dashboard resolves at `/d/<slugOrId>` for a visitor with no workspace
 * context, and a workspace-only one at `/<workspaceSlug>/d/<slugOrId>`.
 *
 * `canonical` is what the QR affordance encodes. It points at the P2 routes
 * rather than the legacy `/public/dashboards/...` path, which survives only as
 * a redirect for QR codes already in circulation.
 */
export function buildShareUrls(args: Readonly<Options>): ShareUrls {
  const base = _origin().replace(/\/$/, "");
  const prefix =
    args.visibility === "public" ? `${base}/d` : (
      `${base}/${args.workspaceSlug}/d`
    );
  return {
    canonical: `${prefix}/${args.dashboardId}`,
    vanity: args.slug ? `${prefix}/${args.slug}` : undefined,
  };
}
```

Add the import:

```ts
import type { PublishedVisibility } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
```

In `VanitySlugField.tsx`, add a `urlPrefix` prop and use it in the preview:

```ts
type Props = {
  slugInput: string;
  normalisedSlug: string;
  /** Path the slug is appended to, e.g. `/d/` or `/acme/d/`. */
  urlPrefix: string;
  errorMessage?: string;
  hasPendingCheck: boolean;
  isAccepted: boolean;
  onChange: (slugInput: string) => void;
};
```

```tsx
          <Code className={css.vanitySlugFieldPreview}>
            {urlPrefix}
            {normalisedSlug}
          </Code>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/buildShareUrls.test.ts`

Expected: PASS.

- [ ] **Step 5: Fix the remaining callers**

Run: `pnpm type-check`

Expected: FAIL in `PublishDashboardModal.tsx` and
`PublishDashboardModalContent.tsx`, which are deleted in Task 9. Keep them
compiling for now by passing `visibility: "public"` and
`urlPrefix="/d/"`, which is exactly what they do today.

Run: `pnpm type-check`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/DashboardApp/DashboardShareModal src/views/DashboardApp/DashboardEditorView
git commit -m "feat(dashboards): make share URLs and the slug preview audience-aware"
```

---

## Task 8: The publishing module and its control hook

**Files:**
- Create: `src/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule.ts`
- Create: `src/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule.test.ts`
- Create: `src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.ts`
- Create: `src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.test.tsx`

- [ ] **Step 1: Write the failing module test**

Create `DashboardPublishingModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DashboardPublishingModule } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";

describe("targetVisibilityFor", () => {
  it("maps Only me to draft, because a published copy for an audience of one is pure cost", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("private")).toBe(
      "draft",
    );
  });

  it("maps Restricted to workspace, which is the internal-report shape", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("restricted")).toBe(
      "workspace",
    );
  });

  it("maps the workspace-wide value to workspace", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("workspace")).toBe(
      "workspace",
    );
  });

  it("maps Anyone with the link to public", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("public")).toBe(
      "public",
    );
  });
});

describe("getPublishActionKind", () => {
  const cases = [
    { visibility: "draft", target: "draft", expected: "disabled_no_audience" },
    { visibility: "draft", target: "workspace", expected: "publish_workspace" },
    { visibility: "draft", target: "public", expected: "publish_public" },
    { visibility: "workspace", target: "draft", expected: "unpublish" },
    { visibility: "workspace", target: "workspace", expected: "republish" },
    { visibility: "workspace", target: "public", expected: "publish_public" },
    { visibility: "public", target: "draft", expected: "unpublish" },
    { visibility: "public", target: "workspace", expected: "make_internal" },
    { visibility: "public", target: "public", expected: "republish" },
  ] as const;

  it.each(cases)(
    "$visibility -> $target is $expected",
    ({ visibility, target, expected }) => {
      expect(
        DashboardPublishingModule.getPublishActionKind({
          visibility,
          targetVisibility: target,
        }),
      ).toBe(expected);
    },
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule.test.ts`

Expected: FAIL, module not found.

- [ ] **Step 3: Implement the module**

Create `DashboardPublishingModule.ts`:

```ts
import type { GeneralAccessValue } from "@/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Which publication state each General access value asks for.
 *
 * "Only me" targets `draft` on purpose: publishing keeps a snapshot object and
 * a live URL alive, and doing that for an audience of one is storage and risk
 * with no reader. "Restricted" targets `workspace` because a restricted but
 * published dashboard is exactly the internal-report-for-three-people shape
 * this feature was asked for.
 */
const _TARGET_VISIBILITY_BY_ACCESS_VALUE = {
  private: "draft",
  restricted: "workspace",
  workspace: "workspace",
  public: "public",
} as const satisfies Record<GeneralAccessValue, Dashboard.Visibility>;

/** What the modal's primary button does next. */
export type PublishActionKind =
  | "publish_workspace"
  | "publish_public"
  | "republish"
  | "make_internal"
  | "unpublish"
  | "disabled_no_audience";

function _targetVisibilityFor(
  value: GeneralAccessValue,
): Dashboard.Visibility {
  return _TARGET_VISIBILITY_BY_ACCESS_VALUE[value];
}

/**
 * Resolves the primary action from what is persisted and what the dropdown
 * currently asks for.
 *
 * Every kind except `unpublish` and `disabled_no_audience` calls
 * `publishDashboard` with the target visibility; the kinds differ only in the
 * label, because "Publish", "Update & republish", and "Make internal" are
 * three very different sentences for the same call.
 */
function _getPublishActionKind(
  options: Readonly<{
    visibility: Dashboard.Visibility;
    targetVisibility: Dashboard.Visibility;
  }>,
): PublishActionKind {
  if (options.targetVisibility === "draft") {
    return options.visibility === "draft" ?
        "disabled_no_audience"
      : "unpublish";
  }
  if (options.visibility === options.targetVisibility) {
    return "republish";
  }
  if (options.targetVisibility === "public") {
    return "publish_public";
  }
  return options.visibility === "public" ?
      "make_internal"
    : "publish_workspace";
}

/** Stateless mappings between General access, visibility, and the action. */
export const DashboardPublishingModule = {
  targetVisibilityFor: _targetVisibilityFor,
  getPublishActionKind: _getPublishActionKind,
} as const;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule.test.ts`

Expected: PASS, 13 assertions.

- [ ] **Step 5: Write the failing hook test**

Create `useDashboardPublishingControl.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const publish = vi.fn();
const unpublish = vi.fn();

vi.mock("@/clients/dashboards/DashboardClient", () => {
  return {
    DashboardClient: {
      usePublishDashboard: () => [publish, false] as const,
      useUnpublishDashboard: () => [unpublish, false] as const,
      useValidateDashboardSlug: () => [vi.fn(), false] as const,
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: () => ({ id: "ws-1", slug: "acme", name: "Acme" }) };
});

function makeDashboard(
  visibility: Dashboard.Visibility,
): Dashboard.T {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    workspaceId: "ws-1",
    name: "Q3 Revenue",
    slug: undefined,
    visibility,
    isPublic: visibility === "public",
    config: { content: [], root: {}, zones: {} },
  } as unknown as Dashboard.T;
}

describe("useDashboardPublishingControl", () => {
  beforeEach(() => {
    publish.mockClear();
    unpublish.mockClear();
  });

  it("starts with the target equal to the persisted visibility", () => {
    const { result } = renderHook(() => {
      return useDashboardPublishingControl({ dashboard: makeDashboard("public") });
    });
    expect(result.current.targetVisibility).toBe("public");
    expect(result.current.actionKind).toBe("republish");
  });

  it("publishes to the workspace when the target is workspace", () => {
    const { result } = renderHook(() => {
      return useDashboardPublishingControl({ dashboard: makeDashboard("draft") });
    });
    act(() => {
      result.current.onGeneralAccessChange("workspace");
    });
    expect(result.current.actionKind).toBe("publish_workspace");
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "workspace" }),
    );
    expect(unpublish).not.toHaveBeenCalled();
  });

  it("unpublishes when the target is draft and the dashboard is published", () => {
    const { result } = renderHook(() => {
      return useDashboardPublishingControl({
        dashboard: makeDashboard("workspace"),
      });
    });
    act(() => {
      result.current.onGeneralAccessChange("private");
    });
    expect(result.current.actionKind).toBe("unpublish");
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(unpublish).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardId: makeDashboard("workspace").id }),
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("does nothing when there is no audience to publish to", () => {
    const { result } = renderHook(() => {
      return useDashboardPublishingControl({ dashboard: makeDashboard("draft") });
    });
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(publish).not.toHaveBeenCalled();
    expect(unpublish).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.test.tsx`

Expected: FAIL, module not found.

- [ ] **Step 7: Implement the hook**

Create `useDashboardPublishingControl.ts`. It is the old
`useDashboardPublishState` from `PublishDashboardModal.tsx` plus a target
visibility, so lift the slug-validation and publish-config parts from there
rather than rewriting them:

```ts
import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { buildShareUrls } from "@/views/DashboardApp/DashboardShareModal/buildShareUrls";
import { DashboardPublishingModule } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import { makeDashboardPublishAnalyticsEventFromDashboards } from "@/views/DashboardApp/DashboardShareModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards";
import { toVanitySlug } from "@/views/DashboardApp/DashboardShareModal/toVanitySlug/toVanitySlug";
import type { PublishActionKind } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import type { GeneralAccessValue } from "@/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type DashboardPublishingControl = {
  currentDashboard: Dashboard.T;
  targetVisibility: Dashboard.Visibility;
  actionKind: PublishActionKind;
  isBusy: boolean;
  shareUrls: ReturnType<typeof buildShareUrls>;
  urlPrefix: string;
  slugInput: string;
  normalisedSlug: string;
  slugErrorMessage: string | undefined;
  hasPendingSlugCheck: boolean;
  isSlugAccepted: boolean;
  isSlugRejected: boolean;
  publishConfig: PublishSliceConfig.Dashboard;
  onSlugInputChange: (slugInput: string) => void;
  onPublishConfigChange: (config: PublishSliceConfig.Dashboard) => void;
  onGeneralAccessChange: (value: GeneralAccessValue) => void;
  onPrimaryAction: () => void;
};

/**
 * Owns everything about a dashboard's publication that the share modal needs.
 *
 * The target visibility is initialised from the persisted one, which is what
 * makes a public dashboard open showing "Anyone with the link" and makes any
 * later divergence a visible pending change rather than a silent one.
 *
 * The dropdown never writes visibility (umbrella D5): it moves the target, and
 * `onPrimaryAction` is the only thing that calls the mutations.
 */
export function useDashboardPublishingControl(
  options: Readonly<{ dashboard: Dashboard.T }>,
): DashboardPublishingControl {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [currentDashboard, setCurrentDashboard] = useState(options.dashboard);
  const [targetVisibility, setTargetVisibility] = useState<Dashboard.Visibility>(
    options.dashboard.visibility,
  );
  const [slugInput, setSlugInput] = useState(currentDashboard.slug ?? "");
  const normalisedSlug = toVanitySlug(slugInput);
  const [publishConfig, setPublishConfig] = useState(() => {
    return DashboardSliceBuilder.readDashboardPublishConfig(
      currentDashboard.config,
    );
  });

  const actionKind = DashboardPublishingModule.getPublishActionKind({
    visibility: currentDashboard.visibility,
    targetVisibility,
  });

  const [publishDashboard, isPublishing] = DashboardClient.usePublishDashboard({
    onSuccess: (updatedDashboard) => {
      notifySuccess(
        currentDashboard.visibility === "draft" ?
          t`Dashboard published!`
        : t`Dashboard share settings updated.`,
      );
      void AnalyticsClient.logEvent({
        ...makeDashboardPublishAnalyticsEventFromDashboards({
          previousDashboard: currentDashboard,
          updatedDashboard,
        }),
        workspaceId: updatedDashboard.workspaceId,
        app: "dashboards",
      });
      setCurrentDashboard(updatedDashboard);
      setSlugInput(updatedDashboard.slug ?? "");
      setTargetVisibility(updatedDashboard.visibility);
    },
    onError: (error: Error) => {
      console.error(error);
      notifyError({
        title: t`Could not publish dashboard`,
        message: t`Please try again. Your dashboard has not been published.`,
      });
    },
  });

  const [unpublishDashboard, isUnpublishing] =
    DashboardClient.useUnpublishDashboard({
      onSuccess: (updatedDashboard) => {
        notifySuccess(t`Dashboard unpublished.`);
        void AnalyticsClient.logEvent({
          event: "dashboard.unpublished",
          payload: {
            dashboardId: updatedDashboard.id,
            priorVisibility: currentDashboard.visibility,
          },
          workspaceId: updatedDashboard.workspaceId,
          app: "dashboards",
        });
        setCurrentDashboard(updatedDashboard);
        setTargetVisibility("draft");
      },
      onError: (error: Error) => {
        console.error(error);
        notifyError({
          title: t`Could not unpublish dashboard`,
          message: t`Please try again. Your dashboard is still published.`,
        });
      },
    });

  const onPrimaryAction = useCallback((): void => {
    if (actionKind === "disabled_no_audience") {
      return;
    }
    if (actionKind === "unpublish") {
      unpublishDashboard({ dashboardId: currentDashboard.id });
      return;
    }
    // Every other kind is a publish to the target; only the label differs.
    const slugUpdate =
      normalisedSlug ? { action: "set" as const, value: normalisedSlug }
      : currentDashboard.slug ? { action: "clear" as const }
      : undefined;
    publishDashboard({
      dashboardId: currentDashboard.id,
      // `disabled_no_audience` and `unpublish` are the only draft targets, and
      // both returned above, so this narrowing is total.
      visibility: targetVisibility as "workspace" | "public",
      ...(slugUpdate ? { slug: slugUpdate } : {}),
      publishConfig,
    });
  }, [
    actionKind,
    currentDashboard.id,
    currentDashboard.slug,
    normalisedSlug,
    publishConfig,
    publishDashboard,
    targetVisibility,
    unpublishDashboard,
  ]);

  // Called unconditionally and before the return: spreading a hook call inside
  // the returned object literal works but hides a hook in an expression, which
  // the lint rules and the next reader both object to.
  const slugValidation = useSlugValidation({
    dashboardId: currentDashboard.id,
    normalisedSlug,
    targetVisibility,
  });

  const urlVisibility = targetVisibility === "public" ? "public" : "workspace";
  const shareUrls = buildShareUrls({
    workspaceSlug: workspace.slug,
    dashboardId: currentDashboard.id,
    slug: normalisedSlug || currentDashboard.slug,
    visibility: urlVisibility,
  });

  return {
    currentDashboard,
    targetVisibility,
    actionKind,
    isBusy: isPublishing || isUnpublishing,
    shareUrls,
    urlPrefix: urlVisibility === "public" ? "/d/" : `/${workspace.slug}/d/`,
    slugInput,
    normalisedSlug,
    publishConfig,
    onSlugInputChange: setSlugInput,
    onPublishConfigChange: setPublishConfig,
    onGeneralAccessChange: (value) => {
      setTargetVisibility(DashboardPublishingModule.targetVisibilityFor(value));
    },
    onPrimaryAction,
    ...slugValidation,
  };
}
```

Lift `useSlugValidation`, `useDebouncedSlugValidation`, `_slugFailureMessage`,
and `SLUG_VALIDATION_DEBOUNCE_MS` out of `PublishDashboardModal.tsx` into this
file verbatim, with one change: the debounced effect passes the target rather
than the literal `"public"`, and skips validation entirely for a draft target.

```ts
      const timeoutId = window.setTimeout(() => {
        if (targetVisibility === "draft") {
          // A draft has no URL, so it has no namespace to collide in.
          return;
        }
        validateSlug({
          slug: normalisedSlug,
          dashboardId,
          visibility: targetVisibility,
        });
      }, SLUG_VALIDATION_DEBOUNCE_MS);
```

Add `targetVisibility` to that effect's dependency array, which is what
re-validates a slug when the audience changes: a name free in one namespace can
be taken in the other.

- [ ] **Step 8: Run the hook test to verify it passes**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.test.tsx`

Expected: PASS, 4 tests.

- [ ] **Step 9: Cover the re-validation on an audience change**

A slug that is free in the public namespace can be taken in the workspace one
and the other way round, so moving the target has to re-run the check. Add to
`useDashboardPublishingControl.test.tsx`, replacing the `useValidateDashboardSlug`
mock with one that records its calls:

```tsx
const validateSlug = vi.fn();
// in the DashboardClient mock:
//   useValidateDashboardSlug: () => [validateSlug, false] as const,

it("re-validates the slug against the new namespace when the target changes", async () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => {
    return useDashboardPublishingControl({ dashboard: makeDashboard("draft") });
  });

  act(() => {
    result.current.onSlugInputChange("q3-revenue");
    result.current.onGeneralAccessChange("workspace");
  });
  act(() => {
    vi.advanceTimersByTime(600);
  });
  expect(validateSlug).toHaveBeenLastCalledWith(
    expect.objectContaining({ slug: "q3-revenue", visibility: "workspace" }),
  );

  act(() => {
    result.current.onGeneralAccessChange("public");
  });
  act(() => {
    vi.advanceTimersByTime(600);
  });
  expect(validateSlug).toHaveBeenLastCalledWith(
    expect.objectContaining({ slug: "q3-revenue", visibility: "public" }),
  );
  vi.useRealTimers();
});

it("skips validation entirely for a draft target, which has no URL", () => {
  vi.useFakeTimers();
  validateSlug.mockClear();
  const { result } = renderHook(() => {
    return useDashboardPublishingControl({
      dashboard: makeDashboard("workspace"),
    });
  });
  act(() => {
    result.current.onSlugInputChange("q3-revenue");
    result.current.onGeneralAccessChange("private");
  });
  act(() => {
    vi.advanceTimersByTime(600);
  });
  expect(validateSlug).not.toHaveBeenCalled();
  vi.useRealTimers();
});
```

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.test.tsx`

Expected: PASS, 6 tests. A failure on the second one means the `targetVisibility`
guard in Step 7's debounced effect is inside the timeout but the effect still
runs `validateSlug`; the early return must come before the call, not before the
timer.

- [ ] **Step 10: Commit**

```bash
git add src/views/DashboardApp/DashboardShareModal
git commit -m "feat(dashboards): add the publishing control and its action mapping"
```

---

## Task 9: The publishing section, actions, and the merged modal

This is the task that makes the surface visible. It ends with the old modal
deleted.

**Files:**
- Create: `src/views/DashboardApp/DashboardShareModal/PublishingSection.tsx`
- Create: `src/views/DashboardApp/DashboardShareModal/PublishingActions.tsx`
- Create: `src/views/DashboardApp/DashboardShareModal/PublishingActions.test.tsx`
- Create: `src/views/DashboardApp/DashboardShareModal/DashboardShareModal.tsx`
- Create: `src/views/DashboardApp/DashboardShareModal/DashboardShareButton.tsx`
- Create: `src/components/permissions/ShareResourceModal/ShareResourceModal.types.ts`
- Create: `src/components/permissions/useShareButtonState/useShareButtonState.ts`
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx`
- Modify: `src/components/permissions/ShareResourceModal/useGeneralAccessControl.ts`
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton.tsx`
- Modify: `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx:205-219`
- Modify: `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.test.tsx:116`
- Modify: `src/views/DashboardApp/DashboardShareModal/PublishDashboardStatus/PublishDashboardStatus.tsx`
- Delete: `PublishDashboardModal.tsx`, `PublishDashboardModalContent.tsx`, `PublishDashboardModal.test.tsx`, `PublishDashboardButton.tsx`
- Test: `src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx`

- [ ] **Step 1: Write the failing action tests**

Create `PublishingActions.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { PublishingActions } from "@/views/DashboardApp/DashboardShareModal/PublishingActions";
import { render, screen } from "@/test-utils";

const noop = vi.fn();

describe("PublishingActions", () => {
  it("labels the draft-to-workspace case as publishing to the workspace", () => {
    render(
      <PublishingActions
        actionKind="publish_workspace"
        isBusy={false}
        isBlockedReason={undefined}
        onPrimaryAction={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeEnabled();
  });

  it("labels a downgrade as making the dashboard internal", () => {
    render(
      <PublishingActions
        actionKind="make_internal"
        isBusy={false}
        isBlockedReason={undefined}
        onPrimaryAction={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Make internal" }),
    ).toBeEnabled();
  });

  it("disables the action when there is no audience selected", () => {
    render(
      <PublishingActions
        actionKind="disabled_no_audience"
        isBusy={false}
        isBlockedReason={undefined}
        onPrimaryAction={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("disables the action while there are unsaved changes", () => {
    // Publishing copies the PERSISTED config to the bucket, so publishing with
    // unsaved edits would ship the previous version without saying so.
    render(
      <PublishingActions
        actionKind="publish_public"
        isBusy={false}
        isBlockedReason="You cannot publish while there are unsaved changes. Save first."
        onPrimaryAction={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/PublishingActions.test.tsx`

Expected: FAIL, module not found.

- [ ] **Step 3: Implement the actions**

Create `PublishingActions.tsx`:

```tsx
import { Tooltip } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import type { PublishActionKind } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import type { ReactNode } from "react";

type Props = {
  actionKind: PublishActionKind;
  isBusy: boolean;
  /** Set when publishing is blocked for a reason outside this modal. */
  isBlockedReason: string | undefined;
  onPrimaryAction: () => void;
};

/**
 * The publish footer.
 *
 * Every kind except `unpublish` calls the same client method; the labels differ
 * because "Publish", "Update & republish", and "Make internal" describe very
 * different intentions to the person clicking them.
 */
export function PublishingActions({
  actionKind,
  isBusy,
  isBlockedReason,
  onPrimaryAction,
}: Readonly<Props>): ReactNode {
  const label = matchLiteral(actionKind, {
    publish_workspace: () => <Trans>Publish to workspace</Trans>,
    publish_public: () => <Trans>Publish</Trans>,
    republish: () => <Trans>Update &amp; republish</Trans>,
    make_internal: () => <Trans>Make internal</Trans>,
    unpublish: () => <Trans>Unpublish</Trans>,
    disabled_no_audience: () => <Trans>Publish</Trans>,
  });
  const isDisabled =
    actionKind === "disabled_no_audience" || isBlockedReason !== undefined;
  return (
    <Group justify="flex-end">
      <Tooltip label={isBlockedReason ?? ""} disabled={!isBlockedReason}>
        <Button
          loading={isBusy}
          disabled={isDisabled}
          onClick={onPrimaryAction}
          color={actionKind === "unpublish" ? "red" : undefined}
          variant={actionKind === "unpublish" ? "light" : "filled"}
          leftSection={
            actionKind === "unpublish" ? undefined : <IconWorld size={16} />
          }
        >
          {label}
        </Button>
      </Tooltip>
    </Group>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/PublishingActions.test.tsx`

Expected: PASS, 4 tests.

- [ ] **Step 5: Teach the status alert about three states**

Replace `PublishDashboardStatus.tsx`'s props and its first alert:

```ts
type Props = {
  visibility: Dashboard.Visibility;
  targetVisibility: Dashboard.Visibility;
  isUsingVanity: boolean;
  targetUrl: string;
};
```

```tsx
      {matchLiteral(visibility, {
        draft: () => (
          <Alert color="blue" icon={<IconInfoCircle size={18} />} variant="light">
            <Text size="sm">
              <Trans>
                Not published yet. Nobody can open this dashboard from a link
                until you publish it.
              </Trans>
            </Text>
          </Alert>
        ),
        workspace: () => (
          <Alert color="teal" icon={<IconBuilding size={18} />} variant="light">
            <Text size="sm">
              <Trans>
                This dashboard is published to your workspace. Only people you
                have given access can open the link below.
              </Trans>
            </Text>
          </Alert>
        ),
        public: () => (
          <Alert color="orange" icon={<IconWorld size={18} />} variant="light">
            <Text size="sm">
              <Trans>
                This dashboard is <strong>public</strong>. Anyone with the link
                can view it, with no Avandar account.
              </Trans>
            </Text>
          </Alert>
        ),
      })}
      {targetVisibility !== visibility ?
        <Alert color="yellow" icon={<IconInfoCircle size={18} />} variant="light">
          <Text size="sm">
            <Trans>
              Your access change is saved, but the published copy still reflects
              the previous audience. Use the button below to apply it.
            </Trans>
          </Text>
        </Alert>
      : null}
```

That second alert is the one that makes umbrella section 5.4's ordering
legible to the user: share writes land immediately, the snapshot moves only on
the button.

- [ ] **Step 6: Compose the section**

Create `PublishingSection.tsx`:

```tsx
import { Divider, Stack } from "@mantine/core";
import { PublishDashboardStatus } from "@/views/DashboardApp/DashboardShareModal/PublishDashboardStatus/PublishDashboardStatus";
import { PublishedShareLinks } from "@/views/DashboardApp/DashboardShareModal/PublishedShareLinks";
import { PublishSliceSection } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection";
import { VanitySlugField } from "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField";
import type { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl";
import type { ReactNode } from "react";

type Props = {
  publishing: ReturnType<typeof useDashboardPublishingControl>;
};

/** The "Published data" half of the merged share modal. */
export function PublishingSection({ publishing }: Readonly<Props>): ReactNode {
  const isPublished = publishing.currentDashboard.visibility !== "draft";
  return (
    <Stack gap="md">
      <Divider />
      <PublishDashboardStatus
        visibility={publishing.currentDashboard.visibility}
        targetVisibility={publishing.targetVisibility}
        isUsingVanity={Boolean(publishing.shareUrls.vanity)}
        targetUrl={publishing.shareUrls.vanity ?? publishing.shareUrls.canonical}
      />
      <VanitySlugField
        slugInput={publishing.slugInput}
        normalisedSlug={publishing.normalisedSlug}
        urlPrefix={publishing.urlPrefix}
        errorMessage={publishing.slugErrorMessage}
        hasPendingCheck={publishing.hasPendingSlugCheck}
        isAccepted={publishing.isSlugAccepted}
        onChange={publishing.onSlugInputChange}
      />
      <PublishSliceSection
        dashboard={publishing.currentDashboard}
        publishConfig={publishing.publishConfig}
        onChange={publishing.onPublishConfigChange}
      />
      {isPublished ?
        <PublishedShareLinks shareUrls={publishing.shareUrls} />
      : null}
    </Stack>
  );
}
```

- [ ] **Step 7: Write the failing modal test**

Append to `ShareResourceModal.test.tsx`:

```tsx
it("renders no publishing section for a resource that has none", () => {
  // Datasets pass no `publishing` prop, so the modal must look exactly as it
  // did before dashboards grew one.
  renderModal({ resourceType: "dataset" });
  expect(screen.queryByTestId("share-publishing-section")).toBeNull();
});

it("renders the publishing section and actions when supplied", () => {
  renderModal({
    resourceType: "dashboard",
    publishing: {
      targetVisibility: "workspace",
      publicOptionDisabledReason: undefined,
      section: <div data-testid="share-publishing-section" />,
      actions: <div data-testid="share-publishing-actions" />,
      onGeneralAccessChange: vi.fn(),
    },
  });
  expect(screen.getByTestId("share-publishing-section")).toBeInTheDocument();
  expect(screen.getByTestId("share-publishing-actions")).toBeInTheDocument();
});
```

Extend the file's existing render helper to forward a `publishing` prop; if the
file has no helper, add one that spreads over the current inline `render` call
so the pre-existing tests keep their exact arguments.

- [ ] **Step 8: Run it to verify it fails**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx`

Expected: FAIL, unknown prop `publishing`.

- [ ] **Step 9: Implement the prop**

Create `ShareResourceModal.types.ts`:

```ts
import type { GeneralAccessValue } from "./GeneralAccessModule/GeneralAccessModule";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

/**
 * Publishing, supplied by the dashboard-only wrapper.
 *
 * `ShareResourceModal` renders datasets too, so publishing arrives as an
 * optional prop rather than an internal branch on `resourceType`. When it is
 * absent the modal behaves exactly as it did before dashboards could be
 * published to a workspace.
 *
 * The modal reads `targetVisibility` for one purpose only: deciding whether
 * the dropdown shows "Anyone with the link". It never writes it.
 */
export type ShareResourcePublishing = {
  targetVisibility: Dashboard.Visibility;
  /** Set when the public option must render disabled, with this reason. */
  publicOptionDisabledReason: string | undefined;
  section: ReactNode;
  actions: ReactNode;
  onGeneralAccessChange: (value: GeneralAccessValue) => void;
};
```

In `ShareResourceModal.tsx`, add `publishing?: ShareResourcePublishing` to
`Props`, pass it into the control, and render the two slots:

```tsx
  const generalAccess = useGeneralAccessControl({
    // ...existing options...
    isPubliclyPublished: publishing?.targetVisibility === "public",
  });
```

```tsx
      <ShareGeneralAccess
        resourceType={resourceType}
        value={generalAccess.displayedValue}
        isOwner={generalAccess.isOwner}
        isBusy={generalAccess.isBusy}
        workspaceShareRole={workspaceShare?.role ?? null}
        isPublicOptionAvailable={publishing !== undefined}
        publicOptionDisabledReason={publishing?.publicOptionDisabledReason}
        onChange={(value) => {
          // The dropdown moves the publish target and writes share state; it
          // never writes visibility. The footer button does that.
          publishing?.onGeneralAccessChange(value);
          generalAccess.onChange(value);
        }}
        onWorkspaceRoleChange={generalAccess.onWorkspaceRoleChange}
      />
```

Render `publishing?.section` directly after `<ShareSummaryLine />`, and replace
the footer `Group` with:

```tsx
      {publishing?.section}

      <Group justify="space-between" mt="md">
        <Button variant="default" onClick={onClose}>
          <Trans>Done</Trans>
        </Button>
        {publishing?.actions}
      </Group>
```

Pass the publication into the summary:

```tsx
  const spans = buildShareSummary({
    // ...existing options...
    publication: publishing ? publishing.targetVisibility : undefined,
  });
```

In `useGeneralAccessControl.ts`, accept the new option and add the fourth
branch:

```ts
  isPubliclyPublished: boolean;
```

```ts
  const derivedValue =
    options.sharingState ?
      GeneralAccessModule.fromResourceState({
        ...options.sharingState,
        isPubliclyPublished: options.isPubliclyPublished,
      })
    : "private";
```

```ts
    public: () => {
      // Public reads never consult `resource_shares`, so selecting this writes
      // no share rows: the anon policy and the `is_public` short-circuit in
      // util__auth_user_may_select_dashboard both fire first. Rewriting shares
      // here would widen EDIT access as a side effect of a READ decision, and
      // would destroy the narrowing the owner gets back on a downgrade.
    },
```

- [ ] **Step 10: Run the modal test to verify it passes**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/ShareResourceModal.test.tsx`

Expected: PASS, including every pre-existing case.

- [ ] **Step 11: Build the dashboard wrapper and its button**

Create `DashboardShareModal.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl";
import { PublishingActions } from "@/views/DashboardApp/DashboardShareModal/PublishingActions";
import { PublishingSection } from "@/views/DashboardApp/DashboardShareModal/PublishingSection";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  /** Publishing copies the PERSISTED config, so unsaved edits block it. */
  hasUnsavedChanges: boolean;
  onClose: () => void;
};

/**
 * The dashboard flavour of the share modal: the resource-generic modal plus
 * the publishing section it renders for dashboards only.
 */
export function DashboardShareModal({
  dashboard,
  hasUnsavedChanges,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const offline = useOfflineGate();
  const canPublishPublicly = useHasPermission(
    "dashboards__can_publish_publicly",
  );
  const publishing = useDashboardPublishingControl({ dashboard });
  const isBlockedReason =
    offline.isBlocked ? t`Unavailable offline`
    : hasUnsavedChanges ?
      t`You cannot publish while there are unsaved changes. Save first.`
    : undefined;

  return (
    <ShareResourceModal
      resourceName={dashboard.name}
      resourceType="dashboard"
      resourceId={dashboard.id}
      onClose={onClose}
      publishing={{
        targetVisibility: publishing.targetVisibility,
        publicOptionDisabledReason:
          canPublishPublicly ? undefined : (
            t`Only workspace admins can publish to the web.`
          ),
        section: <PublishingSection publishing={publishing} />,
        actions: (
          <PublishingActions
            actionKind={publishing.actionKind}
            isBusy={publishing.isBusy}
            isBlockedReason={isBlockedReason}
            onPrimaryAction={publishing.onPrimaryAction}
          />
        ),
        onGeneralAccessChange: publishing.onGeneralAccessChange,
      }}
    />
  );
}
```

Create `useShareButtonState.ts` by lifting the gate out of
`ShareResourceButton.tsx` verbatim:

```ts
import { useLingui } from "@lingui/react/macro";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";

type ShareButtonState = {
  isDisabled: boolean;
  tooltip: string;
};

/**
 * The "may I open the share modal" gate, shared by the generic share button and
 * the dashboard one so the rule lives in one place.
 *
 * Managing shares requires `admin` on the resource, which is stricter than
 * editing it.
 */
export function useShareButtonState(
  options: Readonly<{
    resourceType: ResourceType;
    resourceId: string | undefined;
  }>,
): ShareButtonState {
  const { t } = useLingui();
  const [effectiveRole, isLoadingRole] = useResourceRole(options);
  const canManageShares = effectiveRole === "admin";
  const resourceLabel = resourceTypeLabel(options.resourceType);
  return {
    isDisabled: !options.resourceId || isLoadingRole || !canManageShares,
    tooltip:
      canManageShares || isLoadingRole ?
        t`Share this ${resourceLabel}`
      : t`You need admin access on this resource to manage sharing.`,
  };
}
```

Rewrite `ShareResourceButton.tsx` to call it, deleting the inline role logic
but changing nothing it renders.

Create `DashboardShareButton.tsx`, which is `ShareResourceButton` with the
dashboard modal and the two extra props:

```tsx
import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconShare } from "@tabler/icons-react";
import { useShareButtonState } from "@/components/permissions/useShareButtonState/useShareButtonState";
import { DashboardShareModal } from "@/views/DashboardApp/DashboardShareModal/DashboardShareModal";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ButtonProps } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T | undefined;
  hasUnsavedChanges: boolean;
  size?: ButtonProps["size"];
};

/**
 * Opens the merged share and publish modal.
 *
 * This is the toolbar's only sharing control: the separate Publish button was
 * removed when publishing moved inside the modal, so a dashboard's audience is
 * chosen in exactly one place.
 */
export function DashboardShareButton({
  dashboard,
  hasUnsavedChanges,
  size,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { isDisabled, tooltip } = useShareButtonState({
    resourceType: "dashboard",
    resourceId: dashboard?.id,
  });
  return (
    <Tooltip label={tooltip}>
      <Button
        size={size}
        variant="default"
        leftSection={<IconShare size={16} />}
        data-disabled={isDisabled || undefined}
        aria-disabled={isDisabled || undefined}
        onClick={(event) => {
          if (!dashboard || isDisabled) {
            event.preventDefault();
            return;
          }
          const modalId = `share-dashboard-${dashboard.id}`;
          modals.open({
            modalId,
            title: t`Share`,
            size: "lg",
            children: (
              <DashboardShareModal
                dashboard={dashboard}
                hasUnsavedChanges={hasUnsavedChanges}
                onClose={() => {
                  modals.close(modalId);
                }}
              />
            ),
          });
        }}
      >
        <Trans>Share</Trans>
      </Button>
    </Tooltip>
  );
}
```

- [ ] **Step 12: Rewire the toolbar and delete the old surface**

In `DashboardEditorView.tsx`, replace the `ShareResourceButton` block and
delete the `PublishDashboardButton` block, so the toolbar reads:

```tsx
      <SaveDashboardButton onSave={options.onSave} />
      <DashboardShareButton
        dashboard={dashboard}
        hasUnsavedChanges={hasUnsavedChanges}
        size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
      />
      <ViewDashboardButton
        workspaceSlug={workspaceSlug}
        dashboardId={dashboard.id}
        hasUnsavedChanges={hasUnsavedChanges}
      />
```

Update the two imports at the top of the file, then delete the old files:

```bash
git rm src/views/DashboardApp/DashboardEditorView/PublishDashboardButton.tsx \
       src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx \
       src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModalContent.tsx \
       src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.test.tsx
```

In `DashboardEditorView.test.tsx:116`, rename the mocked module and component
from `ShareResourceButton` to `DashboardShareButton`, and delete the
`PublishDashboardButton` mock if one exists.

- [ ] **Step 13: Verify the whole suite**

Run: `pnpm type-check && pnpm test:frontend && pnpm lint`

Expected: PASS. A `PublishDashboardModal` import error means Step 12 missed a
reference; `grep -rn "PublishDashboardModal\|PublishDashboardButton" src` finds
it.

- [ ] **Step 14: Extract strings and commit**

```bash
pnpm i18n:extract
git add -A src shared/models/Permissions src/i18n
git commit -m "feat(dashboards): merge publishing into the share modal"
```

---

## Task 10: Analytics for the four states

`makeDashboardPublishAnalyticsEventFromDashboards` branches on
`previousDashboard.isPublic`, which after P2 is a generated column that is
false for a workspace-published dashboard. Republishing an internal dashboard
would emit `dashboard.published` every time.

**Files:**
- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts:20-30,69-73`
- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts:106-110`
- Modify: `src/views/DashboardApp/DashboardShareModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.ts`
- Test: `.../makeDashboardPublishAnalyticsEventFromDashboards.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `makeDashboardPublishAnalyticsEventFromDashboards.test.ts`, extending
its local dashboard factory with a `visibility` field:

```ts
it("reports a republish of a workspace dashboard as a settings update", () => {
  // Before P2 this branched on isPublic, which is false for a workspace
  // dashboard, so every internal republish looked like a first publish.
  const event = makeDashboardPublishAnalyticsEventFromDashboards({
    previousDashboard: makeDashboard({ visibility: "workspace" }),
    updatedDashboard: makeDashboard({ visibility: "workspace" }),
  });
  expect(event.event).toBe("dashboard.share_settings_updated");
  expect(event.payload).toMatchObject({ visibility: "workspace" });
});

it("reports the first publish of a draft as a publish", () => {
  const event = makeDashboardPublishAnalyticsEventFromDashboards({
    previousDashboard: makeDashboard({ visibility: "draft" }),
    updatedDashboard: makeDashboard({ visibility: "public" }),
  });
  expect(event.event).toBe("dashboard.published");
  expect(event.payload).toMatchObject({ visibility: "public" });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.test.ts`

Expected: FAIL on the first case, which currently emits `dashboard.published`.

- [ ] **Step 3: Implement**

In `AnalyticsEvents.constants.ts`, add `"dashboard.unpublished"` to
`CLIENT_ANALYTICS_EVENT_NAMES` after `"dashboard.share_settings_updated"`, and
delete the reservation comment at the bottom of the file (lines 69-73), which
says to add the name back only alongside a real unpublish flow. This is that
flow.

In `AnalyticsEvents.types.ts`:

```ts
  : K extends "dashboard.published" ?
    {
      dashboardId: string;
      blockCount: number;
      hasVanitySlug: boolean;
      visibility: DashboardVisibility;
    }
  : K extends "dashboard.share_settings_updated" ?
    {
      dashboardId: string;
      slugAction: "set" | "clear" | "unchanged";
      visibility: DashboardVisibility;
    }
  : K extends "dashboard.unpublished" ?
    { dashboardId: string; priorVisibility: DashboardVisibility }
```

Import `DashboardVisibility` from `$/models/Dashboard/Dashboard.types.ts`.

In `makeDashboardPublishAnalyticsEventFromDashboards.ts`, change the branch and
both payloads:

```ts
  // `isPublic` is a generated column that is false for a workspace-published
  // dashboard, so branching on it would report every internal republish as a
  // first publish. The question this branch asks is "was it published at all".
  return previousDashboard.visibility !== "draft" ?
      {
        event: "dashboard.share_settings_updated",
        payload: {
          dashboardId: updatedDashboard.id,
          slugAction: _getSlugAction({
            previousSlug: previousDashboard.slug,
            updatedSlug: updatedDashboard.slug,
          }),
          visibility: updatedDashboard.visibility,
        },
      }
```

and add `visibility: updatedDashboard.visibility` to the
`dashboard.published` payload.

- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards.test.ts`

Expected: PASS, including the pre-existing cases once their factory carries a
`visibility`.

- [ ] **Step 5: Verify the unpublish event type-checks**

Run: `pnpm type-check`

Expected: PASS. `useDashboardPublishingControl` logs
`dashboard.unpublished` and would not have compiled before this task; if it
still fails, the payload shape in Step 3 does not match the call in Task 8.

- [ ] **Step 6: Commit**

```bash
git add shared/analytics src/views/DashboardApp/DashboardShareModal
git commit -m "feat(analytics): report dashboard visibility on publish and unpublish"
```

---

## Task 11: The Only me confirmation, when the dashboard is public

Selecting "Only me" on a public dashboard revokes every share immediately, but
the dashboard stays world-readable until it is unpublished. The confirmation
has to say so. It must not unpublish on the user's behalf: that deletes
snapshot objects, which is not a side effect to bury in a confirmation someone
clicked for a different reason.

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/copy/makePrivateConfirmCopy.ts`
- Modify: `src/components/permissions/ShareResourceModal/openMakePrivateConfirmModal.tsx`
- Modify: `src/components/permissions/ShareResourceModal/useGeneralAccessControl.ts`
- Test: `src/components/permissions/ShareResourceModal/copy/makePrivateConfirmCopy.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Create or extend `makePrivateConfirmCopy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makePrivateConfirmCopy } from "@/components/permissions/ShareResourceModal/copy/makePrivateConfirmCopy";

describe("makePrivateConfirmCopy", () => {
  it("warns that a public dashboard stays readable until it is unpublished", () => {
    const copy = makePrivateConfirmCopy({
      resourceName: "Q3 Revenue",
      app: "Dashboards",
      numUsers: 2,
      numGroups: 0,
      losesWorkspaceAccess: true,
      isPubliclyPublished: true,
    });
    expect(JSON.stringify(copy)).toContain("still be public");
  });

  it("says nothing about publication for an unpublished resource", () => {
    const copy = makePrivateConfirmCopy({
      resourceName: "Q3 Revenue",
      app: "Dashboards",
      numUsers: 2,
      numGroups: 0,
      losesWorkspaceAccess: true,
      isPubliclyPublished: false,
    });
    expect(JSON.stringify(copy)).not.toContain("still be public");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal/copy/makePrivateConfirmCopy.test.ts`

Expected: FAIL, unknown option `isPubliclyPublished`.

- [ ] **Step 3: Implement**

Add `isPubliclyPublished: boolean` to the options of `makePrivateConfirmCopy`
and append one line to the body it returns:

```ts
    ...(options.isPubliclyPublished ?
      [
        t`This ${resourceLabel} will still be public: anyone with the link keeps access until you unpublish it.`,
      ]
    : []),
```

Thread the flag through `openMakePrivateConfirmModal` and
`_requestMakePrivate` in `useGeneralAccessControl.ts`, which already receives
`isPubliclyPublished` from Task 9.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend src/components/permissions/ShareResourceModal`

Expected: PASS, the whole directory.

- [ ] **Step 5: Extract strings and commit**

```bash
pnpm i18n:extract
git add src/components/permissions/ShareResourceModal src/i18n
git commit -m "feat(permissions): warn that Only me leaves a public dashboard public"
```

---

## Task 12: Discovery, the index query and the ordering

**Files:**
- Modify: `src/routes/_auth/$workspaceSlug/dashboards/index.tsx`
- Modify: `src/views/DashboardApp/DashboardListView/DashboardListView.tsx:159-183`
- Test: `src/views/DashboardApp/DashboardListView/DashboardListView.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test**

Create `src/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sortDashboardsForList } from "@/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

function makeDashboard(
  id: string,
  ownerId: string,
  updatedAt: string,
): Dashboard.T {
  return { id, ownerId, updatedAt } as unknown as Dashboard.T;
}

describe("sortDashboardsForList", () => {
  it("puts your own dashboards first, then everything else, each newest first", () => {
    const mine1 = makeDashboard("a", "me", "2026-01-01T00:00:00Z");
    const mine2 = makeDashboard("b", "me", "2026-03-01T00:00:00Z");
    const theirs = makeDashboard("c", "them", "2026-06-01T00:00:00Z");
    expect(
      sortDashboardsForList([theirs, mine1, mine2], "me").map((d) => d.id),
    ).toEqual(["b", "a", "c"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList.test.ts`

Expected: FAIL, module not found.

- [ ] **Step 3: Implement the sort**

Create `sortDashboardsForList.ts`:

```ts
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Orders the dashboards index: yours first, then everything RLS returned,
 * each group newest first.
 *
 * The index used to filter on `owner_id`, so order never mattered. Now that a
 * dashboard shared with you appears here too, your own work has to stay at the
 * top or the list stops being a place you can find your work.
 */
export function sortDashboardsForList(
  dashboards: readonly Dashboard.T[],
  currentUserId: string | undefined,
): Dashboard.T[] {
  return [...dashboards].sort((a, b) => {
    const aIsMine = a.ownerId === currentUserId;
    const bIsMine = b.ownerId === currentUserId;
    if (aIsMine !== bIsMine) {
      return aIsMine ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList.test.ts`

Expected: PASS.

- [ ] **Step 5: Drop the owner filter**

Rewrite the body of `DashboardsPage` in
`src/routes/_auth/$workspaceSlug/dashboards/index.tsx`:

```tsx
function DashboardsPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const workspace = useCurrentWorkspace();

  // No `owner_id` filter: RLS decides what this user may see, which is what
  // makes a dashboard shared with you appear in your list at all. See the P3
  // design, section 6.
  const [dashboards] = DashboardClient.useGetAll({
    where: { workspace_id: { eq: workspace.id } },
  });

  return (
    <DashboardListView
      dashboards={dashboards ?? []}
      workspaceSlug={workspaceSlug}
    />
  );
}
```

Delete the now-unused `useCurrentUserProfile` import and the
`dashboardsWhere === undefined` guard.

- [ ] **Step 6: Apply the ordering in the list view**

In `DashboardListView.tsx`, add the import:

```ts
import { sortDashboardsForList } from "@/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList";
```

then sort before mapping. The view already has `userProfile` in scope for
`onCreateDashboard`:

```tsx
  const orderedDashboards = useMemo(() => {
    return sortDashboardsForList(dashboards, userProfile?.userId);
  }, [dashboards, userProfile?.userId]);
```

and map over `orderedDashboards` instead of `dashboards`, passing the owner
flag to the card:

```tsx
                <DashboardCard
                  key={dashboard.id}
                  dashboard={dashboard}
                  isOwnedByCurrentUser={dashboard.ownerId === userProfile?.userId}
                  offlineStatus={getDashboardOfflineStatus(dashboard)}
                  onClick={onCardClick}
                />
```

- [ ] **Step 7: Verify**

Run: `pnpm type-check`

Expected: FAIL in `DashboardCard.tsx` only, on the unknown
`isOwnedByCurrentUser` prop. Task 13 adds it.

- [ ] **Step 8: Commit**

```bash
git add src/routes/_auth/\$workspaceSlug/dashboards/index.tsx \
        src/views/DashboardApp/DashboardListView
git commit -m "feat(dashboards): let RLS decide the dashboards index"
```

---

## Task 13: Audience badges on the card

**Files:**
- Modify: `src/views/DashboardApp/DashboardListView/DashboardCard.tsx`
- Test: `src/views/DashboardApp/DashboardListView/DashboardCard.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `DashboardCard.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { DashboardCard } from "@/views/DashboardApp/DashboardListView/DashboardCard";
import { render, screen } from "@/test-utils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

function makeDashboard(visibility: Dashboard.Visibility): Dashboard.T {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    name: "Q3 Revenue",
    description: undefined,
    visibility,
    updatedAt: "2026-08-01T00:00:00Z",
  } as unknown as Dashboard.T;
}

describe("DashboardCard", () => {
  it("badges a dashboard someone else owns", () => {
    render(
      <DashboardCard
        dashboard={makeDashboard("draft")}
        isOwnedByCurrentUser={false}
      />,
    );
    expect(screen.getByText("Shared with you")).toBeInTheDocument();
  });

  it("does not badge your own dashboards, which would be noise on every card", () => {
    render(
      <DashboardCard
        dashboard={makeDashboard("draft")}
        isOwnedByCurrentUser
      />,
    );
    expect(screen.queryByText("Shared with you")).toBeNull();
    expect(screen.queryByText("Yours")).toBeNull();
  });

  it("badges a workspace-published dashboard", () => {
    render(
      <DashboardCard
        dashboard={makeDashboard("workspace")}
        isOwnedByCurrentUser
      />,
    );
    expect(screen.getByText("Published to workspace")).toBeInTheDocument();
  });

  it("badges a public dashboard, and both badges compose", () => {
    render(
      <DashboardCard
        dashboard={makeDashboard("public")}
        isOwnedByCurrentUser={false}
      />,
    );
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Shared with you")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardListView/DashboardCard.test.tsx`

Expected: FAIL, unknown prop and missing badges.

- [ ] **Step 3: Implement**

Add to `Props`:

```ts
  /** Drives the "Shared with you" badge; there is deliberately no "Yours". */
  isOwnedByCurrentUser: boolean;
```

Add the badges inside the existing badge `Group`, before the offline ones:

```tsx
          {!isOwnedByCurrentUser ?
            <Badge size="xs" color="grape" variant="light">
              <Trans>Shared with you</Trans>
            </Badge>
          : null}
          {dashboard.visibility === "workspace" ?
            <Badge size="xs" color="blue" variant="light">
              <Trans>Published to workspace</Trans>
            </Badge>
          : null}
          {dashboard.visibility === "public" ?
            <Badge size="xs" color="orange" variant="light">
              <Trans>Public</Trans>
            </Badge>
          : null}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardListView`

Expected: PASS.

- [ ] **Step 5: Extract strings and commit**

```bash
pnpm i18n:extract
git add src/views/DashboardApp/DashboardListView src/i18n
git commit -m "feat(dashboards): badge dashboard audience on the index cards"
```

---

## Task 14: Viewers cannot open a draft

P2 deferred this because blocking viewers before any control existed to publish
internally would have stranded everyone holding a viewer share. Task 9 shipped
the control, so the rule can land.

**Files:**
- Modify: `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx`
- Test: `src/routes/_auth/$workspaceSlug/dashboards/preview/-$dashboardId.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `-$dashboardId.test.tsx`, following the file's existing loader-test
shape:

```ts
it("denies a viewer on a draft dashboard", async () => {
  // `draft` means the owner has not decided it is ready for anyone else. That
  // is the whole product meaning of the state.
  mockGetById.mockResolvedValue({ ...baseDashboard, visibility: "draft" });
  mockCanAccessResource.mockResolvedValue(false);

  const data = await runLoader({ dashboardId: baseDashboard.id });

  expect(data.isAccessDenied).toBe(true);
});

it("admits a viewer once the dashboard is published to the workspace", async () => {
  mockGetById.mockResolvedValue({ ...baseDashboard, visibility: "workspace" });
  mockCanAccessResource.mockResolvedValue(false);

  const data = await runLoader({ dashboardId: baseDashboard.id });

  expect(data.isAccessDenied).toBe(false);
});

it("admits an editor on a draft, which is the whole point of preview", async () => {
  mockGetById.mockResolvedValue({ ...baseDashboard, visibility: "draft" });
  mockCanAccessResource.mockResolvedValue(true);

  const data = await runLoader({ dashboardId: baseDashboard.id });

  expect(data.isAccessDenied).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:frontend "src/routes/_auth/\$workspaceSlug/dashboards/preview/-\$dashboardId.test.tsx"`

Expected: FAIL, `isAccessDenied` is undefined.

- [ ] **Step 3: Implement**

In the preview route's loader:

```ts
    const canEdit = await UserClient.canAccessResource({
      resourceType: "dashboard",
      resourceId: params.dashboardId,
      minRole: "editor",
    });

    // A viewer may open a dashboard only once it is published. `draft` is the
    // state in which a dashboard is not ready for anyone but the people who
    // can edit it; P2 shipped the state and P3 shipped the control that leaves
    // it, so the rule can finally bind. See the P3 design, section 7.
    const isAccessDenied = !canEdit && dashboard.visibility === "draft";

    return { dashboard, canEdit, isAccessDenied };
```

and in the component:

```tsx
  const { dashboard, canEdit, isAccessDenied } = Route.useLoaderData();
  if (isAccessDenied) {
    return <DashboardAccessDeniedView />;
  }
```

Import `DashboardAccessDeniedView` from
`@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView/DashboardAccessDeniedView`.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:frontend "src/routes/_auth/\$workspaceSlug/dashboards/preview/-\$dashboardId.test.tsx"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/_auth/\$workspaceSlug/dashboards/preview"
git commit -m "feat(dashboards): require a published dashboard for viewer access"
```

---

## Task 15: End-to-end coverage

**Files:**
- Create: `tests/e2e/dashboard-workspace-publishing.spec.ts`
- Create: `tests/e2e/dashboard-discovery.spec.ts`

- [ ] **Step 1: Write the workspace-publishing spec**

Create `tests/e2e/dashboard-workspace-publishing.spec.ts`. Reuse the existing
seed helpers in `tests/e2e/helpers/` (`seedDashboard.ts`,
`DashboardSeedHelpers.ts`) rather than seeding by hand:

```ts
import { expect, test } from "./fixtures";
import { seedDashboard } from "./helpers/seedDashboard";

test("an owner publishes to the workspace and a colleague can read it", async ({
  ownerPage,
  colleaguePage,
  workspace,
}) => {
  const dashboard = await seedDashboard({ workspace, name: "Q3 Revenue" });

  await ownerPage.goto(
    `/${workspace.slug}/dashboards/edit/${dashboard.id}`,
  );
  await ownerPage.getByRole("button", { name: "Share" }).click();
  await ownerPage
    .getByLabel("General access")
    .selectOption({ label: "Anyone in Dashboards" });
  await ownerPage
    .getByRole("button", { name: "Publish to workspace" })
    .click();
  await expect(
    ownerPage.getByText("This dashboard is published to your workspace"),
  ).toBeVisible();

  await colleaguePage.goto(`/${workspace.slug}/d/${dashboard.id}`);
  await expect(colleaguePage.getByText("Q3 Revenue")).toBeVisible();
});

test("a signed-out visitor is sent to sign in, not to the dashboard", async ({
  anonPage,
  workspace,
}) => {
  const dashboard = await seedDashboard({
    workspace,
    name: "Internal only",
    visibility: "workspace",
  });

  await anonPage.goto(`/${workspace.slug}/d/${dashboard.id}`);

  await expect(anonPage).toHaveURL(/\/signin/);
});

test("an editor has no selectable public option", async ({
  editorPage,
  workspace,
}) => {
  const dashboard = await seedDashboard({ workspace, name: "Editor owned" });

  await editorPage.goto(`/${workspace.slug}/dashboards/edit/${dashboard.id}`);
  await editorPage.getByRole("button", { name: "Share" }).click();

  await expect(
    editorPage.getByText("Only workspace admins can publish to the web."),
  ).toBeVisible();
});
```

If the fixtures file has no `colleaguePage`, `editorPage`, or `anonPage`,
add them next to the existing ones following the same pattern; do not
authenticate inline in the spec.

- [ ] **Step 2: Write the discovery spec**

Create `tests/e2e/dashboard-discovery.spec.ts`:

```ts
import { expect, test } from "./fixtures";
import { seedDashboard } from "./helpers/seedDashboard";

test("a dashboard shared with you appears in your index, badged", async ({
  ownerPage,
  colleaguePage,
  workspace,
  colleague,
}) => {
  const dashboard = await seedDashboard({ workspace, name: "Shared report" });

  await ownerPage.goto(`/${workspace.slug}/dashboards/edit/${dashboard.id}`);
  await ownerPage.getByRole("button", { name: "Share" }).click();
  await ownerPage.getByLabel("Add people or groups").fill(colleague.email);
  await ownerPage.getByRole("option", { name: colleague.email }).click();
  await ownerPage.getByRole("button", { name: "Done" }).click();

  await colleaguePage.goto(`/${workspace.slug}/dashboards`);

  await expect(colleaguePage.getByText("Shared report")).toBeVisible();
  await expect(colleaguePage.getByText("Shared with you")).toBeVisible();
});
```

- [ ] **Step 3: Run the new specs**

Run: `pnpm test:e2e tests/e2e/dashboard-workspace-publishing.spec.ts tests/e2e/dashboard-discovery.spec.ts`

Expected: PASS. A failure on the `selectOption` step means the Mantine
`Select` needs a click-then-option interaction rather than a native select;
follow whatever the existing e2e specs do for Mantine dropdowns.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): cover workspace publishing and shared-dashboard discovery"
```

---

## Task 16: Documentation and the full verification sweep

**Files:**
- Modify: `docs/permissions-architecture.md`
- Modify: `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`

- [ ] **Step 1: Record the discovery asymmetry**

Add to `docs/permissions-architecture.md`, in the section describing
`util__auth_user_may_select_dashboard`:

```markdown
### Known asymmetry: viewers see more than editors

For a **non-restricted** dashboard, `util__auth_user_may_select_dashboard`
returns true for any member whose Dashboards app role ranks below `editor`, and
requires an explicit share for `editor` and `admin`. A workspace member with
the viewer role can therefore select every non-restricted dashboard in the
workspace, while an editor sees only the ones they own or hold a share on.
Promoting someone from viewer to editor shrinks their dashboard list.

This predates the private-dashboards work and was unobservable while the
dashboards index filtered on `owner_id`. P3 removed that filter, so it is now a
visible product behavior. It is documented rather than changed because
correcting it is a permission-model decision with its own pgTAP truth tables to
update. See `docs/superpowers/specs/2026-08-15-private-dashboards-merged-share-surface-design.md`
section 8.
```

- [ ] **Step 2: Mark P3 landed in the umbrella**

In `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`, section 8's
table, mark P3 as landed and point at its spec, exactly as P1, P1.5, and P2
were marked. Close open question three in section 10 with the answer from the
P3 spec's section 6.3: badges plus owner-first ordering, no filter control, with
the recorded tripwire.

- [ ] **Step 3: Run every suite**

```bash
supabase start
pnpm db:reset
pnpm test:db
pnpm type-check
pnpm test:frontend
pnpm lint
pnpm i18n:check
pnpm test:e2e
```

Expected: all PASS. `i18n:check` failing means extracted strings were not
committed; run `pnpm i18n:extract` and commit the result.

- [ ] **Step 4: Confirm the old surface is gone**

Run: `grep -rn "PublishDashboardButton\|PublishDashboardModal" src shared tests`

Expected: no matches outside `src/i18n/locales/*.po`, which carry stale source
references until the next extract. If `i18n:extract` has run, even those are
gone.

- [ ] **Step 5: Confirm nothing reads the old analytics branch**

Run: `grep -rn "previousDashboard.isPublic" src`

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add -A
git commit -m "docs: record the P3 merged share surface and the discovery asymmetry"
```

---

## Notes for the implementer

**The three places where order of operations is the point, not a detail:**

1. **Task 5's `auth.uid() is null` exemption.** Without it, every pgTAP file
   and every seed script that flips a dashboard to `public` as the postgres
   role starts failing with 42501, including
   `dashboard_visibility_slug_namespaces.test.sql`, which P2 wrote. The
   exemption is not a hole: service-role writes already bypass RLS entirely.

2. **Task 6 before Tasks 7 to 10.** The move is its own commit so that the
   behavior diffs afterwards are readable. Combining them produces a review
   where every file looks new and nothing can be compared against what it
   replaced.

3. **Task 9's dropdown handler order.** `publishing?.onGeneralAccessChange`
   runs before `generalAccess.onChange`. Both are safe in either order today,
   but the target move is what the status alert reads to decide whether to warn
   about a pending change, and the share write is asynchronous. Keeping the
   synchronous state update first means the modal never renders a frame where
   the shares have changed and the target has not.

**Two shapes worth confirming against the code as you go:**

- `DashboardClient.useUnpublishDashboard` is assumed to exist with the same
  hook shape as `usePublishDashboard`, because P2 registered
  `unpublishDashboard` in the mutation list at
  `src/clients/dashboards/DashboardClient.ts:1044`. Confirm the generated hook
  name before Task 8 rather than after; if the generator produced a different
  name, use it and adjust the mock in the hook test.

- `PublishSliceSection` takes `dashboard: Dashboard.T`, and
  `useDashboardPublishingControl` hands it `currentDashboard`, which is the
  post-publish row rather than the prop. That is deliberate: after a publish the
  slice section must reflect what was published, not what the editor loaded.

**What P3 deliberately leaves undone**, so it is not mistaken for an oversight
in review: the plan-limit gate on the public option (P4 item H, and section 5.3
of the spec explains why `publicOptionDisabledReason` is a bare string until
then), the viewer/editor discovery asymmetry (documented in Task 16, not
fixed), no filter control on the index, no request-access action, and no sweep
for orphaned snapshot objects.
