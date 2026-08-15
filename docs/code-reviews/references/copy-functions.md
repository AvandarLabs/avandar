# Phase: copy functions (Avandar Repo-Local)

Referenced from [`../extra-checklist.md`](../extra-checklist.md). Run it as
its own phase.

- **Gate:** the diff adds or renames a function that returns user-facing copy,
  or touches any file under `shared/copy/` or any nested `copy/` directory.
  Skip otherwise.

Run the three sections in order. Identification decides whether the rest
applies at all, placement decides the directory, and naming decides the
symbol.

## 1. Identification: is this actually copy?

Run this on every function in the diff that sits in a `copy/` directory or
claims the copy naming exception. The rest of this phase applies only to
functions that pass. Both checks must hold:

1. **A Lingui macro appears in the function's own body**: `` t`…` ``,
   `` msg`…` ``, or `i18n._(msg`…`)`. No macro means the function returns
   data, not copy. Copy is always translated, so an untranslated return value
   is proof the function is something else.
2. **The return type is `string`**, or a record whose values are all
   `string`. A string-literal union return type (`AppType`, `ResourceType`,
   `"gis" | "dashboards"`) is a key the program branches on, not text a person
   reads.

A function that fails either check is an ordinary conversion. Flag it twice:
it must move out of the `copy/` directory, and it must be renamed to one of
the four conversion shapes in
[`docs/rules/typescript.md`](../../rules/typescript.md)
(`getAppTypeFromResourceType`, not `appForResource`).

Do not accept "it exists only to feed a copy function, so it lives beside the
copy that consumes it" as a justification, in a docstring or in a reply. That
reasoning is what put `appForResource` in `ShareResourceModal/copy/`;
proximity to copy is not copy. A `copy/` directory holds copy functions and
nothing else, so a lookup table, type map, or helper that copy calls is a
finding even when the copy really is its only caller.

**Find candidates** (files in a copy directory with no Lingui macro):

```bash
for f in $(git diff --name-only <base>...HEAD -- '*/copy/*.ts' 'shared/copy/*.ts' \
  | grep -v '\.test\.ts$'); do
  grep -qE '\b(t|msg)`|i18n\._\(' "$f" || echo "no Lingui macro: $f"
done
```

Then read the return type of every exported function in those directories by
eye. `: string` and `: Promise<string>` pass; anything else, including an
inferred return type on a function whose body returns a bare literal, is a
finding.

This is bad (no Lingui macro, and the return type is a literal union, so this
is a conversion wearing a copy name in a copy directory):

```ts
// src/components/permissions/ShareResourceModal/copy/appForResource.ts
export function appForResource(type: ResourceType): AppType {
  return matchLiteral(type, {
    dashboard: "dashboards",
    dataset: "data_sources",
    map: "gis",
  } as const);
}
```

This is good:

```ts
// .../ShareResourceModal/getAppTypeFromResourceType/getAppTypeFromResourceType.ts
export function getAppTypeFromResourceType(type: ResourceType): AppType {
  return matchLiteral(type, {
    dashboard: "dashboards",
    dataset: "data_sources",
    map: "gis",
  } as const);
}
```

## 2. Placement: which directory?

Shared copy lives in `shared/copy/`, one file per copy function named after
the function (`shared/copy/appLabel.ts`). A copy function reused by more than
one view belongs there rather than being redeclared beside each caller.

Place a new copy function by counting its call sites, because the directory it
lands in is what tells the next reader how far the string's blast radius
reaches. Count the callers of the added function across the repo and route it:

1. **Two or more sub-systems** call it: `shared/copy/`. A sub-system is a
   top-level product area or cross-cutting feature, for example
   `src/views/GisApp/`, `src/views/DashboardApp/`,
   `src/views/DataExplorerApp/`, or `src/components/permissions/`. `appLabel`
   qualifies: the share modal, the workspace settings form, and the map route
   all render it.
2. **Two or more call sites inside exactly one sub-system**: a `copy/`
   directory nested in that sub-system, for example `src/views/GisApp/copy/`.
   Putting a single sub-system's copy in `shared/copy/` advertises a repo-wide
   contract that does not exist, so the next engineer has to grep the whole
   repo before renaming it.
3. **Exactly one call site**: do not extract it at all. Inline the `t` macro
   where the string renders. A one-caller copy function costs a file and an
   import while hiding the string from the component that shows it.

Flag a new `shared/copy/*` file whose exported function has one caller, and
flag one whose callers all sit under the same sub-system directory. The
contract is written up in
[`shared/copy/README.md`](../../../shared/copy/README.md).

**Find candidates** (call sites of each copy function added by the diff):

```bash
grep -rn "<copyFunctionName>" --include="*.ts" --include="*.tsx" src shared \
  | grep -v '^shared/copy/'
```

One hit means inline it. Several hits under a single `src/views/<App>/` or
`src/components/<feature>/` root mean nest it there.

This is bad (`mapDisclaimer` renders only in `MapFurnitureBar`):

```ts
// shared/copy/mapDisclaimer.ts
import { t } from "@lingui/core/macro";

export function mapDisclaimer(): string {
  return t`The boundaries and names shown do not imply official endorsement or acceptance.`;
}
```

This is good:

```tsx
// src/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.tsx
<span className={css.mapFurnitureBarDisclaimer}>
  {t`The boundaries and names shown do not imply official endorsement or acceptance.`}
</span>
```

## 3. Naming

Copy functions are the one conversion exempt from the
`to`/`from`/`make…From…`/`get…From…` naming rule, and take the name of the
copy they return with no prefix: `appLabel`, `resourceTypeLabel`,
`vizTypeLabel`. Flag a prefixed variant (`getAppLabelFromAppType`,
`makeAppLabel`) and flag a copy function that has grown a second
responsibility, which puts it back under the naming rule. The reasoning is in
[`docs/rules/typescript.md`](../../rules/typescript.md).

The exemption is what makes section 1 load-bearing: a wrong identification
buys the function a name that hides what it does. Only apply the exemption
after the two identification checks pass.

Copy functions still translate through Lingui, so they are subject to the i18n
phase in the entry point: a label built from a bare string literal is a
finding even though the function name is correct.

**Find candidates:**

```bash
grep -rEn '^(export )?function (get|make)[A-Z][a-zA-Z]*(Label|Copy|Text|Title|Message)[a-zA-Z]*\(' \
  --include="*.ts" --include="*.tsx" src shared
# copy-shaped functions declared outside shared/copy:
grep -rEln '^export function [a-z][a-zA-Z]*(Label|Copy)\(' \
  --include="*.ts" --include="*.tsx" src shared \
  | grep -v '^shared/copy/'
```
