# Private resource permissions hardening (P1) - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-13
**Phase:** 1 of 4. Parent: `2026-08-13-private-dashboards-design.md`
**Related:** `docs/permissions-architecture.md`,
`supabase/schemas/16.utils.resource-permissions.sql`,
`supabase/schemas/06.utils.app-role-permissions.sql`,
`src/views/WorkspaceSettingsPage/PrivacyLogTab/`

---

## 1. Problem

A workspace member can mark a dashboard or dataset restricted and share it with
nobody, which reads as "private to me". It is not. `util__resource_effective_role`
short-circuits to `admin` for any Settings Admin in the workspace, so every
Global Admin can open it.

Google Drive sets the expectation this violates: an organisation admin cannot
read an employee's private document. We want the same guarantee, because the
next phase invites users to publish dashboards on the strength of it. Shipping
private publishing while admins can still read everything would make the
feature's central promise untrue on day one.

Closing that hole creates a second problem. `dashboards.owner_id` references
`auth.users` with `on delete no action`, and the schema states a user cannot be
removed from a workspace while they still own a dashboard. Once admins cannot
read private resources they cannot reassign or delete them either, so a
departing employee's private dashboards would block their removal permanently.
This phase must therefore ship an escape hatch alongside the restriction.

### 1.1 Scope

In scope: the permission change for **both** dashboards and datasets, an admin
surface showing per-member private-resource counts, and an ownership-transfer
RPC granting no read access.

Out of scope: everything about publishing. No `visibility` enum, no storage
buckets, no share-modal changes. Those are phases 2 to 4.

---

## 2. Goals and non-goals

**Goals**

- A resource that is restricted with no non-owner shares is readable by its
  owner alone. Not by Settings Admins, not by the workspace owner.
- Unrestricted and explicitly-shared resources keep behaving exactly as they do
  now. This is a narrowing, not a redesign.
- Settings Admins can see how many private resources each member holds, and can
  reassign ownership without gaining read access.
- Offboarding a member who owns private resources remains possible.
- The truth table is pinned by pgTAP before the change ships.
- `docs/permissions-architecture.md` matches the code afterwards, including the
  divergence found during design (§6.4).

**Non-goals**

- No new `role_level` values, no new `app_type`, no new permission keys. This
  phase changes *when* an existing grant applies, not what grants exist.
- No change to the resource-share data model.
- No request-access flow. A user who cannot see a resource sees nothing; there
  is no "ask the owner" affordance.
- No bulk reassignment. One resource at a time is sufficient for offboarding,
  and bulk raises questions (partial failure, undo) this phase does not need.
- No read access for admins under any circumstance, including a documented
  break-glass path. If that is ever wanted it should be a deliberate, audited
  feature, not a side effect of this one.

---

## 3. The predicate

Two functions, added to `supabase/schemas/16.utils.resource-permissions.sql`
next to the helpers that consume them.

### 3.1 `util__has_non_owner_share`

The share-existence half, taking the owner id from the caller so hot RLS paths
do not re-fetch a row they already have.

```sql
/**
 * Whether any share on this resource grants a principal other than its owner.
 *
 * `principal_type <> 'user'` is what catches workspace and user_group
 * principals: workspace shares carry a NULL `principal_id` by convention, so
 * comparing `principal_id` alone would miss them.
 *
 * Deliberately ignores `requires_app_access`. A group share that currently
 * reaches nobody (because no group member holds the app role) is still an
 * expressed intent to share, so the resource is not private.
 *
 * @param p_owner_id The resource's owner, supplied by the caller.
 * @returns True when at least one non-owner share row exists.
 */
create or replace function public.util__has_non_owner_share (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_owner_id uuid
) returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from public.resource_shares rs
    where
      rs.resource_type = p_resource_type and
      rs.resource_id = p_resource_id and
      (
        rs.principal_type <> 'user'::public.share_principal_type or
        rs.principal_id is distinct from p_owner_id
      )
  );
$$;
```

Uses the existing `idx_resource_shares__resource on (resource_type,
resource_id)` index, so no new index is needed.

`is distinct from` rather than `<>` so a NULL `principal_id` on a `user`-type
row (impossible under `resource_shares__principal_shape`, but cheap to be
correct about) does not evaluate to NULL and silently drop the row.

### 3.2 `util__is_resource_private_to_owner`

