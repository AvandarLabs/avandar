# Private dashboards P1.5: the "Only me" control - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-13
**Related:** `docs/superpowers/specs/2026-08-13-private-dashboards-design.md` (umbrella, §7.J and §8.0),
`docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md` (P1),
`docs/permissions-architecture.md`,
`supabase/schemas/16.utils.resource-permissions.sql`,
`src/components/permissions/ShareResourceModal/`

> **This spec supersedes §7.J of the umbrella design.** Two of that item's
> requirements do not survive contact with the code; see §6.6. Where this
> document and the umbrella disagree, this one wins.

---

## 1. Problem

P1 made "private to owner" a real guarantee: a restricted resource with no
non-owner share is now invisible to Settings Admins and workspace owners, and
P1's admin surface reports per-member counts of exactly those resources.

Nothing gives the **owner** a control that produces that state. Today the only
route is to select `Restricted` in the share modal and then remember to remove
every share by hand, one row at a time. Nothing in the UI confirms you landed
on private rather than restricted-with-one-share-left, and a sequence of
single-row deletes can fail halfway, leaving a resource that reads as locked
down while other people can still open it. That is precisely the class of bug
P1 exists to remove, reintroduced at the layer above it.

### 1.1 What already exists

| Concern | Where | State |
| --- | --- | --- |
| The predicate | `util__is_resource_private_to_owner`, `util__has_non_owner_share` | Complete (P1) |
| The guarantee | Narrowed short-circuit in `util__resource_effective_role` | Complete (P1) |
| Admin visibility into the state | `rpc_workspaces__private_resource_counts`, Private resources panel | Complete (P1) |
| General access dropdown | `ShareGeneralAccess`, two options | Complete, needs a third |
| Share persistence | `resource_shares`, `is_restricted` | Complete |
| Single-row share removal | `ResourceShareClient.deleteResourceShare` | Complete |
| Atomic "clear every share" | nothing | **Missing** |
| Owner-facing "make this private" control | nothing | **Missing** |

---

## 2. Goals and non-goals

**Goals**

- An owner can make a dashboard or dataset private in one action, from the
  surface that already governs its access.
- The action is atomic. It either lands fully or changes nothing; it can never
  half-succeed into a resource that looks private and is not.
- The control cannot be used to lock someone else out of their own resource,
  and cannot be used by an admin to lock themselves out by accident.
- The owner sees, before committing, exactly who loses access.
- The UI's notion of "private" is the same predicate as the database's, pinned
  by the same truth table on both sides.

**Non-goals**

- No visibility model, no publishing, no bucket work. Those are P2.
- No changes to `ShareGeneralAccess`'s existing two options beyond adding a
  third above them. P3 rewrites this component anyway (umbrella §7.C); with
  P1.5 in place that rewrite becomes three options to four instead of two to
  three.
- No badges or filters on dashboard and dataset cards. Umbrella §7.E assigns
  those to P3.
- No warning about downstream dashboards when a dataset goes private. See §7.
- No release note. P1 needed one because it was retroactive; P1.5 adds a
  control and changes nothing that already exists.

---

## 3. Decisions

| # | Decision | Rejected alternative and why |
| --- | --- | --- |
| J1 | Only the resource **owner** may select "Only me". The option renders disabled for everyone else, and the RPC rejects non-owners, so the client gate is not the only defense. | Any resource admin: the action deletes every non-owner share, so a non-owner admin who selects it locks themselves out on the spot. Owner plus Settings Admins is the same footgun, made worse by P1: the admin loses read access permanently and cannot undo it. |
| J2 | Selecting `Restricted` while private writes nothing and flips a **local intent state**: the dropdown shows `Restricted` and the add-people row unlocks. Reopening the modal with still-zero shares shows "Only me" again. | Disabling the `Restricted` option would require the add-people row to stay enabled under "Only me", contradicting the point of the state. Dropping the add-row disable entirely loses the signal that "Only me" is a deliberate locked-down state. |
| J3 | The RPC is `SECURITY INVOKER` with an explicit owner check and a post-condition assert. | `SECURITY DEFINER`, matching every other `rpc_` file in the repo. Rejected because this function never needs to touch a row the caller cannot already see, and definer would force the owner check, the workspace check, and the existence-oracle handling that `rpc_resources__transfer_ownership` documents to be re-derived by hand for a bypass that buys nothing. See §4.1. |
| J4 | Confirmation is a stacked `modals.openConfirmModal`, the pattern `DeleteDashboardButton` and `WorkspaceUsersTab` already use. | An inline confirm strip inside the share modal introduces a second bespoke state machine in a component that already has one. `DangerousActionButton` is a button, and the trigger here is a `Select` option change. |
| J5 | Dataset dependents are out of scope, recorded as a known limitation. | Detecting them means a JSONB scan across every dashboard's `config`, or a new dependency table. Either is materially larger than the rest of P1.5 combined. |

