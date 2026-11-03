# Testing rules

Rules for unit and integration tests (Vitest). End-to-end (Playwright) rules
live in [`e2e-testing.md`](e2e-testing.md).

## Every test must be able to fail for a real, behavioral reason

A test earns its place only if it can turn red when the behavior it covers
breaks. If the only way to make a test fail is to delete or rename the symbol it
references, it verifies nothing that TypeScript and the module's own imports do
not already guarantee.

Do not write **tautological or assertion-free tests**: tests that only assert a
value exists, that it has a given type, or some other fact the compiler already
enforces.

Bad. This only checks that something was coded. In a typed codebase the export
is already guaranteed to exist and be callable, so the test stays green through
any behavioral regression:

```ts
it("is a function", () => {
  expect(typeof SessionSecret.issueAckToken).toBe("function");
});
```

Good. This asserts observable output, so a regression in token issuance turns it
red:

```ts
it("issues a token whose header carries the payload hash", async () => {
  const token = await SessionSecret.issueAckToken({
    workspaceId,
    userId,
    payloadHash,
  });
  const [headerB64] = token.split(".");
  const header = JSON.parse(atob(headerB64));
  expect(header.payloadHash).toBe(payloadHash);
});
```

## Do not restate the type system

TypeScript already guarantees types, required arguments, and that exported
symbols exist. A runtime test that only re-checks those (a `typeof` check, a
`toBeDefined()` on a non-nullable value, an argument the signature already makes
required) adds maintenance cost with no added safety. Assert on what the types
cannot: values, side effects, and error paths.

## Name a test after what it asserts

A test name is read far more often than the test body, and almost always by
someone deciding whether a failure matters. It has one job: say what is true
when the test passes. Name it after the assertion, not after the machinery that
gets there.

This rule covers unit, integration and e2e tests alike.

Vague process verbs are the usual failure. "parses", "handles", "processes",
"works with" and "supports" all describe activity rather than a claim, so they
survive any change to what is actually checked, including the change that
deletes the assertion:

```ts
// Bad. Passing tells you something was parsed. It does not tell you what was
// required of the result, and it stays accurate if the assertion is weakened
// to "did not throw".
test("imports a picked sheet, parsing a column that turns into prose", ...)

// Good. The name is the claim, so a reader knows without opening the body
// that the count is what turns this red.
test("imports every row when a numeric column ends in prose", ...)
```

Practical checks, in order of how often they catch something:

- **State the outcome, not the steps.** If the name describes what the test
  *does*, rewrite it as what the test *proves*. A name and its assertions
  should be swappable descriptions of one another.
- **Do not promise what the test does not check.** The example above asserts a
  row count. Naming it "detects the column as text" would claim a type
  assertion that is not there, which is worse than being vague: the next
  reader takes the coverage as given and does not add it.
- **Name the condition when the test exists because of one.** "when a numeric
  column ends in prose" is the reason this test was written, and a failure
  reads as a specific regression rather than as "the Sheets test broke".
- **One claim per test.** A name needing "and" usually marks two tests, unless
  the second half is a precondition of the first.

Read the name against a red run: if `FAILED: <name>` does not tell you what
broke, the name is not doing its job.

## Test behavior, not structure

Assert on outputs, side effects, and error branches, not on the shape of the
implementation. A test that inspects internal wiring breaks on harmless
refactors and passes through real behavioral breaks: the opposite of what a
test should do.

## Prefer `it.todo` over a placeholder

If a genuine behavioral test cannot be written yet (for example it needs an
integration harness that does not exist), do not ship a placeholder
existence/`typeof` test to fill the gap. Leave an `it.todo("...")` or a comment
describing the contract instead. A `todo` documents the missing coverage
honestly; a passing tautology hides it behind a green check.

## Name a test file after the module beside it

A test file outside a `__tests__/` directory takes the name of the module file
beside it: `DuckDbClient.test.ts` tests `DuckDbClient.ts` in the same
directory, and `ManualQueryForm.test.tsx` tests `ManualQueryForm.tsx`. The
module name is the filename up to the first dot. A reader finds the code
under test by that name, so a test named after no file beside it
(`mapSourceReadiness.test.tsx` in a directory with no `mapSourceReadiness.ts`)
leaves them guessing which modules it covers.

