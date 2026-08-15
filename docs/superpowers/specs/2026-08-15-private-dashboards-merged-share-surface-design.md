# Private dashboards, merged share surface (P3) - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-15
**Umbrella:** `docs/superpowers/specs/2026-08-13-private-dashboards-design.md`
**Predecessors:** `2026-08-13-private-resource-permissions-hardening-design.md` (P1),
`2026-08-13-private-dashboards-only-me-control-design.md` (P1.5),
`2026-08-14-private-dashboards-publishing-core-design.md` (P2), all landed
**Related:** `docs/permissions-architecture.md`,
`src/components/permissions/ShareResourceModal/`,
`src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/`,
`src/views/DashboardApp/DashboardListView/`,
`shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`,
`supabase/schemas/17.rls.dashboards.sql`

---

## 1. Scope

P3 is the fourth of the umbrella's five phases and covers work items **C**
(merged share surface), **E** (discovery), and **G** (the publish-publicly
permission key).

P2 delivered a publish path that accepts a target visibility and an
`unpublishDashboard` that nothing calls. P3 is the phase that gives a user a way
to ask for a workspace-only dashboard, which means it is also the phase where
private dashboards become a product rather than a set of tested primitives.

### 1.1 What P3 delivers

| Item | Summary |
| --- | --- |
| C | One Share surface per dashboard: `ShareResourceModal` grows an optional publishing section, General access grows a fourth value, `PublishDashboardButton` and `PublishDashboardModal` are deleted |
| E | The dashboards index stops filtering on `owner_id` and lets RLS decide; `DashboardCard` grows audience badges |
| G | `dashboards__can_publish_publicly` at the `admin` tier, gated in the UI and enforced by a Postgres trigger on the transition into `public` |
| P2 deferral | Viewer-role access requires a published dashboard, which is what finally gives `draft` its product meaning |
| P2 deferral | `unpublishDashboard` gets its first caller, closing D-P2-2 |

### 1.2 What P3 deliberately does not deliver

- **No entitlement enforcement.** Umbrella §6.1 says the public option is gated
  twice, by the permission key and by the plan limit. P3 ships only the first
  gate. The plan limit is item H in P4, and the option's disabled state is
  built so P4 adds a second reason rather than a second mechanism (§5.3).
- **No fix for the discovery asymmetry in `util__auth_user_may_select_dashboard`**
  (§8 D1). It is a permission-model change, which is P1's territory, and it is
  observable only because P3 widens the index. Recorded, not closed.
- **No filter control on the dashboards index.** Umbrella §10 left this open;
  §6.3 settles it as "not now".
- **No request-access action** on the access-denied surface. Umbrella §10 put it
  out of scope and it stays there until users ask for it.
- **No sweep for orphaned snapshot objects** (P2 §7 D4). Tracked separately.

---

## 2. Goals and non-goals

**Goals**

- A dashboard's audience is chosen in exactly one place, and that place is the
  same modal that governs who can open it inside the app.
- A user can publish a dashboard so that only their workspace can read it,
  which is the sentence the whole umbrella exists to make true.
- Publishing publicly is an admin-tier act, and the client gate is not the only
  thing standing between an editor and the open internet.
- A dashboard shared with you is findable without a link.
- Nothing about public publishing regresses: the same slug field, the same
  slice configuration, the same QR affordance, the same URLs.

**Non-goals**

- No change to the snapshot pipeline, the storage clients, the buckets, or the
  viewer routes. P2 finished those; P3 calls them.
- No change to `role_level`, `resource_shares`, or the RPCs P1 and P1.5 landed.
- No new visibility value. `draft`, `workspace`, and `public` are the whole
  state machine.
- No redesign of the people list, the add-principal row, or the role selects.
  They are reused exactly as they are.

---

## 3. Decisions

