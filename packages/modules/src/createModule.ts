import type { EmptyObject, UnknownObject } from "@avandar/utils";
import type { Simplify } from "type-fest";

/**
 * Merges two objects together, where its possible for either to be empty
 * objects.
 *
 * This is the recommended way to merge full modules, or members of a module,
 * together.
 */
export type MergeMembers<
  Members extends UnknownObject | EmptyObject,
  NewMembers extends UnknownObject | EmptyObject,
> =
  Members extends EmptyObject ?
    NewMembers extends EmptyObject ?
      EmptyObject
    : NewMembers
  : NewMembers extends EmptyObject ? Members
  : Members & NewMembers;

type Mixin<
  ModuleName extends string,
  Members extends UnknownObject,
  State extends UnknownObject,
  NewMembers extends UnknownObject,
> = (context: { module: Module<ModuleName, Members, State> }) => NewMembers;

export type BaseModule<
  ModuleName extends string = string,
  State extends UnknownObject = EmptyObject,
> = {
  /**
   * Get the internal module name. Useful for logging.
   */
  getModuleName(): ModuleName;

  /**
   * Get the current state of the module.
   */
  getState(): State;
};

export type Module<
  ModuleName extends string = string,
  Members extends UnknownObject = EmptyObject,
  State extends UnknownObject = EmptyObject,
> = MergeMembers<
  BaseModule<ModuleName, State> & {
    /**
     * Mix in a new set of properties into the module.
     *
     * @param mixin - The mixin function to apply to the module.
     * @returns The mixed module.
     */
    mixin<NewMembers extends UnknownObject>(
      mixin: Mixin<ModuleName, Members, State, NewMembers>,
    ): Module<ModuleName, MergeMembers<Members, NewMembers>, State>;
  },
  Members
>;

function _createBaseModule<
  ModuleName extends string,
  State extends UnknownObject,
>(moduleName: ModuleName, state: State): BaseModule<ModuleName, State> {
  return {
    getModuleName: () => {
      return moduleName;
    },
    getState: () => {
      return state;
    },
  };
}

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
  Members extends UnknownObject = EmptyObject,
  State extends UnknownObject = EmptyObject,
>(
  moduleName: ModuleName,
  options: {
    state?: State;
    builder?: (context: { module: BaseModule<ModuleName, State> }) => Members;
  } = {},
): Simplify<Module<ModuleName, Members, State>> {
  const {
    state = {} as State,
    builder = () => {
      return {};
    },
  } = options;

  const baseModule = _createBaseModule(moduleName, state);
  const initialMembers = builder({ module: baseModule });

  const mergedModule = {
    ...baseModule,
    ...initialMembers,
    mixin: <NewMembers extends UnknownObject>(
      mixin: Mixin<ModuleName, Members, State, NewMembers>,
    ): Module<ModuleName, MergeMembers<Members, NewMembers>, State> => {
      const newMembers = mixin({
        module: mergedModule,
      });
      return {
        ...mergedModule,
        ...newMembers,
      } as Module<ModuleName, MergeMembers<Members, NewMembers>, State>;
    },
  } as Module<ModuleName, Members, State>;

  return mergedModule;
}
