# Usage Analytics Events Design

## Goal

Turn the partially wired `usage_analytics_events` table into a complete,
queryable product and growth analytics stream, and add a separate store for
chat samples retained from free-plan workspaces.

## Phase status

**Phase 1, foundation: complete (2026-08-14).** The foundation work and the
deferred client-event payload enrichment are implemented and landed. The
existing event rows now carry trustworthy category, runtime, and version
metadata; the shared registry and database emitter are in place; active client
events carry their approved privacy-safe payloads; and authenticated dashboard
filter analytics are scoped and debounced.

**Phase 2, growth: complete (2026-08-14).** The retired waitlist feature is
removed. The eight event-emitting triggers, the `analytics` schema, and its
seven reporting views are implemented in this worktree. The growth funnel is
readable end to end from service-role SQL. Two views carry columns that stay
empty until Phase 3 instruments `query.ran`, `chat.turn_completed`, and
`chat.turn.failed`.

**Phase 3, product events: next.** `analyticsSurface` on `useDataQuery`,
`query.ran`, `query.failed`, `dashboard.pdf_exported`,
`dashboard.share_settings_updated`, `chat.turn_completed`, and
`chat.turn_failed`. The reporting views that read those events already exist,
so Phase 3 ships instrumentation only.

Three things are wrong today. Ten event names are declared in
`src/lib/analytics/analyticsEventTypes.ts` but only seven are emitted. Every
emitter is in the browser, so events that happen without a browser session
(registration, email confirmation, billing webhooks) cannot be recorded at
all. And account-level events have no workspace, which the current `SELECT`
policy hides from every reader, so the growth funnel would be unreadable even
if it were recorded.

## Scope

In scope: the event catalog and payload contracts, an `event_category` column,
emission from Postgres triggers and edge functions in addition to the client,
a `chat_samples` table with a redaction pipeline, and reporting views.

Out of scope: an in-app founder dashboard, a platform-admin read path, session
identifiers for intra-visit funnel stitching, and any change to how the
existing consent modal behaves for users.

## Emission Architecture

Events are emitted by whichever layer owns the truth of the thing being
recorded.

**Postgres triggers own row facts.** A row appearing or changing in
`auth.users`, `workspaces`, `workspace_invites`, `workspace_memberships`, or
`subscriptions` is itself the event. Triggers make these complete and
tamper-proof: they fire for seed scripts, support tooling, and backfills, not
only for the one code path that exists today.

**The client owns UI intent.** Importing a dataset, running a query, changing
a filter, and sending a chat message have no row to hang a trigger on, and the
distinction between importing a dataset and saving an explorer result as a new
dataset exists only in the UI.

**Edge functions own server-side facts.** Model id, attempt count, latency,
and whether a sample was retained are known only on the server.

Three consequences drove this split. Registration cannot be captured from the
client at all when email confirmation is enabled, because `signUp` returns no
session and the `INSERT` policy requires `user_id = auth.uid()`. A trigger on
`auth.users.last_sign_in_at` captures desktop sign-ins for free, where a
client-side hook would have to be duplicated in the Electrobun platform auth
provider. And a trigger on `subscriptions` gets the previous plan from `OLD`,
where `handleSubscriptionUpdatedEvent` performs a blind `UPDATE` and would
need an extra read to know what changed.

## Event Catalog

Naming stays `<domain>.<past_tense_verb>` with camelCase payload keys, matching
the existing events. Two payload rules are new and binding: no raw PII in this
table (no email addresses, no SQL text, no chat content), and every payload
must answer how many, of what kind, how fast, and whether it worked.

### Acquisition

| Event | Emitter | Payload |
| --- | --- | --- |
| `user.registered` | trigger (`auth.users`) | `emailDomain`, `provider`, `hadPendingInvite` |
| `user.email_confirmed` | trigger (`auth.users`) | `emailDomain`, `secondsToConfirm` |

`hadPendingInvite` is resolved inside the trigger by checking
`workspace_invites` for the new user's email. It separates viral from organic
signup at no extra cost.

### Activation

