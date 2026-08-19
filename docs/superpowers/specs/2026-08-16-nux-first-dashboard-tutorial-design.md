# Nux: the first-dashboard onboarding tutorial - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-16
**Branch:** `feat/nux`
**Follow-up tracked outside this spec:** brain task T468, "Create Linear task:
onboarding/tutorial flow for non-admin users in Avandar"
**Amended by:** `docs/superpowers/specs/2026-08-18-nux-build-dashboard-click-steps-design.md`
(Milestone 3 is three click-through Save steps. Tooltip count is 3/2/3/3.)
**Related:** `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx`,
`src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx`,
`src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx`,
`src/views/DataExplorerApp/DataExplorerApp.tsx`,
`src/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.tsx`,
`src/components/permissions/ShareResourceModal/ShareResourceModal.tsx`,
`src/views/ProfileView/ProfileView.tsx`,
`shared/config/FeaturePlansConfig.ts`

---

## 1. Scope

Avandar has no guided first-run experience. A new owner lands on
`WorkspaceHomeView`, sees two cards ("Upload a dataset", "Explore your data"),
and is otherwise on their own across five apps to reach the thing that makes
the product click: a dashboard their colleagues can open.

This spec delivers one tutorial, `first_dashboard`, that walks an eligible new
user from an empty workspace to a dashboard shared with their workspace, using
their own data and their own actions.

**`Nux` is an internal prefix only.** It appears in type names, component
names, file paths, and the database. It never appears in user-facing copy,
which says **tutorial** in-product and **onboarding** in documentation.

### 1.1 What this delivers

| Item                | Summary                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Progress store      | `public.user_nux_progress`, per-user and global, not per-workspace |
| Tutorial definition | Four milestones and eleven tooltips, declared as pure data         |
| State machine       | A headless `NuxStateManager` mounted once in the workspace layout  |
| Event bridge        | Four existing success paths emit one event each                    |
| Checklist panel     | A global collapsible panel that persists across routes             |
| Tour renderer       | A lazy-loaded `react-joyride` wrapper themed to Mantine            |
| Sample dataset      | A static CSV for users who arrive without a spreadsheet            |
| Explorer fix        | The guided query builder can save to a dashboard (see §3.3.2)      |
| Restart             | A "Tutorial" section in `ProfileView`                              |
| Analytics           | Five events through the existing `AnalyticsClient`                 |

### 1.2 What this does not deliver

- **No onboarding for non-admins.** Every milestone assumes create and share
  permissions. Ineligible users see nothing at all. Designing their experience
  is a separate, higher-priority piece of work tracked in brain T468.
- **No tutorial catalog.** The schema and the definition layer are built so a
  second tutorial is additive, but only one ships and there is no picker.
- **No teaching of the dashboard canvas.** Puck renders the canvas in an
  iframe, which Joyride cannot spotlight into. See §8.
- **No public publishing, slices, row filters, or vanity slugs.** Milestone 4
  sets General access to `workspace` and stops there.
- **No mobile, tablet, or Electron support.** Desktop web only.

---

## 2. Goals and non-goals

**Goals**

- An eligible new user reaches a workspace-shared dashboard built from their
  own data, and understands roughly how they got there.
- The user acts and the tutorial follows. Every artifact at the end is
  genuinely theirs, so the result is relevant rather than a demo.
- Value arrives early and repeatedly. Each milestone ends in something
  visible, and the first payoff lands inside milestone 1.
- Abandoning is cheap and resuming is one click. Nothing is all-or-nothing.
- It runs once per user for their whole Avandar life, not once per workspace.
- It can be replayed deliberately, from the profile page.

**Non-goals**

- Teaching every feature. Entity Designer, the map, chat, and the open data
  catalog are all deliberately absent.
- Maximising completion at the cost of interrupting people. One invite, one
  pill, no nagging.
- Handling every plan and permission combination. See §8 for the two that are
  handled and why the rest are out of scope.

---

## 3. The user-facing flow

### 3.1 The invite

On the first eligible visit to a workspace, a Mantine modal:

> **Welcome to Avandar**
>
> Want a quick tour? In about 5 minutes you'll go from a spreadsheet to your
> first dashboard.
>
> `[ Not now ]` `[ Start tour ]`

