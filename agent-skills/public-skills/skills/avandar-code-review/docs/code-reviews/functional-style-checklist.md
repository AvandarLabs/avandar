# Functional Style Checklist

Use this checklist when the diff includes TypeScript or TSX files.

These rules are about how code is shaped, not which library it imports.
For point-free helpers tied to a specific package (such as
`@avandar/utils`'s `prop` / `propEq`), see the matching
library-gated phase.

- No imperative `for` / `while` loops for iterating collections; prefer
  `map` / `filter` / `reduce` / `forEach` / `flatMap`, even when that means a
  second pass (e.g. `.map().filter()`). The full rule, its **only** exceptions
  (async sequencing, early-exit-for-performance, and large N — ~100,000+ — in a
  hot path), and the note that raw string-character scanning is out of scope
  live in the "Most Common Mistakes" section of this skill's `SKILL.md`. Do not
  flag a `.map().filter()` two-pass as a performance problem below that
  threshold.

- Prefer nested positive returns over a long string of negative early-exit
  `if` statements when the function is computing a value. Early-exit guards
  are appropriate for true preconditions (auth, fast paths) but become
  script-like and hard to follow when used to step through every branch of a
  value computation. Functional code reads better when the structure makes
  the returned value the focal point.

  This is bad:

  ```ts
  function getDisplayName(user: User | undefined): string {
    if (!user) {
      return "Anonymous";
    }
    if (!user.profile) {
      return user.email;
    }
    if (!user.profile.displayName) {
      return user.email;
    }
    return user.profile.displayName;
  }
  ```

  This is good:

  ```ts
  function getDisplayName(user: User | undefined): string {
    return user?.profile?.displayName ?? user?.email ?? "Anonymous";
  }
  ```

  Another example - inside an effect:

  This is bad:

  ```ts
  useEffect(() => {
    if (isLoadingResults) {
      return;
    }
    if (!queryResults) {
      return;
    }
    dispatch.syncVizFromQueryResult(queryResults.columns);
  }, [...]);
  ```

  This is good:

  ```ts
  useEffect(() => {
    if (!isLoadingResults && queryResults?.columns) {
      dispatch.syncVizFromQueryResult(queryResults.columns);
    }
  }, [...]);
  ```

- Prefer ternary expressions over `if`/`else` when the only purpose of the
  branch is to choose a value to assign or return. Ternaries make the value
  the focal point and remove the imperative mutation. Only fall back to
  `if`/`else` when the ternary would be hard to read (deeply nested, very
  long lines, or mixed with non-value side effects).

  This is bad:

  ```ts
  let resolvedModelId: string | undefined;
  if (models.length === 0) {
    resolvedModelId = selectedModelId;
  } else {
    resolvedModelId = resolveChatModelId({
      availableModels: models,
      selectedModelId,
    });
  }
  ```

  This is good:

  ```ts
  const resolvedModelId =
    models.length === 0
      ? selectedModelId
      : resolveChatModelId({
          availableModels: models,
          selectedModelId,
        });
  ```

  Another example:

  This is bad:

  ```ts
  if (isOpen) {
    return "open";
  }
  return undefined;
  ```

  This is good:

  ```ts
  return isOpen ? "open" : undefined;
  ```

- Construct objects as a single literal at the end of the function,
  not by declaring an empty object and mutating fields onto it. Compute
  each field as its own `const` above (using ternaries, `??`,
  short helper calls, or IIFEs from the earlier rule) and then assemble
  the object in one place. The final shape is then visible in one
  expression instead of scattered across `if` blocks the reader has to
  re-execute mentally.

  The bad pattern below reads like a script: you have to walk every
  branch to know what fields the returned object will actually have,
  and the type annotation does the talking instead of the literal.

  This is bad:

  ```ts
  function buildRequestBody(
    payloadParts: PayloadPart[],
    requestContext: RequestContext,
    options: {
      priority?: "low" | "normal" | "high";
      retry?: { reason?: string; attempts: number };
    },
  ): RequestBody {
    const body: RequestBody = {
      parts: payloadParts,
      context: requestContext,
    };
    if (options.priority) {
      body.priority = options.priority;
    }
    if (options.retry?.reason) {
      body.retry = options.retry;
    }
    if (payloadParts.length > 20) {
      body.compact = true;
    }
    return body;
  }
  ```

  This is good:

  ```ts
  function buildRequestBody(
    payloadParts: PayloadPart[],
    requestContext: RequestContext,
    options: {
      priority?: "low" | "normal" | "high";
      retry?: { reason?: string; attempts: number };
    },
  ): RequestBody {
    const retry =
      options.retry?.reason ?
        options.retry
      : undefined;
    const compact = payloadParts.length > 20 ? true : undefined;

    return {
      parts: payloadParts,
      context: requestContext,
      priority: options.priority,
      retry,
      compact,
    };
  }
  ```

  Notes:

  - Optional fields whose value is `undefined` can stay inline on the
    literal (TypeScript treats `{ foo: undefined }` and `{}` as
    structurally identical for an optional `foo?: T`). When that
    bothers a downstream consumer that distinguishes them, use a
    conditional spread (`...(cond ? { foo } : {})`) instead; it still
    keeps the construction inside one literal.
  - If a field's computation needs multiple intermediate names or a
    try/catch, extract it into the IIFE form from the "IIFE for
    computed value" rule above. The point is the same: every field
    lands in the final literal, no field is bolted on with mutation.

  **Find candidates** (variables initialized to an empty object literal,
  which is the canonical smell for this pattern):

  ```bash
  grep -rEn '= *\{\s*\}( as [A-Z][^=;]*)?\s*;?\s*$' \
    --include="*.ts" --include="*.tsx" .
  ```

  Each hit is a candidate. Inspect the lines that follow: if the
  variable gets `foo.bar = ...` assignments inside `if` blocks, flag
  and propose the field-then-literal refactor above. Legitimate uses
  of `= {}` exist (passing a fresh empty options bag into a library
  call, seeding a `useState({})`, etc.); filter those out first.

- Build variable-length arrays by listing every candidate inline with a
  conditional that evaluates to `undefined`, then filter out the
  `undefined`s with the codebase's `isDefined` / `isNonNullish` helper (or
  the equivalent from a standard utility library). Avoid imperative
  `push`-with-`if` style, which is harder to scan and loses the visual
  one-to-one mapping between source positions and output positions.

  This is bad:

  ```ts
  const sections: Array<{ type: "text"; text: string }> = [
    { type: "text", text: response.summary },
  ];
  if (response.details) {
    sections.push({
      type: "text",
      text: response.details,
    });
  }
  ```

  This is good:

  ```ts
  const sections = [
    { type: "text" as const, text: response.summary },
    response.details
      ? {
          type: "text" as const,
          text: response.details,
        }
      : undefined,
  ].filter(isDefined);
  ```

