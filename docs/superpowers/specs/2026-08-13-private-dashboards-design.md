# Private dashboards - design (umbrella)

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-13
**Related:** `docs/permissions-architecture.md`,
`docs/superpowers/specs/2026-05-17-share-resource-modal-redesign-design.md`,
`supabase/schemas/16.utils.resource-permissions.sql`,
`src/components/permissions/ShareResourceModal/`,
`src/views/DashboardApp/DashboardShareModal/` (P3 replaced
`DashboardEditorView/PublishDashboardModal/`, which no longer exists)

> **This is an umbrella design.** The work is too large for one implementation
> plan, so §8 decomposes it into five phases. Each phase gets its own spec,
> plan, and implementation cycle. Phase 1 has one already:
> `2026-08-13-private-resource-permissions-hardening-design.md`.

---

## 1. Problem

Publishing a dashboard today has exactly one outcome: the whole internet can
read it. `PublishDashboardModal` sets `dashboards.is_public = true`, and the
publish routine copies every dependent dataset (sliced per
`PublishSliceConfig`) into the `published` Supabase Storage bucket, which is
declared `public: true` with an `anon`-readable SELECT policy.

There is no way to publish a dashboard so that only the workspace can see it.
That is the single most requested shape: an internal report, distributed by
link, readable by colleagues, invisible to the public.

Separately, the app already has a Google Drive-style share modal
(`ShareResourceModal`) wired to dashboards, writing `resource_shares` rows and
`dashboards.is_restricted`. It governs who can open the dashboard **inside the
app**. It knows nothing about publishing, and publishing knows nothing about
it. Users therefore manage dashboard access in two unrelated places, and
neither one can express "published, but only for us".

### 1.1 What already exists

| Concern | Where | State |
| --- | --- | --- |
| Drive-style share UI | `src/components/permissions/ShareResourceModal/` | Complete, mounted in the dashboard editor toolbar via `ShareResourceButton` |
| Share persistence | `resource_shares`, `dashboards.is_restricted` | Complete |
| Effective-role resolution | `util__resource_effective_role` | Complete |
| Publish flow | `PublishDashboardModal`, `DashboardClient.publishDashboard` | Public-only |
| Data snapshot | `published` bucket, `PublicDatasetParquetStorageClient` | Public-only, world-readable |
| Public viewer routes | `/d/$slug`, `/public/dashboards/$workspaceSlug/$dashboardId` | Hard-require `is_public` |
| Plan limit storage | `subscriptions.max_shareable_dashboards_allowed` | Column exists, value correct, **never enforced** |

### 1.2 Defects found during design

These are pre-existing and in scope because this feature makes them reachable
or acute.

1. **Deleted dashboards leak their data forever.** The `published` bucket has
   SELECT, INSERT, and UPDATE policies and **no DELETE policy**, and no code
   path removes objects from it. `DeleteDashboardButton` deletes only the row,
   so snapshots stay world-readable at
   `published/dashboards/<dashboardId>/datasets/<datasetId>.parquet`
   indefinitely. There is no unpublish action today, so delete is currently the
   only way to reach this; introducing visibility downgrades makes cleanup
   mandatory.
2. **A `viewer` share opens the full editor.** The dashboards route guard
   admits `viewer` (`dashboards__can_view_dashboard`, or `resourceFallback` at
   `minRole: "viewer"`), and clicking a card navigates to
   `/dashboards/edit/$dashboardId`, which renders the entire Puck editor with
   Save, Publish, and Delete in the toolbar. The writes fail at RLS, but every
   affordance is present.
3. **Shared dashboards are undiscoverable.** The dashboards index route filters
   `owner_id = { eq: userProfile.userId }`, so a dashboard shared with you
   never appears in your list. There is no "shared with me" surface.
4. **Docs diverge from code.** `docs/permissions-architecture.md` §4 step 1
   states that workspace owners short-circuit to `admin` inside
   `util__resource_effective_role`. They do not: that function short-circuits
   only for the resource owner and for `util__is_settings_admin`. Workspace
   owners get access through `util__can_manage_workspace_settings` in the
   SELECT helpers instead.

---

## 2. Goals and non-goals