| # | Decision | Rejected alternative and why |
| --- | --- | --- |
| D-P3-1 | `ShareResourceModal` stays resource-generic and grows one optional `publishing` prop. A new dashboard-only `DashboardShareModal` supplies it. | Making the modal dashboard-aware (branching on `resourceType === "dashboard"` inside it) puts dashboard publishing state into a component datasets also render, and every future resource type inherits the branch. A separate dashboard modal that duplicates the people list instead of reusing it was the other option, and it forks the exact code the umbrella merged the surfaces to stop forking. |
| D-P3-2 | The General access dropdown never writes `visibility`. It writes share state immediately and sets a *target* visibility that only the Publish or Unpublish button applies. | Umbrella D5 already settled this for the three-option dropdown. Extending the dropdown to flip visibility directly would mean a slow, per-dataset, partially-fallible snapshot build fires from a select element, with no review step before data leaves the workspace. |
| D-P3-3 | When `visibility = 'public'`, the dropdown displays "Anyone with the link" regardless of share state. | Displaying the derived share-state value would tell a user their dashboard is Restricted while the whole internet can read it. Umbrella §4.2 already establishes that public wins over restriction everywhere else; the UI must not be the one place that disagrees. |
| D-P3-4 | "Only me" targets `draft`, so choosing it on a published dashboard turns the primary action into Unpublish. "Restricted" and "Anyone in <workspace>" both target `workspace`. | Letting "Only me" target `workspace` produces a published snapshot with an audience of one: storage, a live URL, and a bucket object that exist for nobody. "Restricted" targeting `draft` was also rejected: a restricted-but-published dashboard is exactly the internal-report-for-three-people shape this feature was requested for. |
| D-P3-5 | The publish-publicly rule is enforced by a `before update` trigger on `dashboards`, not by an RLS `with check`. | The rule is about a *transition* into `public`, and `with check` cannot see `OLD`. A `with check` that fired on every row version would reject an admin-published dashboard being re-saved by the editor who owns it, which is a working flow today. |
| D-P3-6 | Ship the merged modal unflagged; put the feature flag on the "Anyone in <workspace>" option alone. | P2 D-P2-1 promised P3 would introduce the flag. Flagging the whole modal recreates exactly what D-P2-1 rejected: two code paths for one surface, only one of which the tests drive. The merge itself is a refactor of a shipped public-publishing flow; the new *audience* is the thing worth being able to turn off. |
| D-P3-7 | The dashboards index shows audience badges and orders the user's own dashboards first. No filter control, no tabs. | A "Shared with me" tab or filter is a real answer to a list that has gotten long, and there is no evidence yet that it has: the view has no search, no sort, and no pagination today, so a filter would be the first list affordance ever added, built for a volume nobody has reported. §6.3 records the tripwire that should reopen it. |
| D-P3-8 | `buildShareUrls` returns the audience-correct pair of URLs, and the QR code encodes the id URL for the current target. | Keeping the legacy `/public/dashboards/…` path as the canonical QR payload would mint new QR codes pointing at a route P2 already reduced to a redirect and that §11 wants deleted. |

---

## 4. The merged share surface (item C)

### 4.1 Where publishing lives

`ShareResourceModal` is mounted for datasets as well as dashboards
(`ShareResourceButton` takes a `ResourceType`), and `is_restricted` plus
`resource_shares` are resource-generic. Publishing is not. The seam, per
D-P3-1, is one optional prop:

```ts
/**
 * Dashboard publishing, threaded in by DashboardShareModal. Absent for every
 * resource type that has no published form, which today is all of them except
 * dashboards.
 */
type ShareResourcePublishing = {
  /** Target the dropdown selects; applied by Publish or Unpublish. */
  targetVisibility: DashboardVisibility;
  /** Undefined when the public option is selectable. */
  publicOptionDisabledReason: string | undefined;
  /** Slug field, slice section, status line, and share links. */
  section: ReactNode;
  /** Publish / Update & republish / Unpublish. */
  actions: ReactNode;
  /** The dashboard layer owns the value-to-visibility mapping, not the modal. */
  onGeneralAccessChange: (value: GeneralAccessValue) => void;
};
```

The persisted visibility is deliberately **not** on this prop. The target is
initialised from it, so on open the two agree and D-P3-3's display rule holds;
after that any divergence is a pending change the status line reports. One
field carries both facts, and the modal cannot render a state where they
contradict each other.

The dropdown handler takes a `GeneralAccessValue` rather than a visibility
because the mapping in §4.2's table is dashboard knowledge. Handing the modal a
visibility would mean the resource-generic component knows that "Only me"
implies `draft`.

