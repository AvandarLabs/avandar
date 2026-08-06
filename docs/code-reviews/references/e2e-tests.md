# E2E tests (Playwright) — review ruleset

Repo-local rules for reviewing files under `tests/e2e/`. Run this as its own
phase (gate: the diff touches any spec, fixture, or helper under `tests/e2e/`).
The engineer-facing version of these rules lives in
[`docs/rules/e2e-testing.md`](../../rules/e2e-testing.md).

## Diagnose a flake before applying a fix

An intermittent E2E failure has a mechanism: an aged-process slowdown, a
cold-start slowdown, a race (a set/read that does not wait for the app to
settle), or a degraded environment. Name it and fix that one. Do **not** mask a
race or a missing wait with `freshBrowserPage` or a raised timeout — those are
the wrong tool for a race and can make a cold-start flake worse.

## Running E2E specs at the end of a review

- Never run the whole E2E suite for a code review. Run only the exact
  `*.spec.ts` files that exercise the changed behavior.
- Run specs one at a time, sequentially, each in its own invocation
  (`pnpm test:e2e <spec>.spec.ts`), so each result is visible without waiting
  for the full set.
- Do not loop the full suite back-to-back: that has crashed the local Supabase
  edge runtime (surfacing as `validate-slug` HTTP 500 and billing failures).
  Run once, let the environment settle, and judge heavy-route specs only
  against a warm dev server (a cold Vite can fail a heavy editor route on its
  first load).

## Reviewing E2E test code

**Drive behavior through the UI, not direct DB writes**

The rule itself (seed preconditions before the first page load, drive the
behavior under test through the UI, the flag trigger, and the two failure modes)
is generic and already covered by `tests-checklist.md`'s "E2E only" section,
which loads whenever the diff changes a spec. Do not restate it in a finding;
apply it with these repo-local specifics:

- Direct writes in this repo go through `createSupabaseAdminClient()`. Concrete
  preconditions it may legitimately seed before the flow starts: workspaces,
  users, memberships, owner profiles, role groups, and fixture datasets.
- The running client's stale-cache failure mode here is a React Query desync,
  which made `save-to-dashboard-renders` flaky before its rewrite.

  **Find candidates** (admin DB writes inside spec files):

  ```bash
  grep -rEn '\b(admin|supabaseAdmin)\.(from|rpc|auth)\b' \
    tests/e2e/*.spec.ts
  ```

  Each hit is a candidate. Legitimate ones happen before the user flow starts
  (or in a `try` block right after sign-in for setup). Flag ones that interleave
  with `page.click()`, `page.fill()`, or assertions on the real product
  endpoint.

**Navigate between in-app routes client-side, not with `page.goto`**

- To move between authenticated routes mid-test, click the in-app link
  (`getByRole("link", { name }).click()`), do not `page.goto("/…")`. A hard
  reload rehydrates the persisted React Query cache (which can hold a stale
  snapshot the throttled persister has not overwritten yet) and resets in-page
  state (DuckDB tables, in-memory registrations). Both caused real flakes here:
  an empty datasource dropdown, and a `FROM "<uuid>"` "table does not exist".
- A restored snapshot is treated as **fresh**, not merely old: it keeps the
  `dataUpdatedAt` it was written with, and the default `staleTime` in
  `src/config/AvaQueryClient.ts` keeps it valid for that whole window, so
  `refetchOnMount: true` never refetches it. Nothing inside the test recovers
  from that (no retry loop, no second reload, no raised timeout), so this flake
  presents as a **hard failure**, not a slow pass. Writes are also throttled, so
  a `page.goto` within roughly a second of a mutation restores the
  *pre-mutation* snapshot. Real case: `dataset-sharing`'s tag-share spec created
  a user group, navigated, and could not find it in the members drawer again.
- `page.goto` is correct for the first landing after sign-in, or when the test
  deliberately exercises a cold reload. Flag a mid-flow `page.goto` whose
  success depends on state the test just created.

  **Find candidates** (flag mid-flow gotos after the first navigation). Search
  helpers as well as specs: the `page.goto` behind the flake above lived in
  `tests/e2e/helpers/workspaceTagsFlow.ts`, invisible to a spec-only search.

  ```bash
  grep -rEn 'page\.goto\(' tests/e2e --include="*.ts"
  ```

**Locate by role and scope; never assert a bare generic label**

- A strict-mode violation (a locator resolving to two or more elements) is
  **fatal**: web-first assertions retry "element not found" but abort on
  ambiguity. So an ambiguous locator turns a transient render state into an
  instant hard failure, and the attached snapshot (captured after that state
  resolved) often shows a single match, which makes the report look impossible.
  Do not accept "the snapshot shows one element" as evidence that a strict-mode
  failure was spurious.
- Flag an assertion on a short generic string that another element in the same
  scope may legitimately carry. In the permission UIs that includes `Owner`,
  `None`, `Viewer`, `Editor`, and `Admin`. Real case: `share-modal`'s owner-row
  spec asserted `dialog.getByText("Owner", { exact: true })`, which matched both
  the Owner badge and a row whose display name was still the modal's loading
  placeholder.