**Both buttons set `status = 'in_progress'`.** "Start tour" then opens the
first unfinished milestone (§6.3, which is usually but not always milestone
1); "Not now" collapses to the pill. Writing `in_progress` on both paths is
what makes the invite show at most once, because the invite condition is
`status = 'not_started'` and nothing else ever writes that value. So
`in_progress` should be read as "offered, and neither finished nor
dismissed", not as "the user is actively touring".

### 3.2 The checklist panel

Rendered once in the workspace layout, so it survives every route change. It
has three visual states:

- **Expanded**: four rows with completion ticks and a progress count.
- **Collapsed**: a `● Get started 1/4 ▸` pill.
- **Hidden**: after completion or explicit dismissal.

**The panel is also the navigation.** Clicking a milestone row routes to that
milestone's starting route and begins its tooltips. This is load-bearing: it
is why no tooltip has to be spent on "click this nav item to get to X", which
is what took the tutorial from fifteen tooltips down to eleven. Arrival tooltips
name their location in copy instead, which teaches the same thing for free.

### 3.3 The four milestones

| #   | Key               | Title                        | Tooltips | Completes on                      |
| --- | ----------------- | ---------------------------- | -------- | --------------------------------- |
| 1   | `add_dataset`     | Add your first dataset       | 3        | dataset saved                     |
| 2   | `run_query`       | Ask your first question      | 2        | query returns rows                |
| 3   | `build_dashboard` | Build your first dashboard   | 3        | dashboard created                 |
| 4   | `share_dashboard` | Share it with your workspace | 3        | general access set to `workspace` |

Eleven tooltips in chunks of 3/2/3/3. The remaining two-tooltip milestone
(`run_query`) still keeps an early payoff visible.

#### Milestone 1: add your first dataset

Starts on `WorkspaceHomeView`, routes to
`/$workspaceSlug/data-manager/data-import`, ends on
`/$workspaceSlug/data-manager/$datasetId`.

| #   | Anchor                | Draft copy                                                                                                                               |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `dataset-upload-form` | You're in Data Manager, Import. Pick a CSV or Excel file from your computer. No spreadsheet handy? **Download our sample** and use that. |
| 2   | `dataset-import-form` | Avandar already read your file and guessed what each column contains. Give the dataset a name, then save.                                |
| 3   | `dataset-summary`     | And it profiled every column for you: ranges, distributions, what's missing. You didn't have to ask.                                     |

Tooltip 3 is a **reward, not a task**. It is the first moment the product does
something the user did not request, and it is why the summary statistics
belong at the end of milestone 1 rather than as a milestone of their own. The
checklist ticks to 1/4 as it appears.

#### Milestone 2: ask your first question

Routes to `/$workspaceSlug/data-explorer?ds=<datasetId>`, which preselects the
milestone-1 dataset through `DataExplorerSearchSchema`'s `ds` param. The tour
also dispatches `ChatPanelStateManager`'s `open` action so the chat panel is
showing regardless of the user's stored preference.

| #   | Anchor            | Draft copy                                                                                                    |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `chat-composer`   | This is the Data Explorer, and this is Ava. Ask a question in plain English, like "people served by program". |
| 2   | `explorer-canvas` | Ava wrote the SQL, ran it, and picked a chart. That's your answer.                                            |

##### 3.3.2 Why the chat panel, and the Explorer fix that comes with it

The original design pointed milestone 2 at the guided query builder. That
does not work: **"Save to dashboard" is disabled unless
`DataExplorerAppState.rawSql` is set**, and only the chat panel, the manual
SQL editor, and opening a saved dataset ever set it. The guided builder
generates its SQL at execution time inside `selectSqlToExecute` and never
stores it, so a builder-only path leads to a milestone 3 the user cannot
complete.

Two consequences:

1. **Milestone 2 uses the chat panel.** This is the better fit anyway: "ask
   your first question" becomes literal, the panel already auto-opens on the
   Data Explorer, and the natural-language path is the product's
   differentiator. The cost is that the result is not deterministic, so
   tooltip 2's copy stays about what happened rather than what it shows.

2. **The builder path gets fixed regardless.** `SaveToDashboardModal`'s menu
   item becomes enabled when the structured query is in sync, passing
   `structuredQueryToSql(state.query)` as its SQL. Being unable to save a
   chart you just built is a real gap that outlives this tutorial, and
   leaving it would mean the tour knowingly steers users around a trap.

#### Milestone 3: build your first dashboard

Starts in the Data Explorer, ends on
`/$workspaceSlug/dashboards/edit/$dashboardId`. One tooltip per click. See
`2026-08-18-nux-build-dashboard-click-steps-design.md` for hold-open, forced
create mode, and catch-up.

