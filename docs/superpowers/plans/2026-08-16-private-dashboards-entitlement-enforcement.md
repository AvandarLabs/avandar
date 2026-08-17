# Private dashboards entitlement enforcement (P4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the free plan's limit of one shareable dashboard real, enforced in Postgres, and explained in the UI before the database has to refuse.

**Architecture:** One SQL predicate defines what "shareable" means (public, or workspace-published and not private to its owner), and two `before` triggers consume it: one on `dashboards` for the publish path, one on `resource_shares` for the add-a-person path that never touches an edge function. The same definition is mirrored in TypeScript behind the existing subscription-permission plumbing, so the share modal blocks with an upgrade offer instead of surfacing a database error.

**Tech Stack:** Postgres / Supabase (declarative schema in `supabase/schemas/`), pgTAP, TypeScript, React, Mantine, Lingui, Vitest, Playwright, Deno edge functions.

**Spec:** `docs/superpowers/specs/2026-08-16-private-dashboards-entitlement-enforcement-design.md`

---

## Before you start

Read the spec. This plan implements it and does not repeat its reasoning.

**Where this sits.** P1, P1.5, P2 and P3 have all landed on this branch. A
dashboard's `visibility` is `draft`, `workspace` or `public`; publishing lives
in the share modal; publishing publicly already requires the Dashboards admin
role, enforced by `private.dashboards__enforce_publish_publicly`. P4 adds an
orthogonal gate: how MANY dashboards this workspace may make reachable at all.

**Four repo conventions that will bite you:**

1. **Schema changes are declarative.** Edit `supabase/schemas/*.sql` and
   generate with `pnpm db:new-migration <name>`. Never hand-write a migration
   for `public`/`private` objects.
2. **The local schema has PRE-EXISTING drift.** Every generated migration comes
   out with roughly 880 extra lines of unrelated grants and `analytics.*` view
   churn. Commit ONLY your own statements. `supabase db diff` does not emit
   function ACLs, so carry any `revoke`/`grant` by hand when recreating a
   function that has them.
3. **Use `pnpm db:reset`**, not a bare `supabase db reset`: the bare one skips
   the custom seed script and makes some pgTAP fixtures silently no-op into
   passing.
4. **Run the DB suite as `pnpm test:db`.** It runs the pgTAP suites and then
   the migration upgrade tests. The old workaround of calling
   `supabase test db supabase/tests/database` directly is no longer needed:
   the fragments that failed standalone have moved to
   `supabase/migration-upgrade-tests/`, outside the pgTAP glob.

**Baselines to measure against**

| Suite | Command | Baseline |
| --- | --- | --- |
| Types | `pnpm type-check` | 0 errors |
| Frontend | `pnpm test:frontend` | 257 files / 1618 tests, exit 0 |
| Database | `npx supabase test db supabase/tests/database` | 47 files / 508 tests |
| Lint | `pnpm lint` | exit 0 |
| i18n | `pnpm i18n:check` | exit 0 |

Playwright needs `pnpm fns:serve` running for edge functions.

---

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `supabase/schemas/18.entitlements.dashboards.sql` | The shareable predicate, the limit resolver, the shared guard, and both triggers. Sorts after the tables and helpers it reads |
| `supabase/migrations/<ts>_dashboards_shareable_entitlement.sql` | Generated, trimmed to this phase's statements |
| `supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql` | pgTAP for §4's table and the limit resolver |
| `supabase/tests/database/dashboards/shareable_entitlement_triggers.test.sql` | pgTAP for both enforcement paths |
| `src/views/DashboardApp/DashboardShareModal/ShareableLimitReachedModal.tsx` | The upgrade surface, modelled on `DatasetLimitReachedModal` |
| `src/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit.ts` | Resolves whether this dashboard may consume a new allowance |
| `src/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit.test.tsx` | Vitest for the hook, including the already-counts exemption |
| `tests/e2e/dashboard-shareable-limit.spec.ts` | Playwright: a free workspace's second publish is refused with the modal |

**Modified**

| File | Change |
| --- | --- |
| `shared/models/Subscription/Subscription.types.ts` | `SubscriptionPermission` gains `can_publish_shareable_dashboard` |
| `shared/models/Subscription/SubscriptionModule/SubscriptionModule.ts` | The permission key, `maxShareableDashboardsAllowed` in `getEffectiveEntitlementLimits`, and the `canPublishShareableDashboard` predicate |
| `shared/models/Subscription/SubscriptionModule/SubscriptionModule.test.ts` | Covers the new predicate and limit |
| `supabase/functions/subscriptions/services/hasSubscriptionPermission.ts` | The new `matchLiteral` branch |
| `src/clients/SubscriptionPermissionsClient.ts` | `canPublishShareableDashboard` query |
| `src/views/DashboardApp/DashboardShareModal/DashboardShareModal.tsx` | The plan entry in the blocked-reason chain, and the modal |
| `src/views/DashboardApp/DashboardShareModal/DashboardShareModal.test.tsx` | Covers the plan block and its exemption |
| `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx` | Recognises the trigger's error on the share path |
| `docs/superpowers/specs/2026-08-13-private-dashboards-design.md` | Marks P4 landed, completing the project |