The public, id-only entry point for consumers that hold no row, namely the
counts RPC and (in phase 4) the entitlement trigger.

```sql
/**
 * Whether a resource is private to its owner: restricted, with no share
 * granting any principal other than the owner.
 *
 * Resource-type generic, so it knows nothing about publication. Dashboards can
 * be `visibility = 'public'` while restricted with no shares, which is
 * world-readable and emphatically not private; callers that care must compose
 * this with their own visibility condition. See parent spec §4.2.
 *
 * @returns True when only the owner has been granted access. False when the
 *   resource does not exist.
 */
create or replace function public.util__is_resource_private_to_owner (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language plpgsql security definer stable
set search_path = public as $$
declare
  v_owner_id uuid;
  v_is_restricted boolean;
begin
  if p_resource_type = 'dashboard' then
    select d.owner_id, coalesce(d.is_restricted, false)
      into v_owner_id, v_is_restricted
    from public.dashboards d where d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select ds.owner_id, coalesce(ds.is_restricted, false)
      into v_owner_id, v_is_restricted
    from public.datasets ds where ds.id = p_resource_id;
  else
    return false;
  end if;

  if v_owner_id is null then
    return false;
  end if;

  if not v_is_restricted then
    return false;
  end if;

  return not public.util__has_non_owner_share (
    p_resource_type, p_resource_id, v_owner_id
  );
end;
$$;
```

---

## 4. The permission change

One edit, in `util__resource_effective_role`. Parent spec §4.3 establishes why
this is sufficient; §4.1 there establishes why narrowing rather than removing is
the correct Drive semantic.

**Current:**

```sql
  if public.util__is_settings_admin (v_workspace_id) then
    return 'admin';
  end if;
```

**After:**

```sql
  -- Settings Admins are admin on everything in the workspace EXCEPT resources
  -- their owner has kept private (restricted, zero non-owner shares). Mirrors
  -- Google Drive: an org admin cannot read an employee's private document.
  --
  -- Public dashboards are never private no matter how `is_restricted` is set,
  -- because the anon policy already exposes them; excluding them here keeps an
  -- admin's edit rights on a dashboard the whole internet can read.
  if public.util__is_settings_admin (v_workspace_id) and (
    v_is_public or
    not (
      v_is_restricted and
      not public.util__has_non_owner_share (
        p_resource_type, p_resource_id, v_owner_id
      )
    )
  ) then
    return 'admin';
  end if;
```

`v_is_restricted` and `v_owner_id` are already in scope from the function's
existing per-type `select`. `v_is_public` is new and must be added to that
`select`: `false` for datasets, `coalesce(d.is_public, false)` for dashboards.
Composing inline rather than calling `util__is_resource_private_to_owner` avoids
a second row fetch in a function that RLS calls per row.

### 4.1 What deliberately does not change

- The **resource-owner** short-circuit above it. An owner is always admin on
  their own resource.
- Both `util__can_manage_workspace_settings` bypasses in
  `util__auth_user_may_select_dashboard` and `_dataset` (parent §4.3).
- The editor-block logic in both `may_select_*` helpers.
- `util__is_settings_admin` and `util__can_manage_workspace_settings`
  themselves. They are used for genuine settings management across
  `07.*.rls.sql`, `18.user_workspace_policies.sql`, and
  `60.rpc_datasets__add_dataset.sql`; this change must not touch those.
- `util__auth_user_meets_min_app_role`, including its workspace-owner
  fast path, which governs INSERT rather than read.

---

## 5. Admin surface

### 5.1 Counts RPC

New file `supabase/schemas/70.rpc_workspaces__private_resource_counts.sql`, one
RPC per file per the declarative-schema convention.

```sql
/**
 * Per-member counts of resources private to that member, for the workspace
 * settings privacy log. Security definer because the caller is forbidden by
 * design from reading the underlying rows.
 *
 * Dashboards additionally require `not is_public`: a public dashboard is
 * world-readable and must never be reported as private (parent spec §4.2).
 *
 * @returns One row per workspace member, including members with zero of each.
 */
create or replace function public.rpc_workspaces__private_resource_counts (
  p_workspace_id uuid
) returns table (
  user_id uuid,
  private_dashboard_count bigint,
  private_dataset_count bigint
) language plpgsql security definer
set search_path = public as $$
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  return query
  select
    wm.user_id,
    (
      select count(*)
      from public.dashboards d
      where d.workspace_id = p_workspace_id
        and d.owner_id = wm.user_id
        and not coalesce(d.is_public, false)
        and public.util__is_resource_private_to_owner (
          'dashboard'::public.resource_type, d.id
        )
    ),
    (
      select count(*)
      from public.datasets ds
      where ds.workspace_id = p_workspace_id
        and ds.owner_id = wm.user_id
        and public.util__is_resource_private_to_owner (
          'dataset'::public.resource_type, ds.id
        )
    )
  from public.workspace_memberships wm
  where wm.workspace_id = p_workspace_id;
end;
$$;
```