| #   | Anchor                             | Draft copy                                 |
| --- | ---------------------------------- | ------------------------------------------ |
| 1   | `explorer-save-menu`               | Open Save.                                 |
| 2   | `explorer-save-to-dashboard-item`  | Click "Save to dashboard".                 |
| 3   | `explorer-create-dashboard-button` | Give the dashboard a name, then create it. |

The Save menu stays open on tooltip 2 (controlled `Menu`, `closeOnClickOutside`
off). Tooltip 3 spotlights the full modal and hides Back. The tour always
opens the modal in create mode so the create button exists and
`dashboard.created` can fire. There is no payoff tooltip after create: the
button unmounts with the modal.

#### Milestone 4: share it with your workspace

Entirely within the dashboard editor and the share modal.

| #   | Anchor                   | Draft copy                                                                                                                                                |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `dashboard-share-button` | Your dashboard exists, but right now only you can see it. Let's fix that.                                                                                 |
| 2   | `general-access-select`  | **Workspace** means everyone in your workspace, not the public. Nothing here creates a public link. And you can set it back to Private whenever you like. |
| 3   | `share-role-select`      | Viewer lets people look at it. Editor lets them change it. Viewer is the safe default, and you can change anyone's role later.                            |

Tooltip 2 carries the reassurance in the control's own vocabulary. The share
modal's dropdown values are `private`, `restricted`, `workspace`, and `public`
(`GeneralAccessModule`), and the reverse of workspace access is Private, with
an existing confirm flow in `makePrivateConfirmCopy`. Saying "unpublish" would
send the user hunting the modal for a word that is not on it.

### 3.4 Completion

The panel shows a brief final state, "You built a dashboard your workspace can
see", with a link to the dashboard, then hides itself. Status becomes
`completed`.

---

## 4. Architecture

Six layers, each testable without the ones above it.

### 4.1 Data

`supabase/schemas/` gains the table and enum (§5), through the declarative
schema workflow. `shared/models/Nux/NuxProgress.ts` and `.types.ts` follow
existing model conventions. `src/clients/NuxProgressClient.ts` exposes the
read and update hooks.

### 4.2 Tutorial definition (pure)

`src/components/Nux/tutorials/firstDashboard.ts` declares the milestones as
data: key, title, start route, ordered steps (anchor, copy, placement),
completion event, and the artifact that would make it already-satisfied. No
React, no side effects, fully unit-testable. A second tutorial is a second
file, which is what keeps the future catalog cheap without building it now.

### 4.3 Anchors

`src/components/Nux/nuxAnchors.ts` is the single source of every
`data-nux="..."` value. Targets are always `[data-nux="..."]`, never a class
name or a DOM shape, so a Mantine upgrade or a styling refactor cannot
silently break the tour. Adding the anchors is ten one-attribute edits in
existing components.

### 4.4 State machine

`src/components/Nux/NuxStateManager/`, matching the repo's existing
`DataExplorerStateManager` and `DashboardEditorStateManager` convention. A
headless context exposing `status`, `milestones`, `activeMilestoneKey`,
`activeStepIndex`, `isEligible`, and actions (`start`, `openMilestone`,
`next`, `back`, `close`, `dismiss`, `restart`, `skipBlockedMilestone`).

The reducer is a pure function tested in isolation. React only supplies
effects: persistence, routing, and event subscription.

### 4.5 Event bridge

`src/components/Nux/nuxEvents.ts` is a small typed emitter. Four existing
success paths gain one call each:

| Event                         | Emitted from                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `dataset.saved`               | the dataset save success path behind `ManualUploadView`'s existing `onSaveSuccess` |
| `query.succeeded`             | the Data Explorer's query-result path                                              |
| `dashboard.created`           | `SaveToDashboardModal`'s create success                                            |
| `dashboard.sharedToWorkspace` | the share mutation success, when general access resolves to `workspace`            |

Emitting is a no-op when no tutorial is running, so the cost to those four
flows is one import and one line, with no behaviour change for anyone not
onboarding.

Chosen over deriving completion from TanStack Query data because it
distinguishes "the dataset _you just made_" from "a dataset exists", it fires
at the moment of the win rather than after a refetch, and it is trivially
mockable. Query-derived existence checks are still used, but only for the
one-shot auto-check in §6.3, where "does anything exist" is exactly the
question.