---

## Task 1: The shareable predicate

One function, so the triggers and the tests cannot disagree about what is being
counted.

**Files:**
- Create: `supabase/schemas/18.entitlements.dashboards.sql`
- Test: `supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql`

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql`.
Follow the fixture conventions of
`supabase/tests/database/dashboards/draft_visibility_select_guard.test.sql`:
seed `auth.users`, `workspaces`, `role_groups`, `role_group_app_roles`,
`workspace_memberships`, `user_profiles`, then the dashboards.

Seed one workspace, an owner, and a second member, then five dashboards
covering §4's table, and assert `util__dashboard_counts_as_shareable` for each:

```sql
select plan(6);

-- draft, no shares
select is(
  public.util__dashboard_counts_as_shareable ('f1005001-0000-4000-8000-000000000001'::uuid),
  false,
  'a draft never counts, whatever its shares say'
);

-- workspace, restricted, no non-owner share
select is(
  public.util__dashboard_counts_as_shareable ('f1005002-0000-4000-8000-000000000002'::uuid),
  false,
  'published to the workspace but private to its owner does not count'
);

-- workspace, restricted, one user share
select is(
  public.util__dashboard_counts_as_shareable ('f1005003-0000-4000-8000-000000000003'::uuid),
  true,
  'published to the workspace and shared with someone counts'
);

-- workspace, not restricted
select is(
  public.util__dashboard_counts_as_shareable ('f1005004-0000-4000-8000-000000000004'::uuid),
  true,
  'published to the workspace and unrestricted counts'
);

-- public, restricted, no shares
select is(
  public.util__dashboard_counts_as_shareable ('f1005005-0000-4000-8000-000000000005'::uuid),
  true,
  'public counts even when restricted, because the world can still read it'
);

select is(
  public.util__dashboard_counts_as_shareable ('f1005099-0000-4000-8000-000000000099'::uuid),
  false,
  'an unknown dashboard id does not count rather than raising'
);

select * from finish();
```

Remember the seeding rule P2's constraint enforces: a non-`draft` dashboard
needs a `snapshot_revision`. Copy the pattern from
`draft_visibility_select_guard.test.sql`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx supabase test db supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql`

Expected: FAIL with `function public.util__dashboard_counts_as_shareable(uuid) does not exist`.

- [ ] **Step 3: Write the predicate**

Create `supabase/schemas/18.entitlements.dashboards.sql`:

```sql
/**
 * Whether a dashboard counts against
 * `subscriptions.max_shareable_dashboards_allowed`.
 *
 * A dashboard counts when somebody other than its owner can reach it:
 *
 *   draft                        -> no, nobody outside its editors can open it
 *   workspace + private to owner -> no, every non-owner share was revoked
 *   workspace + shared           -> yes
 *   public                       -> yes, ALWAYS
 *
 * The unconditional `public` arm is load-bearing. A public dashboard is
 * world-readable through the anon policy regardless of its share rows, so
 * letting `is_restricted` hide it from the count would let a free workspace
 * publish unlimited dashboards to the open internet. See the umbrella design
 * section 4.2.
 *
 * Mirrored in TypeScript by the count in `hasSubscriptionPermission`; the two
 * are pinned by pgTAP and by vitest respectively.
 *
 * @returns False for an unknown id, so a deleted row is never counted.
 */
create or replace function public.util__dashboard_counts_as_shareable (
  p_dashboard_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select coalesce(
    (
      select
        d.visibility = 'public'::public.dashboard_visibility or
        (
          d.visibility = 'workspace'::public.dashboard_visibility and
          not public.util__is_resource_private_to_owner (
            'dashboard'::public.resource_type,
            d.id
          )
        )
      from public.dashboards d
      where d.id = p_dashboard_id
    ),
    false
  );
$$;
```

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:new-migration dashboards_shareable_entitlement`

Open the generated file. Keep ONLY the `create or replace function` for
`util__dashboard_counts_as_shareable`; discard the pre-existing drift. You will
extend this same migration in Tasks 2 and 3, so keep track of its filename.

- [ ] **Step 5: Apply and run**

Run: `supabase start && pnpm db:reset && npx supabase test db supabase/tests/database`

Expected: PASS, with 6 new assertions on top of the 508 baseline.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/18.entitlements.dashboards.sql \
        supabase/migrations/*_dashboards_shareable_entitlement.sql \
        supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql
git commit -m "feat(db): define which dashboards count as shareable"
```

