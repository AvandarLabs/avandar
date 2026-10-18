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
 * Members on `receiver` that `builtModule` does not have. These were attached
 * by spreading the module into a new object, outside the mixin system. Throws
 * when the receiver replaces an existing member, because that override would
 * be lost on the next rebuild.
 */
function _findCarriedMembers(params: {
  moduleName: string;
  builtModule: UnknownObject;
  receiver: unknown;
}): UnknownObject | undefined {
  const { moduleName, builtModule, receiver } = params;
  if (
    typeof receiver !== "object" ||
    receiver === null ||
    receiver === builtModule
  ) {
    return undefined;
  }
  const receiverEntries = Object.entries(receiver);
  const replacedEntry = receiverEntries.find(([key, value]) => {
    return key in builtModule && builtModule[key] !== value;
  });
  if (replacedEntry !== undefined) {
    throw new Error(
      `Module "${moduleName}" member "${replacedEntry[0]}" was replaced by spreading; use a mixin to override members`,
    );
  }
  const carriedEntries = receiverEntries.filter(([key]) => {
    return !(key in builtModule);
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
  const carriedMembers = _findCarriedMembers({
    moduleName: recipe.moduleName,
    builtModule,
    receiver,
  });
  const layersSoFar: readonly ModuleLayer[] =
    carriedMembers === undefined
      ? recipe.layers
      : [...recipe.layers, { type: "carried", members: carriedMembers }];
  const base =
    carriedMembers === undefined
      ? builtModule
      : Object.freeze({ ...builtModule, ...carriedMembers });
  const { state: mixinState = {} } = mixinFn(base);
  const mergedState = { ...recipe.state, ...mixinState };
  assertNoReservedStateKeys(recipe.moduleName, mergedState);
  return buildModuleFromRecipe({
    moduleName: recipe.moduleName,
    state: mergedState,
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

/**
 * Throws when `state` has a key whose accessors would be reserved names. An
 * empty-string key is rejected too, since it would generate `get` and `set`.
 */
export function assertNoReservedStateKeys(
  moduleName: string,
  state: UnknownObject,
): void {
  const reservedKey = Object.keys(state).find((key) => {
    return key === "" || RESERVED_STATE_KEYS.has(key);
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
