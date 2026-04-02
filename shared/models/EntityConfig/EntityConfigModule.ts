import { assertIsDefined } from "@utils/asserts/assertIsDefined/assertIsDefined.ts";
import { objectKeys } from "@utils/objects/objectKeys.ts";
import type {
  AnyFunction,
  AnyFunctionWithArguments,
} from "@utils/types/utilities.types.ts";
import type { BuildableEntityConfig } from "$/models/EntityConfig/EntityConfig.types.ts";
import type { EntityFieldConfigModel } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type { EntityFieldValueExtractor } from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types.ts";
import type { Simplify } from "type-fest";

type EntityFieldConfigWithValueExtractor = EntityFieldConfigModel["Read"] & {
  valueExtractor: EntityFieldValueExtractor;
};

type IEntityConfigUtils = {
  getTitleField(
    entityConfig: BuildableEntityConfig,
  ): EntityFieldConfigWithValueExtractor;
  getIdFields(
    entityConfig: BuildableEntityConfig,
  ): EntityFieldConfigWithValueExtractor[];
};

type WithBind<U extends IEntityConfigUtils> = U & {
  bind: (entityConfig: BuildableEntityConfig) => BindWithEntityConfig<U>;
};

type BindWithEntityConfig<U extends IEntityConfigUtils> = Simplify<{
  [K in keyof U]: U[K] extends AnyFunctionWithArguments<infer Args> ?
    Args extends [BuildableEntityConfig, ...infer Rest] ?
      (...args: Rest) => ReturnType<U[K]>
    : never
  : never;
}>;

const boundModuleCache = new WeakMap<
  BuildableEntityConfig,
  BindWithEntityConfig<IEntityConfigUtils>
>();

// TODO(jpsyx): this is overkill. Don't use a composed module pattern here.
// Just use a simple object with functions.
function createEntityConfigModule(): WithBind<IEntityConfigUtils> {
  const module: IEntityConfigUtils = {
    getTitleField: (
      entityConfig: BuildableEntityConfig,
    ): EntityFieldConfigWithValueExtractor => {
      const titleField = entityConfig.fields.find((field) => {
        return field.isTitleField;
      })!;
      assertIsDefined(
        titleField,
        `Entity ${entityConfig.name} does not have a title field`,
      );
      return titleField;
    },

    getIdFields: (
      entityConfig: BuildableEntityConfig,
    ): EntityFieldConfigWithValueExtractor[] => {
      return entityConfig.fields.filter((field) => {
        return field.isIdField;
      });
    },
  };

  return {
    ...module,
    bind: (
      entityConfig: BuildableEntityConfig,
    ): BindWithEntityConfig<IEntityConfigUtils> => {
      if (boundModuleCache.has(entityConfig)) {
        return boundModuleCache.get(entityConfig)!;
      }

      const moduleKeys = objectKeys(module);

      const boundModule = {} as BindWithEntityConfig<IEntityConfigUtils>;
      for (const moduleKey of moduleKeys) {
        const moduleMember = module[moduleKey];
        if (typeof moduleMember === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          boundModule[moduleKey] = (...args: readonly unknown[]): any => {
            return (moduleMember as AnyFunction)(entityConfig, ...args);
          };
        }
      }

      boundModuleCache.set(entityConfig, boundModule);
      return boundModule;
    },
  };
}

export const EntityConfigModule = createEntityConfigModule();