It returns counts only. It must never return names, ids, or any other column of
the private resources; that is the whole guarantee.

### 5.2 Ownership-transfer RPC

New file `supabase/schemas/70.rpc_resources__transfer_ownership.sql`.

```sql
/**
 * Reassigns a resource's owner without granting the caller any read access.
 * Security definer so a Settings Admin can act on a row RLS hides from them.
 *
 * Unblocks offboarding: `owner_id` is ON DELETE NO ACTION, so a member who
 * owns private resources cannot otherwise be removed from the workspace.
 *
 * Writes a `resource.ownership_transferred` audit row. Returns nothing, so no
 * private data leaks through the return value.
 */
create or replace function public.rpc_resources__transfer_ownership (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_new_owner_id uuid
) returns void language plpgsql security definer
set search_path = public as $$
```

Behavior, in order:

1. Resolve the resource's `workspace_id` and current `owner_id` by type. Raise
   `no_data_found` when absent.
2. Require `util__can_manage_workspace_settings(workspace_id)`; otherwise raise
   `insufficient_privilege` (`42501`).
3. Require `p_new_owner_id` to be a `workspace_memberships` member of that same
   workspace. This is essential: without it an admin could move a resource to a
   user outside the workspace, which the `dashboards` UPDATE policy's
   `owner_id = any(util__get_workspace_members(...))` check already forbids for
   normal updates, and a security-definer function would otherwise bypass.
4. No-op and return when `p_new_owner_id` already equals the current owner, so
   the audit log records only real transfers.
5. Update `owner_id` **and** `owner_profile_id`. Both `dashboards` and
   `datasets` carry `owner_profile_id uuid not null` referencing
   `user_profiles` with `on delete no action`, so moving `owner_id` alone would
   leave the profile FK pointing at the departing member and the removal would
   stay blocked while the RPC appeared to succeed. Resolve the new owner's
   `user_profiles` row for that workspace and raise if it is missing.
6. Insert into `usage_analytics_events`:
   `event_name = 'resource.ownership_transferred'`, `app` = `dashboards` or
   `data_sources` by type, `user_id = auth.uid()` (the acting admin),
   `payload = { resourceType, resourceId, previousOwnerId, newOwnerId }`.

Step 5's `owner_profile_id` requirement is easy to miss and would leave the
offboarding deadlock unresolved while appearing to succeed.

### 5.3 Audit policy widening

`usage_analytics_events`'s SELECT policy admits only the workspace owner:

```sql
workspace_id is not null and exists (
  select 1 from public.workspaces w
  where w.id = usage_analytics_events.workspace_id
    and w.owner_id = auth.uid ()
)
```

A Settings Admin who is not the workspace owner could therefore perform a
transfer and be unable to read the record of it. Widen to
`public.util__can_manage_workspace_settings(usage_analytics_events.workspace_id)`,
which covers the workspace owner as before plus Settings Admins.

**This one needs a hand-written migration.** `supabase db diff` does not
reliably capture `ALTER POLICY`, so the migration must `drop policy` and
`create policy` explicitly. Update the declarative file in the same change so
the two stay in sync.

### 5.4 UI

A third sub-tab in `PrivacyLogTab`, beside Consent and Clarifications. That
component is a ~29-line tab shell and already exists to show admins metadata
about member activity without exposing content, which is exactly this surface's
purpose.

```
Settings → Privacy log
  [ Consent ]  [ Clarifications ]  [ Private resources ]

  Member            Private dashboards   Private datasets
  Pablo (you)               2                   5
  Amara                     7                   3    [Reassign]
  Tobias                    0                   0

  ⓘ Counts only. Private content is never visible to workspace admins.
```

New `PrivateResourcesPanel` under `PrivacyLogTab/`, following
`ConsentLogPanel` / `ClarificationLogPanel` for structure and loading states.
Reassign opens a modal picking a target member; the row action is hidden when
both counts are zero.

