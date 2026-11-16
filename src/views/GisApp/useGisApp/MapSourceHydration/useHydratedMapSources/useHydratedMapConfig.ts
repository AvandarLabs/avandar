import { where } from "@avandar/utils";
import { useState } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { MapSourceHydration } from "../MapSourceHydration";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

/** A config hydrated from workspace metadata, plus the metadata it used. */
export type HydratedMapConfig = ReturnType<
  typeof MapSourceHydration.fromMetadata
> & {
  readyColumns: DatasetColumn.T[] | undefined;
  readyAttributes: ConceptAttribute.T[] | undefined;
};

function useReadyMapMetadata({
  config,
  workspaceId,
}: {
  config: AvaMapConfig.T;
  workspaceId: Workspace.Id;
}): {
  readyColumns: DatasetColumn.T[] | undefined;
  readyAttributes: ConceptAttribute.T[] | undefined;
} {
  const [datasetColumns, , datasetQuery] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [conceptAttributes, , conceptQuery] = ConceptAttributeClient.useGetAll({
    ...where("workspace_id", "eq", workspaceId),
    useQueryOptions: {
      enabled: config.layers.some((layer) => {
        return layer.source.dataSource?.__type === "Concept";
      }),
    },
  });
  const readyColumns = datasetQuery?.isSuccess ? datasetColumns : undefined;
  const readyAttributes = conceptQuery?.isSuccess
    ? conceptAttributes
    : undefined;
  return { readyColumns, readyAttributes };
}

function useMapSourceHydration({
  config,
  readyColumns,
  readyAttributes,
}: {
  config: AvaMapConfig.T;
  readyColumns: readonly DatasetColumn.T[] | undefined;
  readyAttributes: readonly ConceptAttribute.T[] | undefined;
}): ReturnType<typeof MapSourceHydration.fromMetadata> {
  const [previousHydrationState, setPreviousHydrationState] = useState(() => {
    return {
      input: config,
      readyColumns,
      readyAttributes,
      result: MapSourceHydration.fromMetadata({
        config: config,
        datasetColumns: readyColumns,
        conceptAttributes: readyAttributes,
      }),
    };
  });
  let result = previousHydrationState.result;
  if (
    previousHydrationState.input !== config ||
    previousHydrationState.readyColumns !== readyColumns ||
    previousHydrationState.readyAttributes !== readyAttributes
  ) {
    result = MapSourceHydration.fromMetadata({
      config: config,
      previousInput: previousHydrationState.input,
      previousConfig: previousHydrationState.result.config,
      datasetColumns: readyColumns,
      conceptAttributes: readyAttributes,
    });
    setPreviousHydrationState({
      input: config,
      readyColumns,
      readyAttributes,
      result,
    });
  }
  return result;
}

/**
 * Hydrates a map config's layer sources from the workspace's column
 * metadata, with no editor attached. The GIS editor and the read-only map
 * viewer both hydrate through this, so their layer queries match.
 */
export function useHydratedMapConfig(
  options: Readonly<{ config: AvaMapConfig.T; workspaceId: Workspace.Id }>,
): HydratedMapConfig {
  const { readyColumns, readyAttributes } = useReadyMapMetadata(options);
  const result = useMapSourceHydration({
    config: options.config,
    readyColumns,
    readyAttributes,
  });
  return { ...result, readyColumns, readyAttributes };
}
