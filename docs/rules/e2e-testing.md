# E2E testing rules

Rules for end-to-end tests (Playwright specs under `tests/e2e/`), which run
against a live app plus real Supabase with a service-role `admin` client. For
unit/integration (Vitest) rules see [`testing.md`](testing.md). The
review-agent form of these rules is in
[`../code-reviews/references/e2e-tests.md`](../code-reviews/references/e2e-tests.md).

## Diagnose a flake before fixing it

An intermittent failure has a mechanism: an aged-process slowdown, a cold-start
slowdown, a race (a set/read that does not wait for the app to settle), or a
degraded local environment. Name it and fix that one. Do not mask a race or a
missing wait with `freshBrowserPage` or a raised timeout — those are the wrong
tool for a race and can make a cold-start flake worse.

## Seed preconditions in the DB; drive the behavior under test through the UI

Separate a spec's **preconditions (Arrange)** from the **behavior under test
(Act)**:

- A direct database write (via the `admin` / service-role client) is a fixture
  mechanism. Use it only to:
  - **seed preconditions** the spec depends on but does not assert — in setup,
    **before the first page load**, while no client is live;
  - **tear down** state the spec created;
  - **bypass an out-of-scope, slow, or external system** not under test (e.g. a
    third-party checkout); or
  - **read** the database as an oracle (look up an id, assert persisted state).
- The **behavior under test** — any state change a real user would make that the
  spec exercises or asserts on — must be driven **through the UI** by simulating
  the user. This is the default.

Why: a direct write skips the app's real code path (validation, the mutation,
permissions, the cache update), so the spec stops proving that path works; and
because the running client caches server state in React Query (some persisted to
IndexedDB), a write behind the app's back leaves that cache stale, producing
flaky false failures or passes. Seeding _before_ the UI loads is safe because no
live client can desync.

Appropriate (Arrange / teardown / oracle):

- `tests/e2e/helpers/insertE2ERestrictedDataset.ts` — seed a restricted dataset.
- `tests/e2e/helpers/upsertPaidSubscriptionForE2E.ts`,
  `tests/e2e/helpers/seedCanceledSubscriptionForWorkspace.ts` — seed subscription
  state and skip the slow Polar checkout (not under test).
- `tests/e2e/helpers/assignE2ESecondaryMemberRole.ts` — seed a member role.
- `tests/e2e/helpers/seedDashboard.ts` (`deleteAllDashboardsForOwner`,
  `deleteDashboardsByIds`) — setup and teardown.
- `tests/e2e/helpers/supabaseAdminClient.ts` (`getWorkspaceIdBySlug`) — oracle.

Not appropriate — must simulate the user:

```ts
// ❌ Mid-test rename via a direct DB write. The running app never learns about
// it, so its dashboards cache stays stale — this made save-to-dashboard-renders
// flaky. Rename through the UI, or seed the name before the page loads.
await admin
  .from("dashboards")
  .update({ name: TARGET_NAME })
  .eq("id", dashboardId);
```

If a distinct name is only needed to disambiguate, make the entity the only one
of its kind (clean up others in setup) and select it by position/id.

## Navigate between in-app routes client-side, not with `page.goto`

To move between authenticated routes mid-test, click the in-app link
(`getByRole("link", { name }).click()`); do not `page.goto("/…")`. A hard reload
rehydrates the persisted React Query cache (which can hold a stale snapshot the
throttled persister has not overwritten yet) and resets in-page state (DuckDB
tables, in-memory registrations). Both caused real flakes here: an empty
datasource dropdown, and a `FROM "<uuid>"` "table does not exist". Use
`page.goto` only for the first landing after sign-in, or when you deliberately
test a cold reload.

## Seed the minimum the assertion needs

A test that asserts _rendering_ (a chart/element appears) should seed a
constant/literal result, not build and query a real dataset — otherwise it
inherits the data pipeline's flakiness. Query a real dataset only when the query
itself is under test. `save-to-dashboard-renders` seeds its bar chart with a
literal `VALUES` query, like `save-to-dashboard`'s `SELECT 1 AS mocked_column`.

## Set a controlled input resiliently when async state writes it back

When you set a controlled input whose value an async op also writes (a mutation
`onSuccess`, a refetch, a reparse), a one-shot `fill` can be reverted by a late
write-back and never re-applies. Set-and-confirm-it-holds:

```ts
await expect(async () => {
  await input.fill(value);
  await expect(input).toHaveValue(value, { timeout: SHORT_WAIT });
}).toPass({ timeout: MEDIUM_WAIT });
```

See `csv-parse-options.spec.ts`'s `setParseOptionUntilStuck`.

## A spec that parses a large file uses the fresh-browser fixture

E2E runs single-worker (`workers: 1`), so tests run one at a time but share one
long-lived Chromium process whose memory pressure grows across the run. A large
DuckDB-WASM parse that takes ~8s on a fresh process can take 30s+ late in the run
and trip its timeout (a different heavy-parse spec failing each run while each
passes in isolation).

- A spec that flakes because a **large parse (~10,000 rows or larger) slows late
  in the run** uses the `freshBrowserPage` fixture
  (`tests/e2e/fixtures/e2e.fixture.ts`), aliased to `page`:
  `async ({ freshBrowserPage: page, e2eWorkerDb }) => { … }`. The row count is a
  guideline that flags a candidate (magnitude, judged by rows not bytes). The
  anchor is `excel-import` (~17k-row XLSX).
- `freshBrowserPage` gives a **fresh, cold** process — right only for a large
  parse slow on an **aged** process. A candidate whose flake is the opposite (it
  needs a **warm** process) stays on the shared `page`: a heavy route slow to
  render cold (e.g. the Puck dashboard-editor iframe with recharts) fails harder
  on a fresh browser. `dashboard-chat-block` (~14.7k-row upload) is the
  counter-example — it clears the row bar but its flake is cold-render, so it
  uses `page`. Confirm the flake is parse-slowness-on-an-aged-process before
  opting a candidate in.
- Below the threshold, use the shared `page`; do not pay the ~200-500ms relaunch
  for small-fixture specs (including ones that only seed a small file as a
  precondition).
