# @avandar/query-hooks

Conventions layered over [TanStack Query](https://tanstack.com/query): thin
`useQuery` and `useMutation` wrappers that return tuples and handle cache
invalidation declaratively, plus a `withQueryHooks` augmenter that generates
query and mutation hooks for a service client.

ESM only. Requires Node 22+ and React 19.

## Install

```sh
pnpm add @avandar/query-hooks
pnpm add react @tanstack/react-query
```

`react` and `@tanstack/react-query` are peer dependencies: your app owns the
`QueryClientProvider`, and a second copy of either would break hooks and cache
identity.

## Error reporting

This package does not know how your app surfaces errors. When a query or
mutation fails and the caller supplied no `onError`, it calls an injected
reporter, defaulting to `console.error`.

```tsx
import { AvaQueryProvider } from "@avandar/query-hooks";

<AvaQueryProvider
  onError={({ title, message, cause }) => showToast(title, message, cause)}
>
  <App />
</AvaQueryProvider>;
```

Mounting the provider is optional.

| Export                       | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `AvaQueryProvider`           | Supplies the error reporter                    |
| `useAvaQueryErrorReporter()` | Reads the active reporter                      |
| `AvaQueryErrorReporter`      | `({ title, message, cause }) => void`          |

---

## `useQuery(options)`

Wraps TanStack's `useQuery` and:

- catches errors thrown by `queryFn`, reports them in development, and
  re-throws so the query still lands in an error state,
- returns a tuple `[data, isLoading, queryResult]` for easier destructuring,
- adds `usePreviousDataAsPlaceholder`, shorthand for
  `placeholderData: (prev) => prev`.

```ts
const [users, isLoading] = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});
```

| Type                  | Description                                     |
| --------------------- | ----------------------------------------------- |
| `UseQueryOptions`     | Options accepted by `useQuery`                  |
| `UseQueryResult`      | The raw TanStack result object                  |
| `UseQueryResultTuple` | The `[data, isLoading, queryResult]` shape      |

## `useMutation(options)`

Wraps TanStack's `useMutation` and:

- returns a tuple `[mutate, isPending, mutationResult]`,
- exposes `mutate.async` for callers that want a promise,
- accepts `queryToInvalidate` / `queriesToInvalidate` and `queryToRefetch` /
  `queriesToRefetch`, applied after a successful mutation and before your own
  `onSuccess`,
- falls back to the injected error reporter when you supply no `onError`
  (a specific message in development, a generic one in production).

```ts
const [createUser, isCreating] = useMutation({
  mutationFn: api.createUser,
  queryToInvalidate: ["users"],
});

createUser({ name: "Alice" });
await createUser.async({ name: "Bob" });
```

The plural options take precedence over the singular ones.

| Type                     | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `UseMutationOptions`     | TanStack's options plus the invalidate/refetch fields   |
| `UseMutationResult`      | The raw TanStack mutation result                        |
| `UseMutateFunction`      | The `mutate` callable, with `.async` attached           |
| `UseMutationResultTuple` | The `[mutate, isPending, mutationResult]` shape         |

---

## `withQueryHooks(client, { queryFns?, mutationFns? })`

Augments a service client (or any object whose values are single-argument
promise-returning functions) with generated `use<Name>` hooks. Each `queryFns`
entry becomes a hook wrapping `useQuery`; each `mutationFns` entry becomes one
wrapping `useMutation`.

```ts
const UserClient = withQueryHooks(rawUserClient, {
  queryFns: ["getById", "getAll"],
  mutationFns: ["insert", "update", "delete"],
});

const [user] = UserClient.useGetById({ id: userId });
const [users] = UserClient.useGetAll();
const [createUser] = UserClient.useInsert({ invalidateGetAllQuery: true });

// loader-friendly, shares the cache
await UserClient.withCache(queryClient).withEnsureQueryData().getAll();
```

Parameters are passed differently depending on their shape: an **object**
parameter is spread directly (`useGetById({ id })`), while a **scalar**
parameter uses the `{ arg }` envelope (`useGetByName({ arg: "sprocket" })`).

The augmented client also exposes:

- `QueryKeys` — query-key builder functions, one per listed query function,
  useful for manual invalidation. Functions in the params are stripped so keys
  stay serialisable.
- `withCache(queryClient)` — returns `withEnsureQueryData()` and
  `withFetchQuery()` variants so non-hook calls share the same cache.

Mutation hooks accept `UseMutationOptions` plus `invalidateGetAllQuery`, which
appends the client's `getAll` key to the invalidation list.

| Export                      | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `DEFAULT_QUERY_FN_NAMES`    | Names treated as queries by default                 |
| `DEFAULT_MUTATION_FN_NAMES` | Names treated as mutations by default               |
| `WithQueryHooks`            | The augmented client type                           |
| `FnNameReturningPromise`    | Keys of an object whose values return a `Promise`   |

`DefaultError`, `QueryClient`, and `QueryKey` are re-exported unchanged from
`@tanstack/react-query` for convenience.

## License

MIT