---

## Task 2: The limit resolver

**Files:**
- Modify: `supabase/schemas/18.entitlements.dashboards.sql`
- Modify: the migration from Task 1 (regenerate)
- Test: `supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql` (extend)

- [ ] **Step 1: Extend the test**

Add a second workspace per case so the subscription rows do not collide. Raise
`plan(6)` to `plan(10)` and append:

```sql
-- No subscription row at all: free tier, not deny-all.
select is(
  public.util__workspace_max_shareable_dashboards ('f1001002-0000-4000-8000-000000000002'::uuid),
  1,
  'a workspace with no subscription row falls back to the free limit'
);

-- active + free
select is(
  public.util__workspace_max_shareable_dashboards ('f1001003-0000-4000-8000-000000000003'::uuid),
  1,
  'an active free subscription uses its stored limit'
);

-- active + paid, null column meaning unlimited
select is(
  public.util__workspace_max_shareable_dashboards ('f1001004-0000-4000-8000-000000000004'::uuid),
  null,
  'an active paid subscription with a null column is unlimited'
);

-- canceled + paid: must COLLAPSE to free, not honour the stored null
select is(
  public.util__workspace_max_shareable_dashboards ('f1001005-0000-4000-8000-000000000005'::uuid),
  1,
  'a canceled paid subscription collapses to the free limit'
);
```

That last one is the case that matters most: a lapsed paid row still carries
`max_shareable_dashboards_allowed = null`, and reading it directly would grant
unlimited publishing to a workspace that stopped paying.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx supabase test db supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql`

Expected: FAIL, function does not exist.

- [ ] **Step 3: Implement**

Append to `supabase/schemas/18.entitlements.dashboards.sql`:

```sql
/**
 * The workspace's effective shareable-dashboard cap, or null for unlimited.
 *
 * Two values here are duplicated from TypeScript because Postgres cannot call
 * into it. Both are pinned by pgTAP, and both must be changed in step:
 *
 *   ('active', 'trialing') mirrors
 *     SubscriptionModule.doesSubscriptionGrantEntitlements
 *   the literal 1 mirrors
 *     FreePlanLimitsConfig.maxShareableDashboardsAllowed
 *     in shared/config/FeaturePlansConfig.ts
 *
 * A missing subscription row resolves to the free limit rather than to a
 * denial. Denying would break any path that creates a workspace before its
 * subscription row, and it would make this trigger stricter than
 * `getEffectiveEntitlementLimits`, which is the function that already answers
 * "what limits apply".
 *
 * @returns The cap, or null when the workspace may publish without limit.
 */
create or replace function public.util__workspace_max_shareable_dashboards (
  p_workspace_id uuid
) returns integer language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_free_limit constant integer := 1;
  v_status public.subscriptions__status;
  v_max integer;
begin
  select s.subscription_status, s.max_shareable_dashboards_allowed
  into v_status, v_max
  from public.subscriptions s
  where s.workspace_id = p_workspace_id
  limit 1;

  if v_status is null then
    return v_free_limit;
  end if;

  if v_status not in ('active'::public.subscriptions__status,
                      'trialing'::public.subscriptions__status) then
    return v_free_limit;
  end if;

  return v_max;
