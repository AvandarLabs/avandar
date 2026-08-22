# Private dashboards, entitlement enforcement (P4) - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-16
**Umbrella:** `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`
**Predecessors:** P1, P1.5, P2 and P3 all landed on `feat/private-dashboards`
**Related:** `shared/config/FeaturePlansConfig.ts`,
`shared/models/Subscription/SubscriptionModule/SubscriptionModule.ts`,
`supabase/functions/subscriptions/services/hasSubscriptionPermission.ts`,
`src/clients/SubscriptionPermissionsClient.ts`,
`supabase/schemas/07.subscriptions.sql`,
`supabase/schemas/10.dashboards.sql`

---

## 1. Scope

P4 is the last of the umbrella's five phases and covers work item **H**,
entitlement enforcement.

`subscriptions.max_shareable_dashboards_allowed` has existed since the billing
work. The column is populated correctly (free = 1, paid = `null` meaning
unlimited) by `SubscriptionModule.computeSubscriptionLimitsForDB`. **Nothing has
ever read it.** A free workspace can publish as many dashboards as it likes,
to its workspace or to the open internet.

P3 made that reachable in a way it was not before: before P3 a user had to find
the publish modal and could only produce public dashboards; now the share modal
offers workspace publishing as the natural first choice, so the limit is about
to start mattering.

### 1.1 What P4 delivers

| Item            | Summary                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| The predicate   | What "shareable" counts as, in one place, in both SQL and TypeScript                                                    |
| The backstop    | Postgres triggers on `dashboards` and on `resource_shares`, covering both ways the limit is crossed                     |
| The client gate | `can_publish_shareable_dashboard` through the existing permission plumbing, so the UI blocks before the database has to |
| The surface     | The publish action explains the limit and offers an upgrade, reusing the dataset-limit precedent                        |

### 1.2 What P4 does not deliver

- **No billing or Polar change.** The column, its values, and the plan configs
  are all correct already. Only enforcement is missing, which is exactly what
  the umbrella's non-goals said.
- **No new limit.** `maxShareableDashboardsAllowed` keeps its current values.
- **No retroactive cleanup.** A workspace that is already over the limit keeps
  what it has; see §7.
- **No enforcement on datasets or seats.** Those have their own paths and are
  out of scope.

---

## 2. Goals and non-goals

**Goals**

- The free-plan limit of one shareable dashboard is actually enforced, and
  enforced at the database, so it holds for every path including ones that
  never touch an edge function.
- A user who hits the limit is told why, in the surface where they hit it, with
  a way to upgrade. They do not get a raw Postgres error.
- The definition of "shareable" is written once per language and cross
  referenced, so the SQL and the TypeScript cannot drift silently.

**Non-goals**

- No change to `visibility`, `resource_shares`, `is_restricted`, or any
  permission helper P1 through P3 built. P4 counts what they produce.
- No change to the share modal's structure. P4 adds a reason to an existing
  blocked-action mechanism.
- No admin override or per-workspace exception.

---

## 3. Decisions

