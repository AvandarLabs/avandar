# `@avandar/modules` factory redesign and `HttpClientFactory`: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development`
> (recommended) or `executing-plans` to implement this plan task by task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `@avandar/modules` so mixins survive state changes and
factories take a typed, unbounded mixin tuple. Then build a rate-limited
`HttpClientFactory` on it and move the open-data connectors and the
`hdx` / `socrata` pipelines onto it.

**Spec:** `docs/measles-demo/modules-factory-and-http-client-design.md`. Read
sections 3 to 7 before starting.

**Architecture:** A module is now built from a recipe (`name`, `state`,
ordered `layers`). Every setter and every `mixin()` rebuilds all layers
against the new state, so nothing is ever dropped. `createModuleFactory`
defines a kind; `Factory.create(name, { state, builder, mixins })` makes a
module of that kind, and a tail-recursive type folds the `mixins` tuple. The
HttpClient is one such kind, with rate limiting as a middleware that the
`withRateLimit` mixin appends to its state.

**Tech stack:** TypeScript 5.9, vitest 3, `type-fest` 5, Bottleneck 2.19.5,
Deno 2 (edge functions), pnpm workspaces.

**Verified before writing:** every new file below was built in a gitignored
scratch copy and passed `tsc` with the repo's strict settings, the repo's
ESLint and Prettier, declaration emit, the tests below (37 in the modules
package, 33 for the HttpClient, with the rate-limit suite green 15 times in a
row), `deno check`, and a Deno runtime run of a rate-limited client.

---

## Ground rules

- Work on `feat/demo/measles` in this worktree. Do not push, merge or open a
  PR. Commit as you go.
- **Never stage `supabase/config.toml`** (it holds this branch's Supabase
  switch) or any file not named in a task's commit step. The worktree has
  unrelated uncommitted work. Always `git add` exact paths, never `-A`.
- Commits that touch `packages/shared/modules/` contain **only** files under
  that directory. AVA-383 lifts them into their own PR.
- Tasks 4 to 8 leave the repo-wide type-check broken in between: Task 4 swaps
  the modules entry point, and Tasks 5 to 8 migrate its callers. Run them
  back to back.
- No database commands are needed for this plan.

## File map

**`@avandar/modules`** (`packages/shared/modules/src/`):

| File | Change | Responsibility |
|---|---|---|
| `Module.types.ts` | create | `Module`, `BuilderModule`, `Merge`, accessor types, reserved names, `UnknownModule`, `NameOfModule`, `StateOfModule` |
| `Mixin.types.ts` | create | `MixinResult`, `Mixin`, `AnyMixin`, `MixinTypeLambda`, `LambdaMixin`, `FoldMixins`, `MixinRequirementCheck` |
| `buildModuleFromRecipe.ts` | create | The untyped runtime: layers, accessors, rebuilds, `mixin`, carried members |
| `createModule/createModule.ts` + `.test.ts` | create | Typed standalone modules |
| `createModuleFactory/createModuleFactory.ts` + `.test.ts` | create | Kinds, `defaultState`, `create` |
| `createLambdaMixin.ts` | create | Brands a mixin with its type lambda |
| `mixins/withNewMembers/withNewMembers.ts` | replace | Unchanged behavior, tighter type |
| `index.ts` | replace | Package exports |
| `createModule.ts`, `createModule.test.ts`, `createModuleFactory.ts` | delete | Old implementation |
| `../README.md` | replace | Docs for the new API |

**Callers of `createModuleFactory`:**

- `src/clients/qetl/QueryMediator/QueryMediator.ts`
- `packages/node/etl/src/EtlEngine/EtlEngine.ts`
- 8 files with `create` calls, migrated by a codemod

**`HttpClientFactory`** (`shared/utils/HttpClientFactory/`):

- `HttpClientFactory.types.ts`
- `HttpClientError.ts`
- `readBoundedBody.ts`
- `sendHttpRequest.ts`
- `HttpClientFactory.ts` + `.test.ts`
- `mixins/withRateLimit/withRateLimit.ts` + `.test.ts`

**Open data:**

- `shared/connectors/open-data/CkanClient/CkanClient.types.ts`
- 10 connector and test files (`getJson` becomes `get`)
- `supabase/functions/open-data/OpenDataRoutes.ts`
- `apps/pipeline-server/pipelines/hdx/run.ts`
- `apps/pipeline-server/pipelines/socrata/run.ts`
- `createOpenDataHttp.ts` and its test (deleted)

**Dependencies:** root `package.json`, `pnpm-lock.yaml`, root `deno.json`.

**Docs:** `docs/measles-demo/open-data-catalog-architecture.md`.

---

## Task 0: Preflight

- [ ] **Step 1: Confirm the branch and look at what is already dirty**

Run: `git branch --show-current && git status --short`

Expected: `feat/demo/measles`, plus pre-existing modified files. Note them. None
of them are yours to commit in this plan.

- [ ] **Step 2: Record the baseline**

Run: `pnpm test:modules && pnpm vitest run shared/connectors/open-data`

Expected: both pass. If either fails before you change anything, stop and
report it.

---

## Task 1: Module and mixin types

**Files:**
- Create: `packages/shared/modules/src/Module.types.ts`
- Create: `packages/shared/modules/src/Mixin.types.ts`

These are types only: the tests in Tasks 2 and 3 exercise them. The two files
import each other, which is fine for type-only imports.

- [ ] **Step 1: Create `packages/shared/modules/src/Module.types.ts`**

```ts
import type {
  LambdaMixin,
  MixinMembers,
  MixinResult,
  MixinState,
  MixinTypeLambda,
} from "@modules/Mixin.types.ts";
import type {
  EmptyObject,
  ObjectPaths,
  PathValue,
  UnknownObject,
} from "@avandar/utils";
import type { IsEmptyObject, Simplify } from "type-fest";

/** Member names every module defines itself. Builders and mixins may not. */
export type ReservedMemberName =
  | "getModuleName"
  | "getState"
  | "setState"
  | "set"
  | "mixin";

/** State keys whose generated accessors would shadow a reserved member. */
export type ReservedStateKey = "moduleName" | "state";

/** `B` merged over `A`. `B` wins on any key both define. */
export type Merge<A extends UnknownObject, B extends UnknownObject> =
  IsEmptyObject<B> extends true ? A : Simplify<Omit<A, keyof B> & B>;

type _StatePath<State extends UnknownObject> = [ObjectPaths<State>] extends [
  never,
]
  ? keyof State
  : ObjectPaths<State>;

type _StatePathValue<
  State extends UnknownObject,
  Path,
> = Path extends keyof State
  ? State[Path]
  : Path extends ObjectPaths<State>
    ? PathValue<State, Path>
    : never;

// A state with an index signature has no fixed keys to generate accessors for.
type _StateGetters<State extends UnknownObject> = string extends keyof State
  ? EmptyObject
  : {
      [Key in keyof State &
        string as `get${Capitalize<Key>}`]: () => State[Key];
    };

type _StateSetters<
  Name extends string,
  State extends UnknownObject,
  Members extends UnknownObject,
> = string extends keyof State
  ? EmptyObject
  : {
      [Key in keyof State & string as `set${Capitalize<Key>}`]: (
        valueOrUpdater: State[Key] | ((current: State[Key]) => State[Key]),
      ) => Module<Name, State, Members>;
    };

type _ModuleMixinMethod<
  Name extends string,
  State extends UnknownObject,
  Members extends UnknownObject,
> = {
  <Lambda extends MixinTypeLambda>(
    mixinFn: LambdaMixin<Lambda> &
      ((base: Module<Name, State, Members>) => MixinResult),
  ): Module<
    Name,
    Merge<State, MixinState<LambdaMixin<Lambda>, Module<Name, State, Members>>>,
    Merge<
      Members,
      MixinMembers<LambdaMixin<Lambda>, Module<Name, State, Members>>
    >
  >;
  <
    NewState extends UnknownObject = EmptyObject,
    NewMembers extends UnknownObject = EmptyObject,
  >(
    mixinFn: (
      base: Module<Name, State, Members>,
    ) => MixinResult<NewState, NewMembers>,
  ): Module<Name, Merge<State, NewState>, Merge<Members, NewMembers>>;
};

/**
 * A frozen object of generated accessors plus members. Every setter returns a
 * new module that keeps every builder and mixin, rebuilt against the new
 * state.
 */
export type Module<
  Name extends string = string,
  State extends UnknownObject = EmptyObject,
  Members extends UnknownObject = EmptyObject,
> = {
  /** Returns the module's name. */
  getModuleName(): Name;

  /** Returns the module's state. The object is frozen. */
  getState(): Readonly<State>;

  /**
   * Returns a new module with `partial` merged over the state. A key set to
   * `undefined` in `partial` becomes `undefined`.
   */
  setState(partial: Partial<State>): Module<Name, State, Members>;

  /**
   * Returns a new module with a value set at a dot-notation `keyPath`.
   * Accepts the value, or an updater that receives the current value.
   */
  set<Path extends _StatePath<State>>(
    keyPath: Path,
    valueOrUpdater:
      | _StatePathValue<State, Path>
      | ((
          current: _StatePathValue<State, Path>,
        ) => _StatePathValue<State, Path>),
  ): Module<Name, State, Members>;

  /** Returns a new module with `mixinFn` applied after every existing layer. */
  mixin: _ModuleMixinMethod<Name, State, Members>;
} & _StateGetters<State> &
  _StateSetters<Name, State, Members> &
  Members;

/**
 * The module a builder receives: accessors plus the members built before it.
 * Its setters return modules typed with those members only.
 */
export type BuilderModule<
  State extends UnknownObject = EmptyObject,
  Members extends UnknownObject = EmptyObject,
  Name extends string = string,
> = Omit<Module<Name, State, Members>, "mixin">;

/** The shape every module has, whatever its name, state, and members. */
export type UnknownModule = {
  getModuleName(): string;
  getState(): Readonly<UnknownObject>;
};

/** The name of a module. */
export type NameOfModule<M> = M extends {
  getModuleName(): infer Name extends string;
}
  ? Name
  : never;

/** The state of a module. */
export type StateOfModule<M> = M extends {
  getState(): Readonly<infer State extends UnknownObject>;
}
  ? State
  : never;
```

- [ ] **Step 2: Create `packages/shared/modules/src/Mixin.types.ts`**

```ts
import type { Merge, Module } from "@modules/Module.types.ts";
import type { EmptyObject, UnknownObject } from "@avandar/utils";

/**
 * What a mixin returns. `state` is merged into the module once, when the
 * mixin is applied. `members` are rebuilt on every state change.
 */
export type MixinResult<
  NewState extends UnknownObject = UnknownObject,
  NewMembers extends UnknownObject = UnknownObject,
> = {
  state?: NewState;
  members?: NewMembers;
};

/**
 * A mixin whose added members do not depend on the module it is applied to.
 * Type `base` with the smallest shape the mixin reads: that type is the
 * mixin's requirement, and applying the mixin to a module that does not
 * satisfy it fails to compile.
 */
export type Mixin<
  Base = unknown,
  NewState extends UnknownObject = EmptyObject,
  NewMembers extends UnknownObject = EmptyObject,
> = (base: Base) => MixinResult<NewState, NewMembers>;

/** Any mixin. The constraint for a tuple of mixins. */
export type AnyMixin = (base: never) => MixinResult;

/**
 * A type-level function for a mixin whose added members depend on the module
 * it is applied to. `this["base"]` is that module; read it in `state` and
 * `members`. An extending interface must declare all three of `requires`,
 * `state` and `members`.
 *
 * An `interface`, not a `type`, because the polymorphic `this` type this
 * relies on only exists on interfaces.
 */
export interface MixinTypeLambda {
  /** Filled in with the module the mixin is applied to. */
  readonly base: unknown;
  /** What that module must satisfy for the mixin to apply. */
  readonly requires: unknown;
  /** The state the mixin adds. */
  readonly state: UnknownObject;
  /** The members the mixin adds. */
  readonly members: UnknownObject;
}

/** A mixin branded with its type lambda. Build one with `createLambdaMixin`. */
export type LambdaMixin<Lambda extends MixinTypeLambda> = ((
  base: Lambda["requires"],
) => MixinResult) & {
  /** Type-level only. Never present at runtime. */
  readonly __mixinTypeLambda: Lambda;
};

type _LambdaOf<MixinFn> = MixinFn extends {
  readonly __mixinTypeLambda: infer Lambda extends MixinTypeLambda;
}
  ? Lambda
  : never;

type _ApplyLambda<Lambda extends MixinTypeLambda, Base> = Lambda & {
  readonly base: Base;
};

type _ReturnOf<MixinFn> = MixinFn extends (base: never) => infer Result
  ? Result
  : never;

type _PlainMixinState<MixinFn> =
  _ReturnOf<MixinFn> extends { state?: infer NewState }
    ? Exclude<NewState, undefined> extends infer Defined extends UnknownObject
      ? Defined
      : EmptyObject
    : EmptyObject;

type _PlainMixinMembers<MixinFn> =
  _ReturnOf<MixinFn> extends { members?: infer NewMembers }
    ? Exclude<NewMembers, undefined> extends infer Defined extends UnknownObject
      ? Defined
      : EmptyObject
    : EmptyObject;

/** What a mixin requires of the module it is applied to. */
export type MixinRequirement<MixinFn> = [_LambdaOf<MixinFn>] extends [never]
  ? MixinFn extends (base: infer Requirement) => unknown
    ? Requirement
    : never
  : _LambdaOf<MixinFn>["requires"];

/** The state a mixin adds when applied to `Base`. */
export type MixinState<MixinFn, Base> = [_LambdaOf<MixinFn>] extends [never]
  ? _PlainMixinState<MixinFn>
  : _ApplyLambda<_LambdaOf<MixinFn>, Base>["state"];

/** The members a mixin adds when applied to `Base`. */
export type MixinMembers<MixinFn, Base> = [_LambdaOf<MixinFn>] extends [never]
  ? _PlainMixinMembers<MixinFn>
  : _ApplyLambda<_LambdaOf<MixinFn>, Base>["members"];

/**
 * The module produced by applying `Mixins` left to right, each one seeing the
 * module built by everything before it. Tail-recursive, so TypeScript allows
 * roughly a thousand mixins.
 */
export type FoldMixins<
  Name extends string,
  State extends UnknownObject,
  Members extends UnknownObject,
  Mixins extends readonly unknown[],
> = Mixins extends readonly [infer First, ...infer Rest]
  ? FoldMixins<
      Name,
      Merge<State, MixinState<First, Module<Name, State, Members>>>,
      Merge<Members, MixinMembers<First, Module<Name, State, Members>>>,
      Rest
    >
  : Module<Name, State, Members>;

type _BuilderAnnotationHint =
  "If the missing members come from this create() call's builder, annotate the builder's parameter";

/**
 * `unknown` when every mixin's requirement is met. Otherwise an object with a
 * required `mixinRequirementNotMet` property that describes the first mixin
 * whose requirement is not met. `create`'s options lack that property, so the
 * call fails to compile and the error message names the mixin.
 */
export type MixinRequirementCheck<
  Name extends string,
  State extends UnknownObject,
  Members extends UnknownObject,
  Mixins extends readonly unknown[],
  Checked extends readonly unknown[] = [],
> = Mixins extends readonly [infer First, ...infer Rest]
  ? Module<Name, State, Members> extends MixinRequirement<First>
    ? MixinRequirementCheck<
        Name,
        Merge<State, MixinState<First, Module<Name, State, Members>>>,
        Merge<Members, MixinMembers<First, Module<Name, State, Members>>>,
        Rest,
        [...Checked, First]
      >
    : {
        readonly mixinRequirementNotMet: {
          readonly mixinIndex: Checked["length"];
          readonly moduleMustSatisfy: MixinRequirement<First>;
          readonly hint: _BuilderAnnotationHint;
        };
      }
  : unknown;
```

