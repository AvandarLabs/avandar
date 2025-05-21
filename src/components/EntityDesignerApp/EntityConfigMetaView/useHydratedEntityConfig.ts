import { useMemo } from "react";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { EntityConfig } from "@/models/EntityConfig/types";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetId } from "@/models/LocalDataset/types";

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
    isLoadingDatasets: boolean;
    isLoadingValueExtractors: boolean;
  },
] {
  const [entityFields, isLoadingFields] = EntityFieldConfigClient.useGetAll({
    where: { entity_config_id: { eq: entityConfig.id } },
  });

  const [valueExtractors, isLoadingValueExtractors] =
    EntityFieldConfigClient.useGetAllValueExtractors({
      fields: entityFields,
      useQueryOptions: {
        enabled: !!entityFields,
      },
    });

  const datasetsToLoad = useMemo(() => {
    const datasetIds = new Set<LocalDatasetId>();
    valueExtractors?.forEach((extractor) => {
      if (extractor.type === "dataset_column_value") {
        datasetIds.add(extractor.datasetId);
      }
    });
    return [...datasetIds];
  }, [valueExtractors]);

  const [localDatasets, isLoadingDatasets] = LocalDatasetClient.useGetAll({
    where: { id: { in: datasetsToLoad } },
    useQueryOptions: {
      enabled: datasetsToLoad.length > 0,
    },
  });

  const hydratedEntityConfig: EntityConfig<"Full"> = useMemo(() => {
    return {
      ...entityConfig,
      datasets: localDatasets,
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
  }, [entityConfig, localDatasets, entityFields, valueExtractors]);

  return [
    hydratedEntityConfig,
    {
      isLoadingFields,
      isLoadingDatasets,
      isLoadingValueExtractors,
    },
  ];
}
