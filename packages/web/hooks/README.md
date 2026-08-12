# @avandar/hooks

Small, dependency-free React state hooks. The only runtime requirement is
`react` itself, which makes this package safe to depend on from anywhere,
including `@avandar/ui`.

> The `useQuery` / `useMutation` wrappers and `withQueryHooks` used to live
> here. They moved to [`@avandar/query-hooks`](https://www.npmjs.com/package/@avandar/query-hooks) so that `ui` and
> `hooks` no longer import each other.

ESM only. Requires Node 22+ and React 19.

## Install

```sh
pnpm add @avandar/hooks
pnpm add react
```

`react` is a peer dependency: a second copy would break hooks.

## Usage

```ts
import { useBoolean, useToggleBoolean } from "@avandar/hooks";
```

---

## State hooks

### `useBoolean(initialState)`

Manages boolean state. Returns a tuple `[state, setTrue, setFalse, toggle]`.
Similar to Mantine's `useDisclosure`, but as a tuple so the destructured
names can be renamed for non-open/close use cases.

```ts
const [isOpen, open, close, toggle] = useBoolean(false);
```

### `useToggleBoolean(initialState)`

Same idea as `useBoolean` but exposes only the toggle handler. Returns
`[state, toggle]`. Use when you don't need explicit `setTrue` / `setFalse`.

```ts
const [isExpanded, toggleExpanded] = useToggleBoolean(false);
```

## License

MIT
