# Testing rules

Rules for unit and integration tests (Vitest).

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
