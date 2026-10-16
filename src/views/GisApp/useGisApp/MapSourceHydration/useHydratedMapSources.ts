import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { notifyWarning } from "@/utils/notifications/notify";
import { MapSourceHydration } from "./MapSourceHydration";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";

/** Shares ready source catalogs across map execution and the inspector. */
export function useHydratedMapSources(
  editor: ReturnType<typeof useAvaMapEditor>,
  workspaceId: Workspace.Id,
): ReturnType<typeof useAvaMapEditor> {
  const { readyColumns, readyAttributes } = useReadyMapMetadata(
    editor.mapConfig,
    workspaceId,
  );
  const result = useMapSourceHydration(
    editor.mapConfig,
    readyColumns,
    readyAttributes,
  );
  useMissingFilterNotification(result.issues);
  return {
    ...editor,
    mapConfig: result.config,
    updateConfig: (update) => {
      return editor.updateConfig((config) => {
        const hydrated = MapSourceHydration.fromMetadata({
          config,
          previousInput: editor.mapConfig,
          previousConfig: result.config,
          datasetColumns: readyColumns,
          conceptAttributes: readyAttributes,
        }).config;
        const updated = update(hydrated);
        return updated === hydrated ? config : updated;
      });
    },
  };
}

function useReadyMapMetadata(
  config: AvaMapConfig.T,
  workspaceId: Workspace.Id,
) {
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

function useMapSourceHydration(
  config: AvaMapConfig.T,
  readyColumns: readonly DatasetColumn.T[] | undefined,
  readyAttributes: readonly ConceptAttribute.T[] | undefined,
): ReturnType<typeof MapSourceHydration.fromMetadata> {
  const [previous, setPrevious] = useState(() => {
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
  let result = previous.result;
  if (
    previous.input !== config ||
    previous.readyColumns !== readyColumns ||
    previous.readyAttributes !== readyAttributes
  ) {
    result = MapSourceHydration.fromMetadata({
      config: config,
      previousInput: previous.input,
      previousConfig: previous.result.config,
      datasetColumns: readyColumns,
      conceptAttributes: readyAttributes,
    });
    setPrevious({
      input: config,
      readyColumns,
      readyAttributes,
      result,
    });
  }
  return result;
}

function useMissingFilterNotification(
  issues: ReturnType<typeof MapSourceHydration.fromMetadata>["issues"],
): void {
  const { t } = useLingui();
  const issueKey = JSON.stringify(issues);
  useEffect(
    function reportMissingMapFilters() {
      if (issueKey !== "[]") {
        notifyWarning({
          title: t`Some filters were removed`,
          message: t`They referenced columns this data source does not have.`,
        });
      }
    },
    [issueKey, t],
  );
}