| Event | Emitter | Payload |
| --- | --- | --- |
| `workspace.created` | trigger (`workspaces`) | `isFirstWorkspaceForUser`, `secondsSinceUserRegistered` |
| `dataset.imported` | client | `datasetId`, `sourceType`, `columnCount`, `rowCount`, `isFirstInWorkspace` |
| `query.ran` | client | `trigger`, `source`, `dataSourceType`, `rowCount`, `columnCount`, `durationMs`, `didAutoLimit` |
| `dashboard.published` | client | `dashboardId`, `blockCount`, `hasVanitySlug` |

`rowCount` and `columnCount` on `dataset.imported` are recorded when known at
save time and omitted otherwise.

### Engagement

| Event | Emitter | Payload |
| --- | --- | --- |
| `user.signed_in` | trigger (`auth.users`) | `daysSinceLastSignIn`, `isFirstSignIn` |
| `chat.message_sent` | client | `promptChars`, `pageApp`, `modelId`, `runtimeMode`, `hasOpenDataset` |
| `chat.sql_generated` | client | `sqlChars` |
| `chat.turn_completed` | edge (`chat`) | `modelId`, `latencyMs`, `attemptCount`, `outcome`, `promptChars`, `responseChars`, `piiSeverity`, `wasSampled`, `schemaDatasetCount` |
| `chat.turn_failed` | edge (`chat`) | `modelId`, `errorClass`, `latencyMs` |
| `dashboard.block_added_via_chat` | client | `blockKind`, `vizType`, `dashboardId`, `blockCountAfter` |
| `dashboard.filter_changed` | client | `dashboardId`, `filterId`, `mode`, `wasCleared` |
| `dashboard.share_settings_updated` | client | `dashboardId`, `slugAction` |
| `dashboard.pdf_export_opened` | client | `dashboardId`, `blockCount` |
| `dashboard.pdf_exported` | client | `dashboardId`, `blockCount`, `durationMs` |
| `query.failed` | client | `surface`, `trigger`, `errorClass`, `errorMessage`, `isOffline` |

`runtimeMode` is `cloud` or `local` and is the only way to observe on-device
chat, which never reaches the server. `attemptCount` exposes how often the
existing three-attempt escalation in `PostChatMessages` fires, which is
invisible today.

### Expansion

| Event | Emitter | Payload |
| --- | --- | --- |
| `workspace.invite_sent` | trigger (`workspace_invites`) | `inviteId`, `invitedEmailDomain`, `inviteeAlreadyRegistered`, `memberCountBefore` |
| `workspace.invite_accepted` | trigger (`workspace_invites`) | `inviteId`, `secondsFromInviteToAccept`, `memberCountAfter` |
| `member.removed` | trigger (`workspace_memberships`) | `memberCountAfter` |
| `dashboard.public_viewed` | edge (`dashboards`) | `dashboardId`, `viaVanitySlug`, `referrerHost` |

Invites store the invite row's own id plus the email domain, never the address.
`inviteId` is the join key between `invite_sent` and `invite_accepted`, which
avoids hashed emails entirely: a bare hash of an email address is
dictionary-reversible and still counts as personal data, while an invite id is
meaningless outside `workspace_invites`. The domain answers whether adoption
spreads inside a company.

`dashboard.public_viewed` requires a new route on the `dashboards` edge
function with JWT verification disabled. Anonymous clients cannot insert
directly (the `INSERT` policy is `to authenticated`), and adding an anonymous
write policy would let anyone forge events. This is the lowest-value event in
the catalog and the first candidate to cut if the route is not worth building
now.

### Revenue

| Event | Emitter | Payload |
| --- | --- | --- |
| `subscription.created` | trigger (`subscriptions`) | `plan`, `isPolarBacked`, `status` |
| `subscription.plan_changed` | trigger (`subscriptions`) | `fromPlan`, `toPlan`, `direction`, `seats` |
| `subscription.status_changed` | trigger (`subscriptions`) | `fromStatus`, `toStatus`, `plan` |

`direction` is `upgrade`, `downgrade`, or `lateral`, computed from the ordering
`free < basic < premium`, so upgrade and downgrade rates are one `group by`.
Churn is `subscription.status_changed` where `toStatus = 'canceled'`.