**Goals**

- A dashboard can be published so that only workspace members can view it,
  with per-person and per-group narrowing through the existing share model.
- Publishing and sharing become **one** surface, reusing `ShareResourceModal`
  and its existing logic. General access ends up with four options: "Only me",
  "Restricted", "Anyone in Dashboards", and "Anyone with the link".
- An owner can make a resource private in one action, rather than setting
  Restricted and then remembering to remove every share by hand.
- A published dashboard's URL does not change when its audience changes.
- Private means private, including from workspace owners and Settings Admins,
  matching Google Drive: an org admin cannot read an employee's private
  document.
- Workspace admins can see **counts** of each member's private resources, and
  can reassign ownership without ever gaining read access.
- The free-plan limit of one shared or public dashboard is actually enforced,
  at the database level.
- No mis-grant ships unlocked by tests. Every permission change is pinned by
  pgTAP, and the storage-policy boundary by an integration test.

**Non-goals**

- No new `role_level` values. `viewer` / `editor` / `admin` combined with
  `resource_shares` and `is_restricted` already expresses everything private
  dashboards need. One new *permission key* is added (§7.G); the role tiers
  are untouched.
- No cross-workspace sharing.
- No per-column ACLs.
- No change to how snapshots are sliced (`PublishSliceConfig` is reused as-is).
- No billing or Polar change. `max_shareable_dashboards_allowed` is already
  stored and already computed correctly by
  `SubscriptionModule.computeSubscriptionLimitsForDB` (free = 1, paid =
  `null`/unlimited). Only enforcement is missing.
- No automatic republish on config change. "Update & republish" stays manual.

---

## 3. Decisions

Each row was decided explicitly during brainstorming. Alternatives considered
are recorded so a future reader does not have to re-litigate them.

| # | Decision | Rejected alternative and why |
| --- | --- | --- |
| D1 | Merge publish into the share modal. One `Share` button; General access grows a third option; slug and slice controls move inline under a "Published data" section. | Keeping two buttons: users would manage access in two places and the two could contradict each other. |
| D2 | Private snapshots go to a **new** private bucket, `published-private`, gated by `util__auth_user_may_select_dashboard`. | Reusing the `workspaces` bucket with a gated prefix works (existing policies all require `foldername[2] = 'datasets'`, so a `dashboards` prefix would not match them), but it puts two security models in one bucket separated only by a path segment, where storage RLS is permissive-OR and any future looser policy silently widens snapshot access. Reading live workspace data instead of snapshotting was also rejected: it would make `PublishSliceConfig` row filters and column projections stop protecting anything. |
| D3 | Add a `visibility` enum; keep `is_public` as a **stored generated column** equal to `visibility = 'public'`. | Dropping `is_public` outright is a cleaner end state but rewrites the anon RLS policy, the partial unique index, the validate-slug edge function, ~15 TS call sites, the pgTAP tests, and the desktop `.gen.sql` mirror in one change, for identical product behavior. A `published_at` timestamp instead of an enum leaves the state machine implicit across two columns. |
| D4 | One URL for every published dashboard: `/d/<slug>`. Anon hitting a workspace-only slug is bounced to sign-in and returned; an authenticated user without access gets "You need access". | A separate auth-gated in-app route is a smaller diff but changes a dashboard's URL when its audience changes, breaking links already pasted in Slack. |
| D5 | Publish stays an explicit button press. General access writes share state immediately; `visibility` flips only when Publish succeeds. | Auto-publishing on audience change removes the review step before data goes out, and the snapshot build is slow and per-dataset fallible, so a dropdown change could half-fail and leave a dashboard marked published with missing datasets. |
| D6 | Super-users lose visibility into resources that are private to their owner, for **both** dashboards and datasets. | Dashboards only: an admin blocked from a private dashboard could usually still read the underlying private dataset and reconstruct it, making the dashboard restriction theatre. |
| D7 | Admins get a per-member **count** of private resources plus an ownership-transfer RPC that grants no read access. | Counts with no action leaves offboarding deadlocked (see §5.2). Allowing delete-without-read is a poor audit story and reassignment already unblocks the foreign key. |
| D8 | Enforce the plan limit with Postgres triggers as the backstop, on `dashboards` **and** `resource_shares`. | Client plus edge-function checks (the existing precedent for `can_add_datasets`) cover only one of the two ways the limit is crossed; see §5.3. |
| D9 | Audit ownership transfers into `usage_analytics_events` as `resource.ownership_transferred`. | A dedicated audit table: the existing one already has `workspace_id`, `user_id`, `event_name`, `app`, and `payload jsonb`, and is insert-only by design. |
| D10 | Ship in four phases, permissions hardening first. | One big change would put storage policies, RLS truth tables, billing enforcement, and a UI rebuild in a single review. Shipping the visible feature first would mean private dashboards launch while admins can still read every one of them. |