When the prop is absent the modal renders exactly what it renders today, which
is what keeps the dataset surface unchanged and makes the existing
`ShareResourceModal.test.tsx` a regression net rather than a rewrite.

New and moved files:

| File | Fate |
| --- | --- |
| `src/views/DashboardApp/DashboardShareModal/DashboardShareModal.tsx` | new; owns publishing state and renders `ShareResourceModal` |
| `src/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl.ts` | new; the publish/unpublish/slug/slice state extracted from `PublishDashboardModal`'s hooks |
| `src/views/DashboardApp/DashboardShareModal/DashboardShareButton.tsx` | new; the toolbar entry point |
| `VanitySlugField/`, `PublishSliceSection*`, `PublishedShareLinks`, `PublishDashboardStatus/`, `ShareUrlRow`, `buildShareUrls`, `toVanitySlug/`, the slice editors | moved under `DashboardShareModal/`, otherwise unchanged except where §4.4 and §4.5 say so |
| `PublishDashboardModal.tsx`, `PublishDashboardModalContent.tsx`, `PublishDashboardButton.tsx` | deleted |

`ShareResourceButton` hardcodes `<ShareResourceModal>` in its `onClick`. Its
gate (the `useResourceRole` call, the disabled state, and the two tooltip
strings) is extracted into `useShareButtonState` so `DashboardShareButton`
reuses the rule rather than restating it. The two buttons stay separate
components because their `modals.open` payloads differ, and that is the only
thing that differs.

`DashboardEditorView.tsx:216` drops `PublishDashboardButton`, and the
`ShareResourceButton` two lines above it becomes `DashboardShareButton`. The
toolbar loses a button rather than gaining one, which is the visible half of
the merge.

### 4.2 The fourth value and the two axes

`GeneralAccessModule` gains `"public"`:

```ts
const _GENERAL_ACCESS_VALUES = [
  "private",
  "restricted",
  "workspace",
  "public",
] as const;
```

Share state alone can no longer derive the displayed value, because `public`
lives on the dashboard row. `GeneralAccessModule.fromShareState` keeps its
current signature and its current three outcomes, and a new
`fromResourceState({ sharingState, visibility })` wraps it with the D-P3-3
rule: `visibility === "public"` returns `"public"`, anything else defers to
`fromShareState`. Keeping the old function intact matters because it is what
`buildShareSummary` and the P1.5 confirmation flow already reason about.

What each value writes, and what it targets:

| Value | Share writes (immediate) | Target visibility |
| --- | --- | --- |
| Only me | `rpc_resources__make_private` (P1.5, unchanged) | `draft` |
| Restricted | `is_restricted = true`, workspace share deleted | `workspace` |
| Anyone in `<workspace>` | `is_restricted = false`, workspace share upserted | `workspace` |
| Anyone with the link | none | `public` |

"Anyone with the link" writing no share rows is deliberate. Public reads do not
go through `resource_shares` at all: the anon policy and the `is_public`
short-circuit in `util__auth_user_may_select_dashboard` fire first. Rewriting
share state on the way to public would silently widen *edit* access as a side
effect of a *read* decision, and it would destroy the narrowing the user gets
back when they downgrade.

The consequence has to be stated in the UI rather than hidden: while a
dashboard is public, the people list governs who can edit it, not who can read
it. The summary line carries that sentence (§4.5).

Three transitions need more than a dropdown change:

- **Public to anything else.** Share writes still land immediately, but the
  dashboard stays world-readable until the user publishes or unpublishes. The
  status line says so explicitly, and the primary action is the only thing that
  closes the gap. This is umbrella §5.4's "prefer transient breakage over
  transient exposure" seen from the user's side: the exposure ends when the
  snapshot moves, not when the select changes.
- **Public to Only me.** The P1.5 confirmation modal already names how many
  people lose access. It gains one more line when `visibility = 'public'`:
  the dashboard stays publicly readable until it is unpublished. The confirm
  action stays "Make private"; it does not unpublish behind the user's back,
  because unpublishing deletes snapshot objects and that is not a side effect
  to bury in a confirmation someone clicked for a different reason.
