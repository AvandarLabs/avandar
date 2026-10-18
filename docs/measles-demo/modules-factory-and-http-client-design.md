# `@avandar/modules` factory redesign and `HttpClientFactory`

Design spec, 2026-10-18. Built on `feat/demo/measles`. The modules refactor
is extracted and merged as its own PR under
[AVA-383](https://linear.app/avandar/issue/AVA-383). Converting
`ServiceClient`, `withQueryHooks` and `withLogger` onto the new API is
[AVA-384](https://linear.app/avandar/issue/AVA-384).

## 1. Goals

1. Make `@avandar/modules` a correct implementation of the composition
   pattern: first-class mixins, and immutable modules whose generated getters
   and setters keep every mixin across state changes.
2. Redesign `createModuleFactory` so a factory defines a **kind** of module
   and `Factory.create(name, { state, builder, mixins })` makes one, with
   `mixins` an unbounded `readonly` tuple folded left to right with precise
   types.
3. Build `HttpClientFactory` in `shared/utils/HttpClientFactory/` on that
   factory: a small `fetch`-based client with GET/POST/PUT/PATCH/DELETE,
   named auth strategies, and first-class rate limiting through a
   `withRateLimit` mixin backed by [Bottleneck](https://github.com/SGrondin/bottleneck).
4. Replace `shared/connectors/open-data/createOpenDataHttp.ts` with it, and
   rate-limit the `hdx` and `socrata` pipelines at 1 request per second.

**Not in scope:** converting `ServiceClient`, `withQueryHooks` and
`withLogger` (AVA-384); retry or backoff (deferred item 6 in
`open-data-catalog-architecture.md`); response caching (a future `withCache`
mixin); new HDX or Socrata credentials or environment variables.

## 2. What is wrong with `@avandar/modules` today

Each row was reproduced against the current code with a throwaway test.

| # | Problem | Evidence |
|---|---|---|
| 1 | Generated getters are shadowed by setters, and neither uses the documented `getX` / `setX` names. Both are keyed by the bare state key and setters are spread last (`createModule.ts:193-250`). | `createModule("Counter", { state: { count: 0 } })` exposes only `count`, which is the setter. `m.count()` sets `count` to `undefined` and returns a module; the types claim it returns `number`. |
| 2 | `.mixin()` freezes the members built before it. It rebuilds from a plain object of already-built members (`createModule.ts:285-296`), so they keep the old state, and the `mixin` doc comment's promise that mixins re-apply on every build is not implemented. | With the README's Counter example, after a mixin `increment()` returns a module without the mixin's members or state, and `setState({ count: 5 }).increment()` yields `count: 1`. |
| 3 | `createModuleFactory().create()` strips `mixin` and builds with no builder (`createModuleFactory.ts:36`). | A created module loses its members on any setter. `EtlEngine.ts:290` needs `@ts-expect-error`. |
| 4 | Members attached by spreading (`withLogger`, `withQueryHooks`) are lost on the next setter. | The workaround comment at `src/clients/UserClient.ts:288`. |
| 5 | `MergeObjects` intersects types, so a member override produces an impossible intersection instead of replacing the member. | Type-level. |
| 6 | Immutability is not enforced: `getState()` returns the live object. | Any caller can mutate state shared by every version of a module. |

## 3. Composition semantics

### 3.1 Vocabulary

| Term | Meaning |
|---|---|
| Module | A frozen plain object: generated accessors plus members. |
| Kind | A family of modules sharing state shape and base members, defined once by a factory (for example `HttpClient`). |
| Factory | Defines a kind. `Factory.create(...)` makes a module of that kind. Replaces the old "child" nomenclature. |
| Builder | `(module) => members`. Returns members given the module built so far. |
| Mixin | `(base) => { state?, members? }`. Extends a module. |
| `base` | The argument a mixin receives: the module built so far, with the current state. Renamed from `prev`. |
| Layer | One builder or mixin in a module's ordered composition. |

### 3.2 Accessors

Every module has `getModuleName()`, `getState()`, `setState(partial)`,
`set(keyPath, value)` and `mixin(mixinFn)`, plus `get{Key}()` and
`set{Key}(valueOrUpdater)` for every state key (`baseUrl` produces
`getBaseUrl` and `setBaseUrl`).

- **Reserved names.** A builder or mixin that returns a member named
  `getModuleName`, `getState`, `setState`, `set` or `mixin` throws when the
  module is built. State keys `moduleName` and `state` are rejected, at the
  type level and at runtime, because their accessors would collide.
- **Freezing.** Every module object and its state object are shallow-frozen.
  Nested values inside state are not frozen; the README says so.

### 3.3 Layers and rebuilds

A module is defined by `{ name, state, layers }`. Building one runs every
layer in order against the module built so far. A factory-made module's
layers are: the kind's builder, then the `create` builder if given, then each
mixin left to right.

- **Every state change rebuilds every layer** with the new state. Setters
  therefore never lose a mixin, and members always read current state. This
  fixes problems 1 to 3.
- **A mixin's `state` is applied once**, when the mixin is applied: the mixin
  wins over existing values for the keys it returns. On later rebuilds its
  `state` output is ignored and only its `members` are rebuilt. Otherwise a
  setter would silently reset whatever the mixin set, and an appending mixin
  like `withRateLimit` would append again on every change.
- **Mixin functions must be pure.** A mixin runs once when applied and once
  more on each later state change. Resources such as a Bottleneck limiter are
  created in the outer `withX(options)` call, never inside the function it
  returns.

### 3.4 Overrides

- The later layer wins, at runtime and in the types: `Omit<A, keyof B> & B`.
  This fixes problem 5.
- A mixin can decorate a member by calling it through `base`
  (`base.getProfile(...)`). It does **not** redirect a kind's internal calls
  to that member: a kind's `get` keeps calling the kind's own internals. There
  is no open recursion, by design, because that is the fragile-base-class
  problem composition exists to avoid.
- A kind that wants to be extensible exposes an extension point **in its
  state**. `HttpClient` keeps a `middlewares` list in state, and
  `withRateLimit` appends to it (section 6.5).

### 3.5 Rules for mixin authors

1. **Declare requirements by typing `base`** with the minimum shape the mixin
   needs, not the full module type. The requirement is then checked at
   compile time (section 5.3), which turns the implicit dependency that gave
   mixins their bad name ("Mixins Considered Harmful") into an explicit one.
2. **Read state at call time** through accessors, inside the member, not when
   the mixin runs.
3. **Never mutate `base`.** Return new members or state.

### 3.6 Members attached by spreading (transitional)

`createModelCrudClient` returns `{ ...baseServiceClient, ...members }` through
`withLogger`, and `createSupabaseCrudClient` then calls `.mixin()` on that
spread object. To keep every CRUD client working until AVA-384, `mixin` keeps
reading `this`: members on `this` that the module's own layers did not
produce are carried forward as a static layer. That layer is never rebuilt,
which is exactly today's behavior for these stateless clients. AVA-384
removes the spread augmenters, and this layer with them.

## 4. Public API

```ts
// A standalone module (unchanged entry point, fixed semantics)
const Counter = createModule("Counter", {
  state: { count: 0 },
  builder: (module) => ({
    increment: () => module.setCount((count) => count + 1),
  }),
});
Counter.getCount(); // 0

// A kind of module. State is inferred from the builder's parameter annotation.
const HttpClientFactory = createModuleFactory("HttpClient", {
  builder: (module: BuilderModule<HttpClientState>) => ({ get, post, getBytes /* ... */ }),
});
HttpClientFactory.getModuleName(); // "HttpClientFactory"

// A module of that kind
const HdxHttpClient = HttpClientFactory.create("HdxHttpClient", {
  state: { maxResponseBytes: 10 * 1024 * 1024 },
  mixins: [withRateLimit({ minTimeMs: 1000 })],
});
```

`Factory.create(name, options)`:

| Option | Required | Meaning |
|---|---|---|
| `state` | When the kind's state has required keys | The module's initial state. |
| `builder` | No | Members specific to this module, layered after the kind's members. |
| `mixins` | No | A `readonly` tuple of mixins, applied left to right. Each sees everything before it. No maximum length. |

The result is a normal module: it keeps `.mixin()` and every accessor.

**Exports:** `createModule`, `createModuleFactory`, `withNewMembers`, and the
types `Module`, `BuilderModule`, `Mixin`, `AnyMixin`, `LambdaMixin`,
`MixinTypeLambda`, `ModuleFactory`, `AnyModule`, `UnknownModule`,
`NameOfModule`, `StateOfModule`, `MembersOfModule`. The `BaseModule` alias is
removed; its one consumer (`EtlEngine.ts`) moves to `BuilderModule`.

## 5. Type design

Prototyped in a scratch file against TypeScript 5.9 (the repo's version)
before this spec was written. Every behavior below was checked with positive
assertions and with `@ts-expect-error` cases that must fail.

### 5.1 The fold

`mixins` is inferred as a `const` tuple, and a tail-recursive conditional type
folds it left to right, merging each mixin's `state` and `members` into the
accumulated module. Tail recursion lets TypeScript go about 1,000 levels deep,
so there is no practical maximum. The prototype covered 21 mixins in one
tuple.

### 5.2 Plain mixins and lambda mixins

A conditional type cannot call a generic function type with a type argument
(TypeScript has no higher-kinded types). So when a generic mixin like
`<M extends Record<Q, AsyncFn>>(base: M) => ...` is folded, `M` erases to
its constraint and the members it adds silently become `any`.

- **Plain mixin:** a function whose added members do not depend on the module
  it is applied to (`withRateLimit`). The fold reads its input and output
  straight off the signature. Plain generic factories such as
  `withName("a")` also work inline.
- **Lambda mixin:** a mixin whose added members depend on `base`
  (`withQueryHooks`, whose `useGetProfile` copies `getProfile`'s argument and
  return types). It declares a type lambda, the same trick Effect-TS calls
  `TypeLambda`, and the fold applies it to the accumulated module:

```ts
interface QueryHooksMixin<Q extends string> extends MixinTypeLambda {
  readonly requires: Record<Q, AsyncFn>;
  readonly state: EmptyObject;
  readonly members: QueryHooks<this["base"], Q>;
}
function withQueryHooks<const Q extends string>(options: {
  queryFns: readonly Q[];
}): LambdaMixin<QueryHooksMixin<Q>> { /* ... */ }
```

Only mixin authors write lambdas, once per mixin. Call sites never see them.

### 5.3 Requirement checks

The check lives in a required `mixinRequirementNotMet` property that is
intersected onto `options` only when some mixin's requirement is not met. The
error lands on the `create` call and names the mixin and what was missing:

```
Property 'mixinRequirementNotMet' is missing ... but required in type
'{ readonly mixinRequirementNotMet: { mixinIndex: 0; moduleMustSatisfy:
{ getMiddlewares(): readonly HttpMiddleware[] | undefined }; hint: "If the
missing members come from this create() call's builder, annotate the
builder's parameter" } }'
```

The check cannot sit on the `mixins` property itself. Anything there becomes
the contextual type of the tuple's elements, which forces TypeScript to fix
the tuple's type before it has read it, so inline mixins stop inferring.

### 5.4 Known constraints

1. **No default on the tuple's type parameter.** A default such as
   `= readonly []` makes TypeScript resolve the tuple to that default while an
   inline generic mixin call is being typed. Every element then fails as "not
   assignable to `undefined`". A minimal repro confirmed it with nothing else
   involved. With no default, an omitted `mixins` falls back to the
   constraint, and the fold returns the unmixed module.
2. **Annotate the `create` builder's parameter when a mixin needs that
   builder's members.** `builder: (module) => ...` is inferred in
   TypeScript's second pass, after the requirement check has already been
   resolved, so the check would not see those members. The fix is to write
   `(module: BuilderModule<State>) =>` or to leave the parameter out. Kind
   builders always annotate it anyway, because that is how the factory
   infers the kind's state. The error's `hint` says this.
3. **Type parameters with no inference candidates default to `EmptyObject`,**
   never to the `UnknownObject` constraint. The constraint carries an index
   signature that would let `module.anythingAtAll` type-check.

## 6. `HttpClientFactory`

### 6.1 Files

```
shared/utils/HttpClientFactory/
  HttpClientFactory.ts          the kind: createModuleFactory("HttpClient", ...)
  HttpClientFactory.types.ts    HttpClientState, HttpClientAuth, HttpMiddleware, HttpClient
  HttpClientFactory.test.ts
  HttpClientError.ts
  readBoundedBody.ts            moved from createOpenDataHttp.ts
  mixins/withRateLimit/withRateLimit.ts
  mixins/withRateLimit/withRateLimit.test.ts
```

There is no barrel file, so a module that imports `HttpClientFactory` never
pulls in Bottleneck.

### 6.2 State

```ts
type HttpClientState = {
  /** Relative request paths resolve against this. Absolute URLs pass through. */
  baseUrl?: string;
  /** Requires `baseUrl`. Sent only to `baseUrl`'s origin. */
  auth?: HttpClientAuth;
  defaultHeaders?: Readonly<Record<string, string>>;
  /** Cap on every response body, JSON or bytes. */
  maxResponseBytes: number;
  middlewares?: readonly HttpMiddleware[];
  /** Defaults to global `fetch`. Injected by tests. */
  fetchImpl?: FetchLike;
};

type HttpClientAuth =
  | { type: "bearer"; token: string }
  | { type: "apiKeyHeader"; headerName: string; apiKey: string }
  | { type: "apiKeyQuery"; paramName: string; apiKey: string };
```

Because this is module state, `client.setBaseUrl(url)` and
`client.setMaxResponseBytes(n)` return new clients that keep their mixins.

### 6.3 Members

| Member | Returns |
|---|---|
| `get(url, options?)` | Parsed JSON as `unknown`. Callers validate with zod, as the open-data clients do today. |
| `post` / `put` / `patch` (`url, options?`) | Parsed JSON. `options.body` is JSON-encoded, and `content-type: application/json` is set. |
| `delete(url, options?)` | Parsed JSON, or `undefined` for an empty body. |
| `getBytes(url, options?)` | `Uint8Array<ArrayBuffer>`. Follows redirects. |

Every member accepts `query` (built with `buildHttpQueryString`), `headers`
and `signal`. A JSON member returns `undefined` for a 204 response or an
empty body. `getBytes` returns an empty array for an empty body.

### 6.4 Request pipeline

1. Resolve the URL: a relative path against `baseUrl`, an absolute URL as-is.
   If `auth` is set without `baseUrl`, the builder throws when the client is
   created.
2. Run the middlewares, first in the array outermost. They receive
   `{ method, url, headers, body, signal }` **without** credentials.
3. Apply auth, in the innermost step just before `fetch`, and only when the
   request's origin equals `baseUrl`'s origin. Credentials therefore never
   reach a middleware and never go to another host. That second guarantee
   matters for the open-data clients, which follow absolute resource URLs to
   arbitrary hosts.
4. `fetch`. A non-2xx status throws `HttpClientError`.
5. Read the body with the `maxResponseBytes` cap: the declared
   `content-length` is checked first, then the streamed read aborts past the
   cap.

`HttpClientError` carries `method`, `status` and a `kind` of
`"status" | "responseTooLarge"`. **No error message ever names a URL.** After
redirects, the URL can be a presigned object-store URL, which is a
credential. This keeps `createOpenDataHttp`'s existing rule.

### 6.5 `withRateLimit`

```ts
withRateLimit({ minTimeMs: 1000, maxConcurrent?: number })
```

- `minTimeMs` spaces the *start* of consecutive requests. `maxConcurrent`
  defaults to Bottleneck's default, which is no cap, so a slow response does
  not hold up the next request once `minTimeMs` has passed.
- It's a plain mixin. Its `base` requirement is `getMiddlewares()`, and it
  returns `state: { middlewares: [...existing, rateLimitMiddleware] }`. The
  middleware wraps `next(request)` in `limiter.schedule(...)`.
- One Bottleneck instance is created per `withRateLimit(...)` call. So clients
  derived through setters share their parent's budget, two clients given the
  same `withRateLimit` value share a budget deliberately, and two separate
  calls give separate budgets.
- `bottleneck@2` (2.19.5) is added to the root `package.json`, and mapped as
  `"bottleneck": "npm:bottleneck@2"` in the root `deno.json`, because
  `pnpm type-check:deno` checks all of `shared/`. No edge function imports
  this file, so no per-function `deno.json` changes are needed.

## 7. Replacing `createOpenDataHttp`

The open-data clients keep depending on a narrow surface, so tests can pass
small fakes: `OpenDataHttp` becomes `Pick<HttpClient, "get" | "getBytes">`,
and every `http.getJson(url)` becomes `http.get(url)`.

| Call site | Client |
|---|---|
| `supabase/functions/open-data/OpenDataRoutes.ts:73` | `HttpClientFactory.create("OpenDataRouteHttpClient", { state: { maxResponseBytes: MAX_RESOURCE_BYTES } })`, with no rate limit |
| `apps/pipeline-server/pipelines/hdx/run.ts:32` | `create("HdxPipelineHttpClient", { state: { maxResponseBytes: MAX_METADATA_BYTES }, mixins: [withRateLimit({ minTimeMs: 1000 })] })` |
| `apps/pipeline-server/pipelines/socrata/run.ts:20` | Same shape, `"SocrataPipelineHttpClient"`. Socrata's drives enumerate concurrently, so one shared limiter is what keeps the discovery API at 1 request per second overall. |
| `CkanClient`, `SocrataClient`, `CkanDiscoveryClient`, `SocrataDiscoveryClient`, `acquireOpenDataResource`, `readOpenDataFreshnessToken` | Type change only. |

Then `createOpenDataHttp.ts` and its test are deleted, and their behaviors are
covered by `HttpClientFactory.test.ts`.

**Behavior changes:**

- JSON responses are now size-capped too. `getJson` used to read them
  unbounded.
- Error messages change from "Open data metadata request failed..." to
  `HttpClientError`'s wording. Tests that assert the old text are updated.

## 8. Migrating existing factory users

| Call site | Change |
|---|---|
| `src/clients/qetl/QueryMediator/QueryMediator.ts:90` | Define `QueryMediatorFactory` with an annotated builder. `IQueryMediator` becomes a type derived from the factory. |
| `WorkspaceQuerySession.ts:120`, `PublicQuerySession.ts:80` | `QueryMediatorFactory.create(state)` becomes `QueryMediatorFactory.create("QueryMediator", { state })`. |
| `packages/node/etl/src/EtlEngine/EtlEngine.ts:288` | Same, and the `@ts-expect-error` goes. `apps/pipeline-server/pipelines/world-bank__wdi/run.ts:20` follows `EtlEngine.create`'s new signature. |

No consumer reads state through the generated accessors (all use
`getState()`), so renaming them to `getX` / `setX` breaks nothing outside the
package.

## 9. Testing (red/green TDD, in this order)

1. **`createModule`:**
   - Accessor names; getters are not shadowed.
   - Setters keep mixins, and members see the new state.
   - A mixin's state is applied once and its members are rebuilt.
   - Reserved names throw; modules are frozen.
   - Later layers win.
   - Spread-attached members survive `.mixin()` (section 3.6).
2. **`createModuleFactory`:**
   - Layer order (kind, then `create` builder, then mixins).
   - Created modules keep `.mixin()` and survive setters.
   - Factory name.
3. **Type tests:** a `*.types.test.ts` compiled by the package's
   `type-check`. It ports the prototype's assertions, including the
   `@ts-expect-error` cases.
4. **`HttpClientFactory`**, using an injected `fetchImpl`:
   - URL resolution and query strings; JSON bodies and empty responses.
   - Each auth strategy; auth withheld from other origins and from
     middlewares.
   - The byte cap, both declared and streamed.
   - Errors never contain the URL.
   - Middleware order.
5. **`withRateLimit`**, with real timers and a 50 ms `minTimeMs`:
   - Requests are spaced and keep their order.
   - Setter-derived clients share one limiter.
6. **Open-data consumers:** update their tests to the new type, and run the
   `hdx` / `socrata` pipeline tests. Run `pnpm type-check:deno`.

## 10. Delivery

- Commits land on `feat/demo/measles`. Every `packages/shared/modules` change
  goes in its own commits, with no other files, so AVA-383 can lift them
  onto a branch off `develop`.
- That PR is titled `feat(modules)!: ...`, a breaking change that bumps the
  minor version while the package is at 0.x. The README, the `mixin` doc
  comment and the `CHANGELOG` are rewritten to match section 3.
