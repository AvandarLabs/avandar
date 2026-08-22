# @avandar/modules

A small library for building composable object modules in place of class
hierarchies. A module is a plain object with auto-generated getters/setters
over its state plus whatever members its builder defines, and can be
incrementally extended via `mixin()`.

State is immutable: every setter call returns a new module instance, leaving
the original untouched.

ESM only. Requires Node 22+.

## Install

```sh
pnpm add @avandar/modules
```

No peer dependencies.

## Usage

```ts
import {
  createModule,
  createModuleFactory,
  withNewMembers,
} from "@avandar/modules";

const Counter = createModule("Counter", {
  state: { count: 0 },
  builder: (m) => ({
    increment: () => m.setCount((c) => c + 1),
    double: () => m.setCount((c) => c * 2),
  }),
});

Counter.getCount(); // 0
const next = Counter.increment().double();
next.getCount(); // 2
Counter.getCount(); // still 0 (immutable)
```

### Mixins

`mixin()` extends a module with extra state and members. Returns a new
module with the merged types.

```ts
const WithLabel = Counter.mixin((prev) => ({
  state: { label: "count" },
  members: {
    describe: () => `${prev.getLabel()}: ${prev.getCount()}`,
  },
}));

WithLabel.describe(); // "count: 0"
```

The `withNewMembers` helper is a convenience shortcut for mixins that only
add members (no new state):

```ts
const WithReset = Counter.mixin(
  withNewMembers({
    reset: () => Counter.setCount(0),
  }),
);
```

### Factories

`createModuleFactory` produces a factory module whose `.create(state)` call
returns a fresh child module each time. Useful when each instance needs its
own state but should share members.

```ts
type CounterModule = Module<
  "Counter",
  { count: number },
  { increment: () => CounterModule }
>;

const CounterFactory = createModuleFactory<CounterModule>("Counter", {
  childBuilder: (m) => ({
    increment: () => m.setCount((c) => c + 1),
  }),
});

const a = CounterFactory.create({ count: 0 });
const b = CounterFactory.create({ count: 100 });
```

## API

### `createModule(moduleName, options?)`

Creates a module.

| Option    | Type                                      | Description                                                               |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `state`   | object                                    | Initial state. Auto-generates `getX()` / `setX()` accessors for each key. |
| `builder` | `(accessors) => members` or `members` obj | Returns the module's members (functions, data) given its base accessors.  |

Every module instance has the following base accessors:

| Member                       | Description                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `getModuleName()`            | Returns the module's name string                                                  |
| `getState()`                 | Returns the full current state object                                             |
| `setState(partial)`          | Returns a new module with `partial` merged into state                             |
| `set(keyPath, value)`        | Returns a new module with `value` set at a dot-notation `keyPath` in state        |
| `get<Key>()` (per state key) | Returns the value of `state[key]`                                                 |
| `set<Key>(value)` (per key)  | Returns a new module with `state[key]` replaced. Accepts a value or `(prev) => v` |
| `mixin(mixinFn)`             | Returns a new module with extra state/members merged in                           |

### `createModuleFactory<ChildModule>(moduleName, options)`

Creates a factory module that produces child instances on demand. The
factory itself is a module named `${moduleName}Factory` with a single
`create(state)` member.

| Option         | Type                          | Description                                                |
| -------------- | ----------------------------- | ---------------------------------------------------------- |
| `childBuilder` | `(accessors) => childMembers` | Members each created child should have given its accessors |

### `withNewMembers(members)`

Mixin helper that returns a `() => { members }` function. Use this when
your mixin only adds members and doesn't depend on the previous module's
state or accessors.

## Types

| Type                     | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `Module<Name, State, M>` | A full module: base accessors + state getters/setters + `mixin` + your custom members   |
| `BaseModule<...>`        | Alias for `Accessors` — the auto-generated accessor surface, without `mixin` or members |
| `ModuleFactory<Child>`   | The factory module type produced by `createModuleFactory`                               |
| `EmptyObject`            | Re-export from `@avandar/utils`; the default state/members shape                        |

## License

MIT