- **Anything to public** when the user lacks the permission key: the option
  renders disabled with a reason (§5.3).

### 4.3 The publish actions

The footer holds one primary button and, when the dashboard is published, one
subtle Unpublish.

| Persisted | Target | Primary label | Calls |
| --- | --- | --- | --- |
| `draft` | `workspace` | Publish to workspace | `publishDashboard({ visibility: "workspace" })` |
| `draft` | `public` | Publish | `publishDashboard({ visibility: "public" })` |
| `draft` | `draft` | Publish (disabled, needs an audience) | none |
| `workspace` | `workspace` | Update & republish | `publishDashboard({ visibility: "workspace" })` |
| `workspace` | `public` | Publish publicly | `publishDashboard({ visibility: "public" })` |
| `public` | `workspace` | Make internal | `publishDashboard({ visibility: "workspace" })` |
| `public` | `public` | Update & republish | `publishDashboard({ visibility: "public" })` |
| any published | `draft` | (Unpublish is the action) | `unpublishDashboard({ dashboardId })` |

Every row calls P2's client as-is. P2 built both mutations, tested both, and
left `unpublishDashboard` without a caller on purpose (D-P2-2); this table is
the caller.

**The two gates the old Publish button carried come with it.**
`PublishDashboardButton` disabled itself while the editor had unsaved changes
(publishing copies the *persisted* config, so publishing dirty would ship the
previous version without saying so) and while the browser was offline. Merging
the surfaces moves both gates onto the publish actions rather than onto the
Share button: sharing is still worth doing with unsaved edits in the buffer, and
only the publish half needs the network. `DashboardShareModal` therefore takes
`hasUnsavedChanges` from the editor and turns either condition into one
disabled-with-a-reason state on the footer button.

The downgrade rows are the ones worth reading twice. `public -> workspace`
runs P2's ordering (upload to the private bucket, clear the public bucket, flip
`visibility`), so a partial failure leaves a dashboard marked public with data
missing rather than a world-readable copy behind a closed door. The button
reports the failure and stays retriable; there is no client-side compensation
step to write.

### 4.4 Slugs across two namespaces

P2 split the namespace: `/d/<slug>` is globally unique for `public`,
`/<workspaceSlug>/d/<slug>` is unique per workspace for `workspace`. The slug
field therefore depends on the *target*, not on the current row:

- The prefix rendered next to the input switches between
  `avandar.app/d/` and `avandar.app/<workspaceSlug>/d/`.
- `validateDashboardSlug` is already namespace-aware (P2 §4.4) and is called
  with `visibility: targetVisibility`. Changing the target re-validates, because
  a slug that is free in one namespace can be taken in the other.
- The client check stays UX only. `publishDashboard` validates against the
  target namespace server-side before it uploads anything (P2 §5.5), so a race
  between the debounced check and the button fails safely.

`buildShareUrls` takes the target visibility and returns:

| Target | `canonical` | `vanity` |
| --- | --- | --- |
| `public` | `/d/<dashboardId>` | `/d/<slug>` when set |
| `workspace` | `/<workspaceSlug>/d/<dashboardId>` | `/<workspaceSlug>/d/<slug>` when set |

Per D-P3-8 the QR code encodes `canonical`, which is now a P2 route rather than
the legacy redirect. Already-printed QR codes keep working: the legacy path is
still a redirect and §11 keeps it that way.

### 4.5 Summary line, copy, and analytics

- `buildShareSummary` gains a publication span appended to the existing access
  spans: "Not published", "Published to `<workspace>`", or "Published on the
  web". In the public case it also carries the §4.2 sentence that the people
  list governs editing rather than reading.
- Slug-failure copy, including P2's `reserved` reason, moves out of
  `PublishDashboardModal` with the rest of the surface. It is copy relocation,
  not copy rewriting.
- `makeDashboardPublishAnalyticsEventFromDashboards` switches its branch from
  `previousDashboard.isPublic` to `previousDashboard.visibility !== "draft"`,
  and both event payloads gain `visibility`. Without that, every
  workspace-published dashboard is indistinguishable from a public one in
  analytics, which is the single number this feature exists to move.
