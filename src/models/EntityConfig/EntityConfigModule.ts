import { Simplify } from "type-fest";
import {
  AnyFunction,
  AnyFunctionWithArguments,
} from "@/lib/types/utilityTypes";
import { assertIsDefined } from "@/lib/utils/asserts";
import { objectKeys } from "@/lib/utils/objects/misc";
import { BuildableEntityConfig, EntityConfig } from "./EntityConfig.types";
import { EntityFieldConfig } from "./EntityFieldConfig/types";
import { EntityFieldValueExtractor } from "./ValueExtractor/types";

type EntityFieldConfigWithValueExtractor = EntityFieldConfig & {
  valueExtractor: EntityFieldValueExtractor;
};

type IEntityConfigModule = {
  getTitleField(
    entityConfig: BuildableEntityConfig,
  ): EntityFieldConfigWithValueExtractor;
  getIdFields(
    entityConfig: BuildableEntityConfig,
  ): EntityFieldConfigWithValueExtractor[];
};

type WithBind<M extends IEntityConfigModule> = M & {
  bind: (entityConfig: BuildableEntityConfig) => BindWithEntityConfig<M>;
};

type BindWithEntityConfig<M extends IEntityConfigModule> = Simplify<{
  [K in keyof M]: M[K] extends AnyFunctionWithArguments<infer Args> ?
    Args extends [EntityConfig, ...infer Rest] ?
      (...args: Rest) => ReturnType<M[K]>
    : never
  : never;
}>;

const boundModuleCache = new WeakMap<
  BuildableEntityConfig,
  BindWithEntityConfig<IEntityConfigModule>
>();

function createEntityConfigModule(): WithBind<IEntityConfigModule> {
  const module: IEntityConfigModule = {
    getTitleField: (
      entityConfig: BuildableEntityConfig,
    ): EntityFieldConfigWithValueExtractor => {
      const titleField = entityConfig.fields.find((field) => {
        return field.options.isTitleField;
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
        return field.options.isIdField;
      });
    },
  };

  return {
    ...module,
    bind: (
      entityConfig: BuildableEntityConfig,
    ): BindWithEntityConfig<IEntityConfigModule> => {
      if (boundModuleCache.has(entityConfig)) {
        return boundModuleCache.get(entityConfig)!;
      }

      const moduleKeys = objectKeys(module);

      const boundModule = {} as BindWithEntityConfig<IEntityConfigModule>;
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