A test with no single module to take its name from exercises several modules
together, so it is an integration test. Move it into a `__tests__/` directory,
per
[Integration tests go in a `__tests__/` directory](#integration-tests-go-in-a-__tests__-directory).

## Add an aspect label only when a module has several test files

A module's only test file is `{ModuleName}.test.ts(x)`, with nothing between
the module name and `.test`. An aspect label such as `.filters` or `.props`
exists to tell one test file of a module from another, so a module with one
test file has nothing to tell apart. Use `{ModuleName}.{aspect}.test.ts(x)`
only once the module has two or more test files, which by then live in a
`__tests__/` directory (see below).

```txt
# Bad: the module's only test file carries a label
ManualQueryForm/
  ManualQueryForm.tsx
  ManualQueryForm.filters.test.tsx

# Good
ManualQueryForm/
  ManualQueryForm.tsx
  ManualQueryForm.test.tsx
```

Count every test file for the module, both beside it and in its
`__tests__/`. Test-only helpers such as fixtures do not count: one test plus a
fixtures file in `__tests__/` is still `__tests__/BarChart.test.tsx`.

These segments are not aspect labels and stay on a lone test file:

1. A segment that is part of the module's own filename.
   `ChartFocusEdit.contract.test.ts` tests `ChartFocusEdit.contract.ts`, and
   `pdfSniff.worker.test.ts` tests `pdfSniff.worker.ts`.
2. A segment a test runner selects files by. The root
   `vitest.executed.config.ts` runs only `*.executed.test.ts`, and
   `apps/desktop` runs `*.integration.test.ts` under `bun test` instead of
   Vitest. Renaming one of these moves the test to a different runner or out
   of every runner.
3. The `.integration` label on an integration test, per
   [Name an integration test `{behavior}.integration.test.ts`](#name-an-integration-test-behaviorintegrationtestts).

## Split test files live in a `__tests__/` directory

A module keeps its test beside it while there is one test file:
`DuckDbClient.ts` next to `DuckDbClient.test.ts`. Once a suite grows big enough
to be split, the pieces move into a `__tests__/` directory:

```txt
DuckDbClient/
  DuckDbClient.ts
  __tests__/
    DuckDbClient.datasetLeasing.test.ts
    DuckDbClient.mutationPoisoning.test.ts
    DuckDbClient.publicSnapshotReads.test.ts
    DuckDbClient.ownership.fixtures.ts
```

The trigger is two or more **test-related files** for the same module in one
directory. A test-related file is a `{ModuleName}.*test.ts(x)` file, or any
file used exclusively by tests: a `*Fixtures.ts(x)` or `*.fixtures.ts(x)`
file, stub, scenario builder, or test wrapper. The module name is the filename
up to the first dot (or, for a fixtures file, the name without the
`TestFixtures`/`Fixtures` suffix). `DuckDbClient.test.ts` and
`DuckDbClient.leasing.test.ts` are two files for `DuckDbClient`. So are
`BarChart.test.tsx` and `BarChartTestFixtures.tsx`: one test plus its
fixtures is already two, so both move into `__tests__/`.

Only a lone test file with no test-only helpers stays beside its module.

### One test file per directory, whatever the module names

The count is per **directory**, not per module name. A directory may hold at
most one `*.test.ts(x)` file outside a `__tests__/` directory. Different module
names are not a loophole: `PairChartForms.test.tsx` and
`PieFunnelChartForm.test.tsx` in one directory are two test files, so the
directory is a violation even though no two share a module name.

When a directory would hold two or more test files, pick one:

1. **One module's split suite:** move that module's tests and test-only helpers
   into a `__tests__/` directory beside the module (the rule above).
2. **Tests for different modules:** give each module its own subdirectory with
   the module file and its test colocated (`Module1/Module1.ts` and
   `Module1/Module1.test.ts`).
3. **One test spanning several sibling modules** (it renders or exercises
   several of them together, so it belongs to none): put it in a `__tests__/`
   directory in the lowest directory containing all of those modules.

Option 2 is the default. Use option 3 only when the test genuinely covers
several modules at once.

Anything used **exclusively** by those tests moves in too: fixtures, stubs,
scenario builders, custom assertions. If a helper has even one non-test
importer it stays outside, because it is production code.

### One module per `__tests__/`

A `__tests__/` directory groups the split suite of **one** module. It is not a
bucket for unrelated test files. The only exception is a `__tests__/` holding
tests that each span several sibling modules (option 3 above), which has no
single owner.

`__tests__/Module1.test.ts` next to `__tests__/Module2.test.ts` means
`Module2` wants its own directory:

```txt
Module2/
  Module2.ts
  Module2.test.ts
```

That is the same directory-for-coupling rule components follow, applied to a
module and its test.

### Integration tests go in a `__tests__/` directory

An integration test covers several modules by definition, so it cannot sit
beside any one of them or inside any one module's `__tests__/`. Put it in a
`__tests__/` directory inside the lowest directory that contains every module
it exercises, and name it after the behavior it covers, since no module name
fits:

```txt
GisApp/
  GisApp.tsx
  GisApp.test.tsx
  layers/useMapLayersData/useMapLayersData.ts
  useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapSources.ts
  __tests__/
    mapSourceReadiness.integration.test.tsx
```

If that directory is the app root, the test is too broad to be an integration
test. Write an e2e test under `tests/e2e/` instead.

Exception: a test whose module lives where the test cannot run. A file under
`shared/` cannot import the Node-only executed-test harness
(`tests/integration/queries/executedDuckDb.ts`), so an executed test of a
`shared/` module goes in a `__tests__/` under `src/` and imports the module
through `$/`, as
`src/lib/openData/__tests__/buildCsvFromDatastoreRecords.executed.test.ts`
does. It keeps the module's name.

### Name an integration test `{behavior}.integration.test.ts`

An integration test's filename is the behavior it covers, then
`.integration`, then `.test.ts(x)`: `mapSourceReadiness.integration.test.tsx`.
The behavior name matches no module, so without the label a reader cannot
tell an integration test from a unit test whose module was renamed or
deleted. With it, a `__tests__/` file named after no module is visibly either
an integration test or a mistake.

When the test also runs under a runner that selects files by suffix,
`.integration` goes before the runner's suffix so the runner still matches
it: `dashboardFilterColumnBindings.integration.executed.test.ts`.

A test that keeps a module's name (a split suite, or the executed-test
exception above) is not an integration test and takes no `.integration`.

### Find violations

```bash
find src shared packages apps -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) \
  -not -path '*/node_modules/*' -not -path '*/__tests__/*' \
  -printf '%h\n' | sort | uniq -c | awk '$1 > 1'
```

Each row is a directory holding that many test files outside `__tests__/`, and
every row is a violation regardless of the module names. Only `tests/e2e/` and
`tests/integration/` are exempt, since they are dedicated test trees.

Also list the test files named after no module beside them. Each one is either
a test to rename after the one module it covers, or an integration test to
move into a `__tests__/` directory:

```bash
find src shared packages apps -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) \
  -not -path '*/node_modules/*' -not -path '*/__tests__/*' |
  while read -r test; do
    module="$(dirname "$test")/$(basename "$test" | cut -d. -f1)"
    ls "$module".* 2>/dev/null | grep -qv '\.test\.' || echo "$test"
  done
```

List the lone test files that carry an aspect label. Each one is a module's
only test file, so it should drop the label, unless the label is one of the
exceptions in
[Add an aspect label only when a module has several test files](#add-an-aspect-label-only-when-a-module-has-several-test-files):

```bash
git ls-files '*.test.ts' '*.test.tsx' | grep -v '^tests/' |
  while read -r test; do
    name="$(basename "$test")"
    module="${name%%.*}"
    stem="${name%.test.*}"
    [ "$stem" = "$module" ] && continue
    case "$name" in *.integration.test.* | *.executed.test.*) continue ;; esac
    dir="$(dirname "$test")"
    owner="$dir"
    [ "$(basename "$dir")" = __tests__ ] && owner="$(dirname "$dir")"
    { [ -e "$owner/$stem.ts" ] || [ -e "$owner/$stem.tsx" ]; } && continue
    count="$(ls "$owner" "$owner/__tests__" 2>/dev/null |
      grep -c "^$module\..*test\.")"
    [ "$count" -eq 1 ] && echo "$test"
  done
```

Those scripts only look at test files. Also look for fixtures that sit beside a
test outside `__tests__/`:

```bash
find src shared packages apps -type f \
  \( -name '*Fixtures.ts' -o -name '*Fixtures.tsx' -o -name '*.fixtures.ts' \) \
  -not -path '*/node_modules/*' -not -path '*/__tests__/*'
```

Every hit whose directory also holds a test for the same module is a
violation. A fixtures file shared by tests of several modules belongs in a
`__tests__/` directory at their lowest common directory instead (see
integration tests above).
