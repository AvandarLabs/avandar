# Private dashboards, publishing core (P2) - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-14
**Umbrella:** `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`
**Predecessors:** `2026-08-13-private-resource-permissions-hardening-design.md` (P1),
`2026-08-13-private-dashboards-only-me-control-design.md` (P1.5), both landed
**Related:** `docs/permissions-architecture.md`,
`supabase/schemas/10.dashboards.sql`, `supabase/schemas/99.storage.sql`,
`src/clients/dashboards/DashboardClient.ts`,
`src/clients/storage/PublicDatasetParquetStorageClient/`,
`src/routes/d/`, `src/routes/public/dashboards/`

---

## 1. Scope

P2 is the third of the umbrella's five phases and covers work items **A**
(visibility model), **B** (private snapshot storage), and **D** (viewer URL and
routing).
It delivers the machinery that makes a workspace-only published dashboard
possible, and none of the interface that lets a user ask for one. That control
is the merged share modal in P3.

### 1.1 What P2 delivers

| Item | Summary |
| --- | --- |
| A | `dashboard_visibility` enum, `visibility` column, `is_public` as a generated column, split slug namespaces, namespace-aware slug validation |
| B | `published-private` bucket and its policies, DELETE policies on both buckets, bucket-parameterized snapshot clients, publish / unpublish / delete transitions |
| D | `/d/<slugOrId>` and `/<workspaceSlug>/d/<slugOrId>` viewer routes, the legacy canonical route reduced to a redirect, viewer-role users routed away from the editor |

It also fixes four defects the design pass turned up. They are in scope because
P2 either rewrites the code that contains them or creates the path that makes
them matter. See §7.

### 1.2 What P2 deliberately does not deliver

- **No control that sets `visibility = 'workspace'`.** The publish path accepts
  a target visibility, but the only caller in P2 is the existing
  `PublishDashboardModal`, which passes `'public'`. P3 wires the rest.
- **No feature flag.** See D-P2-1.
- **No discovery.** Shared and workspace-published dashboards still do not
  appear in the dashboards index; that is item E in P3.
- **No entitlement enforcement.** That is P4.
- **No request-access action** on the access-denied page, per umbrella §10.

### 1.3 What this supersedes in the umbrella design

Two umbrella decisions change here. Both were made with less information than
the code walk provided, and both are recorded in §3 with their reasoning.

- **Umbrella D4 and §5.5** specified one URL for every published dashboard,
  `/d/<slug>`, with a single global slug namespace. P2 splits the namespace
  and the URL by audience. See D-P2-3.
- **Umbrella §5.6** specified that `/public/dashboards/<workspaceSlug>/<dashboardId>`
  keeps its path *and gains the same access branches as the vanity route*. P2
  keeps the path but reduces the route to an unconditional redirect. See
  D-P2-4.

Umbrella §7 item D's bullet "route `viewer`-role users to the viewer rather
than the Puck editor" is delivered here, but only partially: the eventual rule
that viewer-role access requires a published dashboard is deferred to P3. See
§10.

---

## 2. Goals and non-goals

**Goals**

- A dashboard row can express three publication states, and the state machine
  is explicit in one column rather than implied across two.
- A workspace-only snapshot is unreadable by anyone the dashboard is not
  visible to, including anonymous requests, enforced at the storage policy and
  not only in application code.
- Publishing, downgrading, and deleting all leave storage in a state that
  matches the row, or fail loudly in a retriable way. No path leaves a
  world-readable object behind an apparently-closed door.
- A dashboard's vanity URL is unambiguous for every audience, with no
  cross-tenant slug squatting.
- Nothing user-facing changes for public dashboards. Every existing public URL
  keeps resolving, including the ones encoded in printed QR codes.

**Non-goals**

- No change to how snapshots are sliced. `PublishSliceConfig` and
  `DashboardSliceBuilder` are reused untouched.
- No change to `role_level`, `resource_shares`, or `util__resource_effective_role`.
  P1 finished the permission model; P2 consumes it.
- No new permission key. `dashboards__can_publish_publicly` is item G in P3.
- No server-side reconciliation of orphaned storage objects. See §7 D4 and §10.

---

## 3. Decisions