---

## 4. Architecture: one predicate, three consumers

The feature pivots on a single new SQL helper. Defining it once and reusing it
is what keeps the permissions change, the plan limit, and the admin screen
consistent with each other by construction.

```sql
/**
 * Whether a resource is private to its owner: restricted, with no share
 * granting any principal other than the owner.
 *
 * `principal_type <> 'user'` is what catches workspace-principal shares,
 * whose `principal_id` is NULL by convention.
 */
util__is_resource_private_to_owner(
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean
  := is_restricted = true
     and not exists (
       select 1
       from public.resource_shares rs
       where rs.resource_type = p_resource_type
         and rs.resource_id = p_resource_id
         and (
           rs.principal_type <> 'user'
           or rs.principal_id <> v_owner_id   -- looked up per resource type,
         )                                    -- as util__resource_effective_role
     )                                        -- already does
```

The helper is deliberately **generic across resource types**, so it knows only
about restriction and shares. It says nothing about publication, because
`datasets` have no `visibility` column. Each consumer therefore composes it with
the visibility condition it needs (§4.2).

| Consumer | Condition |
| --- | --- |
| Phase 1 (§7.F) | Gates the Settings-Admin short-circuit in `util__resource_effective_role` on `not private_to_owner`. That single edit is sufficient; see §4.3. |
| Phase 1 (§7.I) | Counts, per `owner_id`: `private_to_owner and visibility <> 'public'` for dashboards; `private_to_owner` for datasets. |
| Phase 4 (§7.H) | Counts dashboards where `visibility <> 'draft' and (visibility = 'public' or not private_to_owner)`. |

This is also why Phase 1 ships first. The plan limit in Phase 4 is defined as
"published and visible to someone other than the owner". While workspace owners
and Settings Admins retain their unconditional bypass, that predicate is only
an approximation, because in any workspace with a second admin every dashboard
is technically visible to someone else. Narrowing the bypass first makes the
limit exactly true rather than a pragmatic fiction.

### 4.1 Why narrowing, not removing, is the correct Drive semantic

In this permission model `is_restricted = false` **already means "shared with
the whole workspace"**: it is the flag that lets the workspace-wide app-role
default apply to the resource. So an admin reading an unrestricted resource is
reading something its owner opted into sharing workspace-wide, which is exactly
what Drive permits. The only case that violates Drive semantics is a restricted
resource with no shares, which is precisely `private_to_owner`.

Removing the bypass wholesale would also hide other members' *unrestricted*
resources from admins, which is a much larger behavior change and not what was
asked for.

### 4.2 A public dashboard is never private, even when restricted

`is_restricted` and `visibility` are independent columns, so
`visibility = 'public' and is_restricted = true` with no shares is a reachable
state: `util__auth_user_may_select_dashboard` returns true on `is_public`
**before** it ever consults restriction. Such a dashboard is world-readable
while `util__is_resource_private_to_owner` reports `true`.

Left uncorrected this would be a hole in both directions: a free user could
publish a second dashboard to the open internet without it counting against
`max_shareable_dashboards_allowed`, and the admin counts screen would report a
world-readable dashboard as private. Hence the explicit `visibility` terms in
the table above.

The one place needing no correction is `util__auth_user_may_select_dashboard`
itself, whose `is_public` short-circuit already fires before the narrowed
bypass. `util__resource_effective_role` has no such short-circuit, so it must
add `and not is_public` when gating the Settings-Admin bypass. The consequence
there is defensible and intended: an admin retains public *read* access through
the anon policy while losing *edit* rights on a public-but-restricted dashboard
its owner never shared with them.

