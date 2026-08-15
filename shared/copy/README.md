# `shared/copy/`

This directory holds copy functions: small functions that return a single
piece of translated, user-facing text.

## First: is it copy at all?

A copy function returns translated text a person reads. Two mechanical checks
decide it, and both must hold:

1. **A Lingui macro appears in the function's own body**: `` t`…` ``,
   `` msg`…` ``, or `i18n._(msg`…`)`. Copy is always translated, so a function
   with no macro in it returns data, however user-facing that data eventually
   becomes.
2. **The return type is `string`**, or a record whose values are all `string`.
   A string-literal union (`AppType`, `ResourceType`) is a key the program
   branches on, not text.

Fail either check and the function is an ordinary conversion. It takes a
conversion name from [`docs/rules/typescript.md`](../../docs/rules/typescript.md)
and it does not belong in this directory or any other `copy/` directory.
Feeding a copy function does not qualify it: `getAppTypeFromResourceType`
exists only to produce the argument for `appLabel`, and it still lives with
the rest of `ShareResourceModal`, not beside the copy.

This directory holds copy functions and nothing else. A lookup table, type
map, or helper that copy calls goes with the code it converts.

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

One flat file per copy function, named after the function:
`shared/copy/appLabel.ts` exports `appLabel`.

Give a copy function its own subdirectory only when it has a test to sit
beside it. A directory that holds one file buys nothing, so the test is the
whole reason to make one.

Most copy functions have no test worth writing. A copy function is a lookup
from a key to a translated string, so a test that asserts the label for one
key restates the mapping it is reading from, and the English msgid usually
equals the label, which makes the assertion look like an identity check.

`shared/copy/vizSettingControlLabel/vizSettingControlLabel.ts` is the case
that earns a subdirectory: its test walks the viz descriptor registries and
fails when a label is added there without a matching catalog entry. It checks
an invariant across two files rather than the mapping in front of it.

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