| # | Decision | Rejected alternative and why |
| --- | --- | --- |
| D-P2-1 | Ship P2 with no feature flag. | The umbrella said "behind a feature flag", written before it was settled that P3 owns the only control. Nothing in P2 can produce a `workspace`-visibility dashboard, so a flag would gate an unreachable branch, add a second code path no test exercises through the real UI, and hide the two defect fixes that we want live. P3 introduces the flag alongside the first thing a user can see. |
| D-P2-2 | Ship the publish, unpublish, and delete transitions in P2 even though only `publishDashboard({ visibility: 'public' })` has a caller. | Deferring them to P3 would put the storage state machine and the modal rebuild in one review, which is exactly what the umbrella's phasing exists to prevent. Tested API first, UI second. |
| D-P2-3 | Split the slug namespace and the URL by audience: `/d/<slugOrId>` globally unique for `public`, `/<workspaceSlug>/d/<slugOrId>` unique per workspace for `workspace`. | One global namespace (umbrella D4) lets a workspace-only dashboard, which nobody outside its workspace can see, permanently squat a global slug, invisibly on both sides. Resolving one `/d/<slug>` against the viewer's workspaces was the other option, and it reintroduces ambiguity for a user in two workspaces and cannot work for anonymous viewers at all. The cost, accepted explicitly, is that umbrella D4's promise that the URL never changes with the audience no longer holds; §6.2 mitigates it with cross-redirects. |
| D-P2-4 | `/public/dashboards/<workspaceSlug>/<dashboardId>` becomes an unconditional redirect to `/d/<dashboardId>`, with no loader query. | Giving it the same access branches as the vanity routes (umbrella §5.6) triples the number of places that hold access logic and error copy, for a path we want to delete. As a one-line shim it stays correct by construction and can be removed the day printed QR codes stop mattering. |
| D-P2-5 | `/d/<slugOrId>` and `/<workspaceSlug>/d/<slugOrId>` accept a dashboard id or a slug in the same segment, resolved by UUID shape, and `validateDashboardSlug` rejects UUID-shaped slugs. | Separate id and slug routes keep the legacy path alive forever under a new name. Accepting both without reserving the UUID shape leaves the two namespaces genuinely overlapping, because `SLUG_MAX_LENGTH` is 64 and the slug pattern `^[a-z0-9-]+$` already admits a 36-character UUID. |
| D-P2-6 | Storage writes to both snapshot buckets require edit rights on the dashboard. | The existing `published` policies let any authenticated user overwrite any dashboard's snapshot. P2 rewrites these policies anyway to add DELETE, so the marginal cost of gating them properly is a few lines. See §7 D1. |
| D-P2-7 | `getAvaPageMetadataFromDashboard` takes the rendering surface explicitly instead of inferring it from the row. | Inferring from `isPublic` alone is what makes the editor read a stale snapshot today (§7 D2), and after P2 a wrong inference routes a read to the wrong bucket. The surface is always known at the call site. |
| D-P2-8 | Clean storage before deleting the dashboard row, and abort the delete if cleanup fails. | Deleting the row first is what produced umbrella defect §1.2.1: objects outlive the only record that could locate them. Cleanup-first makes deletion retriable and never leaves an orphan behind a deleted row. It does not survive a crashed client; that residue is documented in §10 rather than closed here. |

---

## 4. The visibility model (item A)

### 4.1 Enum, column, and the generated `is_public`

Per umbrella D3, `is_public` survives as a stored generated column so that
every read-side consumer keeps working untouched: the anon RLS policy, the
`is_public` short-circuits in `util__auth_user_may_select_dashboard` and
`util__resource_effective_role`, and every read-side TypeScript call site.

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

`draft` carries a product meaning beyond "not published": it is the state in
which a dashboard is not ready for anyone but the people who can edit it. §10
records the follow-up that makes that meaning binding for viewer-role users.

`visibility` needs no `check` constraint; the enum is the constraint.

### 4.2 Migration ordering and the RLS dependency

The `Anon can read public dashboards` policy in
`supabase/schemas/17.rls.dashboards.sql` references `is_public`, and Postgres
records that as a real dependency, so the column cannot be dropped while the
policy exists. The unique index `dashboards__slug_unique_when_public` is a
second dependency, and it is being replaced regardless (§4.3).

The plpgsql helpers that read `d.is_public` are **not** dependencies. Postgres
does not track column references inside function bodies, so they need no
drop-and-recreate ceremony. They also need no edit: they read `is_public`,
which still exists with identical semantics.

Migration order:

1. drop policy `Anon can read public dashboards`
2. drop index `dashboards__slug_unique_when_public`
3. create the enum, add `visibility`, backfill
4. drop `is_public`, re-add it as generated
5. recreate the policy verbatim
6. create both slug indexes (§4.3)

`supabase db diff` will not derive this ordering on its own, so the migration
is **hand-written**. The declarative sources in `supabase/schemas/` are still
the source of truth and are edited to their end state; the acceptance check is
that `supabase db diff` returns empty afterwards. This is the same escape hatch
P1 used for its function rewrites, and it is the documented practice when a
diff cannot express a dependency dance.

### 4.3 Two slug namespaces

```sql
-- Vanity slugs for public dashboards are globally unique: `/d/<slug>` must
-- resolve to at most one dashboard for an anonymous visitor, who has no
-- workspace context at all.
create unique index dashboards__slug_unique_when_public
  on public.dashboards (slug)
  where visibility = 'public' and slug is not null;

-- Workspace-only slugs live at `/<workspaceSlug>/d/<slug>`, so they only need
-- to be unique inside their workspace. Scoping them here rather than globally
-- stops a dashboard nobody outside the workspace can see from squatting a
-- name every other tenant then cannot use.
create unique index dashboards__slug_unique_per_workspace_when_internal
  on public.dashboards (workspace_id, slug)
  where visibility = 'workspace' and slug is not null;
```

`draft` rows are unconstrained in both namespaces, matching today's behavior
for non-public dashboards.

The consequence to handle in code: a `workspace -> public` flip moves a slug
between namespaces and can collide with a public slug that did not exist, or
did not matter, while the dashboard was internal. Publish therefore validates
against the **target** namespace before it uploads anything, and fails before
touching storage (§5.5).

### 4.4 Namespace-aware slug validation

`supabase/functions/dashboards/DashboardsRoutes/DashboardsRoutes.ts` currently
checks `.eq("is_public", true)`. It gains a `visibility` field on the request
body and branches:

| Target | Check |
| --- | --- |
| `public` | `slug = $1 and visibility = 'public'`, globally |
| `workspace` | `slug = $1 and visibility = 'workspace' and workspace_id = $2` |

`workspace_id` is **derived from `dashboardId` through the admin client**, never
accepted from the request body. A client-supplied workspace id would let a
caller probe another tenant's slug namespace. A `workspace`-target request with
no `dashboardId` is a validation failure rather than a global check, because
there is no workspace to scope to.

`validateDashboardSlug` gains one rule: a slug matching the UUID shape
`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` returns
`{ isValid: false, reason: "reserved" }`. Without it the id and slug namespaces
genuinely overlap, since `SLUG_MAX_LENGTH` is 64 and `^[a-z0-9-]+$` admits a
36-character UUID. This makes §6.2's shape-based resolution total rather than
heuristic. `DashboardSlugValidationFailure` gains the `reserved` variant, and
`PublishDashboardModal.tsx`, which is where the other failure reasons are
rendered today, gains a matching message. P3 carries that copy into the merged
share modal along with the rest of `VanitySlugField`.

### 4.5 Model and codegen changes

Supabase codegen emits generated columns in `Row` only, never `Insert` or
`Update`. Therefore:

- `shared/models/Dashboard/Dashboard.types.ts`: `visibility: DashboardVisibility`
  joins `DashboardRead`, and `"visibility"` joins the `SetOptional` list on
  `Insert` because the column defaults to `'draft'`. `isPublic` stays on
  `DashboardRead` but must leave `Insert` and `Update`, which today derive from
  it wholesale (`SetOptional<DashboardRead, …>` and `Partial<DashboardRead>`).
  Both therefore become `Omit`-wrapped, and that is what forces the two call
  sites below to change.
- `shared/models/Dashboard/DashboardParsers.ts`: add
  `visibility: z.enum(["draft", "workspace", "public"])`.
- `shared/types/database.types.ts`: regenerated.
- Two insert call sites drop `isPublic: false` and set nothing in its place,
  inheriting the default: `src/views/DashboardApp/DashboardListView/DashboardListView.tsx:112`
  and `src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx:224`.

### 4.6 The desktop SQLite mirror

`apps/desktop/migrations/*.gen.sql` is generated from the Supabase migrations by
`apps/desktop/scripts/gen-sqlite-migrations` via sqlglot. Two constructs in this
migration do not survive the transpile:

