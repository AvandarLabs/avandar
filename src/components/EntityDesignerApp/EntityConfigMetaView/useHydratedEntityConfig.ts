import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { where } from "@/lib/utils/filters/filters";
import { DatasetId } from "@/models/datasets/Dataset";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig.types";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";

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
  const [entityFields, isLoadingFields] = EntityFieldConfigClient.useGetAll(
    where("entity_config_id", "eq", entityConfig.id),
  );

  const [valueExtractors, isLoadingValueExtractors] = EntityFieldConfigClient
    .useGetAllValueExtractors({
      fields: entityFields,
      useQueryOptions: {
        enabled: !!entityFields,
      },
    });

  const datasetsToLoad = useMemo(() => {
    const datasetIds = new Set<DatasetId>();
    valueExtractors?.forEach((extractor) => {
      if (extractor.type === "dataset_column_value") {
        datasetIds.add(extractor.datasetId);
      }
    });
    return [...datasetIds];
  }, [valueExtractors]);

  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("id", "in", datasetsToLoad),
    useQueryOptions: {
      enabled: datasetsToLoad.length > 0,
    },
  });

  const hydratedEntityConfig: EntityConfig<"Full"> = useMemo(() => {
    return {
      ...entityConfig,
      datasets,
      fields: entityFields?.map((field) => {
        const { valueExtractorType } = field;
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
  }, [entityConfig, datasets, entityFields, valueExtractors]);

  return [
    hydratedEntityConfig,
    {
      isLoadingFields,
      isLoadingDatasets,
      isLoadingValueExtractors,
    },
  ];
}
