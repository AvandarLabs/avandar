# How to author a bundled plugin

This guide shows how to add a bundled plugin that puts a command in the Data
Explorer toolbar. It assumes a checkout of this repository with dependencies
installed, and the `ava` CLI on your `PATH` (run `pnpm build:ava-cli` if it is
not).

Bundled plugins live in `plugins/<name>/`, are listed in
`plugins/bundled.yaml`, and are built into the app as lazy chunks. A workspace
pays nothing for a plugin until a settings admin installs it in
Settings → Plugins, and a plugin's code downloads only when someone first uses
one of its commands.

Design background:
`docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md` and
`docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`. Package
exports: the READMEs of `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, and
`@avandar/plugin-ui` (see `docs/avandar-packages.md`).

## 1. Create the plugin

```bash
ava plugin init case-tools
pnpm install
ava plugin validate case-tools
pnpm dev
```

Then open Settings → Plugins in a workspace where you are a settings admin and
install the plugin. Its `hello` command appears in the Data Explorer toolbar.

`ava plugin init [name] [--publisher <publisher>] [--help]`:

| Part | Behavior |
| --- | --- |
| `name` | The folder name under `plugins/`, in kebab-case (lowercase letters, digits, single hyphens). In a terminal it is asked for when omitted. Without a terminal, omitting it fails and prints the exact command to run |
| `--publisher <publisher>` | The first part of the plugin id (`publisher.name`), also kebab-case. Defaults to `avandar`. When the command asks for a missing name in a terminal, it also asks for the publisher unless this flag is given |
| `-h`, `--help` | Prints the purpose, usage, arguments, options, and examples |

The command fails before writing anything when the name or publisher is not
kebab-case, `plugins/<name>` already exists, or `plugins/bundled.yaml` is not a
valid plugin list. Otherwise it writes the files in the next section and adds
the folder to `plugins/bundled.yaml`, keeping that file's comments.

## 2. Lay out the code

`ava plugin init` writes the five files a plugin needs:

```text
plugins/<name>/
  ava.yaml            the manifest
  package.json        approved dependencies only
  tsconfig.json       extends the repo's base config
  locales/en.json     every user-visible string (other locales optional)
  src/index.tsx       export default definePlugin({ commands: { ... } })
```

Plugin code follows the same repository rules as app code. Put each module in
its own folder, named after the module, with its test beside it. A directory
holds at most one `*.test.ts(x)` file outside a `__tests__/` directory (see
`docs/rules/testing.md`). The epidemiology plugin is the reference:

```text
plugins/epidemiology/src/
  index.tsx                                  the plugin entry
  index.test.tsx
  fitLinearRegression/
    fitLinearRegression.ts
    fitLinearRegression.test.ts
  makeRegressionPointsFromRows/
    makeRegressionPointsFromRows.ts
    makeRegressionPointsFromRows.test.ts
  RegressionModal/
    RegressionModal.tsx
    RegressionModal.test.tsx
    ColumnPickers.tsx
    RegressionForm.tsx
    makeStatisticTextFromNumber/
      makeStatisticTextFromNumber.ts
      makeStatisticTextFromNumber.test.ts
```

Plugin tests run with the repo's Vitest setup (`pnpm vitest run plugins/<name>`).

## 3. Write the manifest

`ava.yaml` is strict YAML 1.2, validated by `@avandar/plugin-manifest`. Unknown
keys, duplicate keys, aliases, and parser warnings are all errors, so a typo
fails the build instead of being ignored. Under YAML 1.2, `NO` stays a string.

```yaml
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots
permissions:
  - data:context
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
  menus:
    dataExplorer.toolbar:
      - command: regression.linear
        when:
          numericColumnCount: { gte: 2 }