---

## 4. The RPC

New file, `supabase/schemas/70.rpc_resources__make_private.sql`, created through
the declarative schema workflow: edit the schema file, generate the migration,
never hand-write the migration.

```sql
create or replace function public.rpc_resources__make_private (
  p_resource_type public.resource_type,
  p_resource_id  uuid
) returns void language plpgsql
set search_path = public as $$
declare
  v_owner_id     uuid;
  v_workspace_id uuid;
begin
  if p_resource_type = 'dashboard' then
    select d.owner_id, d.workspace_id
      into v_owner_id, v_workspace_id
      from public.dashboards d
     where d.id = p_resource_id
       for update;
  elsif p_resource_type = 'dataset' then
    select ds.owner_id, ds.workspace_id
      into v_owner_id, v_workspace_id
      from public.datasets ds
     where ds.id = p_resource_id
       for update;
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  if v_owner_id is null or v_owner_id <> auth.uid () then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  delete from public.resource_shares rs
   where rs.resource_type = p_resource_type
     and rs.resource_id   = p_resource_id
     and rs.workspace_id  = v_workspace_id
     and (
       rs.principal_type <> 'user'::public.share_principal_type or
       rs.principal_id is distinct from v_owner_id
     );

  if p_resource_type = 'dashboard' then
    update public.dashboards set is_restricted = true where id = p_resource_id;
  else
    update public.datasets   set is_restricted = true where id = p_resource_id;
  end if;

  if public.util__has_non_owner_share (
    p_resource_type, p_resource_id, v_workspace_id, v_owner_id
  ) then
    raise exception 'make_private_incomplete';
  end if;
end;
$$;
```

### 4.1 Why security invoker

`plpgsql` defaults to `SECURITY INVOKER`; the docstring must say so explicitly,
because every other `rpc_` function in this repo is definer and a reader will
assume the same here.

Running as the caller buys three things:

1. **No new privilege surface.** Existing RLS remains the backstop. The share
   `DELETE` policy already requires `util__is_settings_admin` or resource
   `admin`; the resource `UPDATE` policy already requires
   `util__auth_user_can_update_resource`, which is effective role at least
   `editor`. The owner short-circuits to `admin` in
   `util__resource_effective_role`, so the owner passes both.
2. **The existence oracle closes itself.** The dispatch `select` is subject to
   the resource `SELECT` policy, so a row the caller cannot see returns no
   rows, `v_owner_id` is null, and the function raises the same
   `insufficient_privilege` as a genuinely nonexistent id. The reasoning
   `rpc_resources__transfer_ownership` had to write out by hand is structural
   here.
3. **Atomicity comes free.** A function body is one transaction. The two writes
   land together or not at all, which is the entire point of the RPC.

One implementation note that will otherwise surprise: `select ... for update`
on an RLS table applies the `UPDATE` policy's `USING` clause in addition to the
`SELECT` policy. The owner satisfies both, so this is correct as written, but it
means the lock is not free of policy evaluation.

### 4.2 The post-condition

The `DELETE` is RLS-filtered. If any policy silently skipped a row, the function
would return success on a still-shared resource: exactly the failure mode P1.5
exists to remove, now with the app's blessing. The final check reuses P1's
`util__has_non_owner_share` rather than re-deriving the predicate, and raises so
the transaction rolls back.

