# Tests checklist

Review changed test files (`*.test.*`, `*.spec.*`) for whether each test
actually protects behavior. A test that cannot fail for a real, behavioral
reason is worse than no test: it reports coverage that does not exist. Apply
these rules only to test lines in the diff.

This file is the core of the `tests` focused review. That pack applies
this checklist only; it does not apply comment, naming, or file-layout
rules from other phases.

## Test names must state what the test asserts

Flag a test name that describes activity rather than a claim. A name is read
far more often than the body, almost always by someone triaging a failure, so
it has one job: say what is true when the test passes.

The tell is a process verb with no outcome attached: "parses", "handles",
"processes", "works with", "supports", "checks". These survive any change to
what is actually asserted, including the change that removes the assertion.

```ts
// Flag this. Passing tells you something was parsed, not what was required
// of the result.
test("imports a picked sheet, parsing a column that turns into prose", ...)

// Recommend this. The name is the claim the assertions make.
test("imports every row when a numeric column ends in prose", ...)
```

When recommending a rewrite:

- Take the name from the assertions. If the name describes steps, restate it
  as the outcome those steps have to produce.
- Never let the name promise more than the body checks. A name claiming a
  type, a count or an error the test does not assert is worse than a vague
  one: it reports coverage that does not exist, so nobody adds it.
- Keep the condition that made the test worth writing ("when the column ends
  in prose"), so a failure reads as a specific regression.
- A name needing "and" is usually two tests, unless the second half is a
  precondition of the first.

Apply the same test to `describe` blocks: the block plus the name is what the
runner prints, so judge them together.

## Tautological and assertion-free tests

Flag any test whose assertion can only fail if a symbol is deleted or renamed,
not if the behavior regresses. The most common form checks a value's existence
or type:

```ts
it("is a function", () => {
  expect(typeof myModule.doThing).toBe("function");
});
```

In a typed codebase the compiler already guarantees the export exists and is
callable, so this test gives no signal: it stays green through any behavioral
break. Recommend replacing it with a test that exercises `doThing`'s observable
output, side effects, or error path. If that genuinely needs a harness the repo
does not have yet, recommend an `it.todo("...")` plus a comment describing the
contract, not a passing placeholder.

Other tautologies to flag:

- `expect(x).toBeDefined()` / `toBeTruthy()` on a value the types already make
  non-nullable.
- Asserting a constant equals the same literal the source defines (the test
  would need editing in lockstep with the code, so it catches nothing).
- A runtime `it` that only re-checks a type already covered by `expectTypeOf`
  or by the compiler.
- Snapshotting or asserting a value the test itself just constructed in the
  same block.

## Tests must assert observable behavior

A test should assert on outputs, side effects, and error branches, not on the
shape of the implementation. Flag tests that inspect internal wiring or private
structure: they break on harmless refactors and pass through real behavioral
breaks, the opposite of what a test should do.

## Placeholder tests

Flag tests that exist only to make a file "have a test" (`expect(true).toBe(true)`,
a bare `typeof` check, an empty `it` body). Recommend `it.todo` for
known-missing coverage so the gap is visible instead of hidden behind a green
check.

## Restating the type system

Flag runtime assertions that only re-verify what TypeScript already enforces:
that a required argument is required, that an exported symbol exists, that a
value has a declared type. These add maintenance cost with no added safety.

## E2E only: seed preconditions in the DB, drive the behavior under test through the UI

**Scope: end-to-end / browser specs** (e.g. Playwright) that run against a live
app backed by a real database and an admin/service-role client. Does not apply to
unit/integration tests.

Separate a spec's **preconditions (Arrange)** from the **behavior under test
(Act)**:

- A direct database write (admin/service-role client) is a **fixture**
  mechanism. It is appropriate only to _seed preconditions_ the spec depends on
  but does not itself assert (done in setup, **before the first page load**), to
  _tear down_ state, to _bypass an out-of-scope / slow / external system_ that is
  not what the spec verifies, or as a _read-only oracle_ (look up an id, assert
  persisted state).
- The **behavior under test** — any state change a real user would make that the
  spec exercises or asserts on — must be driven **through the UI** by simulating
  the user, never shortcut with a direct write. This is the default.

Flag a direct write (admin/service-role `.insert` / `.update` / `.upsert` /
`.delete`) that runs **after the UI is loaded** and mutates state the app is
showing, when that mutation is a normal user action (rename, create, share,
edit). Two things break:

1. **Coverage** — the write skips the app's real code path (validation,
   authorization/permission checks, the mutation itself, the cache update), so
   the spec stops proving that path works. This holds even when the spec is not
   about permissions: a direct write sails past an allow/deny check the real
   flow would enforce, so an authorization regression stays green.