- **Enums.** SQLite has none. `visibility` becomes `text`.
- **Stored generated columns.** SQLite supports generated columns, but
  `ALTER TABLE ... ADD COLUMN` accepts only `VIRTUAL`, never `STORED`. The
  mirror declares `is_public` as a `VIRTUAL` generated column, which is
  read-identical for every consumer.

`partition.ts` will not flag either case: `_needsHandEdit` only routes
`ADD CONSTRAINT` and `ALTER COLUMN` statements for review, and these are
`ADD COLUMN`. The hand-edit is therefore deliberate and carries a comment
explaining why the mirror diverges. `apps/desktop/scripts/check-sqlite-migrations`
is the acceptance check.

---

## 5. Private snapshot storage (item B)

### 5.1 The bucket and its policies

New bucket `published-private`, `public: false`. Both buckets use the same
object path, `dashboards/<dashboardId>/datasets/<datasetId>.parquet`, so only
the bucket varies with visibility.

| Visibility | Bucket | SELECT gate |
| --- | --- | --- |
| `public` | `published` | anon and authenticated, path shape only |
| `workspace` | `published-private` | `util__auth_user_may_select_dashboard(<id>)` |
| `draft` | none, objects removed | n/a |

The gate splits by verb rather than using one predicate for all four policies.
Reading a snapshot is exactly "may I see this dashboard"; writing one is
"may I change this dashboard", which is a strictly stronger claim:

- SELECT: `util__auth_user_may_select_dashboard(<id>)`
- INSERT, UPDATE, DELETE: `util__auth_user_can_update_resource('dashboard', <id>)`

`util__auth_user_may_select_dashboard` returns false when `auth.uid()` is null,
so anonymous reads of the private bucket fail without a special case.

Note that this helper short-circuits `true` on `is_public`. That is correct
here and load-bearing in one edge case: if a `workspace -> public` upgrade
fails after uploading to `published` but before clearing `published-private`,
the leftover private objects become readable by any authenticated user. They
contain the same bytes that are already world-readable in `published`, so the
failure widens nothing. §5.5 explains why the ordering is arranged that way.

### 5.2 `util__storage_object_dashboard_id`

The policies need the dashboard id out of the object path, and a bare
`(storage.foldername(name))[2]::uuid` raises on any path whose second segment
is not a UUID, which turns a malformed upload into an error instead of a
denial. A new helper mirrors the existing
`util__storage_object_workspace_id` (`16.utils.resource-permissions.sql:791`)
and fails closed:

```sql
/**
 * Dashboard id embedded in a snapshot object path, or null when the path is
 * not shaped like `dashboards/<uuid>/datasets/<file>`.
 *
 * Returning null rather than raising keeps a malformed path a policy denial
 * instead of a storage error. Mirrors util__storage_object_workspace_id.
 */
create or replace function public.util__storage_object_dashboard_id (
  p_object_name text
) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when split_part(p_object_name, '/', 1) = 'dashboards'
      and split_part(p_object_name, '/', 3) = 'datasets'
      and split_part(p_object_name, '/', 2) ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_object_name, '/', 2)::uuid
    else null
  end;
$$;
```

`99.storage.sql` is the declarative mirror of every `storage.objects` policy
and must be updated in the same change, or the next `supabase db diff` will
write a migration that drops the new policies. Its header documents four
previous occurrences of exactly that.

### 5.3 Tightening the existing `published` bucket

`published` gains the DELETE policy that fixes umbrella defect §1.2.1, and its
INSERT and UPDATE policies are narrowed from "any authenticated user" to
`util__auth_user_can_update_resource('dashboard', <id>)`. See §7 D1 for what
that closes. The SELECT policy is unchanged: the bucket is world-readable by
design and that is what "published publicly" means.

### 5.4 Bucket routing in the clients

`PublicDatasetParquetStorageClient` takes the target visibility rather than a
bucket name, and maps visibility to bucket in one place so no call site can
pick the wrong one:

```ts
/** Visibilities that have a snapshot bucket at all. `draft` has none. */
type PublishedVisibility = Exclude<DashboardVisibility, "draft">;

// The only place that maps visibility to bucket. Callers pass visibility.
const BUCKET_BY_VISIBILITY = {
  public: "published",
  workspace: "published-private",
} as const satisfies Record<PublishedVisibility, string>;
```

Typing the map over `PublishedVisibility` rather than `DashboardVisibility` is
deliberate: a future fourth visibility fails to compile here until someone
decides where its snapshots live.