### 4.3 One short-circuit, not three

An earlier draft of this document called for narrowing three super-user
bypasses. Reading the call order shows that only one edit is needed, because the
other two are already gated by the first.

In both `util__auth_user_may_select_dashboard` and
`util__auth_user_may_select_dataset`, the call sequence is:

```
if not util__auth_user_can_access_resource(<type>, <id>, 'viewer')  -- line 487
  then return false
if util__can_manage_workspace_settings(v_ws) then return true       -- line 495
```

`util__auth_user_can_access_resource` resolves through
`util__resource_effective_role`, which is precisely where the Settings-Admin
short-circuit lives. Narrow that short-circuit and `effective_role` returns
`null` for a private resource, so `can_access_resource` returns false and both
helpers bail at line 487, never reaching their own bypass.

The two `util__can_manage_workspace_settings` lines therefore stay **untouched**.
They remain reachable only for resources that are *not* private to their owner,
where letting an admin through (specifically, past the editor-block that
follows) is the existing and correct behavior.

A related note on workspace owners: they are not short-circuited in
`util__resource_effective_role` at all, so they already cannot read a
restricted-with-no-shares resource unless they are also a Settings Admin. In
practice they always are, because `rpc_workspaces__create_with_owner` assigns
the built-in Global Admin role group at workspace creation. The single edit
therefore covers both super-user paths.

---

## 5. Cross-phase mechanics

### 5.1 Visibility and the generated column

```sql
create type public.dashboard_visibility as enum ('draft', 'workspace', 'public');

alter table public.dashboards
  add column visibility public.dashboard_visibility not null default 'draft';

update public.dashboards
   set visibility = case when is_public then 'public' else 'draft' end;

alter table public.dashboards drop column is_public;
alter table public.dashboards
  add column is_public boolean
    generated always as (visibility = 'public') stored;
```

Because `is_public` becomes derived rather than removed, everything that *reads*
it keeps working with no edit: the "Anon can read public dashboards" policy, the
`is_public` short-circuit inside `util__auth_user_may_select_dashboard`, and
every read-side TS call site. (P1 does edit that same function, but a different
branch: its super-user bypass. The `is_public` line is untouched.)

Two things do change:

- The slug uniqueness index widens, because private dashboards get vanity slugs
  too (D4):
  ```sql
  drop index dashboards__slug_unique_when_public;
  create unique index dashboards__slug_unique_when_published
    on public.dashboards (slug)
    where visibility <> 'draft' and slug is not null;
  ```
  The `dashboards/validate-slug` edge function must widen to match, replacing
  `.eq("is_public", true)`.
- **Supabase codegen emits generated columns in `Row` only, not `Insert` or
  `Update`.** `isPublic` must therefore leave the `Dashboard` `Insert`/`Update`
  model types. Two call sites currently pass `isPublic: false` on insert and
  must stop: `DashboardListView.onCreateDashboard` and
  `SaveToDashboardModal`.

The desktop SQLite mirror under `apps/desktop/migrations/*.gen.sql` is
generated by `apps/desktop/scripts/gen-sqlite-migrations`; regenerate it and
verify with `apps/desktop/scripts/check-sqlite-migrations`.

### 5.2 The offboarding deadlock

`dashboards.owner_id` references `auth.users` with `on delete no action`, and
the schema comment states that a user cannot be removed from a workspace while
they still own a dashboard. Once admins can no longer read private dashboards,
they can no longer reassign or delete them either, so a departing employee's
private dashboards would block their removal permanently.

`rpc_resources__transfer_ownership` resolves this: a security-definer,
admin-gated RPC that reassigns `owner_id` without granting read, writing a
`resource.ownership_transferred` row to `usage_analytics_events`.

One caveat to fix in the same phase: that table's SELECT policy admits only
workspace **owners**, not Settings Admins, so a Settings Admin who performs a
transfer could not read the log back. Widen the policy to
`util__can_manage_workspace_settings`.

### 5.3 The two ways the plan limit is crossed

This is why D8 chose triggers over the existing edge-function precedent.