- `dashboard.unpublished` joins `CLIENT_ANALYTICS_EVENT_NAMES`. The comment at
  `shared/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts:71` reserves
  the name and says to add it back "only alongside a real unpublish flow". This
  is that flow, and the comment is deleted in the same change.
- All new strings go through Lingui; `pnpm i18n:extract` output is committed.

---

## 5. The publish-publicly permission (item G)

### 5.1 The key

`dashboards__can_publish_publicly` is added to `PermissionRegistry.dashboards`
at the `admin` tier only. Editors keep every other dashboard capability,
including publishing to their own workspace, which is the point of the split:
internal publishing is ordinary work, and putting a dataset slice on the open
internet is not.

### 5.2 The server-side rule

`shared/models/Permissions/Permissions.types.ts:17` documents the current
contract: permission keys are a UI concept and "SQL still enforces `role_level`
only". P3 is the first phase to need a server-side counterpart, so it states
the mapping once and pins it:

> `dashboards__can_publish_publicly` is granted at the `dashboards` `admin`
> tier, and its server-side equivalent is
> `util__auth_user_meets_min_app_role(workspace_id, 'dashboards', 'admin')`.

Per D-P3-5 the enforcement is a `before update` trigger on `dashboards` that
raises when the caller does not meet that minimum. Three properties matter:

- It fires on the transition only, so re-saving an already-public dashboard is
  untouched.
- `util__auth_user_meets_min_app_role` returns true for workspace owners
  unconditionally, which is the existing rule everywhere else and is not
  re-litigated here.
- P4 adds its own triggers to this table for the plan limit. Both are
  `before update`, so the naming has to make the order legible; Postgres fires
  them alphabetically and neither depends on the other's outcome.

**Two refinements found during implementation**, recorded here because both
make the boundary stricter than this section originally specified:

- **The trigger guards the claim as well as the settlement.** P2 moves
  `visibility` through a durable two-step transition: a claim writes
  `snapshot_transition_target_visibility`, and a later settle flips
  `visibility` itself. Guarding only the settle would let an unauthorized
  editor build and upload an entire public snapshot before failing on the last
  statement. The trigger therefore fires on
  `update of visibility, snapshot_transition_target_visibility` and rejects
  either transition into `public`.
- **The exemption keys on the connecting role, not only on `auth.uid()`.** The
  intended exemption is "trusted server paths that already bypass RLS", and
  `auth.uid() is null` turned out not to express it: a psql session that
  switches to `postgres` can still carry a leftover `request.jwt.claims`, which
  several storage pgTAP fixtures do, so they were rejected. The guard is
  `current_user <> 'authenticated' or auth.uid() is null`, which asks how the
  request actually arrived rather than trusting a claim that can linger. End
  user traffic reaches Postgres as `authenticated` through PostgREST and is
  always gated. This forces the function to be SECURITY INVOKER, since under
  SECURITY DEFINER `current_user` is the function owner rather than the caller;
  it needs no elevated privileges of its own, because the role check it
  delegates to is already security definer.

### 5.3 The disabled option

`publicOptionDisabledReason` is a single nullable string precisely so P4 adds a
reason rather than a mechanism. In P3 the only reason is the permission
("Only workspace admins can publish to the web"). P4 adds the plan reason and
its upgrade link, which is the one case where the option needs an action rather
than a tooltip; the prop widens to a small object then, in P4's spec, not now.

---

## 6. Discovery (item E)

### 6.1 The index query

`src/routes/_auth/$workspaceSlug/dashboards/index.tsx:20` drops
`owner_id: { eq: userProfile.userId }` and keeps the workspace filter. RLS
decides the rest, which is what makes a dashboard shared with you appear in
your list at all (umbrella defect §1.2.3).

Dropping the filter also means the query no longer waits on `userProfile`, so
the `enabled` guard and the `dashboardsWhere === undefined` dance go away.

### 6.2 Badges

`DashboardCard` gains badges for the cases that are not the default. "Yours" is
not a badge: in a workspace where most of your list is yours, it is noise on
every card.

| Condition | Badge |
| --- | --- |
| `dashboard.ownerId !== currentUserId` | Shared with you |
| `visibility === "workspace"` | Published to `<workspace>` |
| `visibility === "public"` | Public |

