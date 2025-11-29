import {
  AnyFunction,
  AnyFunctionWithArguments,
} from "$/lib/types/utilityTypes";
import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys";
import { Simplify } from "type-fest";
import { assertIsDefined } from "@/lib/utils/asserts";
import { BuildableEntityConfig, EntityConfig } from "./EntityConfig.types";
import { EntityFieldConfig } from "./EntityFieldConfig/EntityFieldConfig.types";
import { EntityFieldValueExtractor } from "./ValueExtractor/types";

type EntityFieldConfigWithValueExtractor = EntityFieldConfig & {
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
    Args extends [EntityConfig, ...infer Rest] ?
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