```
(a) publish a second shared dashboard
      DashboardClient.publishDashboard
      -> could be gated in an edge function

(b) add a share to an ALREADY published self-only dashboard
      ResourceShareClient.upsertResourceShare
      -> direct Postgres write, no edge function in the path
```

Path (b) is not merely a bypass; it is a normal user action. A free user could
publish one self-only dashboard and then simply share it. Triggers on both
`dashboards` (visibility and restriction changes) and `resource_shares`
(insert and update) cover both paths. Note that the count must exclude the row
being modified, and that `DELETE` on `resource_shares` needs no trigger since
removing a share can only reduce the count.

There is no DB-level entitlement enforcement anywhere in the codebase today
(the `subscriptions` table is referenced only by its own schema file), so this
sets a new precedent deliberately.

**Accepted duplication.** The trigger needs SQL equivalents of
`SubscriptionModule.doesSubscriptionGrantEntitlements` (`status in ('active',
'trialing')`) and of the free-plan fallback limit of 1, duplicating
`FeaturePlansConfig` in SQL. This is accepted, pinned by pgTAP, and must carry
a comment cross-referencing the TS source.

### 5.4 Storage routing and downgrade ordering

Both buckets use the same object path, `dashboards/<dashboardId>/datasets/<datasetId>.parquet`,
selected by target visibility:

| Visibility | Bucket | SELECT gate |
| --- | --- | --- |
| `public` | `published` (existing, `public: true`) | anon and authenticated, unconditional |
| `workspace` | `published-private` (new, `public: false`) | `util__auth_user_may_select_dashboard((storage.foldername(name))[2]::uuid)` |
| `draft` | none (objects removed) | n/a |

**DELETE policies are added to both buckets**, fixing defect §1.2.1, and
dashboard deletion cleans up both.

Downgrade ordering is deliberate:

```
1. upload snapshot to the private bucket
2. delete objects from the public bucket
3. flip visibility
```

This prefers transient breakage over transient exposure. If step 2 fails we
retry with the dashboard still marked public but its data gone, so it renders
broken rather than leaving a world-readable copy behind an apparently-closed
door. Cleanup must be idempotent and retriable.

### 5.5 Viewer resolution

```
/d/<slug> loader
  -> getAll({ slug, visibility in ('workspace', 'public') })   -- RLS decides
  -> row found      -> render; metadata.auth = 'public' | 'workspace_published'
  -> empty + anon   -> redirect /signin?redirect=/d/<slug>
  -> empty + authed -> "You need access"
```

There is no route conflict to resolve. `_auth` is a **pathless layout route**
(the `_` prefix contributes no URL segment), so auth is not a routing concept
here at all, just a `beforeLoad` guard attached to that layout. `/d/$slug`
lives outside `_auth` and therefore already serves both audiences: an
authenticated user opening a public `/d/<slug>` link hits that exact route with
no auth check today.

The sign-in-and-return machinery is reused as-is. `/signin` already has a
validated `redirect` search param, and `isValidRedirectPath` already accepts
any internal path except `/invalid-workspace`, so `/d/<slug>` needs no change
there.

Accepted limitation: when anon, RLS cannot distinguish "no such slug" from
"workspace-only slug", so a genuinely nonexistent slug sends anon users through
a pointless sign-in first. Google Drive behaves the same way.

`AvaPageMetadata.auth` gains a third variant, `'workspace_published'`, carrying
both `dashboardId` and `workspaceId`; the Qetl and storage clients select their
bucket from it.

### 5.6 The canonical id URL must not be renamed

`/public/dashboards/<workspaceSlug>/<dashboardId>` reads oddly once it can
serve workspace-only dashboards, and the temptation is to rename it to
something audience-neutral. **Do not.** That path is the stable canonical URL
and is what QR codes encode (see the `PublishDashboardModal` docstring), so
renaming it would break QR codes already printed on flyers and in reports, the
one class of link that cannot be edited after distribution.

It keeps its path and gains the same access branches as `/d/$slug`, retaining
its existing redirect to the vanity URL when a slug is set. If an
audience-neutral path is wanted later, add it as an alias and keep the current
path as a permanent redirect; that is a cosmetic follow-up, not part of this
work.

