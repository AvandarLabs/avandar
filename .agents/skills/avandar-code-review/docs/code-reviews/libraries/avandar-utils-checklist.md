# `@avandar/utils` Checklist

Use this checklist when the repo under review depends on
`@avandar/utils`. Confirm by checking `package.json` (or any `package.json`
in a monorepo) for a `@avandar/utils` dependency, OR by grepping the diff
and surrounding code for imports from `@avandar/utils` or its short alias
`@utils`.

If `@avandar/utils` is not present in the repo, **skip this entire
checklist**. The general functional-style and TypeScript checklists still
apply; only the helpers below are package-specific.

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
  `@avandar/utils`) or `match().exhaustive()` (from `ts-pattern`, if the
  repo uses it). Both fail to compile when a union case is unhandled.
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
  by eye — they are not cleanly greppable but are the same anti-pattern.

  This is bad:

  ```ts
  function pageLabel(app: ChatApp): string {
    switch (app) {
      case "data-explorer":
        return "Data Explorer";
      case "data-sources":
        return "Data Sources";
      // forgot dashboards + other — compiles silently
    }
  }
  ```

  This is good:

  ```ts
  function pageLabel(app: ChatApp): string {
    return matchLiteral(app, {
      "data-explorer": "Data Explorer",
      "data-sources": "Data Sources",
      dashboards: "Dashboards",
      other: "Avandar",
    });
  }
  ```

## Utility reuse

- Avoid hand-writing common utility or data-transformation logic when
  `@avandar/utils` already provides it. Common examples include property
  mapping, bucketing, partitions, object reshaping, filtering helpers,
  and lookup builders. For example, prefer `users.map(prop("id"))` over
  a custom mapper that only returns `user.id`.

- The `@avandar/utils` package README enumerates the available helpers.
  Reviewers and authors should consult the README on the package's
  source path in the repo (typically `packages/shared/utils/README.md`
  in an Avandar monorepo) before introducing a bespoke helper.
