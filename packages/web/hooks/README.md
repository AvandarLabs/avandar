# @avandar/hooks

React hooks for the Avandar web app. Includes thin wrappers around
`@tanstack/react-query` (`useQuery`, `useMutation`) that apply Avandar
conventions for error handling and cache invalidation, a higher-order
`withQueryHooks` augmenter that auto-generates hooks for service clients,
and a few small state hooks.

## Usage

```ts
import {
  useQuery,
  useMutation,
  useBoolean,
  withQueryHooks,
} from "@avandar/hooks";
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

---

## Data hooks

### `useQuery(options)`

A wrapper around Tanstack's `useQuery` that:

- catches thrown errors from `queryFn` and shows a dev-only Mantine
  notification before re-throwing,
- returns a tuple `[data, isLoading, queryResult]` for easier
  destructuring,
- adds the `usePreviousDataAsPlaceholder` option as shorthand for
  `placeholderData: (prev) => prev`.

```ts
const [users, isLoading] = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});
```

| Type                  | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `UseQueryOptions`     | Options accepted by `useQuery` (extends Tanstack's options)                  |
| `UseQueryResult`      | The raw Tanstack result object                                               |
| `UseQueryResultTuple` | The `[data, isLoading, queryResult]` tuple shape                             |

### `useMutation(options)`

A wrapper around Tanstack's `useMutation` that:

- returns a tuple `[mutate, isPending, mutationResult]` for easier
  destructuring,
- exposes `mutate.async` for callers that want a promise (avoids importing
  `mutateAsync` separately),
- accepts `queryToInvalidate` / `queriesToInvalidate` and
  `queryToRefetch` / `queriesToRefetch` options that automatically run
  after `onSuccess`,
- handles errors with a default Mantine error notification (dev shows the
  message; prod shows a generic message) when no custom `onError` is
  supplied.

```ts
const [createUser, isCreating] = useMutation({
  mutationFn: api.createUser,
  queryToInvalidate: ["users"],
});

createUser({ name: "Alice" });
await createUser.async({ name: "Bob" });
```

| Type                     | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| `UseMutationOptions`     | Options accepted by `useMutation` (extends Tanstack's, adds invalidate/refetch fields) |
| `UseMutationResult`      | The raw Tanstack mutation result object                                       |
| `UseMutateFunction`      | The `mutate` callable (with `.async` attached)                                |
| `UseMutationResultTuple` | The `[mutate, isPending, mutationResult]` tuple shape                         |

---

## Client augmenters

### `withQueryHooks(client, { queryFns?, mutationFns? })`

Augments a `@avandar/clients` service client (or any object whose values
are single-argument promise-returning functions) with auto-generated
`use<Name>` hooks. Each listed `queryFns` entry becomes a `useGetX` hook
that wraps `useQuery`; each `mutationFns` entry becomes a `useInsertX`
hook wrapping `useMutation`.

The returned client also exposes:

- `QueryKeys` — a record of query-key builder functions, one per listed
  query function. Keyed identically to the original method names. Useful
  for manual cache invalidation.
- `withCache(queryClient)` — connects the client to a Tanstack
  `QueryClient` so non-hook query calls (e.g. inside a route loader) can
  share the same cache. Returns an object with `withEnsureQueryData()` and
  `withFetchQuery()` that wrap each query function.

```ts
const UserClient = withQueryHooks(rawUserClient, {
  queryFns:    ["getById", "getAll"],
  mutationFns: ["insert", "update", "delete"],
});

// auto-generated hooks
const [user] = UserClient.useGetById({ arg: userId });
const [users] = UserClient.useGetAll();
const [createUser] = UserClient.useInsert({ invalidateGetAllQuery: true });

// loader-friendly variant
await UserClient.withCache(queryClient).withEnsureQueryData().getAll();
```

Mutation hooks accept the standard `UseMutationOptions` plus the extra
`invalidateGetAllQuery` flag, which (when the underlying client has a
`getAll` query) appends the `getAll` query key to the list of keys to
invalidate after the mutation succeeds.

### Default function-name constants

| Constant                     | Value                                                                       |
| ---------------------------- | --------------------------------------------------------------------------- |
| `DEFAULT_QUERY_FN_NAMES`     | Function names treated as queries by default (`getById`, `getAll`, etc.)    |
| `DEFAULT_MUTATION_FN_NAMES`  | Function names treated as mutations by default (`insert`, `update`, etc.)   |

| Type                       | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `WithQueryHooks`           | The augmented client type produced by `withQueryHooks`                     |
| `FnNameReturningPromise`   | Helper: union of an object's keys whose values return a `Promise`          |
| `DefaultQueryFnName`       | Element of `DEFAULT_QUERY_FN_NAMES`                                        |
| `DefaultMutationFnName`    | Element of `DEFAULT_MUTATION_FN_NAMES`                                     |

---

## Forwarded Tanstack types

For convenience, these types are re-exported unchanged from
`@tanstack/react-query`:

| Type           | Description                                |
| -------------- | ------------------------------------------ |
| `DefaultError` | The default error type Tanstack uses       |
| `QueryClient`  | The Tanstack `QueryClient` class           |
| `QueryKey`     | The `QueryKey` tuple shape                 |

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm test`       | Run all tests once           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm type-check` | Run TypeScript type checking |