---

## 6. UX

### 6.1 The merged share modal

```
┌─ Share "Q3 Revenue" ────────────────────────────────────×─┐
│  [ Add people or groups                    ▾ ] [Viewer ▾] │
│                                                            │
│  People with access                                        │
│  ────────────────────────────                             │
│   👤  Pablo (you)                Owner                     │
│   🏷  Health team                Viewer ▾   ☐ Limit    ×   │
│                                                            │
│  General access                                            │
│  ────────────────────────────                             │
│   🏢  [ Anyone in Dashboards ▾ ]        [ Viewer ▾ ]       │
│        • Only me                                           │
│        • Restricted                                        │
│        • Anyone in Dashboards                              │
│        • Anyone with the link          ← sets 'public'     │
│                                                            │
│  ── Published data ───────────────────────────────        │
│   Custom URL     avandar.app/d/[ q3-revenue        ]      │
│   Data slices    2 datasets            [ Configure ]      │
│                                                            │
│   ⓘ Not published yet. Viewers will not see this until    │
│     you publish.                                           │
│                                                            │
│                              [ Cancel ]  [ Publish ]      │
└────────────────────────────────────────────────────────────┘
```

Two axes, deliberately separated (D5): General access writes share state
immediately and selects the *target* visibility; Publish materializes the
snapshot and flips `visibility` from `draft`.

"Anyone with the link" is gated twice: by the new
`dashboards__can_publish_publicly` permission key (§7.G) and by the plan limit
(§7.H). A blocked option renders disabled with an explanatory tooltip, and the
plan case links to upgrade.

### 6.2 Admin private-resource counts

```
Workspace settings → Users → Private resources

┌───────────────────────────────────────────────────────┐
│  Member           Private dashboards   Private datasets│
│  Pablo (you)              2                  5         │
│  Amara                    7                  3  [Reassign]
│  Tobias                   0                  0         │
│                                                        │
│  ⓘ Counts only. Private content is not visible to      │
│    workspace admins.                                   │
└───────────────────────────────────────────────────────┘
```

Backed by a security-definer, admin-gated RPC, because admins cannot `SELECT`
the underlying rows.

---

## 7. Work inventory

Lettered to match the phase table in §8.

**A. Visibility model.** `dashboard_visibility` enum; `visibility` column plus
backfill; `is_public` to stored generated column; widen slug index; widen
validate-slug edge function; `Dashboard.types.ts` (drop `isPublic` from
Insert/Update), `DashboardParsers`, `database.types.ts`, desktop `.gen.sql`;
fix the two insert call sites.

**B. Private snapshot storage.** New `published-private` bucket with four
policies; DELETE policies on both buckets; downgrade and delete cleanup;
bucket-parameterize `PublicDatasetParquetStorageClient`, `PublicQetlClient`,
`LocalPublicDatasetClient`, `LocalPublicDatasetRawDataClient`; third
`AvaPageMetadata.auth` variant plus `getAvaPageMetadataFromDashboard` routing;
`useEnsurePublishedDashboardDatasets` from `isPublic` to `visibility <> 'draft'`.

**C. Merged share surface.** Third `ShareGeneralAccess` option; fold
`VanitySlugField`, `PublishSliceSection`, `PublishedShareLinks`, and
`PublishDashboardStatus` into `ShareResourceModal`; remove
`PublishDashboardButton` from the editor toolbar; `shareCopy` additions.

**D. Viewer URL and routing.** `/d/$slug` loader branches; the same treatment
for the canonical id route, which **keeps its existing path** (§5.6);
`DashboardViewerView` mode handling; route `viewer`-role users to the viewer
rather than the Puck editor (defect §1.2.2).

**E. Discovery.** Drop the `owner_id` filter from the dashboards index route
and let RLS decide; `DashboardCard` badges for yours / shared with you /
published to workspace / public (defect §1.2.3).

**F. Permissions hardening.** `util__is_resource_private_to_owner`; narrow the
Settings-Admin short-circuit in `util__resource_effective_role`, which is
sufficient on its own (§4.3); pgTAP truth-table updates across
`resource_rls_role_matrix.test.sql`,
`rls_datasets_dashboards_manager_writes.test.sql`, and
`rls_phase3_policies.test.sql`; update `docs/permissions-architecture.md`,
including defect §1.2.4.