Triggers on `subscriptions` cover both the native free path in
`supabase/functions/subscriptions/create-free.ts` and every Polar webhook,
without touching either.

### Removed

`dashboard.unpublished` is dropped from the union. No unpublish flow exists:
`DashboardClient.usePublishDashboard` only ever writes `isPublic: true`, the
publish modal offers only Cancel and Publish, and nothing sets it back.

### Deliberate Omissions

Raw SQL is never stored, including on failure, because query text carries
customer literals. `query.failed` stores a classified `errorClass` plus an
error message truncated to 500 characters.

`session_id` is omitted. Intra-visit funnel stitching needs client plumbing
that is deferred until there is a demonstrated need.

## Query Event Scope

`query.ran` fires only for Data Explorer executions. `query.failed` fires from
every surface, including dashboard blocks, because a broken published
dashboard is always worth knowing about.

`useDataQuery` has three callers: `DataExplorerApp`, `DataVizPBlock`, and
`VizConfigPField`. It gains a required `analyticsSurface` option
(`data_explorer`, `dashboard_block`, `viz_config`) so the hook can apply that
asymmetry, and emission is keyed on settled-query transitions so React Query
cache hits do not double-count.

`trigger` on `query.ran` is one of `sql_submit`, `structured_change`,
`chat_generated`, or `url_hydration`. The explorer re-runs on every pill and
limit change, so this field is what makes deliberate runs separable from
incidental ones in SQL rather than requiring the volume to be suppressed at
the source.

One known gap: `useDataQuery` also serves public dashboard views via
`auth: "public"`, where there is no session, so `logEvent` no-ops and those
failures go unrecorded. Recording them would need the same server route as
`dashboard.public_viewed`, and is deferred with it.

## Fixing `dashboard.filter_changed`

Two defects. It never sets `workspaceId`, so its rows land with
`workspace_id = null`, which the `SELECT` policy excludes and no in-app reader
can see. And the `contains` text input branch does not log at all.

Both are fixed: `workspaceId` is threaded in, and the text input logs on a
debounce so typing does not emit per keystroke.

## Table Changes

### `usage_analytics_events`

Three new columns and one index.

**`event_category`**, type `public.usage_analytics_events__category`,
`not null`. Values: `acquisition`, `activation`, `engagement`, `expansion`,
`revenue`, `other`.

The column is set authoritatively by a `before insert` trigger,
`tr__usage_analytics_events__set_category`, which assigns
`public.util__analytics_event_category(new.event_name)` and ignores any value
the emitter passed. Emitters never supply a category.

This is deliberate. The value of the column is that a query can trust it, and
an emitter-supplied category could drift from its event name. A single mapping
function is also the only form reachable from plpgsql triggers, which cannot
read a TypeScript registry. Unmapped names resolve to `other`, so a typo never
rejects an insert but is trivially visible with
`where event_category = 'other'`.

`member.removed` is categorised as `expansion`, treating it as the inverse of
`invite_accepted`: movement in the account's seat count.

**`client`**, type `public.usage_analytics_events__client`, `not null`. Values:
`web`, `desktop`, `server`, `db`. Makes desktop usage separable and identifies
trigger-emitted rows without consulting the catalog.

**`app_version`**, nullable text. Null for `db` and `server` rows. This
requires a `define` in `vite.config.ts` sourcing the version from
`package.json`, which does not exist yet.

Plus `usage_analytics_events__event_category__created_at_idx` on
`(event_category, created_at desc)`, the access pattern every reporting view
uses.

Existing rows are backfilled before either column is made `not null`:
`event_category` through the same mapping function, and `client` to `web`,
since every row written to date came from the browser.

The table comment is corrected: it currently claims reads are restricted to
"workspace owners + global admins" when no platform-admin concept exists
anywhere in the schema.

### `chat_samples`

The only new table.