### 4.6 UI

| Component           | Role                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `NuxWelcomeModal`   | the one-time invite                                                     |
| `NuxChecklistPanel` | the global panel and its collapsed pill                                 |
| `NuxTour`           | a `React.lazy` Joyride wrapper, controlled mode, Mantine-themed tooltip |
| `NuxTooltip`        | the tooltip body, so Joyride's default chrome never ships               |

`NuxTour` is lazy so `react-joyride` stays out of the main chunk and is never
downloaded by ineligible users, which is most users.

Note that react-joyride 3 is not a drop-in for v2 documentation found online:
the component is a **named** export (`import { Joyride } from "react-joyride"`),
the v2 `callback` prop is now `onEvent(data, controls)`, and per-step defaults
live in an `options` prop rather than under `styles.options`.

**Mount point.** `NuxStateManager.Provider` goes in
`WorkspaceLayoutContents.tsx` directly inside `ModalsProvider`, and the three
UI components render as siblings of `AppShell` inside `AppDropzone`. This is
inside `WorkspaceI18nProvider` (so copy is localised to the workspace locale)
and inside the workspace route (so `useCurrentWorkspace` is available for the
eligibility check).

---

## 5. Data model

```sql
create type public.nux_status as enum(
  'not_started', 'in_progress', 'completed', 'dismissed'
);

create table public.user_nux_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The user this progress belongs to. Deliberately NOT scoped to a
  -- workspace: the tutorial is a once-per-person event, so joining or
  -- creating a second workspace must not re-trigger it.
  user_id uuid not null references auth.users (id)
    on update cascade on delete cascade,
  -- Which tutorial. Only 'first_dashboard' exists today; the column and the
  -- unique constraint below are what make a catalog additive later.
  tutorial_key text not null default 'first_dashboard',
  status public.nux_status not null default 'not_started',
  -- Milestone keys already finished, so a partial run resumes in place.
  completed_milestones text[] not null default '{}',
  unique (user_id, tutorial_key)
);
```

Plus the standard `util__set_updated_at` trigger, an index on `user_id`, and
RLS restricting select, insert, and update to `auth.uid() = user_id`. There is
no delete policy; restarting updates the row rather than replacing it.

**The absent `workspace_id` is the point.** `user_profiles` is scoped to a
workspace, so it cannot answer "has this person ever been onboarded". This
table can.

**Persistence granularity is the milestone, not the step.** The active step
index lives in memory only. A hard refresh mid-milestone resumes at that
milestone's first tooltip. This trades a little fidelity for four writes per
tutorial instead of ten, and removes an entire class of resume bugs. Route
changes do not lose state, because the provider sits above the router outlet.

---

## 6. Lifecycle

### 6.1 Eligibility

All three must hold:

1. `workspace.owner_id === user.id` **or** `useIsGlobalAdmin()` is true
   (the Settings app role is `admin`).
2. The viewport is desktop width (`useIsTabletSize()` is false).
3. The platform is web, not Electron (`isDesktop()` from
   `shared/platform/isDesktop.ts` is false).

Ineligible users get no modal, no panel, no pill, and no lazy chunk. The
non-admin case is deliberately empty pending T468; conditions 2 and 3 are
suppression rather than degradation, because shipping an untested flow on a
surface we have not designed for is worse than shipping nothing there.

### 6.2 Start

The invite is shown when the user is eligible and `status = 'not_started'`
after the auto-check has run.

### 6.3 Auto-check

Runs exactly once, when `status = 'not_started'`, before the invite is
decided. It resolves the furthest milestone whose artifact already exists and
marks that milestone and every milestone before it complete:

| Artifact found in the workspace         | Milestones marked complete |
| --------------------------------------- | -------------------------- |
| nothing                                 | none                       |
| at least one dataset                    | 1                          |
| at least one dashboard                  | 1, 2, 3                    |
| at least one workspace-shared dashboard | 1, 2, 3, 4                 |

This "furthest artifact wins" rule is deliberate. There is no reliable way to
detect "this user has run a query", and inventing one would be a detector we
have to maintain and that can be wrong. A dashboard cannot exist without a
query having been run, so milestone 2 rides on milestone 3's artifact.

If all four resolve complete, status is set to `completed` and the user is
never invited. Otherwise the tutorial opens at the first unfinished milestone,
so someone who uploaded a file before finding the tutorial starts at milestone
2 and is never told to add their first dataset.