The Members tab (`WorkspaceUsersTab`) gets a targeted addition: when removing a
member fails because they own resources, show why and deep-link to the Privacy
log tab. Detecting this cheaply is possible because the counts RPC is already
workspace-wide, so the tab can read it and pre-empt the failed removal rather
than parsing a database error.

---

## 6. Migration and rollout

### 6.1 Declarative workflow

Per the mandatory declarative-schema workflow:

1. Edit `supabase/schemas/16.utils.resource-permissions.sql` (two new
   functions, one narrowed short-circuit, `v_is_public` added to the per-type
   select).
2. Add `supabase/schemas/70.rpc_workspaces__private_resource_counts.sql` and
   `supabase/schemas/70.rpc_resources__transfer_ownership.sql`, one RPC each.
3. Edit `supabase/schemas/30.usage_analytics_events.sql` for the widened policy.
4. `supabase stop`, then `supabase db diff -f private_resource_permissions`.
5. Hand-write the policy drop/create migration (§5.3), since diff misses
   `ALTER POLICY`.
6. Review the generated migration for unintended destructive changes.

No table or column changes, so `apps/desktop/migrations` needs no regeneration.
Confirm with `apps/desktop/scripts/check-sqlite-migrations`.

### 6.2 Retroactive effect

On deploy, every existing restricted-with-no-shares dashboard and dataset
disappears from Settings Admin view. This is the intended behavior change, but
to an admin it looks like data loss.

Required: a release note, and the Privacy log panel shipping in the **same**
deploy so an admin who notices resources missing has a screen explaining that
they still exist and who owns them. Do not split these across releases.

Worth measuring before deploy, as a rough blast-radius check. The query is
deliberately **self-contained**: it inlines the predicate rather than calling
`util__has_non_owner_share`, because that function does not exist in production
until this phase's migration has run. Read-only, safe to run against production
as-is.

```sql
select kind, count(*)
from (
  select 'dashboard' as kind, d.id, d.owner_id, d.is_restricted
  from public.dashboards d
  where not coalesce(d.is_public, false)
  union all
  select 'dataset', ds.id, ds.owner_id, ds.is_restricted
  from public.datasets ds
) r
where r.is_restricted
  and not exists (
    select 1
    from public.resource_shares rs
    where rs.resource_type::text = r.kind
      and rs.resource_id = r.id
      and (
        rs.principal_type <> 'user'::public.share_principal_type
        or rs.principal_id is distinct from r.owner_id
      )
  )
group by kind;
```

If that count is large, the release note needs to lead with it.

### 6.3 Reversibility

The change is a predicate narrowing with no data migration, so reverting means
restoring the unconditional short-circuit in the declarative file and generating
a new migration. Nothing is destroyed, and the two new functions can be left in
place. The transfer RPC's effects are not automatically reversible: a
reassignment is a real ownership change, which the audit trail records but does
not undo.

### 6.4 Documentation

`docs/permissions-architecture.md` must be updated in this phase, not deferred:

- §2, §3, and §4 must state that the Settings Admin short-circuit does not
  apply to resources private to their owner, and define that term.
- §4 step 1 currently claims workspace owners short-circuit to `admin` inside
  `util__resource_effective_role`. **They do not**; that function short-circuits
  only for the resource owner and for `util__is_settings_admin`. Fix the claim
  rather than the code: workspace owners reach resources through
  `util__can_manage_workspace_settings` in the `may_select_*` helpers and
  through `util__auth_user_meets_min_app_role` for INSERT.
- §9's "Dashboard visible only to me" recipe becomes true as written and should
  say so explicitly, noting admins are also excluded.
- §10's non-goals should record that admin read access to private resources is
  deliberately unavailable.

---

## 7. Testing

### 7.1 pgTAP

Extend `supabase/tests/database/permissions/`. Following the existing style
(`\set ON_ERROR_STOP on`, `begin`, fixture inserts with stable UUID prefixes,
`set local role authenticated` plus `request.jwt.claims` per actor).

New file `util_is_resource_private_to_owner.test.sql`:

| Fixture | Expected |
| --- | --- |
| restricted, zero shares | `true` |
| restricted, one `user` share to a non-owner | `false` |
| restricted, one `user` share whose principal **is** the owner | `true` |
| restricted, one `workspace` share (`principal_id is null`) | `false` |
| restricted, one `user_group` share | `false` |
| restricted, `user_group` share with `requires_app_access = true` and no group member holding the app role | `false` (§3.1: intent to share counts) |
| not restricted, zero shares | `false` |
| nonexistent resource id | `false` |

Run each case for `dashboard` and `dataset`.

Extend `util_resource_effective_role.test.sql`:

| Actor | Resource | Expected |
| --- | --- | --- |
| Settings Admin | restricted, zero shares, owned by another member | `null` |
| Settings Admin | restricted, shared to a third party | `admin` |
| Settings Admin | unrestricted | `admin` |
| Settings Admin | own restricted resource | `admin` (owner path) |
| Settings Admin | dashboard `is_public`, restricted, zero shares | `admin` (§4 `v_is_public`) |
| Workspace owner, not Settings Admin | restricted, zero shares | `null` |
| Resource owner | own restricted resource | `admin` |
| Member with a viewer share | restricted | `viewer` |

Extend `resource_rls_role_matrix.test.sql`,
`rls_datasets_dashboards_manager_writes.test.sql`, and
`rls_phase3_policies.test.sql` wherever they assert a Settings Admin reading
another member's restricted resource. **Expect existing assertions to fail**;
that is the point. Each flipped expectation should gain a comment pointing at
this spec so a future reader does not "fix" it back.

Assert through `util__auth_user_may_select_dashboard` and `_dataset` too, not
only `util__resource_effective_role`. Parent §4.3 relies on those helpers
bailing at their `can_access_resource` gate before reaching their own bypass; if
that call order ever changes, only a test at this level catches it.

New file `rpc_resources__transfer_ownership.test.sql`:

- Settings Admin can transfer; `owner_id` **and** `owner_profile_id` both move,
  asserted for dashboards *and* datasets since both carry the column.
- A plain member cannot: `42501`.
- Transferring to a non-member raises.
- Transferring to the current owner is a no-op and writes no audit row.
- A transfer writes exactly one `resource.ownership_transferred` row with the
  expected payload.
- After transfer, the acting admin still cannot `select` the resource. This is
  the assertion that proves the RPC grants no read.
- The previous owner can then be removed from the workspace, which is the
  deadlock this exists to break.

New file `rpc_workspaces__private_resource_counts.test.sql`:

- Counts are correct per member, and members with zero appear with zero.
- A public-but-restricted dashboard is **excluded** (§4.2).
- A plain member calling it raises `42501`.

### 7.2 Vitest

`PrivateResourcesPanel` rendering, zero-count row action suppression, and the
Members-tab blocked-removal hint.

### 7.3 Playwright

One flow is worth the cost, because it is the guarantee: as a Settings Admin,
confirm a member's private dashboard is not reachable by direct URL and not
present in any list, then confirm the Privacy log shows a count of 1 for that
member, then reassign it and confirm the count moves.

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Admins perceive the change as data loss. | Release note plus the Privacy log panel in the same deploy (§6.2). |
| An admin workflow silently depended on reading members' restricted resources. | The pre-deploy count query in §6.2 sizes the exposure. Nothing in-repo depends on it, but a support or ops habit might. |
| `owner_profile_id` forgotten in the transfer RPC, leaving the offboarding deadlock unresolved while the RPC reports success. Applies to both tables. | Called out in §5.2 step 5 and asserted in pgTAP for dashboards and datasets. |
| Someone later adds a super-user bypass to a `may_select_*` helper above its `can_access_resource` gate, silently reopening the hole. | The §7.1 requirement to assert through the `may_select_*` helpers, not only `effective_role`. |
| Performance regression: `effective_role` runs per row under RLS and now sometimes runs an extra `exists` on `resource_shares`. | The composed predicate short-circuits on `v_is_restricted`, so unrestricted resources (the common case) never run the subquery. The restricted path uses the existing `idx_resource_shares__resource`. |
| Security-definer functions with a wrong `search_path` become an injection vector. | All new functions set `search_path = public`, matching every existing helper. |

---

## 9. Open questions

None blocking.

- Whether `PrivateResourcesPanel` needs sorting or filtering once workspaces
  grow. Deferred: ship the plain table and add it when a workspace makes it
  necessary.
- Whether the reassign modal should default its target to the workspace owner.
  Deferred to implementation; either is defensible.