`util__has_non_owner_share` is currently `revoke`d from `authenticated`. P1.5
grants `execute` on it to `authenticated`. It is `security definer stable` and
returns a single boolean about a resource the caller has just been proven to
own, so the grant leaks nothing.

`make_private_incomplete` is not expected to fire in any known configuration. It
is a tripwire, and the pgTAP suite proves it rolls back rather than proving it
never triggers.

### 4.3 Ordering

Shares are deleted first, restriction is set second.

This is not load-bearing while the gate is owner-only: the owner short-circuit
in `util__resource_effective_role` does not read `is_restricted`, so the
caller's rights are unaffected by the ordering. It is written this way because
if J1 is ever widened past the owner, setting `is_restricted` first would revoke
the caller's own `DELETE` rights partway through the function.

### 4.4 Accepted race

A concurrent `resource_shares` insert that commits **after** the post-condition
check leaves a private-looking resource carrying one share. `for update` on the
resource row serializes concurrent `make_private` calls against each other but
does not close this, because share writers do not lock the resource row.

Accepted, for two reasons. Only a resource admin can insert a share, and once
this transaction commits, the `resource_shares` INSERT policy
(`util__auth_user_can_access_resource(..., 'admin')`) returns false for every
non-owner on a now-private resource. The window is therefore a single in-flight
transaction by an admin who held rights a moment earlier. Closing it properly
means locking the resource row from the share write path, which would put a
serialization point on every ordinary share edit to defend against a race no
user can realistically drive.

---

## 5. Client layer

One new member on `ResourceShareClient`, which is already the shares client; no
new client. It follows the `PrivateResourceAdminClient` shape: `p_`-prefixed
arguments, rethrow `error.message`.

```ts
makeResourcePrivate: async (options: {
  resourceType: ResourceType;
  resourceId: string;
}): Promise<void>
```

Registered in `mutationFns` so it invalidates `getResourceSharingState` exactly
like its siblings. `workspaceId` is not a parameter: the RPC derives it from the
resource row, and passing a second, client-supplied copy would create a value
that can disagree with the row.

---

## 6. UI

### 6.1 Derivation

A new pure module,
`src/components/permissions/ShareResourceModal/deriveGeneralAccess/`, exporting
the predicate and the three-way value. The orchestrator owns the derivation;
`ShareGeneralAccess` stays presentational, as it is today.

```ts
// Mirrors util__has_non_owner_share exactly.
hasNonOwnerShare(shares, ownerId) =
  shares.some(s => s.principalType !== "user" || s.principalId !== ownerId)
```

`ShareResourceModal`'s existing `filteredDirectShares` cannot be reused for
this: it already drops the `workspace` principal, which the SQL predicate
counts. Reusing it would report a workspace-shared resource as private.

```
!isRestricted                      ->  "workspace"
 isRestricted &&  hasNonOwnerShare  ->  "restricted"
 isRestricted && !hasNonOwnerShare  ->  "private"
```

### 6.2 The Restricted intent state

`wantsRestricted`, a `useState(false)` in the orchestrator.

```
displayed = derived === "private" && wantsRestricted ? "restricted" : derived
```

Selecting either other option resets it to false. It is component state, so it
is lost on remount, which is what makes the agreed reopen behavior fall out for
free:

```
state: private (is_restricted, 0 shares)
  dropdown -> "Only me"       add-row DISABLED

user picks "Restricted"       -> no DB write
  dropdown -> "Restricted"    add-row ENABLED

user adds Amara               -> share row written
  dropdown -> "Restricted"    (now derived, not intent)

user closes and reopens, 0 shares
  dropdown -> "Only me"       add-row DISABLED
```

### 6.3 Owner gate

`isOwner = sharingState.ownerId === useCurrentUser()?.id`, which is false when
the hook returns `undefined`. That branch is unreachable in practice, since
`useCurrentUser` reads the `_auth` route context and the share modal only ever
mounts inside it, but the comparison must fail closed rather than assert.

When false, the "Only me" option renders disabled with a tooltip reading
`Only the owner can make this ${resource} private.` `ShareResourceButton`
already gates the whole modal on effective role `admin`, so a non-owner who
reaches this point is a resource admin, and the disabled option plus its
tooltip is the explanation they need.