| Column | Notes |
| --- | --- |
| `id`, `created_at` | |
| `workspace_id` | references `workspaces`, `on delete cascade` |
| `user_id` | references `auth.users`, `on delete cascade` |
| `feature_plan_type` | the plan at capture time |
| `model_id`, `page_app`, `outcome` | |
| `attempt_count`, `had_consent_ack` | |
| `messages` | jsonb, redacted conversation |
| `assistant_text` | redacted |
| `generated_sql` | redacted, nullable |
| `schema_snapshot` | jsonb, redacted |
| `pii_severity` | `clean` or `warning`; `critical` never lands |
| `redacted_categories` | text array |
| `redaction_version` | int |

Three columns carry more weight than they appear to.

`feature_plan_type` records the plan at capture time rather than joining to
`subscriptions`. If a workspace upgrades later, the record must still show that
the sample was collected under the plan whose terms permitted it. A join would
silently rewrite that history.

`redaction_version` allows the detector to improve without poisoning the
corpus. When a pattern is tightened or a category added, samples captured under
an older version can be re-filtered or discarded rather than guessed about.

`user_id` cascades on delete, so deleting a user removes their samples. This is
the privacy-correct default and it costs training data when users churn.

RLS is enabled with no policies at all. Service-role writes bypass RLS and
nothing reaches it through the API. Per `docs/rules/sql.md` this still requires
negative tests proving an authenticated user reads zero rows and cannot insert.

`schema_snapshot` is the one size concern. Without the schema a prompt-to-SQL
pair is close to useless for training, but `fetchWorkspaceSchema` returns every
dataset and column in the workspace, so the value duplicates across samples.
Postgres TOAST compression makes this acceptable at current volume; if it
grows, dedupe by content hash into a side table.

Indexes: `(workspace_id, created_at desc)` and `(created_at desc)`.

Retention is 180 days. `pg_cron` is not currently used anywhere in this
project, so enforcing it needs the extension enabled on the Supabase project,
or a scheduled edge function instead. If neither is wanted in this change, the
retention window is documented and the deletion job ships as a follow-up; the
window itself is a policy decision that must match what the terms of service
state.

## Chat Sample Capture

Runs inside `PostChatMessages` after the response is parsed, before returning.

1. Read `subscriptions.feature_plan_type` for the workspace using the admin
   client.
2. If the plan is not `free`, skip capture and emit `chat.turn_completed` with
   `wasSampled: false`.
3. Run `detectPii` across every message, the assistant text, the generated
   SQL, and the schema snapshot's column names.
4. If severity is `critical` or `isMedical` is true, skip capture and emit
   `chat.turn_completed` with `wasSampled: false` and
   `piiSeverity: 'critical'`.
5. Build one surrogate map from all hits across the whole turn, apply it to
   every field, discard the map.
6. Insert the sample and emit `chat.turn_completed` with `wasSampled: true`.

Only cloud turns are ever captured. When `resolveChatRuntimeMode` returns
`mode.kind === "local"` the turn never reaches the server and cannot be
recorded.

Step 5 is where correctness lives. The map is built once per turn and applied
across all fields, because if a prompt contains a name and the generated SQL
contains the same name in a `WHERE` clause, both must receive the same
surrogate or the sample is incoherent and worse than no sample.

Capture is awaited before the response returns rather than deferred with
`EdgeRuntime.waitUntil`. It adds roughly one database roundtrip to a call that
already takes seconds, and `waitUntil` work can be killed on worker shutdown,
producing silent partial capture. The whole step is wrapped in a try/catch that
logs and returns the chat response regardless.

## Redaction Strategy

Detected values are replaced with realistic same-type surrogates, not with
typed tags, for two reasons specific to a regex-based detector. A detector miss
surrounded by tags is trivially identifiable as the only real identifier in the
text, whereas a miss surrounded by plausible fakes is not; this is the
"hiding in plain sight" approach from the de-identification literature. And
text full of bracket tokens has a different surface distribution from real user
prompts, so a model trained on it learns to emit the tokens.

The category split is not uniform:

| Categories | Treatment |
| --- | --- |
| `direct_identifier`, `precise_location`, `demographic_sensitive`, `free_text_risky` | replaced with same-type surrogates |
| `government_id`, `financial`, `medical` | the whole sample is discarded |