end;
$$;
```

- [ ] **Step 4: Regenerate the migration and run**

Run: `pnpm db:new-migration dashboards_shareable_entitlement_limit`

Trim to your statement, then:

Run: `supabase start && pnpm db:reset && npx supabase test db supabase/tests/database`

Expected: PASS, 10 assertions in this file.

- [ ] **Step 5: Commit**

```bash
git add supabase/schemas/18.entitlements.dashboards.sql \
        supabase/migrations/*_dashboards_shareable_entitlement_limit.sql \
        supabase/tests/database/dashboards/shareable_entitlement_predicate.test.sql
git commit -m "feat(db): resolve the workspace shareable-dashboard cap"
```

---

## Task 3: Both enforcement triggers

**Files:**
- Modify: `supabase/schemas/18.entitlements.dashboards.sql`
- Create: `supabase/tests/database/dashboards/shareable_entitlement_triggers.test.sql`

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/dashboards/shareable_entitlement_triggers.test.sql`.
Seed a FREE workspace (subscription row with `subscription_status = 'active'`,
`feature_plan_type = 'free'`, `max_shareable_dashboards_allowed = 1`) plus a
second, PAID workspace with `null`.

Cover, at minimum:

```sql
select plan(9);

-- Path (a), the publish path.
select lives_ok(
  $$update public.dashboards set visibility = 'workspace',
      snapshot_revision = gen_random_uuid()
    where id = '<first>'$$,
  'the first shareable dashboard is allowed on the free plan'
);

select throws_ok(
  $$update public.dashboards set visibility = 'workspace',
      snapshot_revision = gen_random_uuid()
    where id = '<second>'$$,
  '42501',
  null,
  'the second shareable dashboard is refused on the free plan'
);

select lives_ok(
  $$update public.dashboards set name = 'renamed', visibility = 'workspace'
    where id = '<first>'$$,
  'republishing the dashboard that already counts is allowed'
);

-- The public audience, which is what the umbrella worried about.
select throws_ok(
  $$update public.dashboards set visibility = 'public',
      snapshot_revision = gen_random_uuid()
    where id = '<second>'$$,
  '42501',
  null,
  'publishing a second dashboard publicly is refused too'
);

-- Path (b), the share path.
select throws_ok(
  $$insert into public.resource_shares
      (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
    values (...'<self_only_published>'..., 'user', '<member>', 'viewer')$$,
  '42501',
  null,
  'sharing a published self-only dashboard is refused at the limit'
);

-- Narrowing is always allowed.
select lives_ok(
  $$update public.dashboards set visibility = 'draft', snapshot_revision = null
    where id = '<first>'$$,
  'unpublishing is allowed even when the workspace is over its limit'
);

-- Unlimited.
select lives_ok(
  $$update public.dashboards set visibility = 'public',
      snapshot_revision = gen_random_uuid()
    where id = '<paid_ws_dashboard_2>'$$,
  'a paid workspace with a null cap is unlimited'
);
```

Add the service-role exemption case, mirroring
`publish_publicly_permission.test.sql`, and one asserting the state actually
changed after an allowed publish rather than only that nothing raised. Zero-row
UPDATEs passing `lives_ok` vacuously has bitten this repo twice; assert the
resulting `visibility` explicitly.

Every mutating statement must run as `authenticated` with a JWT claim set, or
the exemption in Step 3 will skip the trigger and the test will prove nothing.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx supabase test db supabase/tests/database/dashboards/shareable_entitlement_triggers.test.sql`

Expected: FAIL. The `throws_ok` cases fail because nothing raises.

- [ ] **Step 3: Implement the guard and both triggers**

Append to `supabase/schemas/18.entitlements.dashboards.sql`:

```sql
/**
 * Raises when making `p_dashboard_id` shareable would exceed the workspace cap.
 *
 * Shared by both enforcement triggers so the publish path and the share path
 * can never disagree. Allows, rather than raises, in three cases:
 *
 *   - the caller is not an end user (see the exemption below)
 *   - the dashboard's new state does not count as shareable, so narrowing is
 *     always permitted and a workspace over its cap can always get back under
 *   - the cap is null, meaning unlimited
 *
 * The count EXCLUDES the dashboard being modified, which is what makes
 * republishing and re-sharing an already-counted dashboard free.
 */
create or replace function private.dashboards__assert_shareable_within_limit (
  p_dashboard_id uuid
) returns void language plpgsql security definer
set
  search_path = public as $$
declare
  v_workspace_id uuid;
  v_max integer;
  v_count integer;
begin
  -- Same exemption as private.dashboards__enforce_publish_publicly, and for
  -- the same reason: end-user traffic arrives as `authenticated` through
  -- PostgREST, while the service role and direct psql already bypass RLS.
  -- `auth.uid()` alone is not enough, because a psql session that switches to
  -- `postgres` can still carry a leftover `request.jwt.claims`.
  if current_user <> 'authenticated' or auth.uid () is null then
    return;
  end if;

  if not public.util__dashboard_counts_as_shareable (p_dashboard_id) then
    return;
  end if;

  select d.workspace_id into v_workspace_id
  from public.dashboards d
  where d.id = p_dashboard_id;

  if v_workspace_id is null then
    return;
  end if;

  v_max := public.util__workspace_max_shareable_dashboards (v_workspace_id);

  if v_max is null then
    return;
  end if;

  select count(*)::int into v_count
  from public.dashboards d
  where
    d.workspace_id = v_workspace_id and
    d.id <> p_dashboard_id and
    public.util__dashboard_counts_as_shareable (d.id);

  if v_count >= v_max then
    raise exception
      'This workspace''s plan allows % shared or public dashboard(s)', v_max
    using errcode = '42501';
  end if;
end;
$$;

