# Extra Checklist For `avandar-code-review`

This document is intended to be used with the `avandar-code-review` skill.

It contains additional review checks that are not included in the original
skill. After finishing the skill's built-in checklist, the agent should also
review code against the items in this file when it exists.

Whenever a user says to add a new common mistake, or says to "remember this in
the future", append the new mistake to this document.

## Additional Mistakes

- **Test files must import from `@/test-utils`, never from
  `@testing-library/react` directly.** `@/test-utils` re-exports the full
  Testing Library surface (`screen`, `fireEvent`, `waitFor`, `act`,
  `RenderOptions`, etc.) and overrides `render` with our `TestProviders`-
  wrapped variant. Importing `render` from `@testing-library/react` bypasses
  the Mantine + Lingui providers our components depend on and causes
  silent runtime failures (`useLingui()` outside an `I18nProvider`, etc.).
  - If a test needs extra providers (e.g. `QueryClientProvider`), pass them
    via the `wrapper` option on the custom `render` — it composes the
    extra wrapper *inside* `TestProviders`.
  - The only files allowed to import from `@testing-library/react` are the
    files inside `src/test-utils/` themselves (they are the wrapper
    boundary) and tests under `packages/web/{ui,hooks}/` (no
    `@/test-utils` alias is configured there).
- Add new items here as they come up.
