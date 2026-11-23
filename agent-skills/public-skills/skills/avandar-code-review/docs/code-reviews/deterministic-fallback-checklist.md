# Deterministic fallback checklist

Load only the selected AF IDs after **Automation coverage handoff** in
`SKILL.md`. Each finding still requires an eligible added line and verified
rule applicability. With no usable exact report, select every applicable AF
family in the review's packs. These instructions work without Avandar lint.

## Language and capability selection

- Match rule, language, exact reviewed path and capability. For `enforced` or
  `not-applicable` exact operational outcomes, omit only that capability.
  Keep every fallback capability, including `unsupported-shapes`. A safe seed
  never proves the absence of unsupported syntax in the reviewed file.
- For absent outcomes, missing commands/packages/plugins/rules, disabled or
  excluded paths, config errors and summary-only evidence, retain applicable
  detectors. Native AF-02/05/19 and JS AF-17 have no safe repair proof.
- For unknown source extensions or languages, first establish the actual
  language and whether each selected rule's syntax and rationale apply.
  Unknown is not `not-applicable`. Keep the unresolved obligation visible;
  inspect language-native constructs instead of imposing JavaScript syntax.
  AF-06 applies to C-like block/line comments, AF-07 to native docstrings,
  AF-20 to CSS, and TS/JS-only checks require those languages.
- AF-20 applies to **all CSS**, including plain `.css`, independently of the
  CSS-module phase. AF-15 requires the actual `@avandar/utils` dependency or
  a documented alias. Check helper availability before proposing a repair.
- Unsupported shapes require contextual verification, not an unsafe textual
  rewrite. Preserve directives, legal comments, external contracts, hoisting,
  lexical bindings, coercion, evaluation order and observable return values.
  For AF-06, preserve documentation owned by nested declarations. For AF-07,
  preserve tags, paragraphs and markup. For AF-20, preserve declaration docs,
  directives, maps, legal notices, hacks and inline/ambiguous markers.

Scanners below find candidates only. Restrict every command to reviewed paths
and then to added lines; apply the stated exceptions before flagging.

## Exact safe capability names

Use outcome names from the actual report, not language summaries. The safe
capabilities below never discharge a separate unsupported-shapes outcome.

| ID | Safe capability |
| --- | --- |
| AF-01 | `if-body` |
| AF-03 | `type-imports`, `type-exports` independently |
| AF-04 | `literal-assertions` |
| AF-06 | `standalone-body-prose` |
| AF-07 | `short-prose-jsdoc` |
| AF-08 | `direct-top-level-calls` |
| AF-09 | `direct-nested-calls` |
| AF-10 | `private-direct-calls` |
| AF-11 | `one-to-one-module-key` |
| AF-12 | `single-component-props` |
| AF-13 | `local-primitive-bindings` |
| AF-14 | `boolean-jsx-children` |
| AF-15 | `literal-property-map`, `literal-property-equality` independently |
| AF-16 | `fresh-data-object` |
| AF-17 | `optional-parameter-candidates` in TS/TSX only |
| AF-20 | `standalone-prose-comments` |

## AF-01: Braces around if bodies

Braces make branch boundaries explicit and avoid accidental statement capture.

- Never use single-line `if` statements: always keep braces.

  **Find candidates** (heuristic; non-exhaustive):

  ```bash
  grep -rEn '^\s*if *\(.*\)[^{]*[a-zA-Z]' --include="*.ts" --include="*.tsx" . \
    | grep -v '{$'
  ```

  Flags lines like `if (cond) doThing();` and `if (cond) return foo;`.
  Multi-line `if (...)\n  doThing();` patterns are missed; still scan by
  eye for those.

## AF-02: Template interpolation

Interpolation makes the resulting string readable. Verify operand coercion before changing concatenation.

- Prefer string interpolation over string concatenation.

  **Find candidates** (string literal concatenated with `+`):

  ```bash
  grep -rEn '"[^"]*" *\+|\+ *"[^"]*"' --include="*.ts" --include="*.tsx" .
  ```

## AF-03: Type-only import and export markers

Explicit type markers keep erased dependencies separate from runtime imports and exports.

- Type imports and type exports should always use the `type` keyword.

  **Find candidates** (imports/exports of clearly type-only names, by
  convention `T`, `I`, or names ending in `Props` / `Type` / `Id` /
  `Config`, without the `type` keyword; heuristic):

  ```bash
  grep -rEn '^import \{[^}]*\b([A-Z][a-zA-Z]*Props|[A-Z][a-zA-Z]*Type|[A-Z][a-zA-Z]*Id|[A-Z][a-zA-Z]*Config)\b' \
    --include="*.ts" --include="*.tsx" . \
    | grep -v '^[^:]*:import type '
  ```

  Heuristic only; still scan import lists manually for type-only names
  this regex doesn't anticipate.

## AF-04: Literal const assertions

Literal const assertions retain the intended literal type without repeating its value.