### 6.4 Restart

`ProfileView` gains a "Tutorial" section below Password, with a short
description and a "Restart tutorial" button. It sets `status = 'in_progress'`,
clears `completed_milestones`, routes to workspace home, and opens milestone 1.

**Restart intentionally bypasses the auto-check**, and it does so for free:
the auto-check only runs when `status = 'not_started'`, and restart writes
`in_progress` directly. Someone asking to replay the tutorial wants all four
milestones, not "you are already done."

Milestone titles keep their "your first" phrasing on a replay. It reads as
what it is, a repeat of the tutorial, and branching the copy is not worth the
two code paths.

### 6.5 Dismissal

| Action                          | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| "Not now" on the invite         | `status = 'in_progress'`, collapse to pill (see §3.1) |
| Closing a tooltip mid-milestone | collapse to pill, progress kept                       |
| Explicit dismiss on the panel   | `status = 'dismissed'`, everything hidden             |

The pill persists across sessions. Nothing ever re-invites. Once dismissed,
only the profile restart brings it back.

---

## 7. The sample dataset

`public/samples/avandar-sample-people-served.csv`, roughly 200 rows:

| Column          | Type           | Why it is there                                  |
| --------------- | -------------- | ------------------------------------------------ |
| `service_date`  | date           | so the summary view shows its date timeline      |
| `program`       | text, 4 values | a text frequency bar, and milestone 2's group-by |
| `region`        | text, 4 values | a second frequency bar, a second grouping option |
| `people_served` | integer        | the obvious thing to measure in milestone 2      |
| `sessions`      | integer        | a second numeric stat block                      |

Chosen so milestone 1's payoff tooltip has all three summary visuals to point
at, and so "people served by program" is the obvious first question in
milestone 2.
Being a static file under `public/`, it needs no build wiring and is served
directly. The download link lives in milestone 1's first tooltip and nowhere
else, so it costs no permanent UI.

---

## 8. Constraints and edge cases

| Constraint                                                                                                                                        | Handling                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Puck renders the dashboard canvas in an iframe, which Joyride cannot spotlight into                                                               | The tour never enters it. Milestone 3 ends at creation; milestone 4 targets the editor toolbar and the share modal, both outside the frame.                                                                                                                                                                         |
| Joyride's default `zIndex` of 100 sits under Mantine modals and drawers                                                                           | Explicit `zIndex` above Mantine's modal layer, verified per step. Milestones 3 and 4 both spotlight inside portals.                                                                                                                                                                                                 |
| Most targets mount asynchronously (drawer, modal, post-parse form)                                                                                | Handled natively: react-joyride 3 has a per-step `targetWaitTimeout` (default 1000ms) and emits `EVENTS.TARGET_NOT_FOUND` when it expires. Steps waiting on a user action raise it; the not-found event collapses the tour to the pill rather than leaving it hanging. No custom `MutationObserver` hook is needed. |
| Anchors could vanish silently in a refactor                                                                                                       | Central anchor map, plus a development-mode warning when a step's target is not found.                                                                                                                                                                                                                              |
| Publishing blocked by unsaved changes, offline, or plan                                                                                           | `DashboardShareModal` already computes a blocked reason. The tour reads it and shows that sentence instead of spotlighting a dead control.                                                                                                                                                                          |
| **Free plan allows exactly one shareable dashboard** (`FreePlanLimitsConfig.maxShareableDashboardsAllowed = 1`) and workspace sharing consumes it | A brand-new user is fine. A user who already spent it cannot complete milestone 4, so the tooltip explains the limit, surfaces the upgrade path the modal already offers, and provides "Skip this step" so the tutorial is never a dead end.                                                                        |
| Free plan allows 5 datasets and 5 dashboards                                                                                                      | Only reachable by a user who is already well past onboarding, and the auto-check will have marked those milestones complete. The existing limit modals handle it; the tour adds nothing.                                                                                                                            |
| A user in two workspaces                                                                                                                          | Cannot re-trigger, because the progress row has no `workspace_id`.                                                                                                                                                                                                                                                  |
| Mantine `Menu.Dropdown` closes on any outside click, including Joyride's overlay                                                                  | Milestone 3 holds the Save menu open on tooltip 2 (`opened` controlled, `closeOnClickOutside` off) so Joyride can spotlight the item. See the 2026-08-18 amendment.                                                                                                                                                 |
| `ShareWorkspaceRoleSelect` only mounts once General access is `workspace`                                                                         | Deliberate, and it is why milestone 4's role tooltip comes after the access tooltip. `useNuxAnchor` waits for it.                                                                                                                                                                                                   |
| The chat panel may be closed from a stored preference                                                                                             | Milestone 2 dispatches `ChatPanelStateManager`'s `open` action on entry rather than assuming the auto-open ran.                                                                                                                                                                                                     |