/**
 * Publish path: an UPDATE that makes a dashboard shareable.
 *
 * `after` rather than `before`, because the predicate reads
 * `util__is_resource_private_to_owner`, which needs the row's committed state
 * to be the NEW one for the count to be honest.
 */
create or replace function private.dashboards__enforce_shareable_limit () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  perform private.dashboards__assert_shareable_within_limit (new.id);
  return null;
end;
$$;

create trigger tr__dashboards__enforce_shareable_limit
after insert
or
update of visibility,
is_restricted on public.dashboards for each row
execute function private.dashboards__enforce_shareable_limit ();

/**
 * Share path: an INSERT or UPDATE on `resource_shares` that gives a published
 * self-only dashboard its first non-owner reader.
 *
 * No DELETE trigger: removing a share can only reduce the count.
 */
create or replace function private.resource_shares__enforce_shareable_limit () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  if new.resource_type = 'dashboard'::public.resource_type then
    perform private.dashboards__assert_shareable_within_limit (new.resource_id);
  end if;
  return null;
end;
$$;

create trigger tr__resource_shares__enforce_shareable_limit
after insert
or
update on public.resource_shares for each row
execute function private.resource_shares__enforce_shareable_limit ();
```

Then add the matching `revoke all ... from public, anon, authenticated,
service_role;` for all three functions, following the convention of the
`private.dashboards__*` functions in `10.dashboards.sql`.

Note the `after` timing and the `perform`: an `after` trigger sees the row as
it will be, which is what the privacy predicate needs, and raising from it
still aborts the statement.

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:new-migration dashboards_shareable_entitlement_triggers`

Trim to your statements. `db diff` will not emit the function ACLs, so carry
the three `revoke` lines by hand.

- [ ] **Step 5: Apply and run the whole DB suite**

Run: `supabase start && pnpm db:reset && npx supabase test db supabase/tests/database`

Expected: PASS entirely. Existing fixtures that publish several dashboards in
one workspace may now trip the cap; if any pre-existing test fails, give its
workspace a paid subscription row rather than weakening your trigger, and say
which tests you touched and why.

- [ ] **Step 6: Verify the tests bite**

Revert the `v_count >= v_max` check to `false`, re-run, confirm the `throws_ok`
cases fail, then restore. Report which failed.

- [ ] **Step 7: Commit**

```bash
git add supabase/schemas/18.entitlements.dashboards.sql \
        supabase/migrations/*_dashboards_shareable_entitlement_triggers.sql \
        supabase/tests/database/dashboards/shareable_entitlement_triggers.test.sql
git commit -m "feat(db): enforce the shareable-dashboard plan limit"
```

---

## Task 4: The TypeScript predicate and permission key

**Files:**
- Modify: `shared/models/Subscription/Subscription.types.ts:13`
- Modify: `shared/models/Subscription/SubscriptionModule/SubscriptionModule.ts:36-38,115-131,225-245`
- Test: `shared/models/Subscription/SubscriptionModule/SubscriptionModule.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `SubscriptionModule.test.ts`, following its existing fixture style:

```ts
describe("canPublishShareableDashboard", () => {
  it("allows the first shareable dashboard on the free plan", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: makeSubscription({
          subscriptionStatus: "active",
          maxShareableDashboardsAllowed: 1,
        }),
        numShareableDashboardsInWorkspace: 0,
      }),
    ).toBe(true);
  });

  it("refuses the second", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: makeSubscription({
          subscriptionStatus: "active",
          maxShareableDashboardsAllowed: 1,
        }),
        numShareableDashboardsInWorkspace: 1,
      }),
    ).toBe(false);
  });

  it("treats an undefined limit as unlimited", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: makeSubscription({
          subscriptionStatus: "active",
          maxShareableDashboardsAllowed: undefined,
        }),
        numShareableDashboardsInWorkspace: 99,
      }),
    ).toBe(true);
  });

  it("collapses a lapsed paid subscription to the free limit", () => {
    // The stored column still says unlimited; the status is what decides.
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: makeSubscription({
          subscriptionStatus: "canceled",
          maxShareableDashboardsAllowed: undefined,
        }),
        numShareableDashboardsInWorkspace: 1,
      }),
    ).toBe(false);
  });

  it("refuses when there is no subscription at all", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: undefined,
        numShareableDashboardsInWorkspace: 0,
      }),
    ).toBe(false);
  });
});
```

Use the file's existing subscription factory if it has one; otherwise add a
local `makeSubscription` helper in the same shape as its neighbours.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:frontend shared/models/Subscription/SubscriptionModule/SubscriptionModule.test.ts`

Expected: FAIL, `canPublishShareableDashboard is not a function`.

- [ ] **Step 3: Implement**

In `Subscription.types.ts`:

```ts
export type SubscriptionPermission =
  | "can_add_datasets"
  | "can_invite_users"
  | "can_publish_shareable_dashboard";
```

In `SubscriptionModule.ts`, add the key to the registry:

```ts
  Permissions: registry<SubscriptionPermission>().keys(
    "can_add_datasets",
    "can_invite_users",
    "can_publish_shareable_dashboard",
  ),
```

Widen `getEffectiveEntitlementLimits`'s return type and both branches with
`maxShareableDashboardsAllowed: number | undefined`, taking
`subscription.maxShareableDashboardsAllowed` when entitled and
`FreePlanLimitsConfig.maxShareableDashboardsAllowed` otherwise.

Add the predicate next to `canAddDatasets`, matching its shape exactly:

```ts
  /**
   * Whether the workspace may make one MORE dashboard shareable.
   *
   * "Shareable" means reachable by someone other than the owner: published
   * publicly, or published to the workspace without being private to its
   * owner. The Postgres mirror of this rule is
   * `util__dashboard_counts_as_shareable`, and the two are pinned separately.
   *
   * Callers must not ask this for a dashboard that ALREADY counts, since
   * republishing consumes no new allowance.
   */
  canPublishShareableDashboard: ({
    subscription,
    numShareableDashboardsInWorkspace,
  }: {
    subscription: SubscriptionRead | undefined;
    numShareableDashboardsInWorkspace: number;
  }): boolean => {
    if (subscription) {
      const { maxShareableDashboardsAllowed } =
        SubscriptionModule.getEffectiveEntitlementLimits(subscription);
      return (
        maxShareableDashboardsAllowed === undefined ||
        numShareableDashboardsInWorkspace < maxShareableDashboardsAllowed
      );
    }
    return false;
  },
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test:frontend shared/models/Subscription && pnpm type-check`

Expected: tests PASS. Type-check may fail in
`supabase/functions/subscriptions/services/hasSubscriptionPermission.ts`,
because `matchLiteral` is exhaustive and the new key has no branch. Task 5 adds
it. Report if anything ELSE fails.

- [ ] **Step 5: Commit**

```bash
git add shared/models/Subscription
git commit -m "feat(subscriptions): add the shareable-dashboard entitlement predicate"
```

---

## Task 5: The edge-function branch and the client query

**Files:**
- Modify: `supabase/functions/subscriptions/services/hasSubscriptionPermission.ts:68`
- Modify: `src/clients/SubscriptionPermissionsClient.ts`

- [ ] **Step 1: Add the branch**

The route already validates `permissionType` with
`z.enum(Subscription.Permissions)` (`SubscriptionsRoutes.ts:237`), so the new
key is accepted the moment the registry knows it. Only the handler is missing.

Add to the `matchLiteral` in `hasSubscriptionPermission`:

```ts
    can_publish_shareable_dashboard: async () => {
      // Mirrors util__dashboard_counts_as_shareable. A dashboard counts when
      // someone other than its owner can reach it: public always, workspace
      // only when it is not private to its owner. Drafts never count.
      const { data: dashboards } = await supabaseAdminClient
        .from("dashboards")
        .select("id, visibility, is_restricted")
        .eq("workspace_id", subscription.workspaceId)
        .neq("visibility", "draft")
        .throwOnError();

      if (dashboards === null) {
        return false;
      }

      const candidateIds = dashboards
        .filter((dashboard) => {
          return dashboard.visibility === "workspace" && dashboard.is_restricted;
        })
        .map((dashboard) => {
          return dashboard.id;
        });

      // Only restricted workspace dashboards need the share lookup; public
      // ones count regardless, and unrestricted ones are reachable by default.
      const { data: shares } = await supabaseAdminClient
        .from("resource_shares")
        .select("resource_id")
        .eq("resource_type", "dashboard")
        .in("resource_id", candidateIds.length > 0 ? candidateIds : [""])
        .throwOnError();

      const sharedIds = new Set((shares ?? []).map((share) => {
        return share.resource_id;
      }));

      const numShareable = dashboards.filter((dashboard) => {
        if (dashboard.visibility === "public") {
          return true;
        }
        return !dashboard.is_restricted || sharedIds.has(dashboard.id);
      }).length;

      return Subscription.canPublishShareableDashboard({
        subscription,
        numShareableDashboardsInWorkspace: numShareable,
      });
    },
```

Note the owner-share subtlety: `util__is_resource_private_to_owner` ignores a
share whose principal IS the owner. If `resource_shares` can hold such a row in
this codebase, filter it out here too, and say so in your report. Check before
assuming.

- [ ] **Step 2: Verify types**

Run: `pnpm type-check`

Expected: PASS, zero errors. This is the task that closes Task 4's gap.