- Use `as const` for literals that never change.

## AF-05: Unnecessary type assertions

- Never keep an `as T` cast that the compiler does not need. A cast tells
  the reader "TypeScript cannot prove this", so a cast that proves nothing
  sends them looking for a problem that does not exist, and it silences the
  check that would catch a future mismatch. This applies to every single
  `as T`, not only the `as unknown as T` double cast above.

  **The gate is mechanical, never a judgement call.** For every added line
  containing a cast, delete the cast and re-run the type checker. Do not
  reason about whether the cast "looks needed": casts that look necessary
  are routinely removable, and that is how they survive review.

  - **Still type-checks without it:** report a finding. The cast is noise.
  - **A type error appears:** look at what produced the wider type. When
    the surrounding code widened the value itself, report a finding against
    the widening and remove both: a `?? ""` or `|| {}` fallback for a value
    that is always present, an empty literal (`[]`, `{}`) with no declared
    type, or a `.find()` on a value that is always in the collection. A
    non-null assertion (`!`) or a typed declaration is narrower than a cast
    and keeps the real type flowing.
  - **A type error appears and nothing in the code widened the value:**
    the cast may be legitimate. Apply the exceptions below.

  Exceptions (not casts, or casts the compiler genuinely cannot avoid):
  1) `as const`; 2) import and export aliases (`import * as x`,
  `{ a as b }`); 3) `satisfies`, which is a check and not a cast; 4) a
  value whose real type is only known at runtime and cannot be narrowed by a
  type guard, such as a DOM query result or an `event.target`, where a
  comment or the API makes the reason evident; 5) an existing cast whose
  comment already justifies it on those grounds.

  **Find candidates:**

  ```bash
  grep -rEn '\bas [A-Za-z_{(\[]' --include="*.ts" --include="*.tsx" . \
    | grep -vE '\bas const\b|^[^:]+:[0-9]+:\s*(import|export)\b'
  ```

  Restrict the hits to `+` lines in the diff before verifying each one.
  Hits inside a multi-line import or export list are aliases: drop them.

  This is bad (the fallback widens the id to `string`, so the cast is only
  there to undo a widening the same expression introduced):

  ```ts
  const columnId = (columns.find(byName(name))?.id ?? "") as ColumnId;
  ```

  This is good (the column always exists, so assert that instead):

  ```ts
  const columnId = columns.find(byName(name))!.id;
  ```

  This is bad (the value already has the target type):

  ```ts
  const rows = (await fetchRows()) as Row[];
  ```

  This is good:

  ```ts
  const rows = await fetchRows();
  ```

## AF-06: Ordinary function-body comments

Line comments distinguish implementation prose from API documentation.

- Use block comments (`/** ... */`) only as documentation attached to an
  identifier (functions, types, exports, etc.). Do not use file-level header
  comments (see the file-level-comment rule below). Any comment inside a
  function body must use `//` line comments, even when it spans multiple lines.

  This is bad:

  ```ts
  function load(id: string): Result {
    /**
     * We bail early on empty ids because the upstream cache treats them
     * as wildcards and would return stale rows.
     */
    if (id === "") {
      return emptyResult();
    }
    // ...
  }
  ```

  This is good:

  ```ts
  function load(id: string): Result {
    // We bail early on empty ids because the upstream cache treats them
    // as wildcards and would return stale rows.
    if (id === "") {
      return emptyResult();
    }
    // ...
  }
  ```

## AF-07: Single-line short docstrings

A short docstring is easier to scan on one line. Preserve every word.

- If a docstring fits on one line within 80 characters, keep it single-line.
  This is a formatting rule only: never cut a docstring's content to make it
  fit on one line.

## AF-08: Top-level function declarations

Declaration syntax makes module-level functions immediately recognizable. Preserve hoisting and lexical semantics.

- Top-level functions should use the `function` keyword.

  **Find candidates** (top-level arrow-function consts; heuristic):

  ```bash
  grep -rEn '^(export )?const [a-z][a-zA-Z0-9_]* *(:[^=]*)?= *(async )?\(' \
    --include="*.ts" --include="*.tsx" .
  ```

  Many hits will be true single-expression utilities or factory results;
  flag only ones that are real top-level function declarations.

## AF-09: Nested arrow functions

Arrow syntax distinguishes local functions from module entry points. Preserve binding and initialization behavior.

- Nested functions and object methods should use arrow functions.

## AF-10: Private helper prefixes

The prefix distinguishes private helpers from the public API at call sites.

- Non-exported top-level helper functions should be prefixed with `_`.

## AF-11: Exported module-key documentation

