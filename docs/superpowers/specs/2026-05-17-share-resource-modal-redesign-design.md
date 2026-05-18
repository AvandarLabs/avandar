# Share resource modal redesign - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-05-17
**Related:** `docs/permissions-architecture.md`, `src/components/permissions/ShareResourceModal/`

---

## 1. Problem

The current `ShareResourceModal` (datasets and dashboards) layers four independent sharing mechanisms in one dialog:

1. **Workspace access** - a default role for everyone in the workspace.
2. **People and tags** - explicit per-principal shares.
3. **Resource tags** - a *second* default-access mechanism that gates the workspace app-role grant by user-group intersection.
4. **Restrict access** switch - a negation that disables the tag-based default grants.

User feedback: this is hard to reason about. Two competing default mechanisms (workspace role + resource tags) and an inverted negation switch sit next to a list of explicit shares, and the relationship between them is not obvious.

Google Drive solves the same problem with two sections - a list of principals plus a *General access* dropdown whose "Restricted" option is the negation. We want that mental model, adapted to Avandar's permission system.

## 2. Goals & non-goals

**Goals**

- One coherent share dialog that maps cleanly to Drive's "principals + General access" model.
- Preserve the intersection capability currently provided by `resource_user_group_tags` (Analytics ∩ data_sources access) as an explicit, per-share toggle.
- Make the effective semantics legible: copy, tooltips, and a plain-language summary sentence with pills.
- Be honest about the workspace-app-role gate. "Anyone in workspace" is misleading; the correct phrasing is "Anyone in *Data Sources*" (or the resource's app).
- Add a `Shared with me` surface so users with only share-derived access can actually navigate to those resources without needing the parent app's permission key.
- Lock the truth table with pgTAP / RLS tests **and** Playwright e2e tests before cut-over. Mis-grants here are a security incident.

**Non-goals**

- Cross-workspace sharing (out of scope; matches v1 permissions architecture).
- Public-link sharing (`is_public`) - stays a separate flag.
- Per-column ACLs (out of scope).
- Changing the underlying `app_type` or `role_level` enums.
- Adding a new permission tier that bypasses app-role gating (we evaluated this; the `Shared with me` surface + existing shares give the same outcome without expanding the data model).

## 3. UX

### 3.1 Dialog layout

```
┌─ Share "california-covid-sample.csv" ─────────────────────────────×─┐
│                                                                      │
│  [ Add people, groups, or tags…                              ▾ ]    │
│  ↳ on selection: inline role picker + Share button                  │
│                                                                      │
│  People with access                                                  │
│  ─────────────────────────────────                                  │
│   👤  John Snow (you)                Owner                           │
│   👤  William Farr                   Viewer ▾                    ×   │
│   🏷  Analytics                      Editor ▾   ☐ Limit to app   ×   │
│   🏷  Public datasets                Viewer ▾   ✓ Limit to app   ×   │
│                                                                      │
│  General access                                                      │
│  ─────────────────────────────────                                  │
│   🏢  [ Anyone in Data Sources ▾ ]    [ Viewer ▾ ]                  │
│                                                                      │
│       Options:                                                       │
│       • Restricted - only people listed above                        │
│       • Anyone in Data Sources (members with app access)            │
│                                                                      │
│  ────────────────────────────────────────────────────────           │
│  This dataset is shared with:                                       │
│  [William Farr] · all members of [Analytics] who also have          │
│  [Data Sources] access · all members of [Public datasets] · and     │
│  anyone in [Avandar Labs] with [Data Sources] access as [Viewer].   │
│                                                                      │
│                                                            [ Done ]  │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Sections

**A. Add input (top).** Single combobox autocomplete over users + user-groups (today the modal has two separate controls). On selection, an inline role picker appears next to the selected principal and a "Share" button commits the row. Pre-existing `useGetUsersForWorkspace` and `useGetUserGroups` hooks supply the option lists. The grouped option style (`Members` / `Tags`) carries over from the current implementation.

**B. People with access (list).** One row per share, sorted: owner first, then users (alphabetical by display name), then user-groups (alphabetical). Each row:

- Leading icon distinguishes user (👤) from user-group (🏷).
- Display name (user) or group name (group).
- Role select (`Viewer` / `Editor` / `Admin`), disabled for the owner row.
- For user-group rows only: **Limit to app access** checkbox. When checked, the share is treated as an intersection with the resource's app role (see §4).
- Trailing "×" remove button (icon-only, tooltip "Remove access"). Disabled on the owner row.

**C. General access.** A single dropdown with two options:

- *Restricted* - only the rows above grant access. The accompanying role picker is hidden.
- *Anyone in {AppLabel}* - translates to a `workspace` principal share at the chosen role. The role picker is shown next to the dropdown.

Where `{AppLabel}` is the resource's app: "Data Sources" for datasets, "Dashboards" for dashboards. This phrasing is the honest one - it tells users that workspace-wide access still requires the app role.

**D. Summary line (plain language).** A single sentence with pills/badges that compiles from current state. Pills wrap; the sentence reads naturally with no jargon. See §3.3 for the construction rules and examples.

**E. Footer.** A single "Done" button (closes the dialog; saves happen inline as the user changes controls, matching today's behavior). No "Cancel" - non-destructive changes auto-save like Drive.

### 3.3 The summary line

The summary is generated from the modal's current state. Each variable element is a `Pill` (Mantine `Badge` with `variant="light"`), making the sentence scannable.

**Construction rules**

1. Open with: `"This {resourceType} is shared with:"` where `{resourceType}` is "dataset" or "dashboard".
2. If there are user shares, list them as comma-separated name pills.
3. If there are user-group shares without "Limit to app access", join them as `"all members of [Group]"`.
4. If there are user-group shares with "Limit to app access", join them as `"all members of [Group] who also have [AppLabel] access"`.
5. If general access ≠ Restricted, append `"and anyone in [Workspace] with [AppLabel] access as [Role]"`.
6. If general access = Restricted **and** the list is empty (no shares at all), the summary is `"This {resourceType} is currently only accessible to its owner."`
7. If general access = Restricted and shares exist, the closing clause is omitted; the leading sentence carries through unchanged.

**Examples**

- *Just an explicit user share, restricted:*
  > This dataset is shared with: **William Farr**.

- *Group share + workspace general access:*
  > This dataset is shared with: all members of **Analytics**, and anyone in **Avandar Labs** with **Data Sources** access as **Viewer**.

- *Mixed, with intersection toggle on:*
  > This dataset is shared with: **William Farr**, all members of **Analytics** who also have **Data Sources** access, and anyone in **Avandar Labs** with **Data Sources** access as **Viewer**.

- *Restricted, no shares:*
  > This dataset is currently only accessible to its owner.

### 3.4 Copy, tooltips, microcopy

We are deliberately verbose. Every non-trivial control gets a tooltip; every section gets a one-line description. The cost of overexplaining is small; the cost of someone misunderstanding a share grant is real data exposure.

**Tooltips and helper text (canonical strings)**

| Element | Helper / tooltip |
| --- | --- |
| Add combobox placeholder | `"Search by name or tag"` |
| Add combobox helper | `"Add a member or a tag to grant access. Use General access below to share more broadly."` |
| Role select (per row) | Tooltip: `"What this person or group can do. Viewer = read only, Editor = edit content, Admin = full control including sharing."` |
| `Limit to app access` checkbox | Tooltip: `"When on, members of this group only get access if they already have {AppLabel} access in the workspace. When off, every member of the group gets access here, even if they normally can't open {AppLabel}."` |
| General access dropdown | Helper text (below): `"Controls the default for the rest of the workspace. People without app access still need a direct share above."` |
| `Restricted` option tooltip | `"Only the people and groups listed above can access this {resourceType}."` |
| `Anyone in {AppLabel}` option tooltip | `"Every workspace member who can open the {AppLabel} app gets this role on this {resourceType}, in addition to whatever's listed above."` |
| Summary line | No tooltip; the sentence is the explanation. |
| Remove (×) button | Tooltip: `"Remove access for {Name}."` |
| Owner row "Owner" badge | Tooltip: `"The owner always has admin access. To change owner, use the {resourceType} settings."` |

**`Limit to app access` deserves a stronger callout.** A small "(?)" icon next to the checkbox label opens a `HoverCard` with a two-line explanation and an example, e.g.:

> **Limit to app access**
> Off (default): every member of *Analytics* gets this role, even if they can't normally open *Data Sources*.
> On: only members of *Analytics* who already have *Data Sources* access get this role here. People in *Analytics* without app access stay locked out.

### 3.5 Empty and edge states

- **No members or tags in workspace** - the Add combobox shows the helper: `"No members or tags yet. Invite members or create tags in Workspace settings."` with a link.
- **Non-admin viewing share modal** - should not be reachable (the Share button is hidden); if reached, render a read-only summary line with no controls and a banner: `"Only resource admins can change sharing."`
- **Loading** - keep the existing skeleton text. The new layout doesn't change the loading path.
- **Save failures** - keep current `notifyError` behavior. Each control reverts optimistically on error and shows the toast.

### 3.6 Accessibility

- The single Add combobox must be keyboard-navigable; selecting an option focuses the role picker for fast keyboard-only use.
- All pills/badges are decorative; the surrounding sentence is the readable content for screen readers. Generate the summary as one continuous text node with semantic emphasis on the variable spans (e.g. `<strong>` on names), not as a series of disconnected pills.
- Tooltips must be reachable on keyboard focus, not hover-only. Use the existing `@ui` Tooltip wrapper, which already supports this.
- Role-select labels include hidden text for context: `"Role for William Farr"`, not bare `"Role"`.

## 4. Data model

### 4.1 Schema changes

**Drop** `resource_user_group_tags` entirely. The capability it encoded (workspace-app-role gated by tag intersection) is preserved via a new column on `resource_shares`.

**Add** a column to `public.resource_shares`:

```sql
alter table public.resource_shares
  add column requires_app_access boolean not null default false;
```

Semantics:

- `requires_app_access = false` (default) - the share contributes its role unconditionally for matching principals. This matches Drive's union semantics.
- `requires_app_access = true` - the share contributes its role **only if** the principal has a non-null app role on the resource's app (i.e. `util__get_auth_user_app_role(workspace_id, resource_app) is not null`). No specific role threshold; presence of any app role suffices. The share's role is then capped to its declared value (the app role doesn't bump it).

**Validity constraint:** `requires_app_access = true` is only meaningful for `principal_type = 'user_group'`. A check constraint enforces this:

```sql
alter table public.resource_shares
  add constraint resource_shares__requires_app_access_only_for_groups
  check (
    requires_app_access = false
    or principal_type = 'user_group'
  );
```

### 4.2 RLS / function changes

`util__resource_effective_role` is the central function (`supabase/schemas/16.utils.resource-permissions.sql`). Changes:

1. Remove the `resource_user_group_tags` lookup block (the tag intersection on the app-role path).
2. In the share-rank computation, when iterating user-group shares, additionally enforce `requires_app_access` by gating with `util__get_auth_user_app_role(workspace_id, resource_app) is not null`.
3. Workspace and user-direct shares are unaffected; their behavior remains "unconditional grant" as today.

`util__auth_user_may_select_dataset` and `util__auth_user_may_select_dashboard` (the SELECT hardening helpers) need parallel updates so the new column participates in their share-existence check.

### 4.3 Migration

A backfill migration converts existing tagged resources into the new shape. For each row in `resource_user_group_tags`:

- Insert a `resource_shares` row with `(principal_type='user_group', principal_id=<user_group_id>, role=<choose>, requires_app_access=true)`.

**Role-translation caveat.** The current tag mechanism grants each user their *personal* app role (one user might effectively be `editor`, another `viewer`). The new mechanism grants a single share-level role per group. There is no lossless translation. The migration picks `editor` as the converted role because that's the cap most workspaces actually use today and it preserves edit capability for tagged Analyst-style groups; `requires_app_access=true` means viewers without `data_sources` access are still locked out as before. Document this explicitly in the migration script and surface it in release notes - workspaces relying on the per-user app-role variance will need to add finer-grained shares post-migration.

Then drop `resource_user_group_tags` and its RLS policies.

**This migration is observable.** It changes effective roles in subtle cases. We must run it side-by-side with the new RLS, with a pgTAP harness that asserts the truth table is preserved for a representative seeded workspace. Plan to keep `resource_user_group_tags` available read-only for one release for incident recovery. The pgTAP suite includes an explicit `migration_diff` test set that loads a snapshot of the pre-migration state, runs the migration, and asserts the per-user effective role for every (actor, resource) pair - any divergence beyond the documented role-translation caveat fails CI.

## 5. `Shared with me` surface

A new workspace-scoped page makes share-only access usable for members without the parent app's permission key.

**Route:** `/_auth/$workspaceSlug/shared-with-me/route.tsx`

**Guard:** workspace membership only. No `permissionKey` requirement.

**Content:** a list of resources where the auth user has an effective role > none via any path *other than* their app role on the parent app. Group by resource type (Datasets, Dashboards). Each item links to the resource's deep view (`/data-manager/{datasetId}` or `/dashboards/{dashboardId}`).

**Deep route guard relaxation:** `/_auth/$workspaceSlug/data-manager/$datasetId` and the dashboard equivalent need to permit users who have a share-derived role but lack `data_sources__can_list_sources` / `dashboards__can_view_dashboard`. The middleware grows a `resourceFallback: { type: ResourceType; idParam: string; minRole: RoleLevel }` option. When set, `RouteMiddleware.BeforeLoad.checkUserPermissions` first checks the configured `permissionKey`; on miss, it calls `util__auth_user_can_access_resource(type, params[idParam], minRole)` and lets the user through if it returns true. This keeps the parent app's permission key as the fast happy path while still admitting share-only users on a per-resource basis.

**UI signal on the deep page:** when the user reaches a resource via the share path (no app role), show a small "Shared with you" banner with a link back to *Shared with me* - they shouldn't be left wondering why the rest of the app is empty.

## 6. Component / file structure

```
src/components/permissions/ShareResourceModal/
├── ShareResourceModal.tsx               # orchestrator; small
├── ShareResourceButton.tsx              # unchanged (modal entry point)
├── ShareAddPrincipalRow.tsx             # the top combobox + role picker + Share button
├── SharePrincipalList.tsx               # list section
├── SharePrincipalRow.tsx                # one row (user or group)
├── ShareGeneralAccess.tsx               # General access dropdown + role picker
├── ShareSummaryLine.tsx                 # plain-language sentence with pills
├── shareCopy.ts                         # canonical user-visible strings
└── shareSummary.ts                      # pure builder: state → summary spans
```

Rationale: today's `ShareResourceModal.tsx` mixes data fetching, mutation wiring, and ~7 sub-controls in one file. Splitting along section boundaries keeps each unit small, tested in isolation, and easy to hold in context for future edits.

`shareSummary.ts` is a pure function (`(state, lookups) => SummarySpans[]`) so the sentence can be unit-tested exhaustively across combinations without rendering.

`shareCopy.ts` centralizes user-visible strings so a docs-or-copy review only has to touch one file.

## 7. Testing strategy

This section is non-negotiable. A share misconfiguration is a data-exposure incident.

### 7.1 RLS / SQL tests (pgTAP)

Cover the full truth table for `util__resource_effective_role` and the SELECT hardening helpers. Each test case is `(actor, resource_state, expected_role)`.

**Actor dimensions** (cartesian product where meaningful):

- Workspace role: owner, Settings Admin, Global Admin matrix, Global Editor, Global Viewer, Custom (data_sources only), Custom (no data_sources), non-member.
- User-group memberships: in *Analytics*, in *Public datasets*, in both, in neither.

**Resource-state dimensions**:

- `is_restricted`: true / false.
- Workspace share: none / viewer / editor / admin.
- User-group shares: none, `Analytics @ Viewer`, `Analytics @ Editor (requires_app_access=true)`, `Analytics @ Editor (requires_app_access=false)`, multiple combinations.
- Direct user shares: none / viewer / editor / admin to the actor / to another user.

For each combination, assert the returned `role_level` against a hand-coded oracle. The oracle implements §3-§4 semantics in plain SQL or in a TypeScript reference so we can dual-check.

Specific cases to call out as named tests:

- `requires_app_access=true` + user with no `data_sources` app role + in the group → **no grant** from this share.
- `requires_app_access=true` + user with `data_sources: viewer` app role + in the group, share is `editor` → grant is **editor** (capped at share role, not bumped).
- `requires_app_access=false` + user with no app role + in the group → grant is the share role.
- Workspace share `viewer` + user with `data_sources: editor` app role + resource is unrestricted → grant is **editor** (`max(viewer, editor)`).
- Restricted + user-group share `editor` + user in the group, no app role → grant is **editor** (restriction does not block explicit shares).
- Restricted + workspace share `viewer` + user is a member without app role → grant is **viewer** (workspace share still applies).

Run `pgTAP` in CI on every PR that touches schema files under `supabase/schemas/15.*`, `supabase/schemas/16.*`, or `supabase/schemas/17.*`.

### 7.2 Client / unit tests

- `shareSummary.test.ts` - exhaustive cases for the summary sentence builder. Snapshot the sentence text and the pill markup for each example in §3.3 and many more.
- `ShareGeneralAccess.test.tsx` - switching `Restricted ↔ Anyone in {AppLabel}` issues the right mutation; role picker visibility follows.
- `SharePrincipalRow.test.tsx` - `Limit to app access` checkbox visible only for `user_group` principals; toggling fires `useUpsertResourceShare` with the new flag.
- `ShareResourceModal.test.tsx` - full modal smoke: open with mock state, add a user share, add a group share with `requires_app_access`, flip general access. Verifies wiring; deep semantics are covered by sub-tests.

### 7.3 Playwright e2e tests

Extend `tests/e2e/dataset-sharing.spec.ts` and `tests/e2e/share-resource-modal.spec.ts` with new flows:

1. **Drive-style flow** - owner shares with a specific user via the unified Add combobox at editor; secondary user can open the dataset and edit.
2. **Restricted flow** - owner sets *General access* to Restricted; secondary user with `data_sources` viewer can no longer see the dataset in the sidebar nor open it directly.
3. **Intersection-on flow** - owner shares with a user-group at editor with `Limit to app access` on; a member of that group **with** `data_sources` access can open and edit; a member of the same group **without** `data_sources` access cannot.
4. **Intersection-off flow** - same setup but `Limit to app access` off; the no-app-access member can open the resource (via the *Shared with me* surface) and edit.
5. **Summary sentence flow** - for each configuration above, assert the on-screen summary sentence contains the expected substrings and pills.
6. **Shared with me flow** - a user with only a share-derived grant can navigate to *Shared with me*, click into the resource, and open it. The deep route grant works even though the app sidebar item is hidden.
7. **Owner row is read-only** - attempting to change the owner's role or remove them is blocked at the UI.

Test data: extend the seeded workspace with at least one user-group (`Analytics`), a Global Viewer who is in the group, and a Global Viewer who is not. The existing `e2eWorkerDb` fixture is the right place to add this.

### 7.4 Regression checklist

Before merging:

- `pnpm test` (unit + integration) green.
- `pnpm test:e2e` green on the new specs and on `permissions-rls-matrix.spec.ts`.
- pgTAP suite green.
- Manual smoke as the dataset owner, a Global Viewer with and without the relevant tag, a member with `data_sources` revoked, and a non-member (should never see anything).

## 8. Rollout

1. Schema migration + RLS function update behind a feature flag (`SHARE_MODAL_V2`) - the flag controls UI only; RLS changes ship immediately because the new column defaults preserve current behavior for un-migrated rows.
2. Ship the new modal under the flag. Internal dogfood on the `avandar-labs` workspace.
3. Run the `resource_user_group_tags` → `resource_shares` backfill in staging; pgTAP truth-table dual-run against pre- and post-migration. Investigate any diff.
4. Run backfill in production during a quiet window. Keep `resource_user_group_tags` available read-only for one release.
5. Flip the flag on for all workspaces.
6. Two weeks later, drop the legacy table.

## 9. Open questions

- Should the summary line live above the controls instead of below? Current placement (below) treats it as a confirmation. Placing it above turns it into a header that the controls modify. Lean: below, but worth A/B-checking with one user.
- Per-row tooltips reference `{AppLabel}` ("Data Sources" or "Dashboards"). For future resource types we should generalize, but no action needed in v1.
- Do we ever want a "share with link" capability for a single resource, like Drive's "Anyone with the link"? Out of scope for this spec; tracked separately if it comes up.

## 10. Out of scope (deferred)

- A new permission tier that *replaces* `data_sources` app role at the resource level. The `Shared with me` page plus existing share semantics covers the same outcome without expanding the data model.
- Cross-workspace shares.
- Per-column or per-row ACLs.
- Public link shares (`is_public`) - separate flag, separate UI.