Surrogates are never appropriate for identifiers and financial figures, and
generating a plausible fake government id inside otherwise real context is the
pattern auditors treat as inadequate de-identification.

The surrogate map is discarded after the write. Retaining it would make the
result pseudonymised rather than anonymised, which under GDPR is still personal
data. Surrogates are derived from a per-sample random seed that is never
stored.

## New and Moved Modules

`detectPii` moves from
`src/components/privacy/privacy-helpers/detectPii/detectPii.ts` to
`shared/utils/privacy/detectPii/detectPii.ts` so edge functions can import it.
The module is pure and dependency-free, so the move is mechanical; its existing
callers in `src/components/privacy/` are updated.

`detectPii` needs one behavioural addition. It currently returns
`sampleValue`, a matched sample capped at 80 characters, which is correct for
the consent modal it was built for. Substitution needs every matched span, so
the result gains a field returning all matched substrings or offsets per hit.
Existing consent-modal callers must behave identically after this change.

`shared/utils/privacy/surrogates/` is new: a per-category generator,
`buildSurrogateMap(hits, seed)`, and `applySurrogates(text, map)`. Given a
seed, output is deterministic so one turn is internally consistent.

## Typed Event Registry

`src/lib/analytics/analyticsEventTypes.ts` currently pairs a union of names
with `AnalyticsEventPayload = Record<string, unknown>`, so no payload is
checked against its event. It is replaced by a runtime registry, which also
gives tests something to iterate:

```ts
const ANALYTICS_EVENTS = {
  "query.ran": {
    category: "activation",
    payload: {} as {
      trigger: QueryTrigger;
      source: "rawSql" | "structured";
      rowCount: number;
      durationMs: number;
      didAutoLimit: boolean;
    },
  },
  // …
} as const;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;
export type AnalyticsPayloadFor<E extends AnalyticsEventName> =
  (typeof ANALYTICS_EVENTS)[E]["payload"];
```

`logEvent` becomes generic in the event name, so passing a `query.ran` payload
to `chat.message_sent` is a compile error. The registry's `category` field is
documentation and test input only; the database remains authoritative.

## Emission Helpers

`public.util__log_analytics_event(p_event_name, p_workspace_id, p_user_id,
p_app, p_payload)`, `security definer`, with its body wrapped in
`exception when others then null` so a logging failure can never break a
signup, an invite, or a subscription write. Every trigger calls only this. It
sets `client = 'db'` and leaves `app_version` null itself, so callers cannot
get either wrong. The edge helper sets `client = 'server'`; `AnalyticsClient`
sets `web` or `desktop` from `isDesktop()`.

The event-emitting triggers are one per table and operation:

| Table | Operation | Events |
| --- | --- | --- |
| `auth.users` | `after insert` | `user.registered` |
| `auth.users` | `after update` | `user.email_confirmed`, `user.signed_in` |
| `workspaces` | `after insert` | `workspace.created` |
| `workspace_invites` | `after insert` | `workspace.invite_sent` |
| `workspace_invites` | `after update` | `workspace.invite_accepted` |
| `workspace_memberships` | `after delete` | `member.removed` |
| `subscriptions` | `after insert` | `subscription.created` |
| `subscriptions` | `after update` | `subscription.plan_changed`, `subscription.status_changed` |

The two `auth.users` update events share one trigger because both are decided
by comparing `OLD` and `NEW` on the same row: `email_confirmed_at` going from
null to non-null, and `last_sign_in_at` changing. The same applies to the
`subscriptions` update trigger, which can emit both a plan change and a status
change from a single webhook-driven `UPDATE`.

`logAnalyticsEvent()` in `supabase/functions/_shared/analytics/`, taking the
service-role client explicitly and swallowing failures the way
`AnalyticsClient` already does. Used by the chat function.

## Reporting Views

Reads happen through service-role SQL, not through the app. No platform-admin
concept is introduced.

The views live in a dedicated `analytics` schema that is deliberately absent
from `config.toml`'s exposed `schemas` list, so they are unreachable from the
browser as a structural fact rather than as a correctly-configured policy. A
view in `public` would be exposed through PostgREST, and without
`security_invoker = on` would bypass RLS entirely.