| #      | Decision                                                                                                                                                                         | Rejected alternative and why                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-P4-1 | A dashboard counts as **shareable** when `visibility = 'public'`, or when `visibility = 'workspace'` and it is not private to its owner.                                         | Counting every non-`draft` row would charge a user for a dashboard they published and then narrowed to themselves, which nobody else can see. Counting `is_restricted` alone is the hole umbrella §4.2 already identified: a public dashboard is world-readable no matter what its share rows say, so it must count unconditionally.                                                                                            |
| D-P4-2 | Enforce with triggers on **both** `dashboards` and `resource_shares`.                                                                                                            | Umbrella D8. The client plus edge-function precedent used by `can_add_datasets` covers only the publish path. Adding a share to an already-published, self-only dashboard is a direct PostgREST write with no function in it, and it is a normal user action rather than an exotic bypass.                                                                                                                                      |
| D-P4-3 | A workspace with **no** subscription row is treated as free tier (limit 1), not denied outright.                                                                                 | `canAddDatasets` returns `false` for a missing subscription, which is right for a client gate but wrong for a trigger: it would make dashboard publishing fail during workspace provisioning, and any future path that creates a workspace before its subscription row. Free-tier fallback matches `getEffectiveEntitlementLimits`, which is the function that already answers "what limits apply".                             |
| D-P4-4 | The triggers exempt the service role and direct psql exactly as P3's publish-publicly trigger does, with the same `current_user <> 'authenticated' or auth.uid() is null` guard. | Two enforcement triggers on the same table with different exemption rules is a trap. P3 already established this shape and learned why `auth.uid()` alone is insufficient (a lingering `request.jwt.claims` survives a switch to `postgres`).                                                                                                                                                                                   |
| D-P4-5 | The UI gate lives on the **publish action**, not on the "Anyone with the link" option. This supersedes P3 §5.3.                                                                  | The limit counts workspace-published dashboards too, not just public ones. Gating only the public option would let a free workspace publish its second _internal_ dashboard through a UI that showed no objection, and be rejected by the trigger with a generic failure. P3's prop was built to carry a second reason for the public option; that reason turns out to belong one level up, on the action both audiences share. |
| D-P4-6 | No trigger on `delete`, and none on the downgrade paths.                                                                                                                         | Removing a share, unpublishing, or making a dashboard private can only reduce the count. Umbrella §5.3 says the same about `resource_shares` deletes. A trigger that fires on a state it can never reject is pure cost.                                                                                                                                                                                                         |
| D-P4-7 | Duplicate the "shareable" predicate in SQL rather than calling out to TypeScript, and pin both with tests.                                                                       | There is no mechanism to share logic between Postgres and the client. The umbrella already accepted this duplication for the status and free-limit values; §5.2 records exactly what is duplicated and where the comments must point.                                                                                                                                                                                           |

---

## 4. What counts as shareable

The whole phase turns on this predicate, so it is stated once, precisely.

A dashboard in a workspace counts against `max_shareable_dashboards_allowed`
when **somebody other than its owner can reach it**:

| Visibility  | Private to owner | Counts  | Why                                                                                                                                                                         |
| ----------- | ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draft`     | either           | No      | Nobody but its editors can open it, which P3 made true in the database as well as the UI.                                                                                   |
| `workspace` | yes              | No      | Published, but every non-owner share was revoked. The owner is the only reader.                                                                                             |
| `workspace` | no               | **Yes** | Colleagues can open it. This is the shape the whole feature exists to sell.                                                                                                 |
| `public`    | yes              | **Yes** | World-readable regardless of share rows. Umbrella §4.2 is explicit that a public dashboard is never private, and that letting restriction hide it from the count is a hole. |
| `public`    | no               | **Yes** | Obviously.                                                                                                                                                                  |

"Private to owner" is P1's existing `util__is_resource_private_to_owner`, which
is `is_restricted` and no non-owner `resource_shares` row. P4 introduces no new
notion of privacy; it consumes that one.

In SQL this becomes `public.util__dashboard_counts_as_shareable(p_dashboard_id)`,
a single `stable` function that both triggers call, so the two can never
disagree about what they are counting.

---

## 5. Enforcement

### 5.1 The two paths, and why one trigger is not enough

Umbrella §5.3, restated with what P3 changed:

```
(a) publish, or widen the audience of, a dashboard
      the share modal's footer -> DashboardClient.publishDashboard
      -> an UPDATE on `dashboards`

(b) add a person or group to an already published, self-only dashboard
      the share modal's people list -> ResourceShareClient.upsertResourceShare
      -> an INSERT or UPDATE on `resource_shares`, no edge function anywhere