They compose: a colleague's public dashboard shows two. The existing offline
badges keep their place and their color; the audience badges are visually
quieter than "Offline ready" because offline state is actionable and audience
state is descriptive.

Ordering in `DashboardListView`: the user's own dashboards first, then everything
else, each group by `updatedAt` descending. Today the list has no ordering
control at all, so this is the first time the order is a decision rather than
whatever the query returned.

### 6.3 No filter control

Umbrella §10 asked whether badges need a filter control once shared dashboards
appear. The answer for P3 is no (D-P3-7). `DashboardListView` has no search, no
sort, and no pagination, so a filter would be the first list affordance in the
view, added for a volume nobody has hit. Badges plus owner-first ordering are
enough to answer "which of these are mine".

The tripwire that should reopen it: a workspace where a typical member's index
exceeds roughly two screens, or the first user report of not being able to find
their own dashboard. Either one makes search the better first move, with filter
chips after it, and neither is speculative work today.

---

## 7. The viewer gate on `draft` (P2 deferral)

P2 §10 deferred the rule that gives `draft` its meaning: a user whose effective
role is `viewer` may open a dashboard only when it is published. P2 could not
ship it, because blocking viewers before any control existed to publish
internally would have stranded everyone holding a viewer share today. P3 ships
the control, so P3 ships the rule.

