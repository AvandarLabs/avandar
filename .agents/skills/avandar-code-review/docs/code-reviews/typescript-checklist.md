# TypeScript Checklist

Use this checklist only when the diff includes TypeScript or TSX files.

- In Deno-reachable code, imports must include file extensions. This especially
  applies to `supabase/functions/`, `shared/`, and `packages/shared/`.
- Use JSDoc for public classes and methods.
- Prefer functional and declarative programming.
- Avoid classes and imperative patterns unless a real constraint requires them.
- Prefer higher-order functions over manual loops.
- Use named exports instead of default exports.
- Keep comment and docstring lines at 80 characters or fewer.
- If a docstring fits on one line within 80 characters, keep it single-line.
- Never use single-line `if` statements: always keep braces.
- Prefer string interpolation over string concatenation.
- Use PascalCase for React components, classes, singleton instances, and module
  objects.
- Use camelCase for variables, functions, and methods.
- Use UPPERCASE for environment variables and hard-coded constants.
- Event handlers should be named `on...`, not `handle...`.
- Non-exported top-level helper functions should be prefixed with `_`.
- React component prop types should always be named `Props`.
- Preserve `e2e` or `E2E` casing exactly; do not invent mixed variants.
- Never use `any`.
- Use `as const` for literals that never change.
- Prefer `type` over `interface`, except for class-style OOP interfaces.
- Prefer `undefined` over `null` unless an API or framework requires `null`.
- Prefer string literal unions over enums.
- Reuse composite types when they are genuinely shared.
- Avoid extracting one-off type aliases unless the type is reused. `Props` is
  the explicit exception.
- If an object shape has 4 or more properties, extract it to a named type for
  readability.
- Add explicit types at module boundaries, top-level declarations, and function
  parameters. Avoid unnecessary annotations for local variables and inline
  callbacks.
- Prefer default parameter values over nullish guard logic.
- Use RO-RO for multiple parameters and multiple return values.
- If a function takes only one parameter, do not wrap it in an object.
- When using an object parameter, prefer the name `options` unless `params` or
  `config` is more accurate.
- Keep small object parameter types inline. Only extract them when reused.
- Top-level functions should use the `function` keyword.
- Nested functions and object methods should use arrow functions.
- Type imports and type exports should always use the `type` keyword.
- If a module grows beyond one file, prefer a directory module layout instead
  of cramming everything into a single file.
- Do not add barrel files, except approved `index.ts` files in `packages/`.
- Do not use namespace exports such as `export * from`.
- All exported classes, objects, and functions need docstrings.
- If an exported object defines top-level methods inline, those methods need
  docstrings too.
- Follow input contravariance and output covariance: readonly at module
  boundaries for inputs, mutable outputs for callers.
- Apply readonly wrappers to function parameters, not to local variables,
  internal helpers, or return types.
- Prefer mutable local variables and intermediate values.
- If a function intentionally mutates its input, the name should make the
  mutation obvious, and returning `void` is usually the clearest contract.