`uploadDataset`, `downloadDataset`, and `listDatasetIdsForDashboard` all take
it, and a new `deleteDatasetsForDashboard({ dashboardId, visibility })` lists
and removes the dashboard's prefix. Deletion is idempotent: removing objects
that are already gone succeeds.

`PublicQetlClient`, `LocalPublicDatasetClient`, and
`LocalPublicDatasetRawDataClient` thread the same parameter. `PublicQetlClient`'s
`clientCache` is keyed by `dashboardId` today and must also key on visibility,
or a dashboard that changes audience within a session keeps querying the old
bucket.

### 5.5 Transitions

Three operations on `DashboardClient`. Only the first has a caller in P2, and
that caller passes `'public'`.

**`publishDashboard({ dashboardId, visibility, slug, publishConfig })`**

1. Validate the slug against the **target** namespace (§4.4). Fail here, before
   any upload, so a cross-namespace collision never leaves a half-published
   dashboard.
2. Build the sliced snapshots exactly as today.
3. Upload every snapshot to the target visibility's bucket.
4. Delete the dashboard's objects from the other bucket.
5. Flip `visibility`.

**`unpublishDashboard({ dashboardId })`**: delete from both buckets, then set
`visibility = 'draft'`.

**`delete`**: clean both buckets, then delete the row. A cleanup failure aborts
the delete (D-P2-8).

The ordering in steps 3 to 5 is umbrella §5.4's, and it prefers transient
breakage over transient exposure. On a `public -> workspace` downgrade, a
partial failure in step 4 leaves the dashboard still marked public with some of
its data missing, so it renders broken rather than keeping a world-readable
copy behind an apparently-closed door. Every step is retriable and idempotent,
so the fix is to run it again.

### 5.6 Page metadata and query routing

`AvaPageMetadata` gains a third variant:

```ts
| { auth: "workspace_published"; workspaceId: Workspace.Id }
```

`workspace` continues to mean live workspace data; `public` means the public
snapshot; `workspace_published` means the private snapshot. `runStructuredQuery`'s
params union and `DataVizPBlock`'s mapping gain the matching branch, and
`PublicQetlClient` selects its bucket from it.

Per D-P2-7, `getAvaPageMetadataFromDashboard` takes the rendering surface
explicitly:

| Surface | Visibility | `auth` | Data source |
| --- | --- | --- | --- |
| `editor` | any | `workspace` | live |
| `preview` | `draft` | `workspace` | live |
| `preview` | `workspace` | `workspace_published` | private snapshot |
| `preview` | `public` | `public` | public snapshot |
| `published` | `workspace` | `workspace_published` | private snapshot |
| `published` | `public` | `public` | public snapshot |
| `published` | `draft` | unreachable; the loader rejects it first |  |

`editor` is unconditionally live, which is the fix for §7 D2. `preview` shows
what a viewer would see when there is something published to see, and falls
back to live data for a draft, which is what makes it a usable destination for
the viewer-role redirect in §6.6.

`useEnsurePublishedDashboardDatasets` changes its guard from `dashboard.isPublic`
to `dashboard.visibility !== "draft"` and passes visibility through to the
loader.

### 5.7 The local snapshot cache

`LocalPublicDataset` is the IndexedDB cache of dashboard snapshots only. The
workspace dataset cache is a separate table, `LocalDataset`, keyed by
`datasetId` with `userId` and `workspaceId` indexes; it is untouched and never
gains a `dashboardId`.

`LocalPublicDataset` declares `primaryKey: "datasetId"` while storing
`dashboardId` as a secondary index, so two dashboards publishing the same
dataset already overwrite each other's cached slice. §7 D3 covers why P2 has to
fix it. The key becomes compound over the two existing columns, which is Dexie's
`[dashboardId+datasetId]` form, not a concatenated string:

- `LocalPublicDatasetModel`: `primaryKey: ["dashboardId", "datasetId"]`,
  `primaryKeyType: [DashboardId, DatasetId]`.
- `src/clients/dexie/DexieCrudClient.types.ts`: `primaryKey` widens from
  `string` to `string | readonly string[]`, since it only models
  single-column keys today. `AvaDexieVersionManager` emits the compound schema
  string for the array form.
- A new Dexie version 8 (7 is the current maximum in
  `src/db/dexie/dexieVersions/dexieVersions.ts`). The upgrader drops the old
  table rather than migrating it: this is a pure cache of blobs that can be
  re-downloaded, and rows keyed the old way cannot be disambiguated anyway.