The whole General access section is disabled while the mutation is in flight.

### 6.4 Confirmation

A new `openMakePrivateConfirmModal.tsx` beside the modal, following the
`openFileImportFlow.tsx` precedent. Stacked over the share modal via
`modals.openConfirmModal`, red confirm button.

Note that `ShareResourceButton` passes `onClose={() => modals.closeAll()}`, so
the confirm modal must be dismissed through the id `openConfirmModal` manages,
never through `closeAll`.

The dropdown does not move until the RPC resolves. A cancel or a failure
therefore leaves the visible state truthful, with no optimistic update to
reconcile.

**Skipped entirely** when `derived === "private"` already: the option is the
selected value, so choosing it is a no-op that never reaches the confirm.

Body copy, assembled from up to three sentences in `shareCopy.ts`:

| Clause | Condition | Copy |
| --- | --- | --- |
| Direct shares | any non-workspace, non-owner share | `{n} people and {m} groups will lose access.` (Lingui `plural`, each half omitted at zero) |
| Workspace-wide | `!isRestricted` | `Everyone in {App} will lose access.` |
| Reassurance | always | `Only you will be able to open it. You can share it again at any time.` |

The workspace-wide clause keys off `!isRestricted`, **not** off the presence of
a `workspace`-principal share row. An unrestricted resource with no such row
still grants access through workspace app roles, so keying off the row would
silently drop the warning in exactly the case where it matters most.

### 6.5 Summary line

`buildShareSummary` already has the branch: `!hasAnyShares && isRestricted`
returns *"This {resource} is currently only accessible to its owner."* The
change is to reword it to second person, *"Only you have access to this
{resource}."*

No `isOwner` parameter is needed, and that is not an assumption but an
invariant. If `derived === "private"` and someone has the modal open, they are
necessarily the owner:

- the owner short-circuits to `admin` in `util__resource_effective_role`;
- a Settings Admin resolves to `null` on a private resource under P1's
  narrowing;
- an explicit `admin` share would itself be a non-owner share, so the resource
  would not be private;
- a workspace share implies `is_restricted = false`.

This rests on P1. If that narrowing is ever widened, this copy starts lying, so
the invariant is recorded here and in the function's docstring.

`shareCopy.emptyState.noShares` carries the same sentence for a different
surface; check its call sites during implementation and only reword the one the
modal renders.

### 6.6 Two corrections to umbrella §7.J

**1. "Per-share role selects disabled while it is selected" is unreachable.**
`derived === "private"` requires zero non-owner shares, so the only row the
principal list renders is the read-only Owner row, whose selects are already
inert. There is no state in which a private resource displays an editable share
row. Implement the add-principal-row disable, which is real, and do not write
the role-select branch; it would be dead code that a future reader has to prove
unreachable again.

**2. The summary span needs no `isOwner` plumbing.** See §6.5.

### 6.7 i18n

New strings in `shareCopy.ts` and the confirm modal require `pnpm i18n:extract`.
`pnpm i18n:check` fails the build otherwise.

---

## 7. Known limitation: dataset dependents

Making a **dataset** private silently breaks any dashboard built on it for
everyone but the owner. Their widgets stop loading, with no indication why.

P1.5 ships no warning for this. Dataset references live inside
`dashboards.config jsonb` and there is no relational dependency model, so
finding dependents means a JSONB scan across every dashboard in the workspace
or a new dependency table. Both are larger than the rest of this phase
combined, and neither belongs in a phase whose argument for existing (umbrella
§8.0) is that it needs nothing from P2.

Recorded here so it is a decision rather than an oversight. A real dependency
model would belong alongside `PublishSliceConfig`, which already enumerates a
dashboard's datasets for publishing and is the natural place for that
relationship to become first-class.

---

## 8. Migration and rollout

Declarative schema workflow, per `supabase-declarative-schema`:

1. Add `supabase/schemas/70.rpc_resources__make_private.sql`.
2. Add the `grant execute ... to authenticated` for
   `util__has_non_owner_share` in
   `supabase/schemas/16.utils.resource-permissions.sql`.
3. Generate the migration; do not hand-write it.
4. Regenerate `shared/types/database.types.ts`.