| View | Content |
| --- | --- |
| `analytics.acquisition_funnel` | registered, confirmed, first workspace, by registration week cohort |
| `analytics.activation` | per workspace, days to first dataset, first query, first published dashboard |
| `analytics.active_users` | daily and weekly actives from `engagement` rows, split by `client` |
| `analytics.retention_cohorts` | built from `user.signed_in`'s `daysSinceLastSignIn` |
| `analytics.invite_conversion` | `invite_sent` joined to `invite_accepted` on `inviteId`, with time to accept |
| `analytics.plan_movement` | upgrades, downgrades, cancellations by month |
| `analytics.chat_health` | turns, `attemptCount` distribution, outcome mix, failure rate, local versus cloud split |

## Error Handling

Every layer fails silently by design, with one improvement. The client's
current bare `catch {}` hides real defects, such as a payload violating a
constraint, with no signal even in development; it gains a development-only
`console.warn`. Triggers rely on the `exception when others` wrapper inside
`util__log_analytics_event`. Unmapped event names resolve to `other` rather
than rejecting an insert.

## Testing

pgTAP covers `util__analytics_event_category` returning a real category for
every event name, `util__log_analytics_event` not raising on malformed input,
each of the eight event-emitting triggers firing with the expected payload
shape, and the negative RLS cases on `chat_samples` (an authenticated user
reads zero rows and cannot insert).

`tr__usage_analytics_events__set_category` gets its own test asserting it
overrides a category supplied by the caller, since that override is the
guarantee the whole column rests on.

Vitest covers surrogate consistency across every field of one turn, the
critical and medical skip paths, the free-plan gate, `redaction_version`
stamping, and a drift guard that iterates the runtime registry and asserts each
registered name maps to a non-`other` category, so adding an event without
categorising it fails CI.

## Implementation Phases

This is too large for one plan. It decomposes into four phases that each ship
something useful on their own, in this order.

**Phase 1, foundation: complete.** The two enums, the three columns and their backfill,
`util__analytics_event_category`, the category trigger,
`util__log_analytics_event`, the edge helper, the `vite.config.ts` version
define, the typed event registry, the dev-only `console.warn`, dropping
`dashboard.unpublished`, fixing `dashboard.filter_changed`, and enriching the
payloads of the seven events that already fire. After this phase the existing
instrumentation is correct, categorised, and type-checked.

**Phase 2, growth: complete.** The retired waitlist feature is removed. The
eight event-emitting triggers, the `analytics` schema, and its views make the
growth funnel readable. Implemented by
`docs/superpowers/plans/2026-08-14-analytics-growth-events.md`.

**Phase 3, product events.** `analyticsSurface` on `useDataQuery`,
`query.ran`, `query.failed`, `dashboard.pdf_exported`,
`dashboard.share_settings_updated`, `chat.turn_completed`, and
`chat.turn_failed`.

**Phase 4, chat samples.** Moving `detectPii` to `shared/`, extending it to
return all matched spans, the surrogates module, the `chat_samples` table, the
capture pipeline, and retention. This phase carries all of the privacy risk in
the spec and none of the others depend on it, so it goes last and can be
reviewed on its own.

`dashboard.public_viewed` and the public-dashboard `query.failed` gap are a
deliberate fifth item, deferred until the edge route is judged worth building.

## Schema Workflow

`supabase/schemas/*.sql` is the hand-written source of truth and a generated
migration is what runs, so every change here follows the
`supabase-declarative-schema` skill. The triggers on `auth.users` are the one
piece that may not fit the declarative diff, since `schema_paths` covers
`public`; the mechanics are settled during implementation planning.

## Assumptions Requiring Confirmation

The current terms of service already grant the right to train on free-plan
chat inputs and outputs. Capture begins the moment this deploys, so this must
be verified before the code ships rather than after.

Retention on `chat_samples` is 180 days.

The free versus paid gate reads `subscriptions.feature_plan_type = 'free'` at
request time.