- Use an immediately-invoked arrow function (IIFE) to compute a value when
  the computation needs its own try/catch, multiple intermediate names, or
  a small local branch, and would otherwise leak setup variables into the
  enclosing function body. IIFEs keep each computed field in its own
  lexical scope and make the resulting object easier to read.

  This is bad:

  ```ts
  let parsedConfig: ParsedConfig | undefined;
  try {
    parsedConfig = urlSearch.config
      ? (JSON.parse(urlSearch.config) as ParsedConfig)
      : undefined;
  } catch {
    parsedConfig = undefined;
  }

  let selectedItem: SelectedItem | undefined;
  try {
    const raw = urlSearch.item
      ? SelectedItemSchema.parse(JSON.parse(urlSearch.item))
      : undefined;
    if (raw) {
      selectedItem = {
        itemId: raw.id as ItemId,
        name: raw.name,
      };
    }
  } catch {
    selectedItem = undefined;
  }

  return { parsedConfig, selectedItem };
  ```

  This is good:

  ```ts
  const parsedConfig = (() => {
    try {
      return urlSearch.config
        ? (JSON.parse(urlSearch.config) as ParsedConfig)
        : undefined;
    } catch {
      return undefined;
    }
  })();

  const selectedItem = (() => {
    try {
      const raw = urlSearch.item
        ? SelectedItemSchema.parse(JSON.parse(urlSearch.item))
        : undefined;
      if (raw) {
        return {
          itemId: raw.id as ItemId,
          name: raw.name,
        };
      }
    } catch {
      // ignore malformed JSON
    }
    return undefined;
  })();

  return { parsedConfig, selectedItem };
  ```

- Do not gate `.message` access on `instanceof Error` when the value is
  already typed as `Error` (or a known subtype). TypeScript already tells
  you the shape; trust the type and remove the runtime narrowing. Only
  reach for `instanceof Error` when the value is `unknown` (for example,
  a raw `catch` binding).

  **Find candidates:**

  ```bash
  grep -rEn '\binstanceof +Error\b' --include="*.ts" --include="*.tsx" .
  ```

  Each hit is a candidate. Whitelist the ones where the operand really
  is `unknown` (typically `catch (err)` with no explicit type) and flag
  the rest.

  This is bad:

  ```ts
  const message = dataQuery.isError
    ? dataQuery.error instanceof Error
      ? dataQuery.error.message
      : String(dataQuery.error)
    : undefined;
  ```

  This is good:

  ```ts
  const message = dataQuery.isError ? dataQuery.error.message : undefined;
  ```
