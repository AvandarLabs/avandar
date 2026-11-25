# @avandar/modules

A small library for building composable modules in place of class
hierarchies. A module is a frozen plain object: generated `get{Key}` and
`set{Key}` accessors over its state, plus the members its builders and
mixins add. Every setter returns a new module rebuilt against the new state,
so a state change never drops a builder or a mixin.

ESM only. Requires Node 22+. Also runs under Deno.

## Install

```sh
pnpm add @avandar/modules
```

## A standalone module

```ts
import { createModule } from "@avandar/modules";

const Counter = createModule("Counter", {
  state: { count: 0 },
  builder: (module) => {
    return {
      increment: () => {
        return module.setCount((count) => {
          return count + 1;
        });
      },
    };
  },
});

Counter.getCount(); // 0
Counter.setCount(5).increment().getCount(); // 6
Counter.getCount(); // still 0
```

## Mixins

A mixin is a function `(base) => ({ state?, members? })`. `base` is the
module built so far, with the current state.

```ts
const Described = Counter.mixin((base) => {
  return {
    members: {
      describe: () => {
        return `count: ${base.getCount()}`;
      },
    },
  };
});

Described.setCount(4).describe(); // "count: 4"
```

- A mixin's `state` is merged in once, when the mixin is applied. Its
  `members` are rebuilt on every state change.
- A later layer's member replaces an earlier member with the same name.
- A mixin can wrap a member by calling it through `base`, but a module's own
  members never call the wrapped version. To make a module extensible, give
  it an extension point in its state (for example a list of middlewares) and
  let mixins add to it.

Rules for mixin authors:

1. Type `base` with the smallest shape the mixin reads. That type is the
   mixin's requirement, and applying the mixin to a module that does not meet
   it fails to compile.
2. Read state inside members, through accessors, not when the mixin runs.
3. Never mutate `base`.
4. Keep the mixin function pure, because it runs more than once. Create
   resources such as a rate limiter or a cache in the outer `withX(options)`
   call.

`withNewMembers(members)` is a mixin that only adds members.

## Factories

A factory defines a kind of module. `create` makes a module of that kind with
its own name, state, builder and mixins.

```ts
import { createModuleFactory, withNewMembers } from "@avandar/modules";
import type { BuilderModule } from "@avandar/modules";

type CounterState = { count: number; label?: string };

const CounterFactory = createModuleFactory("Counter", {
  defaultState: { label: undefined },
  builder: (module: BuilderModule<CounterState>) => {
    return {
      describe: () => {
        return `${module.getLabel() ?? "count"}: ${module.getCount()}`;
      },
    };
  },
});

const steps = CounterFactory.create("Steps", {
  state: { count: 0 },
  mixins: [withNewMembers({ unit: () => "steps" })],
});
```

- Annotate the kind builder's parameter: the kind's state type is read from
  that annotation.
- `defaultState` needs a value, even `undefined`, for every optional state
  key. Accessors are generated from the keys a state actually has, so an
  optional key with no default would have no accessors.
- `mixins` is a `readonly` tuple of any length, applied left to right, and
  each mixin sees the members added before it. A mixin whose requirement is
  not met fails to compile at the `create` call, and the error names its
  index.
- If a mixin needs members defined by the `create` call's own `builder`,
  annotate that builder's parameter or leave the parameter out.

## Mixins whose members depend on the module

A plain mixin's added members are read off its signature. When they depend
on the module the mixin is applied to, for example a mixin that wraps the
module's own functions, declare a type lambda and brand the mixin with
`createLambdaMixin`. `this["base"]` is the module the mixin is applied to.

```ts
import { createLambdaMixin } from "@avandar/modules";
import type { EmptyObject, LambdaMixin, MixinTypeLambda } from "@avandar/modules";

interface QueryHooksMixin<QueryName extends string> extends MixinTypeLambda {
  readonly requires: Record<QueryName, (...args: never[]) => Promise<unknown>>;
  readonly state: EmptyObject;
  readonly members: QueryHooks<this["base"], QueryName>;
}

function withQueryHooks<const QueryName extends string>(options: {
  queryFns: readonly QueryName[];
}): LambdaMixin<QueryHooksMixin<QueryName>> {
  return createLambdaMixin<QueryHooksMixin<QueryName>>((base) => {
    return { members: buildHooks(base, options.queryFns) };
  });
}
```

## Every module has

| Member | Description |
| --- | --- |
| `getModuleName()` | The module's name. |
| `getState()` | The frozen state. |
| `setState(partial)` | A new module with `partial` merged over the state. |
| `set(keyPath, valueOrUpdater)` | A new module with a value set at a dot-notation path. |
| `get{Key}()` | The value of one state key. |
| `set{Key}(valueOrUpdater)` | A new module with that key replaced. A function argument is treated as an updater, so to store a function pass `() => newFunction`. |
| `mixin(mixinFn)` | A new module with `mixinFn` applied after every existing layer. |

Builders and mixins cannot define a member named `getModuleName`, `getState`,
`setState`, `set` or `mixin`, and state cannot have a `moduleName` or `state`
key, because their accessors would collide.

Modules and their state objects are shallow-frozen. Values nested inside
state are not frozen.

## License

MIT
