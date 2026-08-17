# React Checklist

Use this checklist only when the diff includes TSX files.

## Also run `react-doctor` when available

`react-doctor` is **additive** to this checklist, not a replacement.
You must still run every rule in the "Rules" section below on every
review. When the `react-doctor` skill is available in the current
host (visible in the host's skill list, installable via the host's
skill system, or already loaded), also run it during this phase to
pick up additional React-specific checks and auto-fixes (lint
diagnostics, accessibility issues, bundle-size regressions,
architectural smells) that the rules below do not cover.

How to combine:

1. Run every rule in the "Rules" section below, scoped to the diff
   under review. This is mandatory and runs regardless of whether
   `react-doctor` is available.
2. Additionally, invoke `react-doctor` over the same scope. Treat
   its findings as supplemental. It catches things rules-of-thumb
   miss, and it also fixes some of them in place.
3. Merge both sets of findings into one review output. If
   `react-doctor` and a rule below disagree, this checklist wins
   (these rules encode the team's intentional choices); flag the
   disagreement in the review so the user can decide.

When `react-doctor` is not available, run the rules below as the full
React phase. Do not fail the phase, do not skip the rules, and do not
try to substitute an unrelated tool.

## Rules

- Keep one component per file.
- Split large or monolithic components into logical sub-components instead of
  keeping too much UI or state logic in one file.
- Never leave a top-level function whose body is only a `return` of a JSX
  block. Extract it into its own component file. Such a function is a
  component that has been denied the ability to use hooks, so everything a
  hook would have supplied (`i18n`, state, context, memoisation) has to be
  threaded in through its parameters, and React cannot re-render it
  independently because it is not a component in the tree. When the function
  is used **exclusively** by the component in whose file it is declared, the
  parent becomes a directory and the new component file goes inside it: a
  component directory is how exclusive coupling to a descendant is expressed.

  The gate is the shape, not the name: a top-level declaration, a return type
  of `ReactNode`, `JSX.Element`, or `ReactElement`, and a body that is only a
  return of JSX. Leading destructuring or trivial `const` locals do not
  change this. Names like `_renderX` or `_getXContent` are the usual tell.

  Exceptions: 1) a function returning anything other than a JSX block; 2) a
  hook (`useX`), which returns data rather than JSX; 3) a function that is
  already exported and consumed by more than one component, which belongs in
  a shared location rather than nested in one parent's directory.

  **Find candidates** (top-level render helpers returning a React node):

  ```bash
  grep -rEn '^function _[A-Za-z0-9_]+\(' --include="*.tsx" . \
    | grep -E '(render|Content|Section|Row|Panel|Alert|State)'
  ```

  Non-exhaustive: the return type is usually on a later line, so confirm
  each hit returns `ReactNode`/`JSX.Element` and that its body is only a
  return of JSX before flagging.

  This is bad:

  ```tsx
  // DashboardCard.tsx
  function _renderBadgeRow(
    options: Readonly<{ dashboard: Dashboard.T; i18n: I18n }>,
  ): ReactNode {
    return <Group gap="xs">…</Group>;
  }
  ```

  This is good:

  ```tsx
  // DashboardCard/BadgeRow.tsx
  export function BadgeRow({ dashboard }: Readonly<Props>): ReactNode {
    const { i18n } = useLingui();
    return <Group gap="xs">…</Group>;
  }
  ```

- Use ternaries for conditional rendering instead of short-circuited `&&`
  evaluations.

  **Find candidates** (JSX `{cond && ...}` blocks):

  ```bash
  grep -rEn '\{[^{}]*&&[^{}]*<' --include="*.tsx" .
  ```

  Non-exhaustive: multi-line `{cond && (\n <jsx>\n)}` patterns are
  missed. Also scan diff hunks for those by eye.

- React component prop types should always be named `Props`.

  **Find candidates** (prop type aliases whose name is not literally
  `Props`):

  ```bash
  grep -rEn '^(export )?type [A-Z][a-zA-Z]*Props\b' --include="*.tsx" . \
    | grep -Ev '\btype Props\b'
  ```

- Always destructure props in the component parameter, regardless of how many
  props there are.

  **Find candidates** (component signatures that take `props: Props`
  intact):

  ```bash
  grep -rEn 'function [A-Z][a-zA-Z]*\(\s*props *: *Props' --include="*.tsx" .
  ```

  Discriminated-union `Props` is the documented exception; check whether
  the `Props` type uses a union before flagging.

- The only exception to parameter destructuring is when `Props` is a
  discriminated union and destructuring before type narrowing would lose the
  branch-specific type information. In that case, keep `props: Props` intact
  until after narrowing.