**G. New permission key.** `dashboards__can_publish_publicly` at the `admin`
tier in `PermissionRegistry`; UI gate on the General access option; server-side
check so the client gate is not the only defense.

**H. Entitlement enforcement.** `can_publish_shareable_dashboard` in
`SubscriptionModule.Permissions`; `maxShareableDashboardsAllowed` added to
`getEffectiveEntitlementLimits`; `canPublishShareableDashboard` predicate;
`hasSubscriptionPermission` branch; `SubscriptionPermissionsClient` query;
trigger function plus triggers on `dashboards` and `resource_shares`; pgTAP.

**I. Admin private-resource surface.** Security-definer RPC for per-user
private counts; `rpc_resources__transfer_ownership`; widen the
`usage_analytics_events` SELECT policy to
`util__can_manage_workspace_settings`; settings UI.

**J. The "Only me" control.** A `ShareGeneralAccess` value derived as
`is_restricted and no non-owner share`, rendered as the top option; the
add-principal row and per-share role selects disabled while it is selected;
`buildShareSummary` gains an "Only you have access" span; a confirmation step
naming how many people lose access.

Selecting it must be **one transaction, not a client-side loop**. Going private
means clearing every non-owner share, and `ResourceShareClient` today exposes
only single-row `deleteResourceShare`. N sequential deletes can fail halfway
and leave a dashboard that reads as private in the UI while other people can
still open it, which is precisely the class of bug P1 exists to remove. Add a
security-definer RPC that sets `is_restricted` and deletes all non-owner shares
atomically, with pgTAP covering the partial-failure case.

Applies to datasets as well as dashboards: `ShareResourceModal` is shared, and
`is_restricted` plus `resource_shares` are resource-type generic.

---

## 8. Phasing

| Phase | Contents | Status | Ships independently because |
| --- | --- | --- | --- |
| **P1** Permissions hardening | F, I | Landed. `2026-08-13-private-resource-permissions-hardening-design.md` | It is a self-contained correctness change with no new product surface, and it makes "private" true before anything invites users to rely on it. Also makes P4's predicate exact (§4). |
| **P1.5** The "Only me" control | J | Landed. `2026-08-13-private-dashboards-only-me-control-design.md` | Gives users a way to *ask for* the guarantee P1 enforces. Needs nothing from the visibility model, so it does not have to wait for P2. |
| **P2** Private publishing core | A, B, D | Landed. `2026-08-14-private-dashboards-publishing-core-design.md` | Behind a feature flag. Delivers the visibility model, the private bucket, the viewer routes, and the bucket cleanup fix without touching the share modal. |
| **P3** Merged share surface | C, E, G | Landed. `2026-08-15-private-dashboards-merged-share-surface-design.md` | Flips the flag on. The Drive-style modal is the only way to *set* workspace visibility, so it lands after P2. |
| **P4** Entitlements | H | Not started | Enforcement is orthogonal to the feature mechanics and carries its own risk (a wrong trigger blocks paying customers). |

Each phase gets its own spec, plan, and implementation cycle. Phase specs live
in `docs/superpowers/specs/`; where a phase spec and this document disagree,
the phase spec is authoritative for the phase that landed it.

### 8.0 Why "Only me" is its own phase

P1 makes private-to-owner a real guarantee, and P1's admin surface (I) reports
on it: Settings Admins can see per-member counts of private resources. But
nothing in P1 through P4 as originally written gives an *owner* a control that
says "make this private". Today the only route is to set Restricted and then
remember to remove every share by hand, and nothing in the UI confirms you
landed on private rather than restricted-with-one-share-left.

That gap is worth its own phase rather than folding it into a neighbour:

- **Not P1.** §8's whole argument for shipping P1 first is that it carries *no
  new product surface*. Adding a destructive control and a new RPC to it
  forfeits that property and reopens a finished review.
- **Not P2.** P2 is explicitly the phase that ships machinery "without touching
  the share modal". This is share-modal work.
