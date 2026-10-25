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