- Put the docstring on the module's exported key, not on the underlying
  declaration, when a non-exported declaration is defined in the same file as
  the module object that exports it. TypeScript intellisense does not carry a
  declaration's docstring across the assignment into a module object: hovering
  `MyModule.myFunc` or `MyModule.MY_LIMIT` shows the type but not the docstring
  that sits on `_myFunc` or `MY_LIMIT`. This covers every kind of key, not just
  methods: constants and other values lose their docstring the same way, and a
  shorthand key (`{ MY_LIMIT }`) hides it exactly as an explicit one does. Flag
  a docstring that sits on the underlying declaration while its exported object
  key has none.

  This is bad (neither docstring is visible at the call site):

  ```ts
  /** Smallest allowed value. */
  const MY_LIMIT = 10;

  /** What myFunc does. */
  function _myFunc() {}

  export const MyModule = { MY_LIMIT, myFunc: _myFunc };
  ```

  This is good:

  ```ts
  const MY_LIMIT = 10;

  function _myFunc() {}

  export const MyModule = {
    /** Smallest allowed value. */
    MY_LIMIT,

    /** What myFunc does. */
    myFunc: _myFunc,
  };
  ```

  Exception: when the object is annotated by an interface or type that already
  documents its members (`const Store: BlobStore = { ... }`), that interface is
  the intellisense source; the docstrings belong there, not on the object keys
  or the underlying declarations. Do not flag missing key docstrings in that
  case.

## AF-12: Component props names

A local Props name stays readable as a component is renamed. Verify ownership and external references.

- React component prop types should always be named `Props`.

  **Find candidates** (prop type aliases whose name is not literally
  `Props`):

  ```bash
  grep -rEn '^(export )?type [A-Z][a-zA-Z]*Props\b' --include="*.tsx" . \
    | grep -Ev '\btype Props\b'
  ```

## AF-13: Local E2e casing

- Spell the acronym `E2e` inside camelCase/PascalCase local names, not `E2E`.
  Treating acronyms as words keeps identifiers predictable. Check scope and
  all references when renaming. Exceptions: UPPERCASE constants, environment
  variables and external string contracts stay unchanged.

  This is bad: `const localE2ECount = 1; consume(localE2ECount);`
  This is good: `const localE2eCount = 1; consume(localE2eCount);`

## AF-14: JSX conditional ternaries

An explicit false branch avoids rendering non-boolean falsy values. Preserve exact JSX child behavior.

- Use ternaries for conditional rendering instead of short-circuited `&&`
  evaluations.

  **Find candidates** (JSX `{cond && ...}` blocks):

  ```bash
  grep -rEn '\{[^{}]*&&[^{}]*<' --include="*.tsx" .
  ```

  Non-exhaustive: multi-line `{cond && (\n <jsx>\n)}` patterns are
  missed. Also scan diff hunks for those by eye.

## AF-15: Property helper callbacks

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

## AF-16: Straight-line object construction

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

## AF-17: Optional array candidates

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

## AF-19: File import extensions

- In Deno-reachable code, imports **that name a file** must include the
  file extension (e.g. `.ts`). Repos that use Deno usually pin a few
  specific directories as Deno-reachable. The repo-local
  `docs/code-reviews/extra-checklist.md` should enumerate the exact
  directories that count as Deno-reachable for that repo; check there
  before flagging. If the repo-local checklist does not define
  Deno-reachable paths, skip this rule.

  This applies to relative imports and to directory-style aliases (an
  alias mapped with a trailing slash, such as `@utils/` -> `src/`, where
  the rest of the specifier is a path). It does **not** apply to bare
  package specifiers such as `@avandar/utils` or `@avandar/utils/sql`.
  Those name a package entry point, not a file: Node resolves them
  through `exports`, and Deno resolves them through an exact import-map
  entry. Adding an extension to one is wrong and will fail to resolve.

  **Find candidates** (replace `<deno-dir>` with each Deno-reachable
  directory from the repo-local checklist):

  ```bash
  grep -rEn 'from "(\.|\.\.)/[^"]+"' <deno-dir> --include="*.ts" \
    | grep -Ev '\.(ts|tsx|js|jsx|json|css)"$'
  ```

  Misses imports under non-relative path aliases (`@something/foo`) that
  resolve to Deno-reachable code, so still scan those imports by eye.
  When you do, first decide whether the specifier is a package name or a
  file path; only flag the latter.

## AF-20: CSS block comments

- Use canonical CSS block comment formatting. Consistent comment shape makes
  stylesheet comments easy to scan and keeps formatter output predictable.
  Single-line comments may stay on one line; multi-line comments must put
  the opening and closing markers on their own lines and prefix each content
  line with `*`.

  This is bad:

  ```css
  .shell {
    /* First sentence.
       Second sentence. */
  }
  ```

  This is good:

  ```css
  .shell {
    /*
     * First sentence.
     * Second sentence.
     */
  }
  ```

  This is also good:

  ```css
  .shell {
    /* Single sentence. */
  }
  ```

## Deferred detector ownership

AF-18 remains in `functional-style-checklist.md` (typed Error guards).
AF-21 remains in `sql-checklist.md` (SQL declaration/body comment forms).
These later automation families and every JR judgment obligation remain active
under their normal full/focused phase gates; coverage subtraction here does
not discharge them.
