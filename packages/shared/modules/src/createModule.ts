import {
  getValue,
  isFunction,
  MergeObjects,
  objectFilter,
  objectValuesMap,
  setValue,
} from "@avandar/utils";
import type {
  EmptyObject,
  ObjectPaths,
  PathValue,
  UnknownObject,
} from "@avandar/utils";
import type { Simplify } from "type-fest";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyModule = Module<any, any, any>;

export type UnknownModule = Module<string, UnknownObject, UnknownObject>;

export type NameOfModule<M extends AnyModule> =
  M extends Accessors<infer ModuleName, any, any> ? ModuleName : never;

export type StateOfModule<M extends AnyModule> =
  M extends Accessors<any, infer State, any> ? State : never;

export type MembersOfModule<M extends AnyModule> =
  M extends Module<any, any, infer Members> ? Members : never;
/* eslint-enable @typescript-eslint/no-explicit-any */

type Getters<State extends UnknownObject | EmptyObject> =
  State extends EmptyObject
    ? EmptyObject
    : {
        [K in keyof State]: () => State[K];
      };

type Setters<
  ModuleName extends string,
  State extends UnknownObject | EmptyObject,
  Members extends UnknownObject | EmptyObject,
> = State extends EmptyObject
  ? EmptyObject
  : {
      [K in keyof State]: (
        newValue: ((currentValue: State[K]) => State[K]) | State[K],
      ) => Module<ModuleName, State, Members>;
    };

/**
 * A mixin is a function that takes the previous module and returns the new
 * state and members to merge into the previous module, in order to build a new
 * module.
 */
type Mixin<
  ModuleName extends string,
  State extends UnknownObject,
  Members extends UnknownObject,
  NewState extends UnknownObject,
  NewMembers extends UnknownObject,
> = (prevModule: Module<ModuleName, State, Members>) => {
  state?: NewState;
  members?: NewMembers;
};

/**
 * Accessors are the methods that can be called on a module to get or set the
 * state of the module.
 */
export type Accessors<
  ModuleName extends string,
  State extends UnknownObject | EmptyObject,
  Members extends UnknownObject | EmptyObject,
> = MergeObjects<
  {
    /**
     * Get the internal module name. Useful for logging.
     */
    getModuleName(): ModuleName;

    /**
     * Get the current state of the module.
     */
    getState(): State;
    /**
     * Set the state of the module. This accepts a partial state object and
     * merges it with the current state. Duplicate keys will be overridden
     * by `newState` even if the value in `newState` is undefined.
     */
    setState(newState: Partial<State>): Module<ModuleName, State, Members>;

    /**
     * Set a value in the module's state given a dot-notation key path.
     *
     * The value could either be a static value or a function that returns a
     * value.
     */
    set<
      P extends ([ObjectPaths<State>] extends [never]
        ? keyof State
        : ObjectPaths<State>),
      V extends (P extends keyof State
        ? State[P]
        : P extends ObjectPaths<State>
          ? PathValue<State, P>
          : never),
    >(
      keyPath: P,
      value: ((currentValue: V) => V) | V,
    ): Module<ModuleName, State, Members>;
  },
  MergeObjects<Getters<State>, Setters<ModuleName, State, Members>>
>;

export type Module<
  ModuleName extends string = string,
  State extends UnknownObject | EmptyObject = EmptyObject,
  Members extends UnknownObject | EmptyObject = EmptyObject,
> = Simplify<
  MergeObjects<
    MergeObjects<
      Accessors<ModuleName, State, Members>,
      {
        /**
         * Mix in some new functionality, members, or state into this module to
         * produce a new module.
         *
         * The mixin function will get added to the module's `builder` function,
         * so any time the module is built it will be called with the full
         * sequence of mixins applied to it.
         *
         * @param mixinFn - The mixin function to apply to the module.
         * @returns The mixed module.
         */
        mixin<
          NewMembers extends UnknownObject = EmptyObject,
          NewState extends UnknownObject = EmptyObject,
        >(
          mixinFn: Mixin<ModuleName, State, Members, NewState, NewMembers>,
        ): Module<
          ModuleName,
          MergeObjects<State, NewState>,
          MergeObjects<Members, NewMembers>
        >;
      }
    >,
    Members
  >