- [ ] **Step 3: Add the client query**

In `SubscriptionPermissionsClient.ts`, add to `SubscriptionPermissionQueries`
and to the `queries` object, mirroring `canAddDataset` exactly:

```ts
  /**
   * Backend permission check: whether the workspace may make one more
   * dashboard shareable under its plan.
   */
  canPublishShareableDashboard: (params: {
    subscriptionId: string;
  }) => Promise<{ allowed: boolean }>;
```

```ts
      canPublishShareableDashboard: async ({ subscriptionId }) => {
        const logger = clientLogger.appendName("canPublishShareableDashboard");
        logger.log("Checking can-publish-shareable-dashboard permission", {
          subscriptionId,
        });
        return APIClient.get({
          route: "subscriptions/:subscriptionId/permissions/:permissionType",
          pathParams: {
            subscriptionId,
            permissionType: "can_publish_shareable_dashboard",
          },
        });
      },
```

The `useCanPublishShareableDashboard` hook is generated from that key by
`withQueryHooks`.

- [ ] **Step 4: Verify**

Run: `pnpm type-check && pnpm test:frontend`

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/subscriptions src/clients/SubscriptionPermissionsClient.ts
git commit -m "feat(subscriptions): answer the shareable-dashboard permission"
```

---

## Task 6: Block the publish action and offer the upgrade

**Files:**
- Create: `src/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit.ts`
- Create: `src/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit.test.tsx`
- Create: `src/views/DashboardApp/DashboardShareModal/ShareableLimitReachedModal.tsx`
- Modify: `src/views/DashboardApp/DashboardShareModal/DashboardShareModal.tsx`
- Test: `src/views/DashboardApp/DashboardShareModal/DashboardShareModal.test.tsx`

- [ ] **Step 1: Write the failing hook test**

Create `useShareableDashboardLimit.test.tsx`. Mock
`SubscriptionPermissionsClient.useCanPublishShareableDashboard` and the
current-subscription hook the modal already has access to, then assert:

```tsx
it("does not block a dashboard that already counts as shareable", () => {
  // Republishing consumes no new allowance, so the limit must not apply even
  // when the workspace is at it.
  const { result } = renderHook(() => {
    return useShareableDashboardLimit({
      dashboard: makeDashboard({ visibility: "workspace", isRestricted: false }),
      targetVisibility: "workspace",
    });
  });
  expect(result.current.isBlocked).toBe(false);
});

it("blocks a draft that would become the second shareable dashboard", () => {
  const { result } = renderHook(() => {
    return useShareableDashboardLimit({
      dashboard: makeDashboard({ visibility: "draft", isRestricted: true }),
      targetVisibility: "workspace",
    });
  });
  expect(result.current.isBlocked).toBe(true);
});

