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