>;

/**
 * Creates a composable object module.
 *
 * @param moduleName - The name of the module.
 * @param options - The options for creating the module.
 * @param options.state - The state of the module.
 * @param options.builder - A function that builds the module.
 * @returns The module.
 */
export function createModule<
  ModuleName extends string,
  State extends UnknownObject | EmptyObject = EmptyObject,
  Members extends UnknownObject | EmptyObject = EmptyObject,
  FullModule extends Module<ModuleName, State, Members> = Module<
    ModuleName,
    State,
    Members
  >,
>(
  moduleName: ModuleName,
  options: {
    state?: State;
    builder?:
      | ((
          accessors: Accessors<
            NameOfModule<FullModule>,
            StateOfModule<FullModule>,
            MembersOfModule<FullModule>
          >,
        ) => Members)
      | Members;
  } = {},
): FullModule {
  const {
    state = {} as State,
    builder = () => {
      return {} as Members;
    },
  } = options;

  // create getters and setters from state
  const getters = objectValuesMap(state, (value) => {
    return () => {
      return value;
    };
  });
  const setters = objectValuesMap(state, (_, key) => {
    return <K extends typeof key, V extends State[K]>(
      newValue: ((val: V) => V) | V,
    ) => {
      return createModule(moduleName, {
        state: {
          ...state,
          [key]: isFunction(newValue) ? newValue(state[key] as V) : newValue,
        } as State,
        builder,
      });
    };
  });

  // getters and setters for the module
  const moduleAccessors = {
    getModuleName: () => {
      return moduleName;
    },
    getState: () => {
      return state;
    },
    setState: (newState: Partial<State>) => {
      return createModule(moduleName, {
        state: { ...state, ...newState },
        builder,
      });
    },
    set: <
      P extends ([ObjectPaths<State>] extends [never]
        ? keyof State
        : ObjectPaths<State>),
      V extends (P extends keyof State
        ? State[P]
        : P extends ObjectPaths<State>
          ? PathValue<State, P>
          : never),
    >(
      keyPath: P,
      value: V | ((currentValue: V) => V),
    ) => {
      return createModule(moduleName, {
        state: setValue(
          state,
          keyPath,
          isFunction(value) ? value(getValue(state, keyPath)) : value,
        ),
        builder,
      });
    },

    ...getters,
    ...setters,
  } as unknown as Accessors<
    NameOfModule<FullModule>,
    StateOfModule<FullModule>,
    MembersOfModule<FullModule>
  >;

  const members =
    typeof builder === "function" ? builder(moduleAccessors) : builder;

  const moduleWithMembers = {
    ...moduleAccessors,
    ...members,
  } as unknown as FullModule;

  // cannot use arrow function here because we needto make sure `this` gets
  // bound to the caller
  const cumulativeMixin = function <
    NewState extends UnknownObject = EmptyObject,
    NewMembers extends UnknownObject = EmptyObject,
  >(
    this: FullModule,
    mixinFn: Mixin<ModuleName, State, Members, NewState, NewMembers>,
  ): Module<
    ModuleName,
    MergeObjects<State, NewState>,
    MergeObjects<Members, NewMembers>
  > {
    const {
      state: newState = {} as NewState,
      members: newMembers = {} as NewMembers,
      // mixinFn gets called on the `this` arg, which should be the current full
      // module so we can continue expanding the module
    } = mixinFn(this);

    const priorMembers = objectFilter(this, (key) => {
      return key !== "mixin" && !(key in moduleAccessors);
    });

    return createModule(moduleName, {
      state: {
        ...state,
        ...newState,
      } as MergeObjects<State, NewState>,
      builder: {
        ...priorMembers,
        ...newMembers,
      },
    }) as Module<
      ModuleName,
      MergeObjects<State, NewState>,
      MergeObjects<Members, NewMembers>
    >;
  };

  return {
    ...moduleWithMembers,
    mixin: cumulativeMixin,
  };
}