- **Not P3.** P3 is gated behind P2's enum, bucket, and routing work, so
  deferring leaves P1's guarantee deliberately unusable for as long as that
  takes. "Only me" depends on none of it: it reads and writes `is_restricted`
  and `resource_shares`, both of which exist today.
- **Not P4.** Unrelated.

The rework cost of landing it early is close to zero. P3 rewrites
`ShareGeneralAccess` regardless (C); with P1.5 in place, P3's edit becomes
three options to four instead of two to three. The RPC below is untouched by
P3.

See item J in §7 for the contents.

### 8.1 How P2 is verified with no UI to set visibility

P2 ships the machinery but not the control that sets `visibility = 'workspace'`,
which arrives with the merged modal in P3. Its tests therefore seed
`visibility` directly through admin or Postgres writes, which is the sanctioned
use of direct-DB setup: pre-UI state that no interface can yet produce. Every
assertion after that setup step still goes through the real request path
(loader, RLS, storage policy), so the coverage is not weakened. Once P3 lands,
the Playwright flow in §9 replaces the seeded setup with real UI actions.

### 8.2 Release note required for P1

P1 is retroactive. On deploy, existing restricted-with-no-shares dashboards and
datasets disappear from workspace-admin view. This is the intended behavior
change, but it will look like data loss to an admin who does not expect it, so
it needs an explicit release note and the admin counts screen (I) shipping in
the same phase to explain where the resources went.

---

## 9. Testing strategy

Mis-grants here are a security incident, so the tests are part of the design,
not a follow-up.

**pgTAP (P1, P4)**

- `util__is_resource_private_to_owner` truth table, including the
  workspace-principal (`principal_id is null`) case and a share whose principal
  *is* the owner.
- The §4.2 case explicitly: a dashboard with `visibility = 'public'` and
  `is_restricted = true` and no shares must count against the plan limit and
  must **not** appear in the admin private-resource counts.
- The narrowed short-circuit: Settings Admin and workspace owner can still read
  unrestricted and explicitly-shared resources, and cannot read
  `private_to_owner` ones, for dashboards **and** datasets. Assert through
  `util__auth_user_may_select_dashboard` / `_dataset` as well as
  `util__resource_effective_role`, since §4.3 relies on the former bailing
  before its own bypass.
- Both entitlement-crossing paths from §5.3, across free / paid / inactive /
  missing subscription.
- `rpc_resources__transfer_ownership`: admin may reassign, non-admin may not,
  and reassignment grants no read.

**Integration (P2)**

Storage policies cannot be covered by pgTAP. A workspace member with no share
must not be able to read a `published-private` object path, and an anon request
must not either. Also assert that a downgrade leaves no object behind in
`published`.

**Vitest (P2, P3, P4)**

Bucket routing from visibility; `/d/$slug` loader branches; the
`canPublishShareableDashboard` predicate; merged-modal state transitions.

**Playwright (P3)**

Publish privately, then: a member with a share sees it; a member without a
share gets "You need access"; an anon visitor is bounced to sign-in and
returned after login; flipping to public keeps the same URL working.

---

## 10. Open questions

None blocking. Deferred details, each to be settled in its phase spec:

- Whether the admin counts screen is a new tab under Workspace settings or a
  section within the existing Users tab (P1).
- Exact copy for the "You need access" page, and whether it offers a
  request-access action (P2 ships the page; request-access is out of scope).
- ~~Whether `DashboardCard` badges need a filter control on the index once
  shared dashboards appear there (P3).~~ **Settled by P3 (§6.3, D-P3-7): no
  filter control.** `DashboardListView` has no search, sort, or pagination, so a
  filter would be the view's first list affordance, added for a volume nobody
  has hit. Badges plus owner-first ordering answer "which of these are mine".
  Recorded tripwire for revisiting: a workspace where a typical member's index
  exceeds roughly two screens, or the first user report of not being able to
  find their own dashboard. Either one makes search the better first move, with
  filter chips after it.

---

## Document maintenance

Update this file when a phase lands and its spec supersedes a section here.
`docs/permissions-architecture.md` is the canonical permissions reference and
must be updated by P1, not by this document.
