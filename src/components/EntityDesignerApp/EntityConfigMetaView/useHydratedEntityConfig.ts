import { useMemo } from "react";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { EntityConfig } from "@/models/EntityConfig/types";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";

/**
 * Given an entity config, finish hydrating it.
 *
 * We query for its fields and value extractors and add them to the config.
 *
 * @param options
 * @param options.entityConfig
 */
export function useHydratedEntityConfig({
  entityConfig,
}: {
  entityConfig: EntityConfig;
}): [
  EntityConfig<"Full">,
  {
    isLoadingFields: boolean;
    isLoadingDataset: boolean;
    isLoadingValueExtractors: boolean;
  },
] {
  const [entityFields, isLoadingFields] = EntityFieldConfigClient.useGetAll({
    where: { entity_config_id: { eq: entityConfig.id } },
  });

  const [localDataset, isLoadingDataset] = LocalDatasetClient.useGetById({
    id: entityConfig.datasetId,
  });

  const [valueExtractors, isLoadingValueExtractors] =
    EntityFieldConfigClient.useGetAllValueExtractors({
      fields: entityFields,
      useQueryOptions: {
        enabled: !!entityFields,
      },
    });

  const hydratedEntityConfig: EntityConfig<"Full"> = useMemo(() => {
    return {
      ...entityConfig,
      dataset: localDataset,
      fields: entityFields?.map((field) => {
        const { valueExtractorType } = field.options;
        const valueExtractor = valueExtractors?.find((extractor) => {
          return extractor.entityFieldConfigId === field.id;
        });

        return {
          ...field,
          valueExtractorType,
          valueExtractor,
        };
      }),
    };
  }, [entityConfig, localDataset, entityFields, valueExtractors]);

  return [
    hydratedEntityConfig,
    {
      isLoadingFields,
      isLoadingDataset,
      isLoadingValueExtractors,
    },
  ];
}