- `LocalPublicDatasetRawDataClient` calls `getById({ id: [dashboardId, datasetId] })`,
  and `fetchPublicDatasetToIndexedDB`'s in-flight dedup map keys on both ids.

---

## 6. Viewer URLs and routing (item D)

### 6.1 The URL model

| URL | Audience | Layout | Slug scope |
| --- | --- | --- | --- |
| `/d/<slugOrId>` | public | bare, outside `_auth` | global |
| `/<workspaceSlug>/d/<slugOrId>` | workspace-only | inside `_auth`, app chrome | per workspace |
| `/public/dashboards/<workspaceSlug>/<dashboardId>` | legacy | none, pure redirect | n/a |

Route files become `src/routes/d/$slugOrId.tsx` and
`src/routes/_auth/$workspaceSlug/d/$slugOrId.tsx`. The existing
`src/routes/d/$slug.tsx` is replaced, not kept; the param rename is mechanical.

The workspace-scoped route lives **inside** the `_auth` layout, which buys three
behaviors with no code:

- `_auth`'s `beforeLoad` redirects an anonymous visitor to
  `/signin?redirect=<href>` and returns them after login, which is exactly what
  umbrella §5.5 asked for. `isValidRedirectPath` already admits any internal
  path except `/invalid-workspace`.
- `_auth/$workspaceSlug`'s loader bounces an authenticated non-member to
  `/invalid-workspace`. That is the honest outcome: no share can grant a
  non-member access to a workspace-only dashboard.
- The workspace is warmed into the query cache for the render.

The cost is that internal viewers see the app chrome (`RootLayout mode="workspace"`)
while public viewers get a bare page. That asymmetry is intentional: an internal
viewer is a colleague who benefits from being able to navigate onward, and a
public viewer is not.

### 6.2 Resolving `<slugOrId>`

A strict UUID match is looked up by id; anything else by slug. §4.4's `reserved`
rule is what makes the fork total rather than a guess.

`/d/<slugOrId>` resolves in this order:

1. **UUID shape.** `getById`. A `public` dashboard with a slug redirects to
   `/d/<slug>`, preserving today's canonicalization. A `public` dashboard
   without one renders. A `workspace` dashboard redirects to
   `/<workspaceSlug>/d/<slug ?? id>`, which needs a workspace-slug lookup by
   `workspaceId`.
2. **Otherwise, slug.** Look up the public namespace
   (`slug = $1 and visibility = 'public'`).
3. **Miss.** Try an RLS-filtered lookup across the viewer's workspaces, so a
   link pasted before a `public -> workspace` flip still lands. A public match
   always wins. Exactly one workspace match redirects to
   `/<workspaceSlug>/d/<slug>`. More than one, or none, falls through.
4. **Unresolvable.** Anonymous goes to `/signin?redirect=…`; authenticated gets
   "You need access". A `draft` dashboard resolves the same way: a dashboard
   nobody has published has no viewer URL.

Step 4 means an anonymous visitor who mistypes a slug is sent to sign-in rather
than to a 404. Umbrella §5.5 accepted this: RLS cannot distinguish "no such
slug" from "a slug you cannot see" without leaking the difference, and Google
Drive behaves the same way.

`/<workspaceSlug>/d/<slugOrId>` resolves by id or slug scoped to the workspace,
letting RLS decide. A `public` row redirects to `/d/<slug ?? id>`, so the pair
of routes cross-redirect and a link keeps working through an audience flip in
either direction. A `workspace` row renders. No row yields "You need access",
which is also what a workspace member without a share gets.

### 6.3 The legacy canonical route

```
/public/dashboards/<workspaceSlug>/<dashboardId>  ->  /d/<dashboardId>
```

Unconditional, no loader query, `workspaceSlug` discarded. `/d/<dashboardId>`
then applies §6.2 and forwards a workspace-only dashboard onward, so the worst
case is two hops for a legacy link. All resolution, access branching, and copy
live in one place, and the shim is a single file that can be deleted when the
printed QR codes stop mattering.

Its docstring records why it survives at all: umbrella §5.6, QR codes already
printed on flyers and in reports are the one class of link that cannot be
edited after distribution. The path must not be renamed and the redirect must
not be made conditional.

### 6.4 The access-denied surface

