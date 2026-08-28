# E2E testing rules

Rules for end-to-end tests (Playwright specs under `tests/e2e/`), which run
against a live app plus real Supabase with a service-role `admin` client. For
unit/integration (Vitest) rules see [`testing.md`](testing.md). The
review-agent form of these rules is in
[`../code-reviews/references/e2e-tests.md`](../code-reviews/references/e2e-tests.md).

## A third-party spec skips by default and fails only when asked for

A spec that reaches a real third-party service is tagged with
`E2E_THIRD_PARTY_TAG` (`@third-party`, from
`tests/e2e/setup/e2eThirdPartyMode/`). The tag does not decide whether the spec
runs. It decides what a **missing credential** means:

| Command                                                 | Runs                                           | A missing env var on a tagged spec                 |
| ------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `pnpm test:e2e`                                         | everything, tagged specs included              | **skipped**, with the variable names in the reason |
| `pnpm test:e2e --no-third-party`                        | everything except `@third-party`               | n/a, the tagged specs never start                  |
| `pnpm test:e2e:third-party`                             | only the tagged specs                          | **hard failure**                                   |
| `pnpm test:e2e:offline`                                 | everything except `@online` and `@third-party` | n/a                                                |
| `./scripts/test-runners/run-all-tests.sh --third-party` | the unit suites, then only the tagged specs    | hard failure                                       |

Read credentials with `requireE2EThirdPartyEnv({ test, variableNames })`, which
applies that asymmetry for you. Never read `process.env` for them directly in a
spec, or you lose it.

The asymmetry is the point. A full run must not go red on a machine that was
never given the credentials, and CI holds none, so there the tagged specs skip
and the gate stays about the change under review. But a run invoked to exercise
the third party specifically must not report green having quietly skipped the
one spec that touches it: that is the same green as a run which really reached
the service, and it is the failure mode this whole arrangement exists to
prevent.

### What this asks of a blocking job

**A blocking job runs `pnpm test:e2e --no-third-party`.** The PR gate and both
deploy workflows do, which drops the tagged specs from the run outright rather
than relying on the credentials being absent. Skipping-for-want-of-credentials
is a property of the environment, and a job that gates a merge or a deploy
should not be one `E2E_*` variable away from making live network calls: those
can fail because somebody else's service is down, their quota ran out, or a
standing credential was revoked. The flag makes that impossible to reach by
changing the environment alone.

Keep the second guard too: **do not put third-party credentials into a blocking
job's `env:`.** The flag and the absent credentials are independent, and neither
should be the only thing standing between the gate and a third party.

If a live check is wanted in CI, give it its own scheduled or
manually-dispatched job running `pnpm test:e2e:third-party`, where a missing
credential is loud and a failure blocks nothing.

Tag a spec only when it earns it: it is the only kind that catches the third
party changing its contract, which every stubbed spec passes straight through.
Anything the stub can prove belongs in an untagged spec.

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

A restored snapshot is not merely old, it is treated as **fresh**: the entry
keeps the `dataUpdatedAt` it was written with, and the default `staleTime` in
`src/config/AvaQueryClient.ts` keeps it valid for that whole window, so
`refetchOnMount: true` does not refetch it. Nothing inside a test can recover
from that state: not a retry loop, not another reload, not a raised timeout.
That is why this flake presents as a hard failure rather than a slow pass. The
persister also throttles its writes, so a `page.goto` within roughly a second of
a mutation restores the _pre-mutation_ snapshot. `dataset-sharing`'s tag-share
spec did exactly that: it created a user group, navigated, and then could not
find the group in the members drawer for the rest of the test.

This rule covers helpers under `tests/e2e/helpers/` as much as specs. The
`page.goto` behind the flake above lived in a helper, where a spec-only search
does not find it. Some screens now opt into `ALWAYS_REFETCH_ON_MOUNT`
(`src/config/queryOptions.constants.ts`), which makes a reload recover on those screens,
but that is a per-screen product decision and not a licence to reload.

## Seed the minimum the assertion needs

A test that asserts _rendering_ (a chart/element appears) should seed a
constant/literal result, not build and query a real dataset — otherwise it
inherits the data pipeline's flakiness. Query a real dataset only when the query
itself is under test. `save-to-dashboard-renders` seeds its bar chart with a
literal `VALUES` query, like `save-to-dashboard`'s `SELECT 1 AS mocked_column`.

## Locate by role and scope; never assert a bare generic label

A strict-mode violation (a locator resolving to two or more elements) is
**fatal**: web-first assertions retry "element not found", but they abort on
ambiguity. An ambiguous locator therefore converts a transient render state into
an instant hard failure, and the attached snapshot (captured after that state
resolved) often shows a single match, which makes the report look impossible.

So do not assert a short generic string that another element may legitimately
carry. `share-modal`'s owner-row spec asserted
`dialog.getByText("Owner", { exact: true })`, which matched both the Owner badge
and a row whose display name was still the modal's loading placeholder. `None`,
`Viewer`, `Editor`, `Admin`, and `Owner` are all live strings in the permission
UIs. Instead:

- prefer a role plus accessible name
  (`getByRole("combobox", { name: "User groups" })`) over raw text, and scope the
  locator to its row, drawer, or dialog;
- assert the row's resolved identity first (the member or group name), then its
  label, so a failure names the real problem;
- when a label has no role of its own, scope to the element that renders it
  (`dialog.locator(".mantine-Badge-label")`) and assert `toHaveCount(1)`: that
  fails loudly on ambiguity instead of aborting mid-assertion.

## A `toPass` body must converge, not toggle

`toPass` re-runs its entire body, so an action that _toggles_ state undoes what
the previous attempt achieved. `assignWorkspaceTagToMember` clicked a Mantine
`MultiSelect` on every attempt, and because that click toggles the dropdown,
every other attempt closed the dropdown the one before it had opened, halving the
real retries while still looking like a normal retry loop. Read the current state
and act only when it is wrong:

```ts
if ((await tagsField.getAttribute("aria-expanded")) !== "true") {
  await tagsField.click();
}
```

Keep any action that must happen exactly once (selecting the option) outside the
loop, so a late retry cannot repeat it.

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