2. **State coherence** — the running client caches server state (a query cache,
   often persisted). A write behind the app's back leaves that cache stale,
   producing flaky false failures or false passes.

Recommend driving the action through the UI. If a mutation is only needed to
reach a precondition, move it into setup before the page loads; if a distinct
label is only needed to disambiguate, make the entity the only one of its kind
and select it by position/id instead of renaming it mid-test.

- Always name a test file outside a `__tests__/` directory after a module file
  in the same directory: `Foo.test.ts` or `Foo.aspect.test.ts` sits beside
  `Foo.ts` or `Foo.tsx`. The module name is the filename up to the first dot.
  A reader finds the code under test by that name, so a test named after no
  file beside it leaves them guessing which modules it covers. Recommend one
  of: 1) rename the test after the one module it exercises; 2) when it
  exercises several modules together, it is an integration test, so move it
  into a `__tests__/` directory per the integration-test bullet below.
  Exception: `tests/e2e/` and `tests/integration/` are dedicated test trees
  and exempt.

  This is bad:

  ```txt
  checkout/
    formatOrderTotal.ts
    useCartItems/useCartItems.ts
    checkoutTotals.test.tsx
  ```

  This is good:

  ```txt
  checkout/
    formatOrderTotal.ts
    useCartItems/useCartItems.ts
    __tests__/
      checkoutTotals.test.tsx
  ```

- Always move a module's test-related files into a `__tests__/` directory once
  two or more of them share a module name in the same directory. Count test
  files **and** test-only helpers (`*Fixtures.ts(x)`, `*.fixtures.ts`, stubs,
  scenario builders, test wrappers) together. A module keeps its test beside it
  only when the test is the lone test-related file; a split suite scattered
  across the module directory buries the production files among its own tests.
  The module name is the filename up to the first dot, so `DuckDbClient.test.ts`
  and `DuckDbClient.leasing.test.ts` are two files for `DuckDbClient`, and so
  are `BarChart.props.test.tsx` and `BarChartTestFixtures.tsx`. A test plus a
  fixtures file is already a split suite: flag it.

  Anything used **exclusively** by those tests moves in with them: fixtures,
  stubs, scenario builders, custom assertions. Exceptions: 1) a helper with
  even one non-test importer stays outside, because it is production code;
  2) a lone test file with no test-only helpers stays colocated with its
  module.

  **Find candidates** (a directory with 2+ test files outside `__tests__/`):

  ```bash
  find . -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) \
    -not -path '*/node_modules/*' -not -path '*/__tests__/*' \
    -printf '%h\n' | sort | uniq -c | awk '$1 > 1'
  ```

  Every row this prints is a violation.

- Allow at most one `*.test.ts(x)` file per directory outside a `__tests__/`
  directory, **whatever the module names are**. Two tests for different modules
  in one directory (`PairChartForms.test.tsx` next to
  `PieFunnelChartForm.test.tsx`) are not a loophole around this. Flag the
  directory and recommend one of: 1) a `__tests__/` beside the module for one
  module's split suite; 2) a subdirectory per module with the module and its
  test colocated (the default for tests of different modules); 3) a
  `__tests__/` at the lowest common directory, only for a test that genuinely
  spans several sibling modules at once. `tests/e2e/` and `tests/integration/`
  are exempt. Check every directory touched by the diff, including test files
  the diff did not add but now sits beside.

- Never put test files for two different modules in one `__tests__/`
  directory. `__tests__/` groups the split suite of a single module; two module
  names inside it means the second module wants its own directory, pairing it
  with its own test the way a component directory pairs with its children.

  This is bad:

  ```txt
  clients/__tests__/DuckDbClient.test.ts
  clients/__tests__/QetlClient.test.ts
  ```

  This is good:

  ```txt
  clients/DuckDbClient/DuckDbClient.ts
  clients/DuckDbClient/DuckDbClient.test.ts
  clients/QetlClient/QetlClient.ts
  clients/QetlClient/QetlClient.test.ts
  ```

- Place an integration test in a `__tests__/` directory inside the lowest
  directory containing every module it exercises, and name it after the
  behavior it covers. It covers several modules by definition, so it cannot
  sit beside any one of them or belong to any one module's `__tests__/`:
  either placement implies an ownership that is not real. If that lowest
  common directory is the application root, the test is too broad to be an
  integration test: recommend an e2e test instead. Exception: a test whose
  module lives where the test cannot run (for example a module that must stay
  loadable by another runtime, tested with a harness only Node can load) may
  sit in a `__tests__/` elsewhere and keeps the module's name.
