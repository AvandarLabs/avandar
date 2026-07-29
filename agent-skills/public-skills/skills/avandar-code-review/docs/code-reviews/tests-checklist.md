# Tests checklist

Review changed test files (`*.test.*`, `*.spec.*`) for whether each test
actually protects behavior. A test that cannot fail for a real, behavioral
reason is worse than no test: it reports coverage that does not exist. Apply
these rules only to test lines in the diff.

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
