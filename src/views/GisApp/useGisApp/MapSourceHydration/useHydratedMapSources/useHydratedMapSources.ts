import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { notifyWarning } from "@/utils/notifications/notify";
import { MapSourceHydration } from "../MapSourceHydration";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";

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

/**
 * Returns an `updateConfig` that hydrates the current config before applying
 * an update. Its identity only changes with the editor's own `updateConfig`:
 * map tool gestures re-attach whenever it changes, so a new function on every
 * render would drop an area or polygon mid-draw. Called by
 * `useHydratedMapSources`.
 */
function useHydratedUpdateConfig({
  updateEditorConfig,
  latestHydration,
}: Readonly<{
  updateEditorConfig: ReturnType<typeof useAvaMapEditor>["updateConfig"];
  latestHydration: {
    previousInput: AvaMapConfig.T;
    previousConfig: AvaMapConfig.T;
    readyColumns: readonly DatasetColumn.T[] | undefined;
    readyAttributes: readonly ConceptAttribute.T[] | undefined;
  };
}>): ReturnType<typeof useAvaMapEditor>["updateConfig"] {
  const { previousInput, previousConfig, readyColumns, readyAttributes } =
    latestHydration;
  // The callback reads the latest hydration inputs from this ref, so it does
  // not need them as dependencies.
  const hydrationRef = useRef(latestHydration);
  useEffect(
    function syncLatestHydration() {
      hydrationRef.current = {
        previousInput,
        previousConfig,
        readyColumns,
        readyAttributes,
      };
    },
    [previousInput, previousConfig, readyColumns, readyAttributes],
  );
  return useCallback(
    (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
      return updateEditorConfig((config) => {
        const hydrationInputs = hydrationRef.current;
        const hydrated = MapSourceHydration.fromMetadata({
          config,
          previousInput: hydrationInputs.previousInput,
          previousConfig: hydrationInputs.previousConfig,
          datasetColumns: hydrationInputs.readyColumns,
          conceptAttributes: hydrationInputs.readyAttributes,
        }).config;
        const updated = update(hydrated);
        return updated === hydrated ? config : updated;
      });
    },
    [updateEditorConfig],
  );
}

/**
 * Wraps the map editor so its `mapConfig` carries every layer's source
 * columns and filters hydrated from the workspace's column metadata, and its
 * `updateConfig` edits that hydrated config. Map queries and the inspector
 * then read the same source columns. Warns when hydration drops a filter.
 * Called by `useGisAppState`.
 */
export function useHydratedMapSources({
  editor,
  workspaceId,
}: Readonly<{
  editor: ReturnType<typeof useAvaMapEditor>;
  workspaceId: Workspace.Id;
}>): ReturnType<typeof useAvaMapEditor> {
  const { readyColumns, readyAttributes } = useReadyMapMetadata({
    config: editor.mapConfig,
    workspaceId: workspaceId,
  });
  const result = useMapSourceHydration({
    config: editor.mapConfig,
    readyColumns: readyColumns,
    readyAttributes: readyAttributes,
  });
  useMissingFilterNotification(result.issues);
  const updateConfig = useHydratedUpdateConfig({
    updateEditorConfig: editor.updateConfig,
    latestHydration: {
      previousInput: editor.mapConfig,
      previousConfig: result.config,
      readyColumns,
      readyAttributes,
    },
  });
  return { ...editor, mapConfig: result.config, updateConfig };
}
