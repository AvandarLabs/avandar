# @avandar/ui

Shared React UI components for Avandar apps. Built on top of Mantine
(`@mantine/core`, `@mantine/notifications`) with Avandar design defaults
applied (typography sizes, color tokens, tooltip styles, etc.).

The package has two entry points:

| Entry                | Description                                       |
| -------------------- | ------------------------------------------------- |
| `@avandar/ui`        | UI components, helpers, and notifications         |
| `@avandar/ui/hooks`  | UI-related React hooks                            |

## Usage

```tsx
import {
  ActionIcon,
  Tooltip,
  Select,
  notifyError,
  notifySuccess,
  ObjectDescriptionList,
} from "@avandar/ui";
```

---

## Components

### `ActionIcon`

Mantine `ActionIcon` wrapped with Avandar styles, plus an optional
`tooltip` prop that automatically wraps the icon in the styled `Tooltip`.

| Prop           | Description                                            |
| -------------- | ------------------------------------------------------ |
| `tooltip`      | Tooltip content. When provided, wraps the icon button. |
| `tooltipProps` | Extra props forwarded to the `Tooltip` component       |

Also accepts every Mantine `ActionIconProps` and standard HTML element
attributes.

### `Tooltip`

Mantine `Tooltip` with Avandar defaults: dark `neutral.9` background,
medium font size, max width of 340px, `pop` transition, multiline enabled,
and styles that wrap long unbroken strings (e.g. filenames). All Mantine
`TooltipProps` are accepted and overridable.

### `EditIconButton`

A re-export of the internal `EditButton`. Pencil-icon action button used
to trigger edit flows. Can render as a `<button>` (default) or `<a>`.

| Prop          | Default | Description                                                   |
| ------------- | ------- | ------------------------------------------------------------- |
| `as`          | `"button"` | Render as `"button"` or `"a"`                              |
| `name`        | —       | Item name; populates the tooltip as `Edit ${name}`            |
| `withTooltip` | `true`  | Show the tooltip                                              |

### `EditableDisplayText`

Inline-editable text display. Shows truncated text with a tooltip when
overflowing; clicking the edit affordance reveals a text input or
textarea. Controlled (`value`, `onChange`) with explicit `onSave` /
`onCancel`.

| Prop          | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `value`       | Current text (controlled)                                            |
| `onChange`    | Called as the user types in edit mode                                |
| `onSave`      | Called when the user confirms the edit                               |
| `onCancel`    | Called when the user cancels                                         |
| `isSaving`    | Disables the save action while a save is in-flight                   |
| `disabled`    | Disables the edit affordance                                         |
| `name`        | Item name; populates the edit tooltip as `Edit ${name}`              |
| `emptyDisplayText` | Placeholder shown when `value` is empty                         |
| `isSaveDisabled` | Disables the save button                                          |
| `displayTextProps` | Mantine `TextProps` for the display variant                     |
| `textarea`    | When `true`, renders as a multi-line textarea                        |

### `ObjectDescriptionList`

A flexible structured-data renderer. Accepts either a plain object or an
array as `data` and renders it as a description list with type-aware
formatters for primitives (dates, numbers, booleans, text). Supports
per-key render overrides for inline editing of leaf values.

| Type                       | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `ObjectKeyRenderOptionsMap`| Per-key render-override map keyed by string paths into the data      |

### `Select`

Mantine `Select` wrapped with stricter generic types for `value` /
`defaultValue` / `onChange`, and a typed `data` prop.

| Type                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `SelectOption<T>`   | `{ value, label, disabled? }`                                           |
| `SelectOptionGroup<T>` | `{ group: string, items: ReadonlyArray<T \| SelectOption<T>> }`     |
| `SelectData<T>`     | `ReadonlyArray<T \| SelectOption<T> \| SelectOptionGroup<T>>`           |

#### `makeSelectOptions(list, options)`

Converts a list of objects into `SelectOption[]`. Pick `value` / `label`
either by key (`valueKey`, `labelKey`) or by function (`valueFn`,
`labelFn`). Optionally pass `isDisabledFn` to mark options disabled.

---

## Notifications

Thin wrappers around `@mantine/notifications` that apply Avandar colors
and default titles. Each accepts either a title string or
`{ title?, message? }`.

| Function                 | Default title          | Color    |
| ------------------------ | ---------------------- | -------- |
| `notifySuccess(...)`     | `"Success"`            | `green`  |
| `notifyError(...)`       | `"Error"`              | `red`    |
| `notifyWarning(...)`     | `"Warning"`            | `orange` |
| `notifyExpiredSession()` | `"Your session has expired"` | (via `notifyError`) |

### Dev-only notifications

These should never ship to production. They are placeholders used during
development.

| Function                  | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| `notifyNotImplemented()`  | Toast indicating a feature is not implemented yet                        |
| `notifyDevAlert(...msgs)` | Dev-only alert that pretty-prints any values (only fires in `import.meta.env.DEV`) |

---

## `@avandar/ui/hooks`

UI-specific React hooks (separate entry point).

### `useCheckTruncatedText(ref)`

Watches a DOM node's text overflow and returns whether the text is
currently truncated. Used by `EditableDisplayText` and `ObjectDescriptionList`
to decide whether to show a tooltip on hover.

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm test`       | Run all tests once           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm type-check` | Run TypeScript type checking |
