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

The trigger is two or more `{ModuleName}.*test.ts` files for the same module in
one directory, where the module name is the filename up to the first dot.
`DuckDbClient.test.ts` and `DuckDbClient.leasing.test.ts` are two files for
`DuckDbClient`; they belong together.

Anything used **exclusively** by those tests moves in too: fixtures, stubs,
scenario builders, custom assertions. If a helper has even one non-test
importer it stays outside, because it is production code.

### One module per `__tests__/`

A `__tests__/` directory groups the split suite of **one** module. It is not a
bucket for unrelated test files.

`__tests__/Module1.test.ts` next to `__tests__/Module2.test.ts` means
`Module2` wants its own directory:

```txt
Module2/
  Module2.ts
  Module2.test.ts
```

That is the same directory-for-coupling rule components follow, applied to a
module and its test.

### Integration tests go at the highest common ancestor

An integration test covers several modules by definition, so it cannot sit
inside any one module's `__tests__/`. Put it at the lowest directory that
contains every module it exercises.

If that directory is the app root, the test is too broad to be an integration
test. Write an e2e test under `tests/e2e/` instead.

### Find violations

```bash
find src shared packages apps -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) \
  -not -path '*/node_modules/*' -not -path '*/__tests__/*' \
| awk -F/ '{ dir=""; for(i=1;i<NF;i++) dir=dir $i "/"; split($NF, p, "."); print dir "\t" p[1] }' \
| sort | uniq -c | awk '$1 > 1 { print $1"  "$2"  module="$3 }'
```

Each row is a directory holding that many split test files for one module, and
every row is a violation.