- Accept instead: a role plus accessible name
  (`getByRole("combobox", { name: "User groups" })`) scoped to its row, drawer,
  or dialog; the row's resolved identity asserted before its label; or, for a
  label with no role of its own, a scoped locator plus `toHaveCount(1)`, which
  fails loudly on ambiguity rather than aborting.

  **Find candidates** (bare short-text assertions):

  ```bash
  grep -rEn 'getByText\("[A-Z][a-z]+"' tests/e2e --include="*.ts"
  ```

  This recipe is deliberately broad and mostly returns data values (a cell
  value such as `"California"`), which are fine. Only flag a hit whose string
  is a **UI label** that a badge, role chip, status, or loading placeholder in
  the same scope could also render.

**A `toPass` body must converge, not toggle**

- `toPass` re-runs its whole body, so an action that *toggles* state undoes the
  previous attempt. Flag a retry body that clicks a dropdown, checkbox, or
  disclosure unconditionally: it closes what the last attempt opened and halves
  the effective retries while still reading like a normal retry loop. Real case:
  `assignWorkspaceTagToMember` clicked a Mantine `MultiSelect` on every attempt.
- Accept a body that reads current state and acts only when it is wrong (for
  example gating the click on `aria-expanded`), with any exactly-once action
  (selecting the option) hoisted outside the loop.

  **Find candidates** (clicks inside a retry body):

  ```bash
  grep -rEn -A6 'expect\(async \(\) => \{' tests/e2e --include="*.ts" \
    | grep -E '\.click\(\)'
  ```

**Seed the minimum the assertion needs**

- A test that asserts *rendering* (a chart/element appears) should seed a
  constant/literal result, not build and query a real dataset, so it does not
  inherit the data pipeline's flakiness. Query a real dataset only when the
  query itself is under test. Example: `save-to-dashboard-renders` seeds its bar
  chart with a literal `VALUES` query, like `save-to-dashboard`'s
  `SELECT 1 AS mocked_column`.
- Flag a render-only test that uploads a dataset and queries it by id when a
  literal producing the same result shape would do.

**Set a controlled input resiliently when async state writes it back**

- When a test sets a controlled input whose value is also written by an async op
  (a mutation `onSuccess`, a refetch, a reparse), a one-shot `fill` can be
  reverted by a late write-back, and it never re-applies. Set-and-confirm-holds
  instead of set-once:

  ```ts
  await expect(async () => {
    await input.fill(value);
    await expect(input).toHaveValue(value, { timeout: SHORT_WAIT });
  }).toPass({ timeout: MEDIUM_WAIT });
  ```

- **Catch signal:** a `fill(v)` / `pressSequentially(v)` immediately followed by
  `expect(locator).toHaveValue(v)` on such an input — the self-check on your own
  fill is the tell that the value can slip. See `csv-parse-options.spec.ts`'s
  `setParseOptionUntilStuck`.

  **Find candidates:**

  ```bash
  grep -rEn '\.(fill|pressSequentially)\(' tests/e2e --include="*.ts" -A2 \
    | grep -B2 'toHaveValue'
  ```

## Large-file parses run in a fresh browser process

- E2E runs single-worker (`workers: 1`), so specs run one at a time but share
  **one long-lived Chromium process** whose heap/allocator pressure grows across
  the run. A large DuckDB-WASM parse that is fast on a clean process can slow
  enough late in the run to trip its timeout — the failure lands on a different
  heavy-parse spec each run while each passes in isolation.
- A spec that **flakes because a large data-file parse (~10,000 rows or larger)
  slows down late in the run** must use the `freshBrowserPage` fixture from
  `tests/e2e/fixtures/e2e.fixture.ts`, aliased to `page`:
  `async ({ freshBrowserPage: page, e2eWorkerDb }) => { … }`. The row count is a
  guideline that flags a **candidate** (magnitude, judged by row count, not
  bytes). The current user / anchor is `excel-import` (~17k-row XLSX).
- `freshBrowserPage` gives a **fresh, cold** process — the right cure only for a
  large parse that slows on an **aged** process. A candidate whose flake is the
  **opposite** (it needs a **warm** process) must stay on the shared `page`: a
  heavy route that is slow to compile/render cold (e.g. the Puck
  dashboard-editor iframe with recharts) fails **harder** on a freshly launched
  browser. `dashboard-chat-block` (~14.7k-row upload) is that counter-example —
  it clears the row-count bar but its flake is cold-render, so it uses `page`.
  Flag a diff that puts such a spec on `freshBrowserPage`, and confirm a
  candidate's flake is parse-slowness-on-an-aged-process before opting it in.
- Below the threshold, keep the shared `page`. Do not put small-fixture specs
  (including ones that only seed a ~100-row file as a precondition) on the fresh
  browser — the ~200-500ms relaunch is wasted there.

  **Find candidates** (specs that parse a large fixture on the shared `page`):

  ```bash
  # Large fixtures (~10k+ rows); adjust the fixture list to the repo.
  grep -rEn 'CALIFORNIA_(CSV|XLSX)_PATH|CHOLERA_NYC_XLSX_PATH' \
    tests/e2e/*.spec.ts
  # For each hit, decide fresh vs warm: aged-parse flake -> freshBrowserPage;
  # cold-render flake (heavy editor/iframe route) -> keep page.
  ```