---

## 9. Analytics

Five events through the existing `AnalyticsClient` into
`usage_analytics_events`:

`nux_started`, `nux_milestone_completed` (with the milestone key),
`nux_dismissed` (with the milestone it was dismissed on), `nux_completed`,
`nux_restarted`.

This is the only way to learn whether the tutorial works, where people drop
out, and whether the ten-tooltip cut was the right call. Without it the
follow-up work in T468 would be designed blind.

---

## 10. Testing

**Unit (pure, no React)**

- The `firstDashboard` definition: milestone ordering, that every step's
  anchor exists in `nuxAnchors`, that every milestone declares a completion
  event.
- The `NuxStateManager` reducer: advancing, going back, closing, dismissing,
  completing a milestone out of order, restarting.
- The auto-check resolver: each row of the §6.3 table, including the
  all-complete case.
- Eligibility: owner, global admin, neither, small viewport, Electron.

**Component (vitest + RTL)**

- `NuxChecklistPanel` in each state: 0/4, partial, complete, dismissed.
- `NuxWelcomeModal`: both buttons, and that it does not reappear.
- `ProfileView` tutorial section: restart clears progress and does not
  auto-check.
- That an ineligible user renders none of the three components.

**End to end (Playwright)**

One test covering milestone 1 from invite to the summary payoff, because that
is where abandonment costs the most and where the async-target risk is
highest. Milestones 2 through 4 are covered at the component level for now;
extending the e2e is a reasonable follow-up once the flow has settled.

**i18n**

All copy goes through Lingui macros. `pnpm i18n:check` must pass, which means
extraction is part of the change, not a follow-up.

---

## 11. File inventory

**New**

```
supabase/schemas/00.enum.nux_status.sql
supabase/schemas/04.user_nux_progress.sql
shared/models/Nux/NuxProgress.ts
shared/models/Nux/NuxProgress.types.ts
src/clients/NuxProgressClient.ts
src/components/Nux/nuxAnchors.ts
src/components/Nux/nuxEvents.ts
src/components/Nux/tutorials/firstDashboard.ts
src/components/Nux/NuxStateManager/NuxStateManager.tsx
src/components/Nux/NuxStateManager/nuxReducer.ts
src/components/Nux/NuxStateManager/resolveAutoCheckedMilestones.ts
src/components/Nux/NuxStateManager/useNuxEligibility.ts
src/components/Nux/NuxTour/NuxTour.tsx
src/components/Nux/NuxTour/NuxTour.lazy.tsx
src/components/Nux/NuxTour/NuxTooltip.tsx
src/components/Nux/NuxTour/buildJoyrideSteps.ts
src/components/Nux/NuxChecklistPanel/NuxChecklistPanel.tsx
src/components/Nux/NuxWelcomeModal/NuxWelcomeModal.tsx
src/views/ProfileView/TutorialSection.tsx
public/samples/avandar-sample-people-served.csv
```

**Modified**

```
package.json                                    react-joyride dependency
src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx   mount point
src/views/ProfileView/ProfileView.tsx           restart section
src/views/DataExplorerApp/DataExplorerApp.tsx   builder path fix (§3.3.2)
shared/analytics/AnalyticsEvents/*              five new client events
supabase/schemas/30.usage_analytics_events.sql  event allowlist + category map
```

Plus ten `data-nux` attribute additions and four one-line event emissions
across the existing import, explorer, dashboard, and share flows.

---

## 12. Open items

- **Sample CSV contents.** The column list in §7 is settled; the actual 200
  rows still need generating. They should be plausible enough that the summary
  view looks real, and they must contain no personal data.
- **Panel placement against the Data Explorer drawer.** The drawer occupies
  the bottom of the viewport in that view, so the panel needs a position that
  does not collide with it. Resolve during implementation, in the browser.
- **Milestone 2's second tooltip copy.** Because the chat panel's answer is
  LLM-generated, tooltip 2 cannot describe the chart. The current draft
  describes what Ava did instead. Worth revisiting once the flow can be
  watched end to end in a browser.
