# @avandar/ui

React UI components built on [Mantine](https://mantine.dev) with Avandar design
defaults applied: typography sizes, colour tokens, tooltip styling, and a set of
higher-level components (structured-data rendering, inline-editable text, typed
selects).

ESM only. Requires Node 22+ and React 19.

## Install

```sh
pnpm add @avandar/ui
```

This package has peer dependencies you supply yourself, because they carry
React context or component identity and must resolve to a single shared copy:

```sh
pnpm add react react-dom @mantine/core @mantine/form @mantine/hooks \
  @mantine/modals @mantine/notifications @tabler/icons-react \
  @tanstack/react-router
```

## Setup

**Import the stylesheet once**, at your app root. Components are styled with
CSS modules that are extracted into a single file; without this import they
render unstyled.

```tsx
import "@avandar/ui/styles.css";
```

Mount `AvaUiProvider` at the root of your app. It sets up the Mantine theme,
the notifications portal, and the translations AvaUI components read:

```tsx
import { AvaUiProvider } from "@avandar/ui";

<AvaUiProvider theme={myTheme} i18nMessages={myMessages}>
  <App />
</AvaUiProvider>;
```

Every prop is optional, so `<AvaUiProvider>` on its own gives you Mantine's
default theme and English copy. Data-layer providers are deliberately not
included: pass them through as `children` so this package stays presentation
only.

| Prop | Purpose |
| ---------------------- | -------------------------------------------------- |
| `theme` | Mantine theme override |
| `cssVariablesResolver` | Maps theme values onto CSS variables |
| `i18nMessages` | Translated strings (see below) |
| `notificationsProps` | Forwarded to Mantine's `Notifications` |
| `notificationsStyles` | Merged over AvaUI's notification styles |

`notificationsStyles` merges per selector rather than replacing, so restyling
`notification` keeps the click-through behaviour AvaUI sets on `root`. Mantine's
callback form works too; its result is merged the same way.

## Entry points

| Entry                   | Contents                                  |
| ----------------------- | ----------------------------------------- |
| `@avandar/ui`           | Components, helpers, and the UI provider  |
| `@avandar/ui/hooks`     | React hooks, including the form hook      |
| `@avandar/ui/styles.css`| The extracted stylesheet (import once)    |

## Usage

```tsx
import "@avandar/ui/styles.css";
import { ActionIcon, Select, ObjectDescriptionList } from "@avandar/ui";
import { useForm } from "@avandar/ui/hooks";
```

## Internationalisation

This package does **not** depend on an i18n framework. An i18n framework is an
app-level singleton (locale detection, catalogue loading, plural rules), so
depending on one would force every consumer onto the same framework. Instead
you pass already-translated strings, the same approach MUI (`localeText`) and
Ant Design (`ConfigProvider locale`) take.

Components fall back to English defaults, so this is entirely optional. Pass
them to `AvaUiProvider`:

```tsx
<AvaUiProvider i18nMessages={{ cancel: t`Cancel`, save: t`Save` }}>
  <App />
</AvaUiProvider>;
```

If your app already owns its Mantine setup and wants nothing from AvaUI but the
translations, mount `I18nAvaUiProvider` on its own instead.

`i18nMessages` is a `Partial<I18nMessages>`, so you can translate incrementally
and anything you omit keeps its English default. Interpolated strings are
functions rather than templates so translators control word order:

```ts
fieldMinLength: ({ fieldName, minLength }) =>
  `${fieldName} doit contenir au moins ${minLength} caractères`;
```

| Export                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `AvaUiProvider`        | Theme, notifications, and `i18nMessages` in one     |
| `I18nAvaUiProvider`    | Supplies `i18nMessages` alone                       |
| `useI18nMessages()`    | Reads the active messages (falls back to English)   |
| `defaultI18nMessages`  | The English defaults                                |
| `I18nMessages`         | The full message contract                           |

---

## Components

### `ActionIcon`

Mantine `ActionIcon` with Avandar styles, plus an optional `tooltip` prop that
wraps the button in the styled `Tooltip`.

| Prop           | Description                                            |
| -------------- | ------------------------------------------------------ |
| `tooltip`      | Tooltip content. When provided, wraps the icon button. |
| `tooltipProps` | Extra props forwarded to the `Tooltip` component       |

Also accepts every Mantine `ActionIconProps` and standard HTML attributes.

### `Tooltip`

Mantine `Tooltip` with Avandar defaults: dark `neutral.9` background, medium
font size, 340px max width, `pop` transition, multiline enabled, and styles
that wrap long unbroken strings such as filenames. All Mantine `TooltipProps`
are accepted and overridable.

### `EditIconButton`

Pencil-icon action button for edit flows. Renders as a `<button>` (default) or
`<a>`.

| Prop          | Default    | Description                                    |
| ------------- | ---------- | ---------------------------------------------- |
| `as`          | `"button"` | Render as `"button"` or `"a"`                  |
| `name`        | —          | Item name; populates the tooltip as `Edit {name}` |
| `withTooltip` | `true`     | Show the tooltip                               |

### `EditableDisplayText`

Inline-editable text. Shows truncated text with a tooltip when overflowing;
clicking the edit affordance reveals an input or textarea. Controlled
(`value`, `onChange`) with explicit `onSave` / `onCancel`.

| Prop                 | Description                                         |
| -------------------- | --------------------------------------------------- |
| `value`              | Current text (controlled)                           |
| `onChange`           | Called as the user types in edit mode               |
| `onSave`             | Called when the user confirms the edit              |
| `onCancel`           | Called when the user cancels                        |
| `isSaving`           | Disables saving while a save is in flight           |
| `disabled`           | Disables the edit affordance                        |
| `name`               | Item name; populates the edit tooltip               |
| `emptyDisplayText`   | Placeholder shown when `value` is empty             |
| `isSaveDisabled`     | Disables the save button                            |
| `displayTextProps`   | Mantine `TextProps` for the display variant         |
| `textarea`           | Render as a multi-line textarea                     |

### `ObjectDescriptionList`

Structured-data renderer. Accepts a plain object or an array as `data` and
renders a description list with type-aware formatters for dates, numbers,
booleans, and text. Supports per-key render overrides for inline editing of
leaf values via `ObjectKeyRenderOptionsMap`.

### `Select`

Mantine `Select` with stricter generics for `value` / `defaultValue` /
`onChange`, and a typed `data` prop.

| Type                   | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `SelectOption<T>`      | `{ value, label, disabled? }`                                      |
| `SelectOptionGroup<T>` | `{ group: string, items: ReadonlyArray<T \| SelectOption<T>> }`    |
| `SelectData<T>`        | `ReadonlyArray<T \| SelectOption<T> \| SelectOptionGroup<T>>`      |

`makeSelectOptions(list, options)` converts a list of objects into
`SelectOption[]`, picking `value` / `label` by key (`valueKey`, `labelKey`) or
by function (`valueFn`, `labelFn`), with an optional `isDisabledFn`.

### Others

`Paper`, `Callout`, `Modal`, `Drawer`, `Tabs`, `DangerousActionButton`,
`DangerText`, `TruncatedText`, `Link`, `NavLink`, `NavLinkList`,
`SegmentedControl` (with `makeSegmentedControlItems`), `FloatingLoader`,
`LoadingOverlay`, and the single-purpose forms `FileUploadForm`,
`InputTextForm`, `TextareaForm`.

---

## `@avandar/ui/hooks`

### `useForm(options)`

Mantine's `useForm` with improved type safety on the `validate` option, plus
dot-notation key paths. Exports `FormType`, `UseFormInput`, `FormRule`,
`FormRulesRecord`, and `RuleFn`, and the `isNotEqualTo` validator.

### `useCheckTruncatedText(ref)`

Watches a DOM node's text overflow and returns whether the text is currently
truncated. Used by `EditableDisplayText` and `ObjectDescriptionList` to decide
whether to show a tooltip on hover.

## License

MIT
