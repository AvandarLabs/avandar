# `@avandar/models` Checklist

Use this checklist when the repo under review depends on
`@avandar/models`. Confirm by checking `package.json` (or any
`package.json` in a monorepo) for a `@avandar/models` dependency, OR by
grepping the diff and surrounding code for imports from `@avandar/models`.
A short alias such as `@models` counts only when the repo config shows
that it resolves to `@avandar/models`.

If `@avandar/models` is not present in the repo, **skip this entire
checklist**, even if the repo has unrelated files named `*.types.ts`.

## Construct models with `Model.make`

- When constructing an instance of a typed Model, use
  `Model.make("ModelName", { ... })` rather than a bare object literal
  cast to the model's type. `Model.make` brands the result with the
  model type tag and keeps construction sites grep-able.

  This is bad:

  ```ts
  const result: ProcessResult = {
    summary,
    details,
  };
  ```

  This is good:

  ```ts
  const result = Model.make("ProcessResult", {
    summary,
    details,
  });
  ```

## Import the namespace entry, not `.types.ts`

- A Model created with `@avandar/models` has two co-located files:
  `<ModelName>/<ModelName>.ts` (the namespace entry) and
  `<ModelName>/<ModelName>.types.ts` (the type definitions). The
  namespace entry is the public contract; `.types.ts` is an
  implementation detail.

  When importing from a Model from outside its own folder, import the
  namespace entry and reach for types through the namespace.

  **Find candidates** (any import from a model's `.types.ts`):

  ```bash
  grep -rEn 'from "[^"]*models/[^"]*\.types(\.ts)?"' \
    --include="*.ts" --include="*.tsx" .
  ```

  Each hit is a candidate. The legitimate ones are imports made from
  *inside* the same model's folder (sibling `*.ts`, parser, module
  file); flag everything else and route the import through the
  namespace entry instead.

  This is bad:

  ```ts
  import type { ProcessResultRead } from
    "@/models/ProcessResult/ProcessResult.types.ts";
  import type { ProcessStatus } from
    "@/models/ProcessResult/ProcessResult.types.ts";

  function format(result: ProcessResultRead): string { ... }
  ```

  This is good:

  ```ts
  import { ProcessResult } from
    "@/models/ProcessResult/ProcessResult";

  function format(result: ProcessResult.T): string { ... }
  // and ProcessResult.ProcessStatus for the related type
  ```

  Exception: files inside the model's own folder (`*.types.ts`, parsers,
  modules) may import sibling type files directly because they are the
  files that define the namespace.