`DashboardViewerView` currently inlines a "You do not have access to this
dashboard" block gated on `mode === "public" && !dashboard.isPublic`. That block
is extracted into one component used by every route that can deny access.

Copy: title "You need access", body "Ask the dashboard's owner to share it with
you." Authenticated users additionally get a "Sign in with a different account"
action, because arriving at an internal link while signed into the wrong account
is the common failure. There is no request-access action; umbrella §10 puts it
out of scope.

### 6.5 `DashboardViewerView`

Its `mode` becomes `"published" | "preview"`, and it stops re-deriving access
from `isPublic`, since the loaders now own that decision and can distinguish the
cases the view cannot. It keeps a `visibility !== "draft"` assertion in
`published` mode as defense in depth. `workspaceSlug` stays, since `preview`
still needs it for the back link.

### 6.6 Routing viewer-role users away from the editor

Umbrella defect §1.2.2: the dashboards route guard admits `minRole: "viewer"`
(`src/routes/_auth/$workspaceSlug/dashboards/route.tsx:12`) and
`edit/$dashboardId.tsx` then renders the full Puck editor with Save, Publish,
and Delete. The writes fail at RLS, but every affordance is present.

`edit/$dashboardId.tsx` gains a `beforeLoad` that calls the existing
`UserClient.canAccessResource({ resourceType: "dashboard", resourceId, minRole: "editor" })`,
the same call `RouteMiddleware` already uses for its resource fallback, and
redirects anyone below `editor` to `/<workspaceSlug>/dashboards/preview/<dashboardId>`.
The preview banner's "Back to editor" button is conditioned on the same check.

Note that `DashboardEditorView`'s existing `isShareOnlyAccess` flag is not the
right signal: it is `!!appRoles && !appRoles.dashboards`, which is about app
roles, so a user who holds a `dashboards` app role but only a viewer share on
this dashboard does not trip it.

In P2 preview is reachable regardless of visibility. §10 records the follow-up.

---

## 7. Defects fixed here

**D1. Any authenticated user can overwrite any published snapshot.**
`99.storage.sql:201-224` gates INSERT and UPDATE on `published` with
`bucket_id = 'published' and (storage.foldername(name))[3] = 'datasets'` and
nothing else. No reference to the dashboard, its workspace, or the caller's
rights. Any signed-in user in any workspace can replace the parquet behind any
published dashboard in the product. Fixed by §5.3, which is a few lines on top
of policies P2 is rewriting anyway.

**D2. Editing a published dashboard previews stale snapshot data.**
`DashboardEditorView.tsx:126` passes `getAvaPageMetadataFromDashboard(dashboard)`
into Puck, and that function keys purely off `dashboard.isPublic`, so the
*editor* for a public dashboard reads the published snapshot instead of live
workspace data. Edits are previewed against whatever was last published. Fixed
by D-P2-7 and the table in §5.6.

**D3. The snapshot cache is keyed by dataset alone.**
`LocalPublicDataset` uses `primaryKey: "datasetId"` while carrying
`dashboardId`, and `fetchPublicDatasetToIndexedDB`'s in-flight map keys the
same way, so two dashboards publishing the same dataset with different slices
collide. This exists today as a wrong-slice bug. After P2 it means a private
dashboard's snapshot can be served into a public dashboard's render, and a
private blob can linger in IndexedDB after a downgrade. It is same-browser,
same-user throughout, so it is a correctness and data-at-rest problem, not
cross-user disclosure. Fixed by §5.7.

**D4. Storage cleanup has no server-side backstop.**
Cleanup is client-driven, so a tab that closes mid-delete orphans objects: this
is umbrella defect §1.2.1 in a new form. P2 orders cleanup before the row delete
and aborts on failure (D-P2-8), which makes deletion retriable and stops
orphans from outliving the row that locates them. Nothing sweeps what a crashed
client leaves behind. That residue is a known gap, recorded in §10, not closed
here: a reconciliation job is a new scheduled surface with its own permissions
story, and P2 already touches RLS, storage policies, and routing.

---

## 8. Testing

Umbrella §8.1 governs setup: P2 ships no control that sets
`visibility = 'workspace'`, so tests seed it through admin or Postgres writes.
That is the sanctioned use of direct-DB setup, pre-UI state no interface can yet
produce. Every assertion after the seed still runs through the real path:
loader, RLS, or storage policy.

**pgTAP**

