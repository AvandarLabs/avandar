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