## Cleanup

- Every E2E spec must leave the database in the same shape it was in before the
  test ran. Resources created **during** the test (datasets, dashboards, virtual
  datasets, resource_shares, role groups, profiles, etc.) and state the test
  **mutated** on existing resources (membership role-group reassignments,
  permission matrix overrides, feature-flag overrides, etc.) must both be
  cleaned up before the spec returns.
- Cleanup must run even when the spec fails or throws. Use one of the two
  supported patterns:
  1. **`try { … } finally { … }` around the test body**, calling the repo's
     admin cleanup helpers (`deleteDashboardsByIds`, `deleteDatasetAndShares`,
     `restoreE2ESecondaryMemberRoleGroup`, etc.) from `tests/e2e/helpers/`. Track
     created ids in arrays (`createdDashboardIds: string[]`) and push as you
     create.
  2. **A Playwright fixture** that owns setup _and_ teardown for the resource.
     Fixtures in `tests/e2e/fixtures/` already follow this pattern (for example
     `e2eWithGlobalViewerMembership.fixture.ts`) and should be extended rather
     than recreated when a new shared resource needs the same lifecycle.
- Setup-only `await admin.from(...).insert(...)` blocks with no matching delete
  in `finally` (or in a fixture teardown) are a finding, even if the seed data is
  "small" or "harmless". Cross-spec leakage causes flake that is expensive to
  diagnose later.
- When a spec mutates state on a seeded user / membership / role group that other
  specs will later read (the secondary user's role group is the canonical
  example), the restore call belongs in `finally` so a thrown assertion never
  leaves the user in a half-modified state.
- Do not rely on `afterEach` / `afterAll` for resource cleanup set up inside the
  test body: those hooks run even when the body threw before capturing the
  resource id, leaving cleanup with nothing to delete. `try { … } finally { … }`
  pairs the cleanup with the capture and is what the rest of the suite uses.

  **Find candidates** (specs that create resources but never use `finally`):

  ```bash
  # Specs that look like they create resources but have no try/finally block.
  for f in <files-in-diff-under-tests/e2e-ending-in-.spec.ts>; do
    if grep -Eq '\b(admin|supabaseAdmin)\.(from|rpc)\b|createSupabaseAdminClient' "$f" \
       && ! grep -q '\bfinally\b' "$f"; then
      echo "no try/finally cleanup: $f"
    fi
  done

  # Specs that import a delete helper but never call it inside a finally.
  grep -rEn 'import .*(delete[A-Z][a-zA-Z]+|restoreE2E[A-Z][a-zA-Z]+)' \
    tests/e2e/*.spec.ts
  ```

  False positives: specs that delegate all setup + teardown to a fixture (e.g.
  `e2eWithGlobalViewerMembership`) won't have `finally`, and that is correct.
  Check for such a fixture before flagging.

  This is bad:

  ```ts
  test("creates a dashboard", async ({ page, e2eWorkerDb }) => {
    const admin = createSupabaseAdminClient();
    // ...
    await page.getByRole("button", { name: "Create a dashboard" }).click();
    // no try/finally, no fixture, no cleanup — the row leaks into the next spec
  });
  ```

  This is good:

  ```ts
  test("creates a dashboard", async ({ page, e2eWorkerDb }) => {
    const admin = createSupabaseAdminClient();
    const createdDashboardIds: string[] = [];
    try {
      await page.getByRole("button", { name: "Create a dashboard" }).click();
      const dashboardId = parseDashboardIdFromUrl(page.url());
      if (dashboardId) {
        createdDashboardIds.push(dashboardId);
      }
      // ...assertions...
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
  ```

## Test timeouts

- Do not change the default test-level timeout from inside a spec: no
  `test.setTimeout(...)`, and no `timeout` option on `test(...)`,
  `test.describe(...)`, or `test.beforeAll/Each(...)`. Test-level timeouts are
  configured globally in `playwright.config.ts` so the suite stays consistent
  and a flaky test cannot mask the underlying issue by raising its own ceiling.
- If a spec is genuinely too slow, investigate the root cause (a real bug, a
  missing wait, a costly fixture); only the global config should change, and only
  after the cause is understood.

  **Find candidates:**

  ```bash
  grep -rEn 'test\.setTimeout\(|\.configure\(\s*\{[^}]*timeout' \
    tests/e2e/ --include="*.ts"
  grep -rEn '\btest(\.(describe|beforeAll|beforeEach|afterAll|afterEach))?\s*\([^)]*timeout *:' \
    tests/e2e/ --include="*.ts"
  ```

  Locator-level timeouts (`expect(...).toBeVisible({ timeout: MEDIUM_WAIT })`,
  `page.click(..., { timeout: SHORT_WAIT })`) are fine when they use the shared
  `SHORT_WAIT` / `MEDIUM_WAIT` / `LONG_WAIT` constants — do not flag those.