- Slug namespace truth table: the same slug at `workspace` visibility in two
  workspaces both succeed; a second `public` row with an existing public slug
  fails; `draft` rows are unconstrained in both namespaces; a `workspace -> public`
  flip into a taken global slug fails at the index.
- `util__storage_object_dashboard_id` returns the id for a well-formed path and
  `null` for a wrong prefix, a wrong third segment, a non-UUID second segment,
  and an empty string.

**pgTAP, storage boundary**

`storage.objects` is an ordinary RLS-protected table, so the storage policies
are testable in the same place as everything else. P1 already established the
pattern in
`supabase/tests/database/permissions/storage_private_dataset_guard.test.sql`,
which seeds `storage.objects` rows directly and asserts visibility per role.
The same file shape covers:

- A workspace member with no share cannot see a `published-private` object row.
- A member with a viewer share can.
- Anonymous cannot.
- A non-editor cannot insert or update an object in **either** bucket (D1).
- An editor can delete from both, which is what makes cleanup possible at all.

Umbrella §9 asserted that this boundary "cannot be covered by pgTAP" and called
for an integration test instead. That was written before P1 landed the pattern
above; the pgTAP route is hermetic, transactional, and faster, so P2 uses it.
The one thing pgTAP cannot cover is the client's own cleanup sequencing, which
is covered by vitest against a mocked storage client.

**Vitest**

- Bucket selection from visibility, including `PublicQetlClient`'s cache key.
- All three routes' loader branches: the UUID versus slug fork, both
  cross-redirects, the anonymous sign-in bounce, and the access-denied fall
  through.
- `validateDashboardSlug`'s `reserved` rejection, and the edge function's
  namespace branch including the missing-`dashboardId` failure.
- `getAvaPageMetadataFromDashboard` across all seven rows of §5.6's table.
- The compound-key cache: two dashboards publishing the same dataset keep
  separate rows.

**Playwright**

The viewer-role redirect from editor to preview, which is P2's one
user-reachable behavior change, plus one end-to-end assertion that a
`published-private` object seeded for a workspace dashboard is unreadable by a
member with no share, through the real HTTP storage API rather than through
Postgres. That last one exists because the pgTAP tests prove the *policy* is
right while proving nothing about the bucket actually being private: a bucket
created with `public: true` serves objects through a path that never consults
`storage.objects` RLS at all.

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| The `is_public` swap fails or reorders badly against the anon RLS policy and the slug index. | Hand-written migration with the explicit order in §4.2; acceptance is a clean `supabase db diff`. |
| The SQLite mirror silently diverges, since `partition.ts` does not flag `ADD COLUMN`. | Deliberate hand-edit with a comment, verified by `check-sqlite-migrations`. |
| A `workspace -> public` flip collides in the global slug namespace and half-publishes. | Slug validation against the target namespace runs first, before any upload (§5.5). |
| `99.storage.sql` is not updated with the new policies and the next `db diff` drops them. | Called out in §5.2; the file's own header documents four prior occurrences. |
| Narrowing the `published` write policies breaks an existing publish path. | The only writer is `publishDashboard`, which runs as the acting user on a dashboard they are editing, so `util__auth_user_can_update_resource` is already satisfied. Covered by the integration tests. |
| The Dexie version 8 upgrade drops cached snapshots for every existing user. | Intended. The table is a pure cache of re-downloadable blobs, and old rows cannot be disambiguated. Cost is one re-download per dashboard. |
| A crashed client orphans snapshot objects. | Not closed in P2. See §10. |

---

## 10. Deferred

- **Viewer-role access should require a published dashboard.** P2 routes
  viewer-role users to the preview surface regardless of visibility, because
  blocking them outright before any control exists to publish internally would
  strand the people who have a viewer share today. Once P3 ships the control,
  the rule becomes: a user whose effective role is `viewer` may open a dashboard
  only when `visibility <> 'draft'`. This is what gives `draft` its product
  meaning, that the owner decides when a dashboard is ready for others to see.
- **A reconciliation sweep for orphaned snapshot objects** (§7 D4), covering
  both a crashed client mid-delete and a failed downgrade.
- **Deleting the legacy `/public/dashboards/…` route** once printed QR codes
  encoding it are out of circulation.

---

## Document maintenance

This spec supersedes umbrella §5.5, §5.6, and decision D4 as described in §1.3.
Update the umbrella design when P2 lands so a future reader does not follow the
superseded URL model. `docs/permissions-architecture.md` is owned by P1 and is
not changed here.