it("does not block when the target is draft, because unpublishing is free", () => {
  const { result } = renderHook(() => {
    return useShareableDashboardLimit({
      dashboard: makeDashboard({ visibility: "workspace", isRestricted: false }),
      targetVisibility: "draft",
    });
  });
  expect(result.current.isBlocked).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit.test.tsx`

Expected: FAIL, module not found.

- [ ] **Step 3: Implement the hook**

`useShareableDashboardLimit` answers one question: would applying
`targetVisibility` to this dashboard consume a NEW allowance, and if so, does
the plan have one left?

```ts
/**
 * Whether the plan blocks publishing this dashboard.
 *
 * Returns `isBlocked: false` in the two cases where no allowance is consumed:
 * the target is `draft` (unpublishing is always free, and §7 of the design
 * requires that a workspace over its cap can always get back under), and the
 * dashboard ALREADY counts as shareable, since republishing it changes no
 * count.
 */
```

Compute "already counts" client-side with the same rule as the SQL predicate:
`visibility === "public"`, or `visibility === "workspace"` and the dashboard is
not private to its owner. The modal already knows the sharing state, so read it
from there rather than adding a query; if that is awkward, take it as a
parameter and let `DashboardShareModal` supply it.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test:frontend src/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit.test.tsx`

Expected: PASS, 3 tests.

- [ ] **Step 5: Build the modal**

Create `ShareableLimitReachedModal.tsx`, modelled closely on
`src/views/DataManagerApp/DataImportView/DatasetLimitReachedModal/DatasetLimitReachedModal.tsx`:
a dismissible Mantine `Modal` that embeds `WorkspaceBillingView` so the user
can upgrade in place, with copy naming the shareable-dashboard limit instead of
the dataset one. Read that file first and follow its structure, including how
it branches its message on `subscription.featurePlanType`.

- [ ] **Step 6: Wire it into the footer**

In `DashboardShareModal.tsx`, add the plan entry to the existing
`isBlockedReason` chain. Order matters: offline and unsaved changes still take
precedence, because they block regardless of plan.

```ts
    : limit.isBlocked ?
      t`Your plan allows ${limit.maxAllowed} shared or public dashboard(s).`
```

and render the modal, opened from the blocked button rather than automatically,
so the user is not interrupted before they try to publish.

- [ ] **Step 7: Cover it in the modal test**

Add to `DashboardShareModal.test.tsx`, following its existing offline and
unsaved-changes cases: the plan block disables the publish button with its
reason, and the exemption case does not.

- [ ] **Step 8: Verify**

Run: `pnpm type-check && pnpm test:frontend && npx eslint src/views/DashboardApp/DashboardShareModal`

Expected: all PASS. Then `pnpm i18n:extract` and include the catalogs.

- [ ] **Step 9: Commit**

```bash
pnpm i18n:extract
git add src/views/DashboardApp/DashboardShareModal src/i18n
git commit -m "feat(dashboards): block publishing at the plan limit and offer the upgrade"
```

---

## Task 7: The share path's error, and the sweep

**Files:**
- Modify: `src/components/permissions/ShareResourceModal/ShareResourceModal.tsx`
- Modify: `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`
- Create: `tests/e2e/dashboard-shareable-limit.spec.ts`

- [ ] **Step 1: Recognise the trigger's error on the share path**

Adding a person to a published self-only dashboard can cross the limit, and
that write goes straight to PostgREST with no gate in front of it. Today the
rejection surfaces as the generic "Share failed" toast.

In `ShareResourceModal.tsx`'s `upsertShare` `onError`, detect the entitlement
rejection and show the limit copy instead. Match on the Postgres error code
`42501` together with the message text the trigger raises; do not match on the
message alone, since other policies raise the same code.

Keep it a toast here rather than opening the upgrade modal: the user is in the
middle of a different task, and the design puts the upgrade offer on the
publish action.

- [ ] **Step 2: Write the e2e**

Create `tests/e2e/dashboard-shareable-limit.spec.ts`, modelled on
`tests/e2e/dashboard-workspace-publishing.spec.ts`. The e2e fixture provisions
a workspace with a native free subscription, which is exactly the state this
needs. Seed one already-shareable dashboard, then drive the UI to publish a
second and assert the limit is explained rather than a raw error appearing.

If arranging the fixture's subscription proves awkward, say so and cover the
scenario in pgTAP plus vitest only, rather than writing a flaky spec.

- [ ] **Step 3: Mark P4 landed**

In `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`, mark P4
landed in the phase table with its spec filename, the same way P1, P1.5, P2 and
P3 are marked. That completes the private-dashboards project; note that in the
document's status line.

- [ ] **Step 4: Full sweep**

```bash
pnpm type-check
pnpm test:frontend
pnpm lint
pnpm i18n:check
npx supabase test db supabase/tests/database
```

Report ACTUAL numbers for each, not "all pass".

For Playwright, `pnpm fns:serve` must be running.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add -A
git commit -m "feat(dashboards): explain the plan limit on the share path"
```

---

## Notes for the implementer

**The three places where the reasoning is the point:**

1. **The count excludes the row being modified.** Without that exclusion, a
   free workspace publishes its one allowed dashboard and can then never save
   it again. Every "allowed" case in Task 3's test exists to pin this.

2. **`public` counts unconditionally.** It is tempting to write the predicate
   as "not private to owner" for both audiences, because that reads cleaner. It
   is wrong: a public dashboard is world-readable through the anon policy no
   matter what its share rows say, so restriction would hide it from the count
   while the whole internet reads it. Umbrella §4.2 exists because of this.

3. **Narrowing is never blocked.** Unpublish, make private, and delete a share
   must all work from a workspace that is already over its cap, or a workspace
   that crossed the limit before enforcement existed has no way back.

**Two shapes to confirm against the code as you go:**

- The `after` trigger timing in Task 3 is deliberate, because the privacy
  predicate reads the row and its shares. Confirm with the test that a
  `before`-timed version would actually have been wrong before assuming the
  comment is right; if `before` also works, simplify and say so.
- Task 5's edge-function count reimplements the SQL predicate in TypeScript
  over two queries. If `resource_shares` can contain a row whose principal is
  the dashboard's own owner, that count will disagree with
  `util__is_resource_private_to_owner`, which ignores such rows. Check the
  table's constraints before writing it, and mirror whatever you find.

**What P4 deliberately leaves undone:** no usage counter in the billing view,
no seat-scaled shareable limits (both paid plans are unlimited), and no
database backstop for datasets or seats, which still rely on the client and, for
datasets, an edge function.