`src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx` already
loads the dashboard and computes `canEdit` through
`UserClient.canAccessResource({ minRole: "editor" })`. The loader gains one
branch: when `canEdit` is false and `dashboard.visibility === "draft"`, render
`DashboardAccessDeniedView` (P2's extracted component) instead of the viewer.

That is the whole change. The editor route's `beforeLoad` already redirects
sub-editor users to preview (P2 §6.6), so the two routes compose: a viewer
clicking a draft dashboard from the widened index lands on "You need access"
rather than on someone's unfinished work.

The index still lists the draft, because RLS still returns it. That is
consistent with the rest of the model, where listing and opening are separate
questions, and it is what lets the owner see their own drafts in the same list.

---

## 8. Defects found during design

**D1. A dashboards viewer sees more of the workspace than a dashboards editor.**
In `util__auth_user_may_select_dashboard`
(`supabase/schemas/16.utils.resource-permissions.sql:630`), a non-restricted
dashboard resolves as:

```
if v_user_rank < v_editor_rank then return true;   -- viewers: yes
if v_has_share then return true;                   -- editors and admins: only with a share
return false;
```

So a member with the `viewer` app role can select every non-restricted
dashboard in the workspace, while a member with `editor` or `admin` sees only
the ones they own or hold a share on. Today the index filters on `owner_id`, so
nobody can observe it. §6.1 removes that filter, and the inversion becomes a
visible product behavior: promoting someone from viewer to editor shrinks their
dashboard list.

P3 does **not** change the predicate. It is the core resource-permission
function P1 owns, it is pinned by the pgTAP truth tables P1 wrote, and changing
it is a permission-model decision rather than a discovery one. What P3 owes is
that the behavior is documented rather than discovered: the finding goes in
`docs/permissions-architecture.md` and in §11 as the next permissions question
to settle.

**D2. The publish analytics branch reads a column that no longer means what it
did.** `makeDashboardPublishAnalyticsEventFromDashboards` branches on
`previousDashboard.isPublic` to choose between `dashboard.published` and
`dashboard.share_settings_updated`. After P2, `isPublic` is a generated column
that is false for a workspace-published dashboard, so republishing an internal
dashboard would emit `dashboard.published` every time. Fixed in §4.5.

---

## 9. Testing

Umbrella §8.1 no longer applies: P3 is the phase that ships the control, so
tests seed state through the UI instead of through admin writes wherever the UI
can produce it. Direct seeding stays for the cases the UI cannot reach, which
after P3 is only `draft` rows belonging to another user.

**pgTAP**

- An editor cannot update a dashboard from `draft` or `workspace` to `public`;
  an admin can; a workspace owner can.
- An editor *can* update a `public` dashboard that is already public (the
  transition-only property of D-P3-5), including changing its slug and config.
- An editor can publish to `workspace` freely.
- The trigger denies with an error rather than silently no-opping, so the
  client surfaces a failure instead of reporting success.

**Vitest**

- `GeneralAccessModule.fromResourceState` across the product of
  {`draft`, `workspace`, `public`} and the three share states, including
  D-P3-3's rule that public wins over a restricted-with-no-shares row.
- The §4.3 action table: every persisted-target pair maps to the right label
  and the right client call, with `unpublishDashboard` reached only from the
  `draft` target.
- `ShareResourceModal` renders identically with `publishing` absent
  (the dataset case), which is the existing test file re-run unchanged.
- The public option renders disabled with the permission reason when
  `dashboards__can_publish_publicly` is absent, and the dropdown refuses the
  value even if the option is forced.
- `buildShareUrls` for both targets, with and without a slug.
- Slug validation is re-run when the target changes.
- `makeDashboardPublishAnalyticsEventFromDashboards` for a
  `workspace -> workspace` republish (D2's regression) and for the new
  `dashboard.unpublished` event.
- The index route query no longer carries an `owner_id` filter, and
  `DashboardCard` renders each badge combination.
- The preview route denies a viewer on a `draft` dashboard and admits them on a
  published one.

**Playwright**

- The end-to-end sentence this phase exists for: an owner publishes a dashboard
  to the workspace, a colleague opens `/<workspaceSlug>/d/<slug>` and sees it,
  and a signed-out request to the same URL lands on sign-in.
- An editor does not see a selectable "Anyone with the link" option.
- After a `public -> workspace` downgrade, the public vanity URL no longer
  serves the dashboard to a signed-out visitor.
- The dashboards index shows a dashboard shared with the signed-in user, with
  the "Shared with you" badge.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| The merged modal drops an affordance the publish modal had (slices, QR, republish), and nobody notices until a user does. | The publish surface moves as whole components rather than being rewritten (§4.1); the moved files keep their tests. |
| A user reads the dropdown as having already changed who can see the published dashboard. | The status line and summary line state the pending state explicitly (§4.2), and the primary action is the only thing that applies it. |
| Widening the index floods a viewer's list with every non-restricted dashboard in the workspace. | Known and bounded by §8 D1; owner-first ordering keeps the user's own work at the top, and §6.3's tripwire is the signal to add search. |
| The permission trigger blocks a legitimate re-save of a public dashboard. | It is transition-scoped by construction (D-P3-5) and pinned by the second pgTAP case in §9. |
| P4's plan-limit trigger and P3's permission trigger interact badly. | Both are `before update` and neither reads the other's result; §5.2 records the naming requirement so the firing order is legible. |
| Deleting `PublishDashboardModal` orphans translations and leaves stale `.po` references. | `pnpm i18n:extract` is part of the verification sweep, and `pnpm i18n:check` fails the build if the catalogs drift. |

---

## 11. Deferred

- **The viewer/editor discovery inversion** (§8 D1). The next permissions
  question to settle, and P1's file to change.
- **Search, then filter chips, on the dashboards index** (§6.3), on the
  tripwire recorded there.
- **The plan-limit gate on the public option**, which is P4 item H and is the
  second reason §5.3's prop was built to carry.
- **A reconciliation sweep for orphaned snapshot objects** (P2 §7 D4), which
  P3 makes marginally more reachable by giving users an unpublish button, and
  which is tracked outside this phase.
- **Deleting the legacy `/public/dashboards/…` route** once printed QR codes
  encoding it are out of circulation. P3 stops minting new ones (D-P3-8), which
  starts that clock.
- **A request-access action** on the access-denied surface. Explicitly parked:
  it ships when users ask for it, not before.

---

## Document maintenance

This spec supersedes umbrella §6.1's dropdown sketch where they disagree: the
publish button is inside the modal footer rather than beside it, and the option
labels are §4.2's. It answers two of umbrella §10's three open questions (the
badge filter control, and the request-access action); the third belonged to P1
and is closed. Update the umbrella when P3 lands.

`docs/permissions-architecture.md` is owned by P1 and is edited here only to
record §8 D1, which is a documentation of existing behavior rather than a
change to it.
