# `@avandar/utils` Checklist

Use this checklist when the repo under review depends on
`@avandar/utils`. Confirm by checking `package.json` (or any `package.json`
in a monorepo) for a `@avandar/utils` dependency, OR by grepping the diff
and surrounding code for imports from `@avandar/utils`. A short alias such
as `@utils` counts only when the repo config shows that it resolves to
`@avandar/utils`.

If `@avandar/utils` is not present in the repo, **skip this entire
checklist**, even if the repo has unrelated helpers with the same names.
The general functional-style and TypeScript checklists still apply; only
the helpers below are package-specific.

## Higher-order property helpers (`prop`, `propEq`)

- Prefer the higher-order helpers `prop`, `propEq`, `propIn`, etc. from
  `@avandar/utils` over inline arrow functions that only read a property,
  compare a property, or return a property. These helpers are point-free,
  more declarative, and avoid the visual noise of `(x) => x.foo`.

  **Find candidates** (inline lambdas inside `.map` / `.filter` / `.find`
  / `.some` / `.every` / `.flatMap` that only read a property or compare
  one):

  ```bash
  # property-read lambdas: .map((x) => x.foo) or .map((x) => { return x.foo; })
  grep -rEn '\.(map|flatMap|filter|find|some|every)\(\s*\(([a-zA-Z_]+)\)\s*=>\s*\2\.[a-zA-Z_]+' \
    --include="*.ts" --include="*.tsx" .

  # property-equality lambdas: .find((x) => x.id === value)
  grep -rEn '\.(find|filter|some|every)\(\s*\(([a-zA-Z_]+)\)\s*=>\s*\2\.[a-zA-Z_]+\s*===' \
    --include="*.ts" --include="*.tsx" .
  ```

  Non-exhaustive: misses block-body arrows (`(x) => { return x.foo; }`)
  and lambdas bound to a named variable. Scan the diff by eye for those.

  This is bad:

  ```ts
  models.map((model) => {
    return model.id;
  });
  models.find((model) => {
    return model.id === resolvedModelId;
  });
  resources.filter((r) => {
    return r.resourceType === "dataset";
  });
  groups.flatMap((g) => g.models);
  ```

  This is good:

  ```ts
  models.map(prop("id"));
  models.find(propEq("id", resolvedModelId));
  resources.filter(propEq("resourceType", "dataset"));
  groups.flatMap(prop("models"));
  ```

  `prop` also accepts dotted paths (`prop("baseColumn.name")`), and `propEq`
  composes the same way (`propEq("baseColumn.name", targetName)`). Use the
  dotted form rather than an inline lambda for nested reads.

## Exhaustive union dispatch (`matchLiteral`)

- Dispatch on a string-literal or enum union with `matchLiteral` (from
  `@avandar/utils`) or `match().exhaustive()` (from `ts-pattern`, only if
  the repo depends on `ts-pattern`). Both fail to compile when a union case
  is unhandled.
  Plain `switch` (with or without `default`) and `if`/`else if` chains do
  not check exhaustiveness, so don't use them for union dispatch.

  Prefer `matchLiteral` when the dispatch is a pure value lookup with no
  per-case logic, since the call site reads as a record literal.

  **Find candidates** (`switch` statements, which often dispatch on
  enums / string-literal unions):

  ```bash
  grep -rEn '^\s*switch *\(' --include="*.ts" --include="*.tsx" .
  ```

  Each hit is a candidate. Replace with `matchLiteral` (pure value
  lookup) or `match().exhaustive()` (per-case logic) when the discriminant
  is a string-literal or enum union. Leave the switch alone when the
  discriminant is a true open string (file extensions arriving from
  user input, etc.).

  Also scan `if (x === "a") { ... } else if (x === "b") { ... }` chains
  by eye; they are not cleanly greppable but are the same anti-pattern.

  This is bad:

  ```ts
  function statusLabel(status: JobStatus): string {
    switch (status) {
      case "queued":
        return "Queued";
      case "running":
        return "Running";
      // forgot complete + failed; compiles silently
    }
  }
  ```

  This is good:

  ```ts
  function statusLabel(status: JobStatus): string {
    return matchLiteral(status, {
      queued: "Queued",
      running: "Running",
      complete: "Complete",
      failed: "Failed",
    });
  }
  ```

## Utility reuse

- Avoid hand-writing common utility or data-transformation logic when the
  installed `@avandar/utils` package already provides it. Common examples
  include property mapping, bucketing, partitions, object reshaping,
  filtering helpers, and lookup builders. For example, prefer
  `items.map(prop("id"))` over a custom mapper that only returns `item.id`.

- The `@avandar/utils` package README enumerates the available helpers.
  Reviewers and authors should consult the installed package docs, package
  README, or local source for the package when it exists in the repo before
  introducing a bespoke helper.