```

| Key | Rule |
| --- | --- |
| `id` | `publisher.name`, lowercase letters, digits, and hyphens in each part |
| `version` | A quoted semver string, for example `"0.1.0"`. An unquoted `1.10` parses as a number and fails |
| `license` | A non-empty string, such as `MIT` |
| `engines.avandar` | A non-empty version range for the host, such as `"^1"` |
| `name`, `description`, command `title` | A `%key%` reference to `locales/en.json`, such as `"%plugin.name%"`. The text is plain, with no ICU arguments. A key missing from `en.json` fails |
| `icon` (plugin and command) | A Tabler icon name in kebab-case, such as `trending-up`. It must be a real icon in `@tabler/icons-react`, matched with exact case |
| `entry` | A relative `.ts` or `.tsx` path inside the plugin folder. The file must exist |
| `permissions` | A list. `data:context` is the only accepted value |
| `contributes.commands[].id` | Lowercase letters, digits, and hyphens in dot-separated words. Unique within the plugin |
| `contributes.menus.<slot>[].command` | The id of a command declared in the same manifest |

Quote any value YAML could read as something else: versions, and strings that
start with `%` (YAML needs the quotes there).

Edit `ava.yaml`, `locales/*.json`, or `plugins/bundled.yaml` while `pnpm dev`
runs and the page reloads. An invalid file shows the error in the browser
overlay and keeps the previous plugins.

## 4. Decide when a command shows

A menu entry's optional `when` decides whether its button shows, without
loading any plugin code. An entry with no `when` always shows. A condition is
exactly one of:

- **A fact comparison**: one fact and one or more operators, such as
  `numericColumnCount: { gte: 2 }`. Operators on one fact must all hold.
- **`all: [...]`**: every condition holds.
- **`any: [...]`**: at least one condition holds.
- **`not: ...`**: the condition does not hold.

Combinators need at least one condition, and a comparison names exactly one
fact. The operators are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, and `in`. `in`
takes a non-empty list, and every other operator takes a single value. Number
facts accept every operator, and boolean facts accept only `eq` and `ne`. A
value of the wrong type, an operator that does not fit the fact, or a fact the
slot does not declare fails validation. A condition that names a fact the slot
did not provide at runtime is false, even under `not` or `any`.

```yaml
when:
  all:
    - hasResult: { eq: true }
    - rowCount: { gt: 0 }
    - not: { dateColumnCount: { eq: 0 } }
```

The `dataExplorer.toolbar` slot is the only slot. Its facts:

| Fact | Type | Meaning |
| --- | --- | --- |
| `hasResult` | boolean | A settled query result is on screen |
| `rowCount` | number | Rows in that result |
| `columnCount` | number | Columns in that result |
| `numericColumnCount` | number | Columns of type whole number (`bigint`) or decimal (`double`) |
| `dateColumnCount` | number | Columns of type `date`, `time`, or `timestamp` |

While no result is on screen, `hasResult` is `false` and the counts are `0`.
Up to two matching commands render as toolbar buttons. With more than two, all
of them collapse into one "Plugins" menu. Buttons are disabled while a result
loads or another command is running.

## 5. Write the command

A plugin's entry module exports `definePlugin(...)` as its default export. The
`commands` keys must match the command ids in `ava.yaml`. A handler receives
the scoped `avandar` object and may be async.

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { RegressionModal } from "./RegressionModal/RegressionModal";

// eslint-disable-next-line react-refresh/only-export-components
export default definePlugin({
  commands: {
    "regression.linear": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("regression.linear.title"),
        content: <RegressionModal />,
      });
    },
  },
});
```

The `avandar` API, from `@avandar/plugin-sdk`:

| Member | Purpose | Permission |
| --- | --- | --- |
| `avandar.context` | What the command was invoked on: `{ slotId: "dataExplorer.toolbar", queryHandle, columns: [{ name, dataType }], rowCount }` | none |
| `avandar.data.fetchRows(handle, { columns, limit })` | Resolves `{ rows, isTruncated }` for the invoked-on result, with only the requested columns. `limit` defaults to 50,000 and is clamped to at most 200,000. `isTruncated` is true when the result had more rows | `data:context` |
| `avandar.ui.openModal({ title, content })` | Opens a modal. `content` is a React tree built from `@avandar/plugin-ui` | none |
| `avandar.ui.openDrawer({ title, content })` | Opens a drawer with the same options | none |
| `avandar.ui.notify({ title?, message, color? })` | Shows a notification. `title` defaults to the plugin name. `color` is `blue` (default), `green`, `red`, or `yellow` | none |
| `avandar.i18n.t(key, values?)` | Synchronous. Formats a message from `locales/` for the workspace locale | none |
| `avandar.workspace` | `{ id, slug, locale }`, read-only | none |

`fetchRows` accepts only the `queryHandle` of the current invocation. Any other
handle rejects with a `PluginError` coded `PermissionDenied`, and a result that
is no longer available rejects with `InvalidHandle`. A handler that throws or
rejects shows a failure notification, and a plugin chunk that fails to load can
be retried by clicking the button again.

Inside plugin UI, read the same scoped object with `useAvandar()`, and the
translator with `useT()`. Both throw a `PluginError` outside the content a
plugin opens through `avandar.ui`. The host wraps that content in an error
boundary, so a component that throws shows a failure message in the modal or
drawer and the rest of the app is unaffected.

```tsx
import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Text } from "@avandar/plugin-ui";

function RowCount() {
  const avandar = useAvandar();
  const t = useT();
  return (
    <Text>
      {t("modal.n")}: {avandar.context.rowCount}
    </Text>
  );
}
```

## 6. Translate plugin strings

Every user-visible string lives in `locales/<lang>.json`, as a flat map of key
to text. `en.json` is required and must define every `%key%` the manifest uses.
Other languages are optional. A key missing from the workspace's exact locale
(`es-MX`) falls back to its base language (`es`), then to English, then to the
bare key.

Manifest strings are plain text. Strings used in plugin code are ICU messages,
so they can take arguments and plurals:

```json
{
  "modal.truncated": "Fitted on the first {count, plural, one {# row} other {# rows}} of the result."
}
```

```ts
avandar.i18n.t("modal.truncated", { count: 50000 });
```

A message that cannot be compiled or formatted is returned as written instead
of throwing.

## 7. Stay within the import allowlist

Plugin code may import only:

- relative files inside the plugin
- `@avandar/plugin-sdk` and `@avandar/plugin-ui`
- `react` and `react/jsx-runtime`
- the approved npm packages: `simple-statistics`, `d3-array`, and `date-fns`
  (including its subpaths)

ESLint enforces this for `plugins/**` (`eslint/plugin-restrictions.js`). Test
files are exempt, since they import the test runner. `ava plugin validate` also
fails when `package.json` lists a dependency outside the approved list. The
list is `APPROVED_PLUGIN_DEPENDENCIES` in `@avandar/plugin-manifest`, and the
ESLint patterns must stay in step with it.

Build plugin UI only from `@avandar/plugin-ui`: `Alert`, `Badge`, `Button`,
`Divider`, `Group`, `Loader`, `NumberInput`, `Select`, `SimpleGrid`, `Stack`,
`Table`, `Text`, `TextInput`, and `Title`. Every API call is async or
fire-and-forget and passes serializable data, so a plugin keeps working when
plugins later run in a sandbox. The two exceptions are the synchronous
`i18n.t` and the React `content` of `openModal` and `openDrawer`.

## 8. Validate

```bash
ava plugin validate case-tools
```

`ava plugin validate [name] [--help]` checks one plugin, or every plugin in
`plugins/bundled.yaml` when no name is given (in a terminal it asks, and an
empty answer means all). For each plugin it runs:

1. The manifest checks: `ava.yaml` against the schema, locale files, the
   referenced `%key%` strings, the entry file, Tabler icons, and `package.json`
   dependencies.
2. `tsc` on `plugins/<name>/tsconfig.json`.
3. `eslint` on `plugins/<name>`.

Steps 2 and 3 are skipped when step 1 fails. The command exits nonzero when any
plugin fails, so CI can use it. The same manifest checks run on every
`vite build` and `pnpm dev`, and an invalid manifest fails the build.

Before you open a pull request, also run `pnpm check:plugin-bundle`. It builds
the app and fails if plugin code is statically reachable from the main bundle,
or if the plugin host outgrows its size budget.

## Rules to keep in mind

- **Permissions are declared, not enforced.** A manifest lists the permissions
  it needs and Settings → Plugins shows them to admins, but bundled plugins run
  in-process, so nothing blocks a call yet. Declare `data:context` whenever the
  plugin calls `fetchRows`, so the plugin is already correct when enforcement
  starts.
- **Never bundle a contract plugin.** This repository is public. A plugin that
  carries a customer's logic or data must wait for a distribution path that
  keeps it out of this repository.
