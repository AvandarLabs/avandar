# `shared/copy/`

This directory holds copy functions: small functions that return a single
piece of translated, user-facing text.

## What belongs here

**Only copy that is used by more than one sub-system.** A sub-system is a
top-level product area or cross-cutting feature, for example
`src/views/GisApp/`, `src/views/DashboardApp/`, `src/views/DataExplorerApp/`,
or the permissions components under `src/components/permissions/`.

Use this decision order:

1. **Used in more than one sub-system** (for example `appLabel`, which the
   share modal, the workspace settings form, and the map route all render):
   it goes here, in `shared/copy/`.
2. **Used in more than one place, but all inside a single sub-system**: it goes
   in a `copy/` directory nested inside that sub-system, for example
   `src/views/GisApp/copy/`. Keeping it next to its only callers means the
   sub-system can rename or retire the string without a repo-wide search.
3. **Used in exactly one place**: do not extract it. Inline the `t` macro at
   the call site. A one-caller copy function adds a file and an import while
   hiding the string from the component that renders it, and it invites the
   next reader to treat a private string as a shared contract.

Promote copy up a level the moment a second caller appears, and move it back
down when it loses one.

## File layout

One file per copy function, named after the function:

- `shared/copy/appLabel.ts` exports `appLabel`.
- `shared/copy/resourceTypeLabel/resourceTypeLabel.ts` exports
  `resourceTypeLabel`, with its test alongside it.

## Naming

Copy functions are the one conversion exempt from the
`to` / `from` / `make…From…` / `get…From…` naming rule in
[`docs/rules/typescript.md`](../../docs/rules/typescript.md). They take the
name of the copy they return, with no prefix: `appLabel`, `resourceTypeLabel`,
`vizTypeLabel`. Never `getAppLabelFromAppType` or `makeAppLabel`.

The exemption holds only while the function does nothing but return copy. Once
one grows a second responsibility, it falls back under the general naming rule
and should be split.

## Translation

Every function here returns text through Lingui, so it is subject to the
repo's [i18n rules](../../docs/rules/i18n.md). These are plain modules with no
component in the call path, so they use the `t` macro from
`@lingui/core/macro` rather than the `useLingui()` hook. Never return a bare
string literal.