- [ ] **Step 3: Type-check the package**

Run: `pnpm --filter @avandar/modules type-check`

Expected: exit 0. The old files still compile, and the new files are not
imported yet.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/modules/src/Module.types.ts packages/shared/modules/src/Mixin.types.ts
git commit -m "feat(modules): add the module and mixin type model"
```

---

## Task 2: `createModule` rebuilt from a recipe

**Files:**
- Create: `packages/shared/modules/src/createModule/createModule.test.ts`
- Create: `packages/shared/modules/src/buildModuleFromRecipe.ts`
- Create: `packages/shared/modules/src/createModule/createModule.ts`
- Replace: `packages/shared/modules/src/mixins/withNewMembers/withNewMembers.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/modules/src/createModule/createModule.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from "vitest";
import { createModule } from "@modules/createModule/createModule.ts";
import { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";

function _createCounter() {
  return createModule("Counter", {
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
}

describe("createModule: generated accessors", () => {
  it("getCount returns the count state value", () => {
    expect(_createCounter().getCount()).toBe(0);
  });

  it("setCount returns a module holding the new value", () => {
    expect(_createCounter().setCount(5).getCount()).toBe(5);
  });

  it("setCount leaves the original module's state unchanged", () => {
    const counter = _createCounter();
    counter.setCount(5);
    expect(counter.getCount()).toBe(0);
  });

  it("setCount passes the current value to an updater function", () => {
    const counter = _createCounter().setCount(2);
    expect(
      counter
        .setCount((count) => {
          return count * 10;
        })
        .getCount(),
    ).toBe(20);
  });

  it("set writes a value at a dot-notation path", () => {
    const module = createModule("Nested", { state: { inner: { value: 1 } } });
    expect(module.set("inner.value", 2).getInner().value).toBe(2);
  });

  it("setState merges a partial state over the current one", () => {
    const module = createModule("Pair", { state: { left: 1, right: 2 } });
    expect(module.setState({ right: 3 }).getState()).toEqual({
      left: 1,
      right: 3,
    });
  });

  it("getModuleName returns the name the module was created with", () => {
    expectTypeOf(_createCounter().getModuleName()).toEqualTypeOf<"Counter">();
    expect(_createCounter().getModuleName()).toBe("Counter");
  });
});

describe("createModule: rebuilding on state changes", () => {
  it("a member reads the state of the module it was rebuilt for", () => {
    expect(_createCounter().setCount(5).increment().getCount()).toBe(6);
  });

  it("a mixin's members are still present after a setter", () => {
    const counter = _createCounter().mixin(
      withNewMembers({
        ping: (): string => {
          return "pong";
        },
      }),
    );
    expect(counter.setCount(3).ping()).toBe("pong");
  });

  it("a mixin's member reads the current state after a setter", () => {
    const counter = _createCounter().mixin((base) => {
      return {
        members: {
          describe: (): string => {
            return `count: ${base.getCount()}`;
          },
        },
      };
    });
    expect(counter.setCount(4).describe()).toBe("count: 4");
  });

  it("a member built before a mixin returns a module that still has the mixin's members", () => {
    const counter = _createCounter().mixin(
      withNewMembers({
        ping: (): string => {
          return "pong";
        },
      }),
    );
    expect("ping" in counter.increment()).toBe(true);
  });

  it("a mixin's state is added to the module when the mixin is applied", () => {
    const labeled = _createCounter().mixin(() => {
      return { state: { label: "a" } };
    });
    expect(labeled.getLabel()).toBe("a");
  });

  it("a mixin's state is not reapplied after a setter changes it", () => {
    const labeled = _createCounter().mixin(() => {
      return { state: { label: "a" } };
    });
    expect(labeled.setLabel("b").setCount(1).getLabel()).toBe("b");
  });

  it("a later layer's member replaces an earlier member of the same name", () => {
    const module = createModule("Override", {
      builder: () => {
        return {
          value: (): number => {
            return 1;
          },
        };
      },
    }).mixin(() => {
      return {
        members: {
          value: (): string => {
            return "two";
          },
        },
      };
    });
    expectTypeOf(module.value).returns.toEqualTypeOf<string>();
    expect(module.value()).toBe("two");
  });
});

describe("createModule: immutability and reserved names", () => {
  it("freezes the module object", () => {
    expect(Object.isFrozen(_createCounter())).toBe(true);
  });

  it("freezes the state object", () => {
    expect(Object.isFrozen(_createCounter().getState())).toBe(true);
  });

  it("throws when a builder defines a reserved member name", () => {
    expect(() => {
      createModule("Reserved", {
        // @ts-expect-error - getState is reserved
        builder: () => {
          return { getState: () => {} };
        },
      });
    }).toThrow(/reserved/);
  });

  it("throws when a mixin adds a reserved member name", () => {
    expect(() => {
      _createCounter().mixin(() => {
        return { members: { mixin: 1 } };
      });
    }).toThrow(/reserved/);
  });

  it("throws when the state has a key whose accessors would be reserved", () => {
    expect(() => {
      // @ts-expect-error - "state" would generate getState and setState
      createModule("BadState", { state: { state: 1 } });
    }).toThrow(/state key named "state"/);
  });
});

describe("createModule: members attached by spreading", () => {
  it("keeps members spread onto a copy of the module when a mixin is applied", () => {
    const spread = {
      ..._createCounter(),
      extra: (): string => {
        return "extra";
      },
    };
    const mixed = spread.mixin(withNewMembers({ fromMixin: () => {} }));
    expect((mixed as Record<string, unknown>).extra).toBe(spread.extra);
  });

  it("passes members spread onto a copy of the module to the mixin's base", () => {
    const spread = {
      ..._createCounter(),
      extra: (): string => {
        return "extra";
      },
    };
    let baseHadExtra = false;
    spread.mixin((base) => {
      baseHadExtra = "extra" in base;
      return {};
    });
    expect(baseHadExtra).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @avandar/modules exec vitest run src/createModule/createModule.test.ts`

Expected: FAIL, because `@modules/createModule/createModule.ts` cannot be
resolved yet.

- [ ] **Step 3: Create the runtime, `packages/shared/modules/src/buildModuleFromRecipe.ts`**

```ts
import { getValue, isFunction, setValue } from "@avandar/utils";
import type { MixinResult } from "@modules/Mixin.types.ts";
import type {
  ReservedMemberName,
  ReservedStateKey,
} from "@modules/Module.types.ts";
import type { UnknownObject } from "@avandar/utils";

/** An untyped mixin, as the runtime stores it. */
export type RuntimeMixin = (base: UnknownObject) => MixinResult;

/** One step in building a module. */
export type ModuleLayer =
  | { type: "builder"; build: (module: UnknownObject) => UnknownObject }
  | { type: "mixin"; apply: RuntimeMixin }
  /** Members attached by spreading, carried forward without rebuilding. */
  | { type: "carried"; members: UnknownObject };

/** A built module as the runtime sees it: untyped members plus `mixin`. */
export type RuntimeModule = UnknownObject & {
  mixin: (this: unknown, mixinFn: RuntimeMixin) => RuntimeModule;
};

/** Everything needed to rebuild a module after a state change. */
export type ModuleRecipe = {
  moduleName: string;
  state: UnknownObject;
  layers: readonly ModuleLayer[];
};

const RESERVED_MEMBER_NAMES: ReadonlySet<string> = new Set<ReservedMemberName>([
  "getModuleName",
  "getState",
  "setState",
  "set",
  "mixin",
]);

const RESERVED_STATE_KEYS: ReadonlySet<string> = new Set<ReservedStateKey>([
  "moduleName",
  "state",
]);

function _capitalize(key: string): string {
  return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function _assertNoReservedMembers(
  moduleName: string,
  members: UnknownObject,
): void {
  const reservedKey = Object.keys(members).find((key) => {
    return RESERVED_MEMBER_NAMES.has(key);
  });
  if (reservedKey !== undefined) {
    throw new Error(
      `Module "${moduleName}" cannot define a member named "${reservedKey}": that name is reserved.`,
    );
  }
}

function _resolveUpdate(valueOrUpdater: unknown, current: unknown): unknown {
  return isFunction(valueOrUpdater) ? valueOrUpdater(current) : valueOrUpdater;
}

function _buildAccessors(recipe: ModuleRecipe): UnknownObject {
  const { moduleName, state } = recipe;
  const rebuildWithState = (newState: UnknownObject): RuntimeModule => {
    return buildModuleFromRecipe({ ...recipe, state: newState });
  };
  const stateAccessors = Object.fromEntries(
    Object.keys(state).flatMap((key) => {
      return [
        [
          `get${_capitalize(key)}`,
          () => {
            return state[key];
          },
        ],
        [
          `set${_capitalize(key)}`,
          (valueOrUpdater: unknown) => {
            return rebuildWithState({
              ...state,
              [key]: _resolveUpdate(valueOrUpdater, state[key]),
            });
          },
        ],
      ];
    }),
  );
  return {
    getModuleName: () => {
      return moduleName;
    },
    getState: () => {
      return state;
    },
    setState: (partial: UnknownObject) => {
      return rebuildWithState({ ...state, ...partial });
    },
    set: (keyPath: string, valueOrUpdater: unknown) => {
      const current = getValue(state, keyPath);
      return rebuildWithState(
        setValue(state, keyPath, _resolveUpdate(valueOrUpdater, current)),
      );
    },
    ...stateAccessors,
  };
}

function _buildLayerMembers(
  moduleName: string,
  layer: ModuleLayer,
  moduleSoFar: UnknownObject,
): UnknownObject {
  if (layer.type === "carried") {
    return layer.members;
  }
  const members =
    layer.type === "builder"
      ? layer.build(moduleSoFar)
      : (layer.apply(moduleSoFar).members ?? {});
  _assertNoReservedMembers(moduleName, members);
  return members;
}

/**
 * Members on `receiver` that `builtModule` does not have, or has with a
 * different value. These were attached by spreading the module into a new
 * object, outside the mixin system.
 */
function _findCarriedMembers(
  builtModule: UnknownObject,
  receiver: unknown,
): UnknownObject | undefined {
  if (
    typeof receiver !== "object" ||
    receiver === null ||
    receiver === builtModule
  ) {
    return undefined;
  }
  const carriedEntries = Object.entries(receiver).filter(([key, value]) => {
    return !RESERVED_MEMBER_NAMES.has(key) && builtModule[key] !== value;
  });
  return carriedEntries.length > 0
    ? Object.fromEntries(carriedEntries)
    : undefined;
}

function _applyMixin(params: {
  recipe: ModuleRecipe;
  builtModule: UnknownObject;
  receiver: unknown;
  mixinFn: RuntimeMixin;
}): RuntimeModule {
  const { recipe, builtModule, receiver, mixinFn } = params;
  const carriedMembers = _findCarriedMembers(builtModule, receiver);
  const layersSoFar: readonly ModuleLayer[] =
    carriedMembers === undefined
      ? recipe.layers
      : [...recipe.layers, { type: "carried", members: carriedMembers }];
  const base =
    carriedMembers === undefined
      ? builtModule
      : Object.freeze({ ...builtModule, ...carriedMembers });
  const { state: mixinState = {} } = mixinFn(base);
  return buildModuleFromRecipe({
    moduleName: recipe.moduleName,
    state: { ...recipe.state, ...mixinState },
    layers: [...layersSoFar, { type: "mixin", apply: mixinFn }],
  });
}

/**
 * Wraps a typed builder as a builder layer. The module it receives is cast
 * from the untyped recipe to the builder's own parameter type, which the
 * public signature already checked.
 */
export function createBuilderLayer<BuilderInput, Members extends UnknownObject>(
  builder: (module: BuilderInput) => Members,
): ModuleLayer {
  return {
    type: "builder",
    build: (module: UnknownObject) => {
      return builder(module as BuilderInput);
    },
  };
}

/** Throws when `state` has a key whose accessors would be reserved names. */
export function assertNoReservedStateKeys(
  moduleName: string,
  state: UnknownObject,
): void {
  const reservedKey = Object.keys(state).find((key) => {
    return RESERVED_STATE_KEYS.has(key);
  });
  if (reservedKey !== undefined) {
    throw new Error(
      `Module "${moduleName}" cannot have a state key named "${reservedKey}": its accessors would shadow a reserved member.`,
    );
  }
}

/**
 * Builds a frozen module by running every layer in order against the module
 * built so far. Setters and `mixin` rebuild from the same recipe, so a state
 * change never drops a layer.
 *
 * The recipe is untyped on purpose. A module's accessor names are computed
 * from its state keys at runtime, which no static type can express for an
 * arbitrary recipe, so the typed public functions cast at their boundary.
 */
export function buildModuleFromRecipe(recipe: ModuleRecipe): RuntimeModule {
  const frozenRecipe: ModuleRecipe = {
    ...recipe,
    state: Object.freeze({ ...recipe.state }),
  };
  const members = frozenRecipe.layers.reduce<UnknownObject>(
    (moduleSoFar, layer) => {
      return {
        ...moduleSoFar,
        ..._buildLayerMembers(
          frozenRecipe.moduleName,
          layer,
          Object.freeze({ ...moduleSoFar }),
        ),
      };
    },
    _buildAccessors(frozenRecipe),
  );
  const builtModule: RuntimeModule = Object.freeze({
    ...members,
    // A `function`, not an arrow: `this` is whatever `.mixin()` was called
    // on, which may carry members spread onto a copy of this module.
    mixin: function mixin(this: unknown, mixinFn: RuntimeMixin) {
      return _applyMixin({
        recipe: frozenRecipe,
        builtModule,
        receiver: this,
        mixinFn,
      });
    },
  });
  return builtModule;
}
```

- [ ] **Step 4: Create `packages/shared/modules/src/createModule/createModule.ts`**

```ts
import {
  assertNoReservedStateKeys,
  buildModuleFromRecipe,
  createBuilderLayer,
} from "@modules/buildModuleFromRecipe.ts";
import type {
  BuilderModule,
  Module,
  ReservedMemberName,
  ReservedStateKey,
} from "@modules/Module.types.ts";
import type { EmptyObject, UnknownObject } from "@avandar/utils";

/** Rejects, at compile time, a state key whose accessors would be reserved. */
export type NoReservedStateKeys = {
  readonly [Key in ReservedStateKey]?: never;
};

/** Rejects, at compile time, a member named after a reserved member. */
export type NoReservedMembers = {
  readonly [Key in ReservedMemberName]?: never;
};

/**
 * Creates a standalone module: generated `get{Key}` / `set{Key}` accessors
 * for every state key, plus the members `builder` returns. Every setter and
 * `mixin` returns a new module, rebuilt against the new state.
 *
 * @param moduleName - The module's name, returned by `getModuleName()`.
 * @param options.state - The initial state.
 * @param options.builder - Returns the module's members, given its accessors.
 * @returns The module.
 */
export function createModule<
  Name extends string,
  State extends UnknownObject = EmptyObject,
  Members extends UnknownObject = EmptyObject,
>(
  moduleName: Name,
  options: {
    state?: State & NoReservedStateKeys;
    builder?: (
      module: BuilderModule<State, EmptyObject, Name>,
    ) => Members & NoReservedMembers;
  } = {},
): Module<Name, State, Members> {
  const { state = {}, builder } = options;
  assertNoReservedStateKeys(moduleName, state);
  const builtModule = buildModuleFromRecipe({
    moduleName,
    state,
    layers: builder === undefined ? [] : [createBuilderLayer(builder)],
  });
  // The recipe is untyped (see `buildModuleFromRecipe`), so the typed module
  // the signature promises is asserted here, once.
  return builtModule as unknown as Module<Name, State, Members>;
}
```

- [ ] **Step 5: Replace `packages/shared/modules/src/mixins/withNewMembers/withNewMembers.ts`**

```ts
import type { UnknownObject } from "@avandar/utils";

/**
 * A mixin that adds `newMembers` and reads nothing from the module.
 *
 * @param newMembers - The members to add.
 * @returns The mixin.
 */
export function withNewMembers<NewMembers extends UnknownObject>(
  newMembers: NewMembers,
): () => { members: NewMembers } {
  return () => {
    return { members: newMembers };
  };
}
```

- [ ] **Step 6: Run the test and watch it pass**

Run: `pnpm --filter @avandar/modules exec vitest run src/createModule/createModule.test.ts`

Expected: PASS, 21 tests.

- [ ] **Step 7: Type-check the package**

Run: `pnpm --filter @avandar/modules type-check`

Expected: exit 0. This also checks the test file's `@ts-expect-error` lines:
an unused one is an error.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/modules/src/buildModuleFromRecipe.ts packages/shared/modules/src/createModule/createModule.ts packages/shared/modules/src/createModule/createModule.test.ts packages/shared/modules/src/mixins/withNewMembers/withNewMembers.ts
git commit -m "feat(modules): rebuild every layer of a module on each state change"
```

---

## Task 3: `createModuleFactory` with `defaultState` and a mixin tuple

**Files:**
- Create: `packages/shared/modules/src/createModuleFactory/createModuleFactory.test.ts`
- Create: `packages/shared/modules/src/createLambdaMixin.ts`
- Create: `packages/shared/modules/src/createModuleFactory/createModuleFactory.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/modules/src/createModuleFactory/createModuleFactory.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from "vitest";
import { createLambdaMixin } from "@modules/createLambdaMixin.ts";
import { createModuleFactory } from "@modules/createModuleFactory/createModuleFactory.ts";
import { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";
import type { LambdaMixin, MixinTypeLambda } from "@modules/Mixin.types.ts";
import type { BuilderModule } from "@modules/Module.types.ts";
import type { EmptyObject } from "@avandar/utils";

type _AsyncFn = (...args: never[]) => Promise<unknown>;

type _Hooks<Base, QueryName extends string> = {
  [Key in QueryName as `use${Capitalize<Key>}`]: Key extends keyof Base
    ? Base[Key] extends (...args: infer Args) => Promise<infer Result>
      ? (...args: Args) => { data: Result | undefined }
      : never
    : never;
};

interface _HooksMixin<QueryName extends string> extends MixinTypeLambda {
  readonly requires: Record<QueryName, _AsyncFn>;
  readonly state: EmptyObject;
  readonly members: _Hooks<this["base"], QueryName>;
}

/** A stand-in for `withQueryHooks`: its members depend on the module. */
function _withHooks<const QueryName extends string>(options: {
  queryFns: readonly QueryName[];
}): LambdaMixin<_HooksMixin<QueryName>> {
  return createLambdaMixin<_HooksMixin<QueryName>>((base) => {
    const hookEntries = options.queryFns.map((queryFn) => {
      if (typeof base[queryFn] !== "function") {
        throw new Error(`No query function named "${queryFn}".`);
      }
      const hookName = `use${queryFn.charAt(0).toUpperCase()}${queryFn.slice(1)}`;
      return [
        hookName,
        () => {
          return { data: undefined };
        },
      ] as const;
    });
    return { members: Object.fromEntries(hookEntries) };
  });
}

type _CounterState = { count: number };

const CounterFactory = createModuleFactory("Counter", {
  defaultState: {},
  builder: (module: BuilderModule<_CounterState>) => {
    return {
      describe: (): string => {
        return `${module.getModuleName()}: ${module.getCount()}`;
      },
    };
  },
});

const ServiceFactory = createModuleFactory("Service", {
  defaultState: {},
  builder: (module: BuilderModule) => {
    return {
      getServiceName: (): string => {
        return module.getModuleName();
      },
    };
  },
});

/** A plain mixin that requires a `getCount` accessor on its base. */
function _withDoubled() {
  return (base: { getCount(): number }) => {
    return {
      members: {
        doubled: (): number => {
          return base.getCount() * 2;
        },
      },
    };
  };
}

describe("createModuleFactory: the factory", () => {
  it("is named after the kind", () => {
    expect(CounterFactory.getModuleName()).toBe("CounterFactory");
  });
});

describe("createModuleFactory: create", () => {
  it("gives the created module the name passed to create", () => {
    const counter = CounterFactory.create("Steps", { state: { count: 0 } });
    expectTypeOf(counter.getModuleName()).toEqualTypeOf<"Steps">();
    expect(counter.getModuleName()).toBe("Steps");
  });

  it("gives the created module the kind's members", () => {
    const counter = CounterFactory.create("Steps", { state: { count: 3 } });
    expect(counter.describe()).toBe("Steps: 3");
  });

  it("builds the create builder's members after the kind's, so they can call them", () => {
    const counter = CounterFactory.create("Steps", {
      state: { count: 1 },
      builder: (
        module: BuilderModule<_CounterState, { describe(): string }>,
      ) => {
        return {
          shout: (): string => {
            return module.describe().toUpperCase();
          },
        };
      },
    });
    expect(counter.shout()).toBe("STEPS: 1");
  });

  it("keeps the kind's members after a setter, reading the new state", () => {
    const counter = CounterFactory.create("Steps", { state: { count: 1 } });
    expect(counter.setCount(9).describe()).toBe("Steps: 9");
  });

  it("keeps a create-time mixin's members after a setter", () => {
    const counter = CounterFactory.create("Steps", {
      state: { count: 2 },
      mixins: [_withDoubled()],
    });
    expect(counter.setCount(5).doubled()).toBe(10);
  });

  it("lets a created module take further mixins", () => {
    const counter = CounterFactory.create("Steps", {
      state: { count: 2 },
    }).mixin(_withDoubled());
    expect(counter.doubled()).toBe(4);
  });

  it("gives an optional state key its default, so its accessors exist", () => {
    const LabelFactory = createModuleFactory("Label", {
      defaultState: { label: undefined },
      builder: (module: BuilderModule<{ label?: string }>) => {
        return {
          read: (): string => {
            return module.getLabel() ?? "none";
          },
        };
      },
    });
    expect(LabelFactory.create("L", {}).setLabel("set").read()).toBe("set");
  });

  it("lets create's state override a default", () => {
    const LabelFactory = createModuleFactory("Label", {
      defaultState: { label: "default" },
      builder: (module: BuilderModule<{ label?: string }>) => {
        return {
          read: (): string | undefined => {
            return module.getLabel();
          },
        };
      },
    });
    expect(LabelFactory.create("L", { state: { label: "given" } }).read()).toBe(
      "given",
    );
  });

  it("accepts no state when the kind's state has no required keys", () => {
    const service = ServiceFactory.create("Users", {});
    expect(service.getServiceName()).toBe("Users");
  });
});

describe("createModuleFactory: mixins", () => {
  it("applies mixins left to right, each seeing the members added before it", () => {
    const service = ServiceFactory.create("Users", {
      mixins: [
        withNewMembers({
          getUsers: async (): Promise<string[]> => {
            return [];
          },
        }),
        _withHooks({ queryFns: ["getUsers"] }),
      ],
    });
    expect(service.useGetUsers()).toEqual({ data: undefined });
  });

  it("types a lambda mixin's members from the members it wraps", () => {
    const service = ServiceFactory.create("Users", {
      builder: () => {
        return {
          getProfile: async (_params: {
            id: string;
          }): Promise<{ email: string }> => {
            return { email: "a@b.c" };
          },
        };
      },
      mixins: [_withHooks({ queryFns: ["getProfile"] })],
    });
    expectTypeOf(service.useGetProfile).parameter(0).toEqualTypeOf<{
      id: string;
    }>();
    expectTypeOf(service.useGetProfile).returns.toEqualTypeOf<{
      data: { email: string } | undefined;
    }>();
    expect(service.useGetProfile({ id: "1" })).toEqual({ data: undefined });
  });

  it("applies a long tuple of mixins with every member typed", () => {
    const service = ServiceFactory.create("Many", {
      mixins: [
        withNewMembers({
          m1: (): "m1" => {
            return "m1";
          },
        }),
        withNewMembers({
          m2: (): "m2" => {
            return "m2";
          },
        }),
        withNewMembers({
          m3: (): "m3" => {
            return "m3";
          },
        }),
        withNewMembers({
          m4: (): "m4" => {
            return "m4";
          },
        }),
        withNewMembers({
          m5: (): "m5" => {
            return "m5";
          },
        }),
        withNewMembers({
          m6: (): "m6" => {
            return "m6";
          },
        }),
        withNewMembers({
          m7: (): "m7" => {
            return "m7";
          },
        }),
        withNewMembers({
          m8: (): "m8" => {
            return "m8";
          },
        }),
        withNewMembers({
          m9: (): "m9" => {
            return "m9";
          },
        }),
        withNewMembers({
          m10: (): "m10" => {
            return "m10";
          },
        }),
        withNewMembers({
          m11: (): "m11" => {
            return "m11";
          },
        }),
        withNewMembers({
          m12: (): "m12" => {
            return "m12";
          },
        }),
      ],
    });
    expectTypeOf(service.m12).returns.toEqualTypeOf<"m12">();
    expect([service.m1(), service.m12()]).toEqual(["m1", "m12"]);
  });

  it("refuses a mixin whose requirement the module does not meet", () => {
    expect(() => {
      // @ts-expect-error - a Service has no getCount accessor
      ServiceFactory.create("NoCount", { mixins: [_withDoubled()] }).doubled();
    }).toThrow();
  });

  it("refuses a lambda mixin wrapping a member the module lacks", () => {
    expect(() => {
      // @ts-expect-error - getNothing is not a member
      ServiceFactory.create("NoQuery", {
        mixins: [_withHooks({ queryFns: ["getNothing"] })],
      });
    }).toThrow(/getNothing/);
  });

  it("refuses a lambda mixin placed before the mixin that adds its member", () => {
    expect(() => {
      // @ts-expect-error - getUsers does not exist yet when _withHooks runs
      ServiceFactory.create("WrongOrder", {
        mixins: [
          _withHooks({ queryFns: ["getUsers"] }),
          withNewMembers({
            getUsers: async () => {
              return [];
            },
          }),
        ],
      });
    }).toThrow(/getUsers/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @avandar/modules exec vitest run src/createModuleFactory/createModuleFactory.test.ts`

Expected: FAIL, because `@modules/createLambdaMixin.ts` cannot be resolved.

- [ ] **Step 3: Create `packages/shared/modules/src/createLambdaMixin.ts`**

```ts
import type {
  LambdaMixin,
  MixinResult,
  MixinTypeLambda,
} from "@modules/Mixin.types.ts";

/**
 * Brands a mixin function with its type lambda, for a mixin whose added
 * members depend on the module it is applied to.
 *
 * @param mixinFn - The mixin. Its `base` is typed as the lambda's `requires`.
 * @returns The same function, typed as a `LambdaMixin`.
 */
export function createLambdaMixin<Lambda extends MixinTypeLambda>(
  mixinFn: (base: Lambda["requires"]) => MixinResult,
): LambdaMixin<Lambda> {
  // The brand is a phantom property: it exists only in the type.
  return mixinFn as LambdaMixin<Lambda>;
}
```

- [ ] **Step 4: Create `packages/shared/modules/src/createModuleFactory/createModuleFactory.ts`**

```ts
import {
  assertNoReservedStateKeys,
  buildModuleFromRecipe,
  createBuilderLayer,
} from "@modules/buildModuleFromRecipe.ts";
import { createModule } from "@modules/createModule/createModule.ts";
import type {
  ModuleLayer,
  RuntimeMixin,
  RuntimeModule,
} from "@modules/buildModuleFromRecipe.ts";
import type { NoReservedMembers } from "@modules/createModule/createModule.ts";
import type {
  AnyMixin,
  FoldMixins,
  MixinRequirementCheck,
} from "@modules/Mixin.types.ts";
import type { BuilderModule, Merge, Module } from "@modules/Module.types.ts";
import type { EmptyObject, UnknownObject } from "@avandar/utils";
import type { OptionalKeysOf } from "type-fest";

/**
 * A value for every optional key of a kind's state. Accessors are generated
 * from the keys a module's state actually has, so an optional key needs a
 * default (even `undefined`) for its accessors to exist.
 */
export type KindDefaultState<KindState extends UnknownObject> = {
  [Key in OptionalKeysOf<KindState> & string]-?: KindState[Key];
};

type _StateOption<KindState extends UnknownObject> =
  Partial<KindState> extends KindState
    ? { state?: KindState }
    : { state: KindState };

/** The options `Factory.create` takes. */
export type ModuleFactoryCreateOptions<
  Name extends string,
  KindState extends UnknownObject,
  KindMembers extends UnknownObject,
  Members extends UnknownObject,
  Mixins extends readonly AnyMixin[],
> = _StateOption<KindState> & {
  /** Members for this module only, built after the kind's members. */
  builder?: (
    module: BuilderModule<KindState, KindMembers, Name>,
  ) => Members & NoReservedMembers;
  /** Applied left to right after both builders. */
  mixins?: Mixins;
};

/**
 * A factory module for one kind of module. `create` makes a module of that
 * kind with its own name, state, builder, and mixins.
 */
export type ModuleFactory<
  KindName extends string,
  KindState extends UnknownObject,
  KindMembers extends UnknownObject,
> = Module<
  `${KindName}Factory`,
  EmptyObject,
  {
    /**
     * Creates a module of this kind. Its layers run in order: the kind's
     * builder, then `options.builder`, then each of `options.mixins`.
     */
    create: <
      Name extends string,
      const Mixins extends readonly AnyMixin[],
      Members extends UnknownObject = EmptyObject,
    >(
      name: Name,
      options: ModuleFactoryCreateOptions<
        Name,
        KindState,
        KindMembers,
        Members,
        Mixins
      > &
        NoInfer<
          MixinRequirementCheck<
            Name,
            KindState,
            Merge<KindMembers, Members>,
            Mixins
          >
        >,
    ) => FoldMixins<Name, KindState, Merge<KindMembers, Members>, Mixins>;
  }
>;

type _RuntimeCreateOptions = {
  state?: UnknownObject;
  builder?: (module: UnknownObject) => UnknownObject;
  mixins?: readonly RuntimeMixin[];
};

function _createModuleOfKind(params: {
  kindLayer: ModuleLayer;
  defaultState: UnknownObject;
  name: string;
  options: _RuntimeCreateOptions;
}): RuntimeModule {
  const { kindLayer, defaultState, name, options } = params;
  const { builder, mixins = [] } = options;
  const state = { ...defaultState, ...options.state };
  assertNoReservedStateKeys(name, state);
  const layers: readonly ModuleLayer[] =
    builder === undefined
      ? [kindLayer]
      : [kindLayer, createBuilderLayer(builder)];
  return mixins.reduce(
    (builtModule, mixinFn) => {
      return builtModule.mixin(mixinFn);
    },
    buildModuleFromRecipe({ moduleName: name, state, layers }),
  );
}

/**
 * Creates a factory for one kind of module. The kind's state type is read
 * from the builder's parameter annotation, so annotate it:
 * `builder: (module: BuilderModule<MyState>) => ({ ... })`.
 *
 * @param kindName - The kind's name. The factory is named `${kindName}Factory`.
 * @param options.defaultState - A value for every optional state key.
 * @param options.builder - The members every module of this kind has.
 * @returns The factory.
 */
export function createModuleFactory<
  const KindName extends string,
  KindState extends UnknownObject = EmptyObject,
  KindMembers extends UnknownObject = EmptyObject,
>(
  kindName: KindName,
  options: {
    defaultState: NoInfer<KindDefaultState<KindState>>;
    builder: (
      module: BuilderModule<KindState>,
    ) => KindMembers & NoReservedMembers;
  },
): ModuleFactory<KindName, KindState, KindMembers> {
  const kindLayer = createBuilderLayer(options.builder);
  const defaultState: UnknownObject = options.defaultState;
  const factory = createModule(`${kindName}Factory`, {
    builder: () => {
      return {
        create: (name: string, createOptions: _RuntimeCreateOptions) => {
          return _createModuleOfKind({
            kindLayer,
            defaultState,
            name,
            options: createOptions,
          });
        },
      };
    },
  });
  // `create`'s public signature is computed by `FoldMixins` and
  // `MixinRequirementCheck`; its runtime is untyped, so the factory is
  // asserted here, once.
  return factory as unknown as ModuleFactory<KindName, KindState, KindMembers>;
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `pnpm --filter @avandar/modules exec vitest run src/createModuleFactory/createModuleFactory.test.ts`

Expected: PASS, 16 tests.

- [ ] **Step 6: Type-check the package**

Run: `pnpm --filter @avandar/modules type-check`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/modules/src/createLambdaMixin.ts packages/shared/modules/src/createModuleFactory/createModuleFactory.ts packages/shared/modules/src/createModuleFactory/createModuleFactory.test.ts
git commit -m "feat(modules): give factories a typed default state and mixin tuple"
```

---

## Task 4: Swap the package entry point and retire the old code

**Files:**
- Replace: `packages/shared/modules/src/index.ts`
- Delete: `packages/shared/modules/src/createModule.ts`, `packages/shared/modules/src/createModule.test.ts`, `packages/shared/modules/src/createModuleFactory.ts`
- Replace: `packages/shared/modules/README.md`

- [ ] **Step 1: Replace `packages/shared/modules/src/index.ts`**

```ts
export { createLambdaMixin } from "@modules/createLambdaMixin.ts";
export { createModule } from "@modules/createModule/createModule.ts";
export { createModuleFactory } from "@modules/createModuleFactory/createModuleFactory.ts";
export { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";

export type {
  NoReservedMembers,
  NoReservedStateKeys,
} from "@modules/createModule/createModule.ts";
export type {
  KindDefaultState,
  ModuleFactory,
  ModuleFactoryCreateOptions,
} from "@modules/createModuleFactory/createModuleFactory.ts";
export type {
  AnyMixin,
  FoldMixins,
  LambdaMixin,
  Mixin,
  MixinMembers,
  MixinRequirement,
  MixinRequirementCheck,
  MixinResult,
  MixinState,
  MixinTypeLambda,
} from "@modules/Mixin.types.ts";
export type {
  BuilderModule,
  Merge,
  Module,
  NameOfModule,
  ReservedMemberName,
  ReservedStateKey,
  StateOfModule,
  UnknownModule,
} from "@modules/Module.types.ts";
export type { EmptyObject } from "@avandar/utils";
```

- [ ] **Step 2: Delete the old implementation**

Run: `git rm packages/shared/modules/src/createModule.ts packages/shared/modules/src/createModule.test.ts packages/shared/modules/src/createModuleFactory.ts`

- [ ] **Step 3: Run the package's tests, type-check and build**

Run: `pnpm --filter @avandar/modules test && pnpm --filter @avandar/modules type-check && pnpm --filter @avandar/modules build`

Expected: 37 tests pass, the type-check exits 0, and tsup writes `dist/` with
`index.d.ts` and no declaration-emit errors. `git status --short packages/shared/modules`
must not list `dist/`.

- [ ] **Step 4: Replace `packages/shared/modules/README.md`**

````markdown
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
````

- [ ] **Step 5: Commit**

```bash
git add packages/shared/modules/src/index.ts packages/shared/modules/README.md
git commit -m "feat(modules)!: export the rebuilt module and factory API

BREAKING CHANGE: generated accessors are now get{Key}/set{Key};
createModuleFactory takes { defaultState, builder } and create takes
(name, { state, builder, mixins }); builders must be functions;
AnyModule, MembersOfModule and BaseModule are removed."
```

`git rm` in Step 2 already staged the deletions. They are part of this commit.

---

## Task 5: Migrate every `create` call site with a codemod

**Files:** the 8 files listed in Step 2, plus a throwaway codemod in `.temp/`
(gitignored).

- [ ] **Step 1: Write the codemod**

Create `.temp/feat-demo-measles/codemods/migrateFactoryCreate.mjs`:

```js
// Rewrites `Factory.create({ ...state })` to
// `Factory.create("Name", { state: { ...state } })` for the factories below.
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const MODULE_NAME_BY_FACTORY = {
  QueryMediatorFactory: "QueryMediator",
  EtlEngine: "EtlEngine",
};

function findCreateCalls(sourceFile) {
  const calls = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "create" &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text in MODULE_NAME_BY_FACTORY &&
      node.arguments.length === 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}

for (const filePath of process.argv.slice(2)) {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const edits = findCreateCalls(sourceFile).map((call) => {
    const [stateLiteral] = call.arguments;
    const moduleName = MODULE_NAME_BY_FACTORY[call.expression.expression.text];
    return {
      start: stateLiteral.getStart(sourceFile),
      end: stateLiteral.getEnd(),
      text: `"${moduleName}", { state: ${stateLiteral.getText(sourceFile)} }`,
    };
  });
  const migrated = [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((text, edit) => {
      return text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    }, sourceText);
  writeFileSync(filePath, migrated);
  console.log(`${filePath}: ${edits.length} create call(s) migrated`);
}
```

- [ ] **Step 2: Run it**

```bash
node .temp/feat-demo-measles/codemods/migrateFactoryCreate.mjs \
  apps/pipeline-server/pipelines/world-bank__wdi/run.ts \
  packages/node/etl/src/EtlEngine/EtlEngine.test.ts \
  src/clients/qetl/PublicQuerySession/PublicQuerySession.ts \
  src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts \
  src/clients/qetl/QueryMediator/__tests__/relationCacheOrdering.test.ts \
  src/clients/qetl/QueryMediator/__tests__/relationCacheProjection.test.ts \
  src/clients/qetl/QueryMediator/QueryMediator.coordination.test.ts \
  src/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession.ts
```

Expected: one line per file reporting 11 calls in total: 1 in every file
except `QueryMediator.coordination.test.ts` (3) and
`relationCacheProjection.test.ts` (2).

- [ ] **Step 3: Format the 8 files**

Run: `pnpm exec prettier --write` followed by the same 8 paths.

- [ ] **Step 4: Check that no old-style call is left**

Run: `grep -rn -E "(QueryMediatorFactory|EtlEngine)\.create\(\{" --include='*.ts' src apps packages shared`

Expected: no output.

---

## Task 6: QueryMediator's factory definition

**Files:** Modify `src/clients/qetl/QueryMediator/QueryMediator.ts`.

`IQueryMediator` stays exactly as it is. Only the factory changes.

- [ ] **Step 1: Import the builder types**

Replace:

```ts
import type { Module } from "@avandar/modules";
```

with:

```ts
import type { BuilderModule, Module, StateOfModule } from "@avandar/modules";
```

- [ ] **Step 2: Replace the factory definition**

Replace:

```ts
export const QueryMediatorFactory = createModuleFactory<IQueryMediator>(
  "QueryMediator",
  {
    childBuilder: (module) => {
      return { runQuery: createQetlQueryRunner(module.getState()) };
    },
  },
);
```

with:

```ts
export const QueryMediatorFactory = createModuleFactory("QueryMediator", {
  defaultState: {
    planConceptRelations: undefined,
    getDuckDbLeaseDatasetIds: undefined,
    duckDbReadMode: undefined,
    publicSnapshotDuckDbOwner: undefined,
    prepareDuckDbDatasets: undefined,
  },
  builder: (
    module: BuilderModule<StateOfModule<IQueryMediator>>,
  ): Pick<IQueryMediator, "runQuery"> => {
    return { runQuery: createQetlQueryRunner(module.getState()) };
  },
});
```

`createQetlQueryRunner` never iterates or `in`-checks its options, so the
`undefined` defaults behave exactly like absent keys.

---

## Task 7: EtlEngine's factory definition

**Files:** Modify `packages/node/etl/src/EtlEngine/EtlEngine.ts`.

- [ ] **Step 1: Replace the type import**

Replace:

```ts
import type {
  BaseModule,
  Module,
  ModuleFactory,
  StateOfModule,
} from "@avandar/modules";
```

with:

```ts
import type {
  BuilderModule,
  Module,
  ModuleFactory,
  StateOfModule,
} from "@avandar/modules";
```

- [ ] **Step 2: Replace the factory head**

Replace:

```ts
const EtlEngineFactory = createModuleFactory<IEtlEngine>("EtlEngine", {
  // TODO(jpsyx): fix the types of `childBuilder` to better support factory
  // patterns in modules
  // @ts-expect-error - this needs to be fixed
  childBuilder: (
    accessors: BaseModule<
      "EtlEngine",
      StateOfModule<IEtlEngine>,
      { run: () => Promise<EtlContext> }
    >,
  ) => {
```

with:

```ts
const EtlEngineFactory = createModuleFactory("EtlEngine", {
  defaultState: {},
  builder: (
    accessors: BuilderModule<StateOfModule<IEtlEngine>>,
  ): Pick<IEtlEngine, "run"> => {
```

The builder body (from `const pipelineRunId = ...` to the end) does not
change.

- [ ] **Step 3: Update the public API type**

Replace:

```ts
 * This is written out explicitly rather than left to inference. `Accessors`
 * (which `ModuleFactory` builds on) types its `set()` method with type-fest's
```

with:

```ts
 * This is written out explicitly rather than left to inference. `Module`
 * (which `ModuleFactory` builds on) types its `set()` method with type-fest's
```

Then replace:

```ts
export type EtlEngineApi = ModuleFactory<IEtlEngine> & {
```

with:

```ts
export type EtlEngineApi = ModuleFactory<
  "EtlEngine",
  StateOfModule<IEtlEngine>,
  Pick<IEtlEngine, "run">
> & {
```

- [ ] **Step 4: Stop mutating the factory**

Modules are frozen now, so `Object.assign` onto one throws. Replace:

```ts
export const EtlEngine: EtlEngineApi = Object.assign(EtlEngineFactory, {
  storeExtractedData,
  getLoadParquetPathForTable,
  uploadParquetToStorage,
});
```

with:

```ts
export const EtlEngine: EtlEngineApi = {
  ...EtlEngineFactory,
  storeExtractedData,
  getLoadParquetPathForTable,
  uploadParquetToStorage,
};
```

---

## Task 8: Verify every caller of the modules package

- [ ] **Step 1: Repo-wide TypeScript check**

Run: `pnpm exec tsc -b --noEmit`

Expected: exit 0. The scratch build compiled replicas of `createServiceClient`,
`withLogger`, `withSupabaseClient` and the CRUD and permission client patterns
against the new types. If anything else fails, it's a caller this plan does
not cover: **stop and report the `tsc` output**. Don't patch around it with
casts.

- [ ] **Step 2: Run the suites that build on modules**

Run each, and expect each to pass:

```bash
pnpm test:modules
pnpm test:clients
pnpm test:logger
pnpm test:etl
pnpm --filter @avandar/query-hooks test
pnpm test:pipeline-server
pnpm vitest run src/clients
```

- [ ] **Step 3: Build the ETL package, which emits declarations for `EtlEngineApi`**

Run: `pnpm --filter @avandar/etl build`

Expected: tsup finishes with no `TS2527`, `TS2742` or `TS7056`.

- [ ] **Step 4: Lint the changed files**

```bash
pnpm exec eslint packages/shared/modules/src src/clients/qetl packages/node/etl/src/EtlEngine apps/pipeline-server/pipelines/world-bank__wdi/run.ts
```

Expected: no errors.

- [ ] **Step 5: Commit the caller migration**

```bash
git add src/clients/qetl/QueryMediator/QueryMediator.ts packages/node/etl/src/EtlEngine/EtlEngine.ts \
  apps/pipeline-server/pipelines/world-bank__wdi/run.ts packages/node/etl/src/EtlEngine/EtlEngine.test.ts \
  src/clients/qetl/PublicQuerySession/PublicQuerySession.ts src/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession.ts \
  src/clients/qetl/QueryMediator/__tests__/QueryMediator.concepts.test.ts \
  src/clients/qetl/QueryMediator/__tests__/relationCacheOrdering.test.ts \
  src/clients/qetl/QueryMediator/__tests__/relationCacheProjection.test.ts \
  src/clients/qetl/QueryMediator/QueryMediator.coordination.test.ts
git commit -m "refactor: move createModuleFactory callers to named create calls"
```

---

## Task 9: Add Bottleneck

**Files:** root `package.json`, `pnpm-lock.yaml`, root `deno.json`.

- [ ] **Step 1: Install it at the workspace root**

Run: `pnpm add -w bottleneck@^2.19.5`

Expected: `package.json` gains `"bottleneck": "^2.19.5"` under
`dependencies`, and `pnpm-lock.yaml` updates.

- [ ] **Step 2: Map it for Deno**

`pnpm type-check:deno` checks all of `shared/`. In the root `deno.json`,
replace:

```json
    "@utils/": "./packages/shared/utils/src/",
```

with:

```json
    "@utils/": "./packages/shared/utils/src/",
    "bottleneck": "npm:bottleneck@2",
```

No `supabase/functions/*/deno.json` changes: no edge function imports
`withRateLimit`. The `open-data` function, which will import
`HttpClientFactory`, already maps `@avandar/modules`, `@modules/`,
`@avandar/utils`, `@utils/` and `type-fest`.

The commit for this task is Task 11's.

---

## Task 10: `HttpClientFactory`

**Files (all new, under `shared/utils/HttpClientFactory/`):**

- `HttpClientFactory.test.ts`
- `HttpClientFactory.types.ts`
- `HttpClientError.ts`
- `readBoundedBody.ts`
- `sendHttpRequest.ts`
- `HttpClientFactory.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/HttpClientFactory/HttpClientFactory.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import type {
  FetchLike,
  HttpClientState,
  HttpMiddleware,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

const BASE_URL = "https://api.example.org";

/** A presigned redirect target, which must never reach a message or a log. */
const PRESIGNED_URL =
  "https://s3.us-east-1.amazonaws.com/hdx/x.csv?Signature=SECRET";

function _jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function _bytesResponse(
  bytes: Uint8Array,
  options: { declaredLength?: string; status?: number } = {},
): Response {
  const headers = new Headers();
  if (options.declaredLength !== undefined) {
    headers.set("content-length", options.declaredLength);
  }
  const response = new Response(bytes as BodyInit, {
    status: options.status ?? 200,
    headers,
  });
  // `fetch` reports the final URL after redirects, so this carries the
  // presigned one exactly as a real response would.
  Object.defineProperty(response, "url", { value: PRESIGNED_URL });
  return response;
}

/** Streams `bytes` in small chunks, so the size guard sees more than one. */
function _chunkedResponse(bytes: Uint8Array, chunkSize: number): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
        controller.enqueue(bytes.subarray(offset, offset + chunkSize));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function _createClient(
  fetchImpl: FetchLike,
  state: Partial<HttpClientState> = {},
) {
  return HttpClientFactory.create("TestHttpClient", {
    state: { maxResponseBytes: 1000, fetchImpl, ...state },
  });
}

function _requestedUrl(fetchImpl: FetchLike, callIndex = 0): string {
  return String(vi.mocked(fetchImpl).mock.calls[callIndex]?.[0]);
}

function _requestedHeaders(fetchImpl: FetchLike, callIndex = 0): Headers {
  return new Headers(vi.mocked(fetchImpl).mock.calls[callIndex]?.[1]?.headers);
}

describe("HttpClient: URLs and bodies", () => {
  it("get returns the parsed JSON body", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({ success: true });
    });
    expect(await _createClient(fetchImpl).get(`${BASE_URL}/x`)).toEqual({
      success: true,
    });
  });

  it("resolves a relative URL against baseUrl", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL }).get("/api/items");
    expect(_requestedUrl(fetchImpl)).toBe(`${BASE_URL}/api/items`);
  });

  it("sends an absolute URL to its own host, ignoring baseUrl", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL }).get(
      "https://other.example.com/data",
    );
    expect(_requestedUrl(fetchImpl)).toBe("https://other.example.com/data");
  });

  it("adds query parameters and leaves out undefined ones", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL }).get("/search", {
      query: { q: "measles", limit: 10, cursor: undefined },
    });
    expect(_requestedUrl(fetchImpl)).toBe(
      `${BASE_URL}/search?q=measles&limit=10`,
    );
  });

  it("post sends its body JSON-encoded with a JSON content type", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl).post(`${BASE_URL}/items`, {
      body: { name: "a" },
    });
    const init = vi.mocked(fetchImpl).mock.calls[0]?.[1];
    expect([
      init?.body,
      _requestedHeaders(fetchImpl).get("content-type"),
    ]).toEqual(['{"name":"a"}', "application/json"]);
  });

  it("delete returns undefined for a 204 response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response(null, { status: 204 });
    });
    expect(await _createClient(fetchImpl).delete(`${BASE_URL}/items/1`)).toBe(
      undefined,
    );
  });

  it("raises an HttpClientError naming the status on a non-2xx response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response("nope", { status: 403 });
    });
    await expect(_createClient(fetchImpl).get(`${BASE_URL}/x`)).rejects.toThrow(
      /status 403/,
    );
  });

  it("refuses a JSON body over the size limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(3000), 500);
    });
    await expect(_createClient(fetchImpl).get(`${BASE_URL}/x`)).rejects.toThrow(
      /exceeded the 1000 byte limit/,
    );
  });
});

describe("HttpClient: auth", () => {
  it("sends a bearer token to baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).get("/x");
    expect(_requestedHeaders(fetchImpl).get("authorization")).toBe(
      "Bearer t0k",
    );
  });

  it("sends an API key header to baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "apiKeyHeader", headerName: "X-App-Token", apiKey: "k" },
    }).get("/x");
    expect(_requestedHeaders(fetchImpl).get("x-app-token")).toBe("k");
  });

  it("adds an API key query parameter for baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "apiKeyQuery", paramName: "api_key", apiKey: "k" },
    }).get("/x");
    expect(_requestedUrl(fetchImpl)).toBe(`${BASE_URL}/x?api_key=k`);
  });

  it("sends no credentials to another origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).get("https://other.example.com/x");
    expect(_requestedHeaders(fetchImpl).has("authorization")).toBe(false);
  });

  it("drops credentials when baseUrl's origin redirects to another origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async (url: string) => {
      return url.startsWith(BASE_URL)
        ? new Response(null, {
            status: 302,
            headers: { location: PRESIGNED_URL },
          })
        : _bytesResponse(new Uint8Array([1]));
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).getBytes("/download");
    expect(_requestedHeaders(fetchImpl, 1).has("authorization")).toBe(false);
  });

  it("keeps credentials across a redirect within baseUrl's origin", async () => {
    const fetchImpl: FetchLike = vi.fn(async (url: string) => {
      return url.endsWith("/old")
        ? new Response(null, { status: 301, headers: { location: "/new" } })
        : _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
    }).get("/old");
    expect(_requestedHeaders(fetchImpl, 1).get("authorization")).toBe(
      "Bearer t0k",
    );
  });

  it("throws when created with auth but no baseUrl", () => {
    const fetchImpl: FetchLike = vi.fn();
    expect(() => {
      _createClient(fetchImpl, { auth: { type: "bearer", token: "t0k" } });
    }).toThrow(/auth but no baseUrl/);
  });
});

describe("HttpClient: middlewares", () => {
  it("runs middlewares with the first one outermost", async () => {
    const order: string[] = [];
    const record = (label: string): HttpMiddleware => {
      return async (request, next) => {
        order.push(`${label}:before`);
        const response = await next(request);
        order.push(`${label}:after`);
        return response;
      };
    };
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      middlewares: [record("outer"), record("inner")],
    }).get(`${BASE_URL}/x`);
    expect(order).toEqual([
      "outer:before",
      "inner:before",
      "inner:after",
      "outer:after",
    ]);
  });

  it("never shows a middleware the request's credentials", async () => {
    let seenAuthorization: string | null = "unset";
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, {
      baseUrl: BASE_URL,
      auth: { type: "bearer", token: "t0k" },
      middlewares: [
        (request, next) => {
          seenAuthorization = request.headers.get("authorization");
          return next(request);
        },
      ],
    }).get("/x");
    expect(seenAuthorization).toBe(null);
  });
});

describe("HttpClient: getBytes", () => {
  it("returns the body bytes", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1, 2, 3]));
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("lets fetch follow redirects, since a CKAN download answers with one", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]));
    });
    await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(vi.mocked(fetchImpl).mock.calls[0]?.[1]?.redirect).toBe("follow");
  });

  it("refuses a body whose declared length is over the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1, 2, 3]), {
        declaredLength: "5000",
      });
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/5000 bytes, above the 1000 byte limit/);
  });

  // The declared length is a claim, not a fact, so the read is guarded too.
  it("refuses a body that exceeds the limit while streaming, despite a small declared length", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      const response = _chunkedResponse(new Uint8Array(3000), 500);
      response.headers.set("content-length", "10");
      return response;
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/exceeded the 1000 byte limit/);
  });

  it("refuses an undeclared body that exceeds the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(3000), 500);
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/exceeded the 1000 byte limit/);
  });

  it("reassembles a chunked body in order", async () => {
    const source = new Uint8Array([10, 20, 30, 40, 50, 60, 70]);
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(source, 3);
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(Array.from(bytes)).toEqual(Array.from(source));
  });

  it("accepts a body exactly at the limit", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _chunkedResponse(new Uint8Array(1000), 250);
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(bytes.byteLength).toBe(1000);
  });

  it("returns empty bytes for a body-less response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return new Response(null, { status: 200 });
    });
    const bytes = await _createClient(fetchImpl).getBytes(`${BASE_URL}/f`);
    expect(bytes.byteLength).toBe(0);
  });

  // After redirects `response.url` is the presigned object-store URL, which
  // is a credential. No message raised here may repeat it.
  it("names no presigned URL when it refuses an oversized body", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]), { declaredLength: "5000" });
    });
    const error = await _createClient(fetchImpl)
      .getBytes(`${BASE_URL}/f`)
      .catch((caught: unknown) => {
        return caught;
      });
    expect((error as Error).message).not.toMatch(/Signature|amazonaws/);
  });

  it("raises an HttpClientError naming the status on a non-2xx response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _bytesResponse(new Uint8Array([1]), { status: 502 });
    });
    await expect(
      _createClient(fetchImpl).getBytes(`${BASE_URL}/f`),
    ).rejects.toThrow(/status 502/);
  });
});

describe("HttpClient: state changes", () => {
  it("a client derived with setBaseUrl sends relative URLs to the new base", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      return _jsonResponse({});
    });
    await _createClient(fetchImpl, { baseUrl: BASE_URL })
      .setBaseUrl("https://next.example.org")
      .get("/x");
    expect(_requestedUrl(fetchImpl)).toBe("https://next.example.org/x");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run shared/utils/HttpClientFactory/HttpClientFactory.test.ts`

Expected: FAIL, because `$/utils/HttpClientFactory/HttpClientFactory.ts`
cannot be resolved.

- [ ] **Step 3: Create `shared/utils/HttpClientFactory/HttpClientFactory.types.ts`**

```ts
import type { Module } from "@avandar/modules";

/** A `fetch` implementation. Injected by tests so they need no network. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** An HTTP method an HttpClient sends. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** How an HttpClient authenticates. Sent only to `baseUrl`'s origin. */
export type HttpClientAuth =
  | { type: "bearer"; token: string }
  | { type: "apiKeyHeader"; headerName: string; apiKey: string }
  | { type: "apiKeyQuery"; paramName: string; apiKey: string };

/** A request as a middleware sees it. It never carries credentials. */
export type HttpMiddlewareRequest = {
  method: HttpMethod;
  url: string;
  headers: Headers;
  body: string | undefined;
  signal: AbortSignal | undefined;
};

/** Wraps sending a request. Call `next` to continue down the chain. */
export type HttpMiddleware = (
  request: Readonly<HttpMiddlewareRequest>,
  next: (request: Readonly<HttpMiddlewareRequest>) => Promise<Response>,
) => Promise<Response>;

/** A query parameter value. `undefined` leaves the parameter out. */
export type HttpQueryValue = string | number | boolean | undefined;

/** Options every request accepts. */
export type HttpRequestOptions = {
  query?: Readonly<Record<string, HttpQueryValue>>;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
};

/** Options for a request with a body, which is sent JSON-encoded. */
export type HttpRequestWithBodyOptions = HttpRequestOptions & {
  body?: unknown;
};

/** An HttpClient's state. Every key has a generated getter and setter. */
export type HttpClientState = {
  /** Relative request URLs resolve against this. Absolute URLs pass through. */
  baseUrl?: string;
  /** Requires `baseUrl`. Sent only to `baseUrl`'s origin. */
  auth?: HttpClientAuth;
  /** Sent with every request. */
  defaultHeaders?: Readonly<Record<string, string>>;
  /** The largest response body read, JSON or bytes. */
  maxResponseBytes: number;
  /** Wrap every request, the first one outermost. */
  middlewares?: readonly HttpMiddleware[];
  /** Defaults to global `fetch`. */
  fetchImpl?: FetchLike;
};

/** The members every HttpClient has. */
export type HttpClientMembers = {
  /** Sends a GET and returns the parsed, unvalidated JSON body. */
  get: (url: string, options?: HttpRequestOptions) => Promise<unknown>;
  /** Sends a POST and returns the parsed, unvalidated JSON body. */
  post: (url: string, options?: HttpRequestWithBodyOptions) => Promise<unknown>;
  /** Sends a PUT and returns the parsed, unvalidated JSON body. */
  put: (url: string, options?: HttpRequestWithBodyOptions) => Promise<unknown>;
  /** Sends a PATCH and returns the parsed, unvalidated JSON body. */
  patch: (
    url: string,
    options?: HttpRequestWithBodyOptions,
  ) => Promise<unknown>;
  /** Sends a DELETE and returns the parsed body, or `undefined` if empty. */
  delete: (url: string, options?: HttpRequestOptions) => Promise<unknown>;
  /** Sends a GET and returns the raw body bytes. Follows redirects. */
  getBytes: (
    url: string,
    options?: HttpRequestOptions,
  ) => Promise<Uint8Array<ArrayBuffer>>;
};

/** An HttpClient, whatever its name. */
export type HttpClient = Module<string, HttpClientState, HttpClientMembers>;
```

- [ ] **Step 4: Create `shared/utils/HttpClientFactory/HttpClientError.ts`**

```ts
import type { HttpMethod } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

/** Why an HttpClient request failed. */
export type HttpClientErrorKind =
  | "status"
  | "responseTooLarge"
  | "tooManyRedirects";

type _HttpClientErrorDetails = {
  kind: HttpClientErrorKind;
  method: HttpMethod;
  status?: number;
  maxBytes?: number;
  declaredBytes?: number;
};

function _buildHttpClientErrorMessage(
  details: Readonly<_HttpClientErrorDetails>,
): string {
  const { kind, method, status, maxBytes, declaredBytes } = details;
  if (kind === "status") {
    return `HTTP ${method} request failed with status ${status}.`;
  }
  if (kind === "tooManyRedirects") {
    return `HTTP ${method} request was redirected too many times.`;
  }
  return declaredBytes === undefined
    ? `HTTP ${method} response exceeded the ${maxBytes} byte limit.`
    : `HTTP ${method} response declared ${declaredBytes} bytes, above the ${maxBytes} byte limit.`;
}

/**
 * A failed HttpClient request. Its message never names a URL: after a
 * redirect the URL can be a presigned object-store URL, which is a
 * credential.
 */
export class HttpClientError extends Error {
  readonly kind: HttpClientErrorKind;
  readonly method: HttpMethod;
  readonly status: number | undefined;

  constructor(details: Readonly<_HttpClientErrorDetails>) {
    super(_buildHttpClientErrorMessage(details));
    this.name = "HttpClientError";
    this.kind = details.kind;
    this.method = details.method;
    this.status = details.status;
  }
}
```

- [ ] **Step 5: Create `shared/utils/HttpClientFactory/readBoundedBody.ts`**

```ts
import { HttpClientError } from "$/utils/HttpClientFactory/HttpClientError.ts";
import type { HttpMethod } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

async function _readStreamWithLimit(params: {
  body: ReadableStream<Uint8Array>;
  maxBytes: number;
  method: HttpMethod;
}): Promise<Uint8Array<ArrayBuffer>> {
  const { body, maxBytes, method } = params;
  const reader = body.getReader();
  const chunks: Array<Uint8Array<ArrayBuffer>> = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        throw new HttpClientError({
          kind: "responseTooLarge",
          method,
          maxBytes,
        });
      }
      chunks.push(value as Uint8Array<ArrayBuffer>);
    }
  } finally {
    // Releasing the lock lets the caller cancel the underlying connection
    // rather than leaving a half-read body open after an over-limit abort.
    reader.releaseLock();
  }
  const bytes = new Uint8Array(new ArrayBuffer(total));
  chunks.reduce((offset, chunk) => {
    bytes.set(chunk, offset);
    return offset + chunk.byteLength;
  }, 0);
  return bytes;
}

/**
 * Reads a response body, refusing more than `maxBytes`. The declared
 * `content-length` is checked first, and the streamed read is checked again,
 * because a response can declare a small length and send more.
 *
 * Streaming rather than `arrayBuffer()` is the point: `arrayBuffer()` would
 * buffer an oversized body in full before anyone could object.
 */
export async function readBoundedBody(params: {
  response: Response;
  maxBytes: number;
  method: HttpMethod;
}): Promise<Uint8Array<ArrayBuffer>> {
  const { response, maxBytes, method } = params;
  const declaredBytes = Number(
    response.headers.get("content-length") ?? Number.NaN,
  );
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new HttpClientError({
      kind: "responseTooLarge",
      method,
      maxBytes,
      declaredBytes,
    });
  }
  if (!response.body) {
    return new Uint8Array(new ArrayBuffer(0));
  }
  return await _readStreamWithLimit({ body: response.body, maxBytes, method });
}
```

- [ ] **Step 6: Create `shared/utils/HttpClientFactory/sendHttpRequest.ts`**

```ts
import { HttpClientError } from "$/utils/HttpClientFactory/HttpClientError.ts";
import type {
  FetchLike,
  HttpClientAuth,
  HttpClientState,
  HttpMethod,
  HttpMiddlewareRequest,
  HttpRequestWithBodyOptions,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

const MAX_REDIRECTS = 5;

const REDIRECT_STATUSES: ReadonlySet<number> = new Set([
  301, 302, 303, 307, 308,
]);

type _SendToNetwork = (
  request: Readonly<HttpMiddlewareRequest>,
) => Promise<Response>;

function _resolveRequestUrl(params: {
  baseUrl: string | undefined;
  url: string;
  query: HttpRequestWithBodyOptions["query"];
}): string {
  const resolved = new URL(params.url, params.baseUrl);
  Object.entries(params.query ?? {}).forEach(([name, value]) => {
    if (value !== undefined) {
      resolved.searchParams.set(name, String(value));
    }
  });
  return resolved.toString();
}

function _buildRequestHeaders(params: {
  defaultHeaders: HttpClientState["defaultHeaders"];
  headers: HttpRequestWithBodyOptions["headers"];
  accept: string | undefined;
  hasBody: boolean;
}): Headers {
  const headers = new Headers(params.defaultHeaders);
  Object.entries(params.headers ?? {}).forEach(([name, value]) => {
    headers.set(name, value);
  });
  if (params.accept !== undefined) {
    headers.set("accept", params.accept);
  }
  if (params.hasBody) {
    headers.set("content-type", "application/json");
  }
  return headers;
}

function _isCredentialedOrigin(
  url: URL,
  state: Readonly<HttpClientState>,
): boolean {
  return (
    state.auth !== undefined &&
    state.baseUrl !== undefined &&
    url.origin === new URL(state.baseUrl).origin
  );
}

function _addCredentials(params: {
  url: URL;
  headers: Headers;
  auth: HttpClientAuth;
}): { url: URL; headers: Headers } {
  const { auth } = params;
  const url = new URL(params.url);
  const headers = new Headers(params.headers);
  switch (auth.type) {
    case "bearer":
      headers.set("authorization", `Bearer ${auth.token}`);
      break;
    case "apiKeyHeader":
      headers.set(auth.headerName, auth.apiKey);
      break;
    case "apiKeyQuery":
      url.searchParams.set(auth.paramName, auth.apiKey);
      break;
  }
  return { url, headers };
}

function _redirectMethod(status: number, method: HttpMethod): HttpMethod {
  const switchesToGet =
    status === 303 || ((status === 301 || status === 302) && method === "POST");
  return switchesToGet ? "GET" : method;
}

/**
 * Sends one hop. Requests to `baseUrl`'s origin carry credentials and follow
 * redirects by hand, so a redirect to another origin drops them. Everything
 * else is sent without credentials and lets `fetch` follow redirects.
 */
async function _sendHop(params: {
  request: Readonly<HttpMiddlewareRequest>;
  state: Readonly<HttpClientState>;
  fetchImpl: FetchLike;
  redirectsLeft: number;
}): Promise<Response> {
  const { request, state, fetchImpl, redirectsLeft } = params;
  const url = new URL(request.url);
  const init = {
    method: request.method,
    body: request.body,
    signal: request.signal,
  };
  if (!_isCredentialedOrigin(url, state) || state.auth === undefined) {
    return await fetchImpl(url.toString(), {
      ...init,
      headers: request.headers,
      redirect: "follow",
    });
  }
  const credentialed = _addCredentials({
    url,
    headers: request.headers,
    auth: state.auth,
  });
  const response = await fetchImpl(credentialed.url.toString(), {
    ...init,
    headers: credentialed.headers,
    redirect: "manual",
  });
  const location = response.headers.get("location");
  if (!REDIRECT_STATUSES.has(response.status) || location === null) {
    return response;
  }
  if (redirectsLeft === 0) {
    throw new HttpClientError({
      kind: "tooManyRedirects",
      method: request.method,
    });
  }
  const method = _redirectMethod(response.status, request.method);
  return await _sendHop({
    ...params,
    request: {
      ...request,
      url: new URL(location, url).toString(),
      method,
      body: method === request.method ? request.body : undefined,
    },
    redirectsLeft: redirectsLeft - 1,
  });
}

/**
 * Sends one HttpClient request through the client's middlewares and returns
 * the 2xx response. Credentials are added after the middlewares, only for
 * `baseUrl`'s origin, so no middleware and no other host ever sees them.
 */
export async function sendHttpRequest(params: {
  state: Readonly<HttpClientState>;
  method: HttpMethod;
  url: string;
  options: Readonly<HttpRequestWithBodyOptions>;
  accept: string | undefined;
}): Promise<Response> {
  const { state, method, options } = params;
  const body =
    options.body === undefined ? undefined : JSON.stringify(options.body);
  const request: HttpMiddlewareRequest = {
    method,
    url: _resolveRequestUrl({
      baseUrl: state.baseUrl,
      url: params.url,
      query: options.query,
    }),
    headers: _buildRequestHeaders({
      defaultHeaders: state.defaultHeaders,
      headers: options.headers,
      accept: params.accept,
      hasBody: body !== undefined,
    }),
    body,
    signal: options.signal,
  };
  const sendToNetwork: _SendToNetwork = (finalRequest) => {
    return _sendHop({
      request: finalRequest,
      state,
      fetchImpl: state.fetchImpl ?? fetch,
      redirectsLeft: MAX_REDIRECTS,
    });
  };
  const send = (state.middlewares ?? []).reduceRight<_SendToNetwork>(
    (next, middleware) => {
      return (middlewareRequest) => {
        return middleware(middlewareRequest, next);
      };
    },
    sendToNetwork,
  );
  const response = await send(request);
  if (!response.ok) {
    throw new HttpClientError({
      kind: "status",
      method,
      status: response.status,
    });
  }
  return response;
}
```

- [ ] **Step 7: Create `shared/utils/HttpClientFactory/HttpClientFactory.ts`**

```ts
import { createModuleFactory } from "@avandar/modules";
import { readBoundedBody } from "$/utils/HttpClientFactory/readBoundedBody.ts";
import { sendHttpRequest } from "$/utils/HttpClientFactory/sendHttpRequest.ts";
import type { BuilderModule } from "@avandar/modules";
import type {
  HttpClientMembers,
  HttpClientState,
  HttpMethod,
  HttpRequestWithBodyOptions,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

function _parseJsonBody(bytes: Uint8Array): unknown {
  return bytes.byteLength === 0
    ? undefined
    : JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * The HttpClient kind: a small `fetch`-based client with named auth
 * strategies, a response size cap, and middlewares. Make one with
 * `HttpClientFactory.create(name, { state, mixins })`; add rate limiting with
 * the `withRateLimit` mixin.
 */
export const HttpClientFactory = createModuleFactory("HttpClient", {
  defaultState: {
    baseUrl: undefined,
    auth: undefined,
    defaultHeaders: undefined,
    middlewares: [],
    fetchImpl: undefined,
  },
  builder: (module: BuilderModule<HttpClientState>): HttpClientMembers => {
    const state = module.getState();
    if (state.auth !== undefined && state.baseUrl === undefined) {
      throw new Error(
        `HttpClient "${module.getModuleName()}" has auth but no baseUrl, so it cannot tell which origin may receive the credentials.`,
      );
    }
    const requestJson = async (
      method: HttpMethod,
      url: string,
      options: HttpRequestWithBodyOptions = {},
    ): Promise<unknown> => {
      const response = await sendHttpRequest({
        state,
        method,
        url,
        options,
        accept: "application/json",
      });
      if (response.status === 204) {
        return undefined;
      }
      return _parseJsonBody(
        await readBoundedBody({
          response,
          maxBytes: state.maxResponseBytes,
          method,
        }),
      );
    };
    return {
      get: (url, options) => {
        return requestJson("GET", url, options);
      },
      post: (url, options) => {
        return requestJson("POST", url, options);
      },
      put: (url, options) => {
        return requestJson("PUT", url, options);
      },
      patch: (url, options) => {
        return requestJson("PATCH", url, options);
      },
      delete: (url, options) => {
        return requestJson("DELETE", url, options);
      },
      getBytes: async (url, options = {}) => {
        const response = await sendHttpRequest({
          state,
          method: "GET",
          url,
          options,
          accept: undefined,
        });
        return await readBoundedBody({
          response,
          maxBytes: state.maxResponseBytes,
          method: "GET",
        });
      },
    };
  },
});
```

- [ ] **Step 8: Run the test and watch it pass**

Run: `pnpm vitest run shared/utils/HttpClientFactory/HttpClientFactory.test.ts`

Expected: PASS, 28 tests.

---

## Task 11: `withRateLimit`

**Files:**
- Create: `shared/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit.test.ts`
- Create: `shared/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit.test.ts`:

```ts
import { createModule } from "@avandar/modules";
import { describe, expect, it, vi } from "vitest";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit.ts";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

const MIN_TIME_MS = 50;

/** Real timers are not exact, so a spacing check allows this much slack. */
const TIMER_SLACK_MS = 10;

function _recordingFetch(): { fetchImpl: FetchLike; startTimes: number[] } {
  const startTimes: number[] = [];
  const fetchImpl: FetchLike = vi.fn(async () => {
    startTimes.push(performance.now());
    return new Response("{}", { status: 200 });
  });
  return { fetchImpl, startTimes };
}

function _gaps(times: readonly number[]): number[] {
  return times.slice(1).map((time, index) => {
    return time - (times[index] ?? time);
  });
}

describe("withRateLimit", () => {
  it("spaces the start of consecutive requests by at least minTimeMs", async () => {
    const { fetchImpl, startTimes } = _recordingFetch();
    const client = HttpClientFactory.create("Limited", {
      state: { maxResponseBytes: 1000, fetchImpl },
      mixins: [withRateLimit({ minTimeMs: MIN_TIME_MS })],
    });
    await Promise.all([
      client.get("https://a.example/1"),
      client.get("https://a.example/2"),
      client.get("https://a.example/3"),
    ]);
    _gaps(startTimes).forEach((gap) => {
      expect(gap).toBeGreaterThanOrEqual(MIN_TIME_MS - TIMER_SLACK_MS);
    });
  });

  it("sends requests in the order they were made", async () => {
    const { fetchImpl } = _recordingFetch();
    const client = HttpClientFactory.create("Limited", {
      state: { maxResponseBytes: 1000, fetchImpl },
      mixins: [withRateLimit({ minTimeMs: 5 })],
    });
    await Promise.all(
      ["1", "2", "3"].map((path) => {
        return client.get(`https://a.example/${path}`);
      }),
    );
    expect(
      vi.mocked(fetchImpl).mock.calls.map((call) => {
        return call[0];
      }),
    ).toEqual([
      "https://a.example/1",
      "https://a.example/2",
      "https://a.example/3",
    ]);
  });

  it("shares one limiter between a client and a client derived from it by a setter", async () => {
    const { fetchImpl, startTimes } = _recordingFetch();
    const client = HttpClientFactory.create("Limited", {
      state: { maxResponseBytes: 1000, fetchImpl },
      mixins: [withRateLimit({ minTimeMs: MIN_TIME_MS })],
    });
    const derived = client.setBaseUrl("https://b.example");
    await Promise.all([client.get("https://a.example/1"), derived.get("/2")]);
    expect(_gaps(startTimes)[0]).toBeGreaterThanOrEqual(
      MIN_TIME_MS - TIMER_SLACK_MS,
    );
  });

  it("gives clients from separate withRateLimit calls separate limiters", async () => {
    const { fetchImpl, startTimes } = _recordingFetch();
    const create = (name: string) => {
      return HttpClientFactory.create(name, {
        state: { maxResponseBytes: 1000, fetchImpl },
        mixins: [withRateLimit({ minTimeMs: 1000 })],
      });
    };
    await Promise.all([
      create("First").get("https://a.example/1"),
      create("Second").get("https://a.example/2"),
    ]);
    expect(_gaps(startTimes)[0]).toBeLessThan(500);
  });

  it("refuses a module without a middlewares state", () => {
    expect(() => {
      // @ts-expect-error - the module has no getMiddlewares accessor
      createModule("NotAnHttpClient").mixin(withRateLimit({ minTimeMs: 1 }));
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run shared/utils/HttpClientFactory/mixins/withRateLimit`

Expected: FAIL, because `withRateLimit.ts` cannot be resolved.

- [ ] **Step 3: Create `shared/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit.ts`**

```ts
import Bottleneck from "bottleneck";
import type { Mixin } from "@avandar/modules";
import type {
  HttpClientState,
  HttpMiddleware,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

type _RateLimitBase = {
  getMiddlewares(): HttpClientState["middlewares"];
};

/**
 * Rate-limits every request an HttpClient sends, by appending a middleware
 * that schedules each request through one Bottleneck limiter.
 *
 * The limiter is created by this call, so clients derived from one client
 * through setters share its budget, and clients given the same returned
 * mixin share a budget on purpose.
 *
 * @param options.minTimeMs - The least time between two request starts.
 * @param options.maxConcurrent - The most requests in flight. No cap if unset.
 * @returns The mixin.
 */
export function withRateLimit(options: {
  minTimeMs: number;
  maxConcurrent?: number;
}): Mixin<_RateLimitBase, Pick<HttpClientState, "middlewares">> {
  const limiter = new Bottleneck({
    minTime: options.minTimeMs,
    maxConcurrent: options.maxConcurrent ?? null,
  });
  const rateLimitMiddleware: HttpMiddleware = (request, next) => {
    return limiter.schedule(() => {
      return next(request);
    });
  };
  return (base) => {
    return {
      state: {
        middlewares: [...(base.getMiddlewares() ?? []), rateLimitMiddleware],
      },
    };
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run shared/utils/HttpClientFactory`

Expected: PASS, 33 tests across both files. These are real-timer tests: run
`pnpm vitest run shared/utils/HttpClientFactory/mixins/withRateLimit` 5 more
times and expect it to pass every time.

- [ ] **Step 5: Check the new code under Deno**

Run: `deno check shared/utils/HttpClientFactory/HttpClientFactory.ts shared/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit.ts`

Expected: both files check with no errors.

- [ ] **Step 6: Lint**

Run: `pnpm exec eslint shared/utils/HttpClientFactory`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml deno.json shared/utils/HttpClientFactory
git commit -m "feat(http-client): add HttpClientFactory with a withRateLimit mixin"
```

---

## Task 12: Point the open-data connectors at `HttpClient`

**Files:**
- Modify: `shared/connectors/open-data/CkanClient/CkanClient.types.ts`
- Modify: the 10 connector and test files listed in Step 3

- [ ] **Step 1: Re-type `OpenDataHttp`**

Add this import as the first line of
`shared/connectors/open-data/CkanClient/CkanClient.types.ts`:

```ts
import type { HttpClient } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";
```

Then replace:

```ts
 * The two members are separate rather than one `fetch`-shaped dependency
 * because they do not have the same reachability. CKAN's `/api/3/action/*`
 * responses carry `access-control-allow-origin: *`, so metadata can be read
 * straight from a browser. A resource download answers with a redirect whose
 * `access-control-allow-origin` names only the CKAN host, so those bytes cannot
 * be read from another origin in a browser at all and have to come through a
 * server-side reader. Collapsing the two would hide that.
 */
export type OpenDataHttp = {
  /** Reads a JSON document. Parsed but not validated; the caller validates. */
  getJson: (url: string) => Promise<unknown>;

  /** Reads raw bytes. Must follow redirects and must not cache the target. */
  getBytes: (url: string) => Promise<Uint8Array<ArrayBuffer>>;
};
```

with:

```ts
 * It is the part of an `HttpClient` the open-data clients use, so a test can
 * pass a two-function fake. `get` reads a JSON document, parsed but not
 * validated: the caller validates. `getBytes` reads raw bytes and follows
 * redirects.
 *
 * The two members are separate rather than one `fetch`-shaped dependency
 * because they do not have the same reachability. CKAN's `/api/3/action/*`
 * responses carry `access-control-allow-origin: *`, so metadata can be read
 * straight from a browser. A resource download answers with a redirect whose
 * `access-control-allow-origin` names only the CKAN host, so those bytes cannot
 * be read from another origin in a browser at all and have to come through a
 * server-side reader. Collapsing the two would hide that.
 */
export type OpenDataHttp = Pick<HttpClient, "get" | "getBytes">;
```

- [ ] **Step 2: Watch the connectors fail to compile**

Run: `pnpm exec tsc -b --noEmit`

Expected: errors that `getJson` does not exist on `OpenDataHttp`, in the
files Step 3 changes.

- [ ] **Step 3: Rename `getJson` to `get` in the connectors and their tests**

```bash
perl -pi -e 's/\bgetJson\b/get/g' \
  shared/connectors/open-data/CkanClient/CkanClient.ts \
  shared/connectors/open-data/CkanClient/CkanClient.test.ts \
  shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts \
  shared/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.test.ts \
  shared/connectors/open-data/SocrataClient/SocrataClient.ts \
  shared/connectors/open-data/SocrataClient/SocrataClient.test.ts \
  shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.ts \
  shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.test.ts \
  shared/connectors/open-data/acquireOpenDataResource.test.ts \
  shared/connectors/open-data/readOpenDataFreshnessToken/readOpenDataFreshnessToken.test.ts
```

Then run `grep -rn "getJson" shared apps supabase --include='*.ts'`. Expected:
matches only in `createOpenDataHttp.ts` and `createOpenDataHttp.test.ts`,
which Task 13 deletes.

- [ ] **Step 4: Run the open-data suites**

Run: `pnpm vitest run shared/connectors/open-data`

Expected: PASS. The suite count matches Task 0's baseline.

---

## Task 13: Move the edge route and the pipelines onto `HttpClientFactory`

**Files:**
- Modify: `supabase/functions/open-data/OpenDataRoutes.ts`
- Replace: `apps/pipeline-server/pipelines/hdx/run.ts`
- Replace: `apps/pipeline-server/pipelines/socrata/run.ts`
- Delete: `shared/connectors/open-data/createOpenDataHttp.ts`, `shared/connectors/open-data/createOpenDataHttp.test.ts`

- [ ] **Step 1: The edge route**

In `supabase/functions/open-data/OpenDataRoutes.ts`, delete this line:

```ts
import { createOpenDataHttp } from "$/connectors/open-data/createOpenDataHttp.ts";
```

Then replace:

```ts
import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts";
```

with:

```ts
import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
```

That keeps the value imports in path order (`$/connectors`, `$/models`,
`$/utils`) ahead of the type imports. Then replace:

```ts
  const http = createOpenDataHttp({ maxBytes: MAX_RESOURCE_BYTES });
```

with:

```ts
  const http = HttpClientFactory.create("OpenDataRouteHttpClient", {
    state: { maxResponseBytes: MAX_RESOURCE_BYTES },
  });
```

Then run `pnpm exec prettier --write supabase/functions/open-data/OpenDataRoutes.ts`.

- [ ] **Step 2: Replace `apps/pipeline-server/pipelines/hdx/run.ts`**

```ts
import { randomUUID } from "node:crypto";
import { HDX_DRIVE } from "@pipelines/hdx/hdxDrive";
import { makeCkanListingRowsFromPackage } from "@pipelines/hdx/makeCkanListingRowsFromPackage/makeCkanListingRowsFromPackage";
import { createSupabaseAdminClient } from "@pipelines/shared/createSupabaseAdminClient";
import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** HDX asks API clients to send at most one request per second. */
const MIN_TIME_BETWEEN_REQUESTS_MS = 1000;

/**
 * Enumerates the HDX drive, if one is configured (`hdxDrive.ts`), and
 * upserts one `data_catalog_listings` row per readable resource it finds.
 *
 * Not an `EtlEngine` pipeline: nothing here extracts, transforms, or loads
 * data into Parquet. It only discovers metadata and writes catalog rows -
 * the actual resource bytes are still fetched live on first query, by the
 * existing `acquireOpenDataResourceWithCache` path, completely unchanged.
 */
export async function run(): Promise<string> {
  const pipelineRunId = randomUUID();

  if (HDX_DRIVE === undefined) {
    console.log(`[hdx] run ${pipelineRunId}: no HDX drive configured`);
    return pipelineRunId;
  }

  const supabase = createSupabaseAdminClient();
  const http = HttpClientFactory.create("HdxPipelineHttpClient", {
    state: { maxResponseBytes: MAX_METADATA_BYTES },
    mixins: [withRateLimit({ minTimeMs: MIN_TIME_BETWEEN_REQUESTS_MS })],
  });
  const discovery = createCkanDiscoveryClient(http);
  const client = createCkanClient(http);

  const slugs = await discovery.listDatasets({ baseUrl: HDX_DRIVE.baseUrl });
  const rows: DataCatalogListingRow[] = [];
  // Sequential on purpose: the rate limiter already spaces requests, and an
  // offline batch job gains nothing from racing them.
  for (const slug of slugs) {
    const ckanPackage = await client.getPackage({
      baseUrl: HDX_DRIVE.baseUrl,
      ckanDatasetId: slug,
    });
    rows.push(
      ...makeCkanListingRowsFromPackage({ drive: HDX_DRIVE, ckanPackage }),
    );
  }

  console.log(
    `[hdx] run ${pipelineRunId}: discovered ${String(rows.length)} resources`,
  );
  await upsertDataCatalogListingRows({ supabase, rows });

  return pipelineRunId;
}
```

- [ ] **Step 3: Replace `apps/pipeline-server/pipelines/socrata/run.ts`**

The client moves into `run()` and is shared by every drive. Every drive is
enumerated through the same Discovery API host, so one shared limiter is what
keeps the pipeline at one request per second overall.

```ts
import { randomUUID } from "node:crypto";
import { CONFIGURED_DRIVES } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { makeListingRowFromSocrataResult } from "@pipelines/socrata/makeListingRowFromSocrataResult/makeListingRowFromSocrataResult";
import { createSupabaseAdminClient } from "@pipelines/shared/createSupabaseAdminClient";
import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** One Discovery API page, matching Socrata's own reasonable page size. */
const SOCRATA_PAGE_SIZE = 100;

/** Stays well inside Socrata's unauthenticated request budget. */
const MIN_TIME_BETWEEN_REQUESTS_MS = 1000;

async function _enumerateDrive(params: {
  drive: Readonly<ConfiguredDrive>;
  http: OpenDataHttp;
}): Promise<DataCatalogListingRow[]> {
  const { drive, http } = params;
  const discovery = createSocrataDiscoveryClient(http);
  const domain = new URL(drive.baseUrl).host;

  const rows: DataCatalogListingRow[] = [];
  let offset = 0;
  // Sequential pagination on purpose: each page's offset depends on the
  // previous page's result count, so this cannot run concurrently.
  for (;;) {
    const page = await discovery.search({
      domains: [domain],
      limit: SOCRATA_PAGE_SIZE,
      offset,
    });
    rows.push(
      ...page.map((result) => {
        return makeListingRowFromSocrataResult({ drive, result });
      }),
    );
    if (page.length < SOCRATA_PAGE_SIZE) {
      break;
    }
    offset += SOCRATA_PAGE_SIZE;
  }
  return rows;
}

/**
 * Enumerates every configured Socrata drive and upserts one
 * `data_catalog_listings` row per discovered dataset.
 *
 * Each drive is enumerated independently with `Promise.allSettled`: one
 * drive throwing (e.g. a rate limit) is logged and skipped rather than
 * discarding every other drive's already-enumerated rows, so a partial run
 * still upserts what did succeed. Every drive shares one rate-limited client,
 * because they all go through the same Discovery API host.
 */
export async function run(): Promise<string> {
  const pipelineRunId = randomUUID();
  const supabase = createSupabaseAdminClient();
  const http = HttpClientFactory.create("SocrataPipelineHttpClient", {
    state: { maxResponseBytes: MAX_METADATA_BYTES },
    mixins: [withRateLimit({ minTimeMs: MIN_TIME_BETWEEN_REQUESTS_MS })],
  });

  const results = await Promise.allSettled(
    CONFIGURED_DRIVES.map((drive) => {
      return _enumerateDrive({ drive, http });
    }),
  );

  const rows: DataCatalogListingRow[] = [];
  results.forEach((result, index) => {
    const drive = CONFIGURED_DRIVES[index];
    if (result.status === "fulfilled") {
      rows.push(...result.value);
    } else {
      console.error(
        `[socrata] run ${pipelineRunId}: drive ${drive?.baseUrl ?? "unknown"} failed:`,
        result.reason,
      );
    }
  });

  console.log(
    `[socrata] run ${pipelineRunId}: discovered ${String(rows.length)} resources across ${String(CONFIGURED_DRIVES.length)} drives`,
  );
  await upsertDataCatalogListingRows({ supabase, rows });

  return pipelineRunId;
}
```

- [ ] **Step 4: Delete `createOpenDataHttp`**

Run: `git rm shared/connectors/open-data/createOpenDataHttp.ts shared/connectors/open-data/createOpenDataHttp.test.ts`

Its behaviors are covered by `HttpClientFactory.test.ts`, whose `getBytes`
cases are ported from the deleted test.

- [ ] **Step 5: Verify everything**

```bash
grep -rn "createOpenDataHttp" --include='*.ts' . --exclude-dir=node_modules
pnpm vitest run shared/connectors/open-data shared/utils/HttpClientFactory
pnpm test:pipeline-server
pnpm type-check
pnpm exec eslint shared/connectors/open-data shared/utils/HttpClientFactory supabase/functions/open-data apps/pipeline-server/pipelines/hdx apps/pipeline-server/pipelines/socrata
```

Expected:
- `grep` prints nothing.
- Both vitest runs, the pipeline-server tests and `pnpm type-check` (`tsc -b`
  plus `deno check` over `shared`, `supabase/functions` and `packages/shared`)
  pass.
- ESLint reports no errors.

- [ ] **Step 6: Commit**

```bash
git add shared/connectors/open-data supabase/functions/open-data/OpenDataRoutes.ts \
  apps/pipeline-server/pipelines/hdx/run.ts apps/pipeline-server/pipelines/socrata/run.ts
git commit -m "refactor(open-data): read open data through HttpClientFactory and rate-limit the pipelines"
```

Check `git status --short shared/connectors/open-data` first. If it shows
modified files this plan did not touch (the branch carried uncommitted
open-data work before Task 0), add only the paths named in Tasks 12 and 13
instead of the whole directory.

---

## Task 14: Document the rate limiting

**Files:** Modify `docs/measles-demo/open-data-catalog-architecture.md`.

- [ ] **Step 1: Section 6.6**

After the paragraph ending `deviation anyone needs to reconcile with the
EtlEngine pattern later.`, add:

```markdown
Both pipelines send every request through an `HttpClientFactory` client with
`withRateLimit({ minTimeMs: 1000 })`, so each makes at most one request per
second. The Socrata pipeline shares one client across all of its drives,
because every drive is enumerated through the same Discovery API host.
```

- [ ] **Step 2: Deferred item 6 in section 7**

Replace:

```markdown
6. Retry/backoff/throttling for the drive index pipelines' HTTP calls.
   Discovered necessary, not hypothetical: a live dry run against HDX's real
   CKAN catalog (42,000+ datasets) hit its rate limiter after ~150
   sequential requests with no `Retry-After` header. `HDX_DRIVE` stays
   `undefined` and Socrata's `CONFIGURED_DRIVES` ships empty rather than
   either being seeded with a drive this size; a deployer adding any drive
   should first confirm its real total dataset count is small enough to
   enumerate in one run without this.
```

with:

```markdown
6. Retry and backoff for the drive index pipelines' HTTP calls. Both
   pipelines are rate-limited to one request per second (section 6.6), but a
   request that is still rejected fails its drive's run: nothing retries it.
   Discovered necessary, not hypothetical: a live dry run against HDX's real
   CKAN catalog (42,000+ datasets) hit its rate limiter after ~150 sequential
   requests with no `Retry-After` header, which is why `HDX_DRIVE` stays
   `undefined`. A deployer adding any drive should first confirm its real
   total dataset count can be enumerated in one run.
```

- [ ] **Step 3: Commit**

`docs/measles-demo/open-data-catalog-architecture.md` may already carry the
uncommitted section 6.7 edit from before this plan. Commit the whole file only
if the user has said to. Otherwise stage just this task's hunks with
`git add -p docs/measles-demo/open-data-catalog-architecture.md`.

```bash
git commit -m "docs(open-data): document the rate-limited drive index pipelines"
```

---

## Task 15: Final verification

- [ ] **Step 1: Full checks**

```bash
pnpm type-check
pnpm test:modules && pnpm test:clients && pnpm test:logger && pnpm test:etl
pnpm --filter @avandar/query-hooks test
pnpm test:pipeline-server
pnpm vitest run src/clients shared
```

Expected: all pass.

- [ ] **Step 2: Confirm nothing stray is staged or left behind**

Run: `git status --short`

Expected: only the files that were dirty in Task 0. `supabase/config.toml`
stays modified and unstaged.

- [ ] **Step 3: Report**

Report to the user:

- The commits made.
- Which commits are the AVA-383 modules PR: Tasks 1 to 4, which touch only
  `packages/shared/modules`, plus Task 8's caller migration, which has to go
  with them.
- That the scratch copies under `.temp/feat-demo-measles/` (`modimpl`,
  `httpimpl`, `codemods`) can be deleted.
