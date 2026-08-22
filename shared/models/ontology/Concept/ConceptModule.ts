import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types.ts";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types.ts";
import type { ConceptAttributeModel } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { AnyFunction, AnyFunctionWithArguments } from "@avandar/utils";
import type { Simplify } from "type-fest";

import { assertIsDefined, objectKeys } from "@avandar/utils";

type ConceptAttributeWithMapping = ConceptAttributeModel["Read"] & {
  mapping: AttributeMapping;
};

type IConceptUtils = {
  getLabelAttribute(concept: BuildableConcept): ConceptAttributeWithMapping;
  getIdentifierAttributes(
    concept: BuildableConcept,
  ): ConceptAttributeWithMapping[];
};

type WithBind<U extends IConceptUtils> = U & {
  bind: (concept: BuildableConcept) => BindWithConcept<U>;
};

type BindWithConcept<U extends IConceptUtils> = Simplify<{
  [K in keyof U]: U[K] extends AnyFunctionWithArguments<infer Args>
    ? Args extends [BuildableConcept, ...infer Rest]
      ? (...args: Rest) => ReturnType<U[K]>
      : never
    : never;
}>;

const boundModuleCache = new WeakMap<
  BuildableConcept,
  BindWithConcept<IConceptUtils>
>();

// TODO(jpsyx): this is overkill. Don't use a composed module pattern here.
// Just use a simple object with functions.
function createConceptModule(): WithBind<IConceptUtils> {
  const module: IConceptUtils = {
    getLabelAttribute: (
      concept: BuildableConcept,
    ): ConceptAttributeWithMapping => {
      const labelAttribute = concept.attributes.find((attribute) => {
        return attribute.isLabel;
      })!;
      assertIsDefined(
        labelAttribute,
        `Concept ${concept.name} does not have a label attribute`,
      );
      return labelAttribute;
    },

    getIdentifierAttributes: (
      concept: BuildableConcept,
    ): ConceptAttributeWithMapping[] => {
      return concept.attributes.filter((attribute) => {
        return attribute.isIdentifier;
      });
    },
  };

  return {
    ...module,
    bind: (concept: BuildableConcept): BindWithConcept<IConceptUtils> => {
      if (boundModuleCache.has(concept)) {
        return boundModuleCache.get(concept)!;
      }

      const moduleKeys = objectKeys(module);

      const boundModule = {} as BindWithConcept<IConceptUtils>;
      for (const moduleKey of moduleKeys) {
        const moduleMember = module[moduleKey];
        if (typeof moduleMember === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          boundModule[moduleKey] = (...args: readonly unknown[]): any => {
            return (moduleMember as AnyFunction)(concept, ...args);
          };
        }
      }

      boundModuleCache.set(concept, boundModule);
      return boundModule;
    },
  };
}

export const ConceptModule = createConceptModule();
