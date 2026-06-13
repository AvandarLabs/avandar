# Functional Style Checklist

Use this checklist when the diff includes TypeScript or TSX files.

These rules are about how code is shaped, not which library it imports.
For point-free helpers tied to a specific package (such as
`@avandar/utils`'s `prop` / `propEq`), see the matching
library-gated phase.

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
  function buildChatRequest(
    apiMessages: ChatClientMessage.T[],
    pageContext: ChatPageContext.T,
    options: {
      model?: string;
      regenerateContext?: { lastError?: string; lastSql?: string };
    },
  ): ChatRequest {
    const body: ChatRequest = {
      messages: apiMessages,
      context: pageContext,
    };
    if (options.model) {
      body.model = options.model;
    }
    if (options.regenerateContext?.lastError) {
      body.regenerateContext = options.regenerateContext;
    }
    if (apiMessages.length > 20) {
      body.summarize = true;
    }
    return body;
  }
  ```

  This is good:

  ```ts
  function buildChatRequest(
    apiMessages: ChatClientMessage.T[],
    pageContext: ChatPageContext.T,
    options: {
      model?: string;
      regenerateContext?: { lastError?: string; lastSql?: string };
    },
  ): ChatRequest {
    const regenerateContext =
      options.regenerateContext?.lastError ?
        options.regenerateContext
      : undefined;
    const summarize = apiMessages.length > 20 ? true : undefined;

    return {
      messages: apiMessages,
      context: pageContext,
      model: options.model,
      regenerateContext,
      summarize,
    };
  }
  ```

  Notes:

  - Optional fields whose value is `undefined` can stay inline on the
    literal (TypeScript treats `{ foo: undefined }` and `{}` as
    structurally identical for an optional `foo?: T`). When that
    bothers a downstream consumer that distinguishes them, use a
    conditional spread (`...(cond ? { foo } : {})`) instead — it still
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
  call, seeding a `useState({})`, etc.) — filter those out first.

- Build variable-length arrays by listing every candidate inline with a
  conditional that evaluates to `undefined`, then filter out the
  `undefined`s with the codebase's `isDefined` / `isNonNullish` helper (or
  the equivalent from a standard utility library). Avoid imperative
  `push`-with-`if` style, which is harder to scan and loses the visual
  one-to-one mapping between source positions and output positions.

  This is bad:

  ```ts
  const assistantParts: Array<{ type: "text"; text: string }> = [
    { type: "text", text: response.assistantText },
  ];
  if (response.generatedSql) {
    assistantParts.push({
      type: "text",
      text: `\n\`\`\`sql\n${response.generatedSql.sql}\n\`\`\``,
    });
  }
  ```

  This is good:

  ```ts
  const assistantParts = [
    { type: "text" as const, text: response.assistantText },
    response.generatedSql
      ? {
          type: "text" as const,
          text: `\n\`\`\`sql\n${response.generatedSql.sql}\n\`\`\``,
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
  let vizConfig: VizConfig | undefined;
  try {
    vizConfig = urlSearch.vc
      ? (JSON.parse(urlSearch.vc) as VizConfig)
      : undefined;
  } catch {
    vizConfig = undefined;
  }

  let openDataset: OpenDatasetInfo | undefined;
  try {
    const raw = urlSearch.od
      ? OpenDatasetSchema.parse(JSON.parse(urlSearch.od))
      : undefined;
    if (raw) {
      openDataset = {
        datasetId: raw.did as DatasetId,
        name: raw.name,
        virtualDatasetId: raw.vid as VirtualDatasetId,
      };
    }
  } catch {
    openDataset = undefined;
  }

  return { vizConfig, openDataset };
  ```

  This is good:

  ```ts
  const vizConfig = (() => {
    try {
      return urlSearch.vc ? (JSON.parse(urlSearch.vc) as VizConfig) : undefined;
    } catch {
      return undefined;
    }
  })();

  const openDataset = (() => {
    try {
      const raw = urlSearch.od
        ? OpenDatasetSchema.parse(JSON.parse(urlSearch.od))
        : undefined;
      if (raw) {
        return {
          datasetId: raw.did as DatasetId,
          name: raw.name,
          virtualDatasetId: raw.vid as VirtualDatasetId,
        };
      }
    } catch {
      // ignore malformed JSON
    }
    return undefined;
  })();

  return { vizConfig, openDataset };
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