```

Path (b) also covers the P1.5 direction in reverse: a dashboard published to
the workspace and then made private with "Only me" drops out of the count, and
adding anyone back puts it in again.

### 5.2 The limit, resolved in SQL

```
util__workspace_max_shareable_dashboards(workspace_id) ->
  subscription row absent                     -> FreePlanLimitsConfig value (1)
  status not in ('active', 'trialing')        -> FreePlanLimitsConfig value (1)
  otherwise                                   -> max_shareable_dashboards_allowed
                                                 (null means unlimited)
```

Two values are duplicated from TypeScript here, and both must carry a comment
naming their source:

- `('active', 'trialing')` duplicates
  `SubscriptionModule.doesSubscriptionGrantEntitlements`.
- The literal `1` duplicates
  `FreePlanLimitsConfig.maxShareableDashboardsAllowed` in
  `shared/config/FeaturePlansConfig.ts`.

This is the accepted duplication from umbrella §5.3, and pgTAP pins both. A
change to either value in TypeScript that is not mirrored here should fail a
test rather than silently diverge.

### 5.3 The check

Both triggers do the same thing, differing only in how they find the dashboard:

1. Exempt the service role and direct psql (D-P4-4).
2. Resolve the dashboard and its workspace.
3. If the row's new state does **not** count as shareable, allow. Narrowing is
   always permitted, which is what makes the limit escapable without support.
4. Resolve the limit. `null` means unlimited, so allow.
5. Count the workspace's other shareable dashboards, **excluding the dashboard
   being modified**, and reject when that count has already reached the limit.

Step 5's exclusion is what makes re-saving, re-publishing, or adding a second
person to an already-counted dashboard free. Without it a free workspace could
publish its one allowed dashboard and then never touch it again.

The error is raised with `errcode = '42501'` and a message the client can
recognise, so the UI can turn it into the limit modal rather than a generic
failure toast.

### 5.4 Cost

The count calls `util__is_resource_private_to_owner` once per candidate row.
Workspaces have tens of dashboards, not thousands, and the trigger fires only
on publication and sharing changes rather than on reads, so this is accepted
rather than optimised. If it ever matters, the fix is a partial index on
`visibility` and a materialised share count, not a looser predicate.

---

## 6. The client side

### 6.1 Through the existing plumbing

Item H's list, unchanged except where P3 moved something:

- `SubscriptionPermission` gains `can_publish_shareable_dashboard`, and
  `SubscriptionModule.Permissions` gains the matching key.
- `getEffectiveEntitlementLimits` gains `maxShareableDashboardsAllowed`,
  falling back to `FreePlanLimitsConfig` exactly as the other two limits do.
- `SubscriptionModule.canPublishShareableDashboard({ subscription,
numShareableDashboardsInWorkspace })` mirrors `canAddDatasets`: `undefined`
  limit means unlimited, and a missing subscription returns `false`, which is
  the conservative client answer and is deliberately stricter than the trigger
  (D-P4-3).
- `hasSubscriptionPermission` gains the branch, counting through the admin
  client with the same predicate as §4.
- `SubscriptionPermissionsClient` gains `canPublishShareableDashboard`.

### 6.2 The surface

Per D-P4-5 the gate is on the publish action. `DashboardShareModal` already
computes a single `isBlockedReason` for the footer, with offline, unsaved
changes, and the two slug states in a precedence chain. The plan limit joins
that chain, and it is the one entry that needs an action rather than a
sentence, because the user can do something about it.

So the footer's blocked state gains an optional call to action, and the modal
renders the existing `DatasetLimitReachedModal` pattern for dashboards: a
dismissible modal that embeds `WorkspaceBillingView` so the user can upgrade
without losing their place. Reuse that component's shape rather than inventing
a second one; only its copy differs.

The check is skipped entirely when the dashboard **already** counts as
shareable, because republishing it consumes no new allowance. A free user must
be able to keep updating the one dashboard they are entitled to.

### 6.3 The share path

Adding a person to a published, self-only dashboard can also cross the limit,
and that write goes straight to PostgREST. The trigger will reject it. The
people list therefore has to recognise the error and show the same limit modal,
rather than the generic "Share failed" toast it shows today.

---

## 7. Workspaces already over the limit

Enforcement is retroactive in the sense that it applies to workspaces that
already exceed the limit, and P4 does nothing to reduce them. The rules above
make that safe:

- Nothing is unpublished or unshared. Existing dashboards keep working.
- Every narrowing operation stays permitted, so a workspace over the limit can
  always get back under it.
- Only the operation that would _add_ a shareable dashboard is refused.

A workspace with three shareable dashboards on the free plan therefore keeps
all three, and simply cannot make a fourth. That is the right trade: the
alternative is either breaking live dashboards or leaving the limit
unenforceable for every workspace that ever crossed it.

The release note has to say this, because support will be asked.

---

## 8. Testing

**pgTAP**

- The predicate: each row of §4's table, including the two `public` rows that
  must count regardless of restriction.
- The limit resolver: no subscription row, an `active` paid row with `null`,
  an `active` free row with 1, and a `canceled` paid row that must collapse to
  the free limit rather than honouring its stored column.
- Path (a): a free workspace publishes its first dashboard to the workspace
  (allowed), then a second (rejected with 42501), then re-publishes the first
  (allowed, because the row being modified is excluded).
- Path (a) again for `public`, since that is the audience the umbrella worried
  about.
- Path (b): a published self-only dashboard plus a share, on a workspace
  already at its limit, is rejected. The same insert on a workspace under the
  limit succeeds.
- Narrowing is always allowed: unpublish, make private, and delete a share, all
  from a workspace that is over the limit.
- A paid workspace with `null` is unlimited across all of the above.
- The service-role exemption, mirroring P3's trigger test.

**Vitest**

- `canPublishShareableDashboard` across the limit boundary, `undefined` limit,
  and missing subscription.
- `getEffectiveEntitlementLimits` returns the free fallback for a lapsed paid
  subscription.
- The footer's blocked-reason precedence, including that the plan reason does
  not fire for a dashboard that already counts.

**Playwright**

One end-to-end: a free workspace with one shareable dashboard tries to publish
a second, sees the limit modal rather than an error toast, and the dashboard
stays unpublished.

---

## 9. Risks

| Risk                                                               | Mitigation                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The SQL and TypeScript definitions of "shareable" drift.           | One SQL function, one TS predicate, cross-referencing comments, and pgTAP covering §4's table so a change on either side has to be deliberate.                                                                                                                     |
| A trigger rejects a legitimate write and blocks a paying customer. | `null` means unlimited and is checked before any counting; every narrowing path is exempt by construction; the service role is exempt. This is the risk the umbrella named when it put entitlements last, and it is why the count excludes the row being modified. |
| The two enforcement triggers on `dashboards` interact.             | Both are `before update`, neither reads the other's result, and P3's naming convention already accounts for a second one. Postgres fires them alphabetically.                                                                                                      |
| A user hits the database error without the UI explaining it.       | §6.2 and §6.3 route both paths to the limit modal, and the error carries a recognisable code. The UI gate is the first line; the trigger is the backstop, not the messenger.                                                                                       |
| Workspaces already over the limit are disrupted.                   | §7. Nothing is removed and every reduction is permitted.                                                                                                                                                                                                           |

---

## 10. Deferred

- **Enforcement counts, surfaced in billing.** A "1 of 1 shareable dashboards
  used" line in `WorkspaceBillingView` would make the limit legible before the
  user hits it. Out of scope here, and cheap once the count function exists.
- **Seat-scaled shareable limits.** Both paid plans are unlimited today, so
  there is nothing to scale.
- **Datasets and seats reaching parity.** Neither has a database backstop; both
  rely on the client and, for datasets, an edge function. P4 sets the precedent
  deliberately (umbrella §5.3) but does not retrofit it.

---

## Document maintenance

This spec supersedes P3's §5.3 on where the plan gate lives: on the publish
action rather than on the "Anyone with the link" option, for the reason in
D-P4-5. Update the umbrella's phase table when P4 lands, which completes the
private-dashboards project.
