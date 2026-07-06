# React Hooks Checklist

Use this checklist when the diff includes a TSX file (or a `.ts` file that
exports a custom hook) that uses React hooks such as `useEffect`,
`useMemo`, `useState`, or data-loading hooks.

Skip this phase for purely presentational components with no hooks.

- Do not wrap trivial derivations in `useMemo`. `useMemo` is for caching
  expensive computations or for keeping a stable reference across renders
  to satisfy a downstream dependency array. A simple property read, a
  ternary, a single `.find` / `.map`, or string concatenation does not
  benefit from memoization and only adds noise.

  This is bad:

  ```ts
  const selectedModel = useMemo((): ChatModelOption | undefined => {
    if (!resolvedModelId) {
      return undefined;
    }
    return models.find((m) => m.id === resolvedModelId);
  }, [models, resolvedModelId]);
  ```

  This is good:

  ```ts
  const selectedModel =
    resolvedModelId ?
      models.find((m) => m.id === resolvedModelId)
    : undefined;
  ```

- Name every `useEffect` callback with a descriptive `function` name so the
  effect's purpose is self-evident in source, stack traces, and React
  DevTools. Anonymous arrow callbacks are acceptable only for one-line
  effects whose intent is obvious from the body.

  **Find candidates** (effects whose callback is an anonymous arrow):

  ```bash
  grep -rEn 'useEffect\(\s*\(\s*\)\s*=>' --include="*.ts" --include="*.tsx" .
  ```

  Each multi-line hit should adopt the named-`function` form. Genuinely
  one-line effect bodies are the documented exception.

  This is bad:

  ```ts
  useEffect(() => {
    if (resolvedModelId) {
      writeStoredChatModelId(resolvedModelId);
    }
  }, [resolvedModelId]);
  ```

  This is good:

  ```ts
  useEffect(
    function writeResolvedModelIdToStorage() {
      if (resolvedModelId) {
        writeStoredChatModelId(resolvedModelId);
      }
    },
    [resolvedModelId],
  );
  ```

- When destructuring from a hook that returns a possibly-`undefined` array,
  default to `[]` in the destructure rather than coalescing at each use
  site. If the hook is from a specific external data library, apply this
  rule only after confirming the repo uses that library and the hook's
  return contract matches the pattern.

  **Find candidates** (`xxx ?? []` patterns, which often indicate a
  missed default-destructure):

  ```bash
  grep -rEn '\?\? *\[\]' --include="*.ts" --include="*.tsx" .
  ```

  Each hit is a candidate. Trace the value back to its destructure site
  and apply the rule + caveats below: switch to `[name = []] = ...` only
  when (1) `undefined` is **not** load-bearing for downstream state and
  (2) the default `[]` would not break a memoization that currently
  relies on the stable `undefined` reference.

  This is bad:

  ```ts
  const [groups, isLoading, queryResult] = useQuery({...});
  const resolvedGroups = groups ?? [];
  const models = resolvedGroups.flatMap((g) => g.models);
  ```

  This is good:

  ```ts
  const [groups = [], isLoading, queryResult] = useQuery({...});
  const models = groups.flatMap((g) => g.models);
  ```

  Caveats: keep the `undefined` and coalesce only where you actually use it
  if either of these applies:

  1. The `undefined` value is load-bearing. Downstream code distinguishes
     "still loading / not fetched yet" (`undefined`) from "fetched and
     empty" (`[]`). Defaulting to `[]` collapses those two states and can
     fire effects, render empty states, or trigger writes before the query
     has actually resolved.
  2. Defaulting would break memoization. `[]` in the destructure produces
     a fresh array reference on every render, so any `useMemo`,
     `useEffect`, `useCallback`, or memoized child that depends on the
     destructured value will invalidate every render. In that case, keep
     the original possibly-`undefined` reference when the hook keeps it
     stable across renders and coalesce at the leaf use site instead, or
     memoize the fallback array yourself.