No backfill, no data migration, no retroactive behavior change. Every existing
resource keeps its current access. The desktop SQLite mirror is unaffected:
this phase adds a function and changes no table.

**Reversibility.** Dropping the function and reverting the grant restores the
previous state exactly. The resources it created are ordinary
restricted-with-no-shares rows, indistinguishable from ones produced by hand
today, so nothing has to be undone at the data layer.

---

## 9. Testing

**pgTAP** (`supabase/tests/database/permissions/rpc_resources__make_private.test.sql`)

- Owner clears user, group, and workspace shares in one call, and
  `util__is_resource_private_to_owner` returns true afterwards. Asserted for
  dashboard **and** dataset.
- Non-owner resource admin gets `42501`, and every share survives.
- Settings Admin gets `42501`, and every share survives. This is the J1 case
  and the one most likely to regress, since the DELETE policy would otherwise
  admit them.
- A nonexistent id and an id the caller cannot see fail identically, with the
  same error, proving §4.1's oracle claim.
- Idempotent: calling it on an already-private resource succeeds and changes
  nothing.
- The rollback case: with the post-condition forced to fail, both `is_restricted`
  and the share rows are unchanged after the raise. This is umbrella §7.J's
  "partial-failure case", asserted as a real rollback rather than as an error
  message.
- The owner's own explicit `user` share on their own resource is **not**
  deleted and does not defeat privacy, matching `util__has_non_owner_share`.

**Vitest**

A measured constraint shapes this layer: **a Mantine `Select` dropdown cannot
be opened in jsdom.** `fireEvent.click`, `mouseDown`, `focus` + `keyDown
ArrowDown`, and a full pointer sequence all leave `queryAllByRole("option")`
empty, and `@testing-library/user-event` is not a dependency of this repo.
Vitest can therefore assert a selected value, a disabled control, and whether
the role picker rendered, but never which options exist or what clicking one
does.

This is why the dropdown's option list is built by an exported pure function
rather than inline in the component: it moves the option contents and the
owner gate into a layer that can be tested at all.

- `deriveGeneralAccess`: the same truth table the pgTAP test uses, including
  the workspace-principal row (`principalId` null), the owner's own user share,
  and a group share; plus `buildGeneralAccessOptions` ordering and the "Only
  me" disabled flag for a non-owner.
- `ShareGeneralAccess`: the selected value for each of the three states, the
  role picker hidden for both restricted values, and the dropdown disabled
  while the mutation is in flight.
- `ShareResourceModal`: that a workspace-principal share renders as
  `Restricted` and not `Only me`, and that the add-principal row is disabled
  when private.
- `buildShareSummary`: the reworded private branch, for both resource types.
- `ResourceShareClient.makeResourcePrivate`: `p_`-prefix mapping and error
  rethrow, matching `PrivateResourceAdminClient.test.ts`.

The §6.2 intent-state sequence needs a real click on an option, so it is
asserted in Playwright rather than here.

**Playwright** (`tests/e2e/share-modal.spec.ts`)

One new case in the existing suite: an owner shares a dataset with a member,
the member sees it, the owner selects "Only me" and confirms, the member no
longer sees it.

Umbrella §9 assigns Playwright to P3, but this is the first flow in which a
**user action** produces the state P1 enforces, and P1's existing
`private-resource-admin-cannot-read.spec.ts` covers only the seeded version of
that state. It earns an e2e now rather than waiting.

A **dataset**, not a dashboard, because every existing share-modal e2e is
dataset-based: `openShareModal` navigates from the dataset meta page, and
`expectDatasetVisibleInDataManager` / `expectDatasetMetaPageDenied` already
express both halves of the assertion. The RPC and the UI are resource-type
generic and pgTAP covers both types, so a bespoke dashboard flow would spend
significant new helper code to re-prove what the SQL layer already pins.

---

## 10. Open questions

None.

---

## Document maintenance

This document supersedes §7.J of
`docs/superpowers/specs/2026-08-13-private-dashboards-design.md`. When P1.5
lands, add the RPC to `docs/permissions-architecture.md`, which stays the
canonical permissions reference.
