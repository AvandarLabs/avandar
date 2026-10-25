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
