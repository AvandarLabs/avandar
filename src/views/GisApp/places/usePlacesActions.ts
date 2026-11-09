import { useMutation } from "@avandar/query-hooks";
import { propEq, where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { PlaceRowEdits } from "@/clients/places/PlaceRowEdits/PlaceRowEdits";
import { PLACES_MAX_ROWS } from "@/clients/places/places.constants";
import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { createPlacesLayer } from "@/views/GisApp/places/createPlacesLayer/createPlacesLayer";
import { refreshPlacesDatasetCaches } from "@/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches";
import { usePlacesErrorMessage } from "@/views/GisApp/places/usePlacesErrorMessage";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { PlaceEditResult } from "@/clients/places/PlaceRowEdits/PlaceRowEdits";
import type { PlaceInput, PlaceRow } from "@/clients/places/places.types";
import type {
  PlaceFeatureTarget,
  PlaceToolController,
} from "@/views/GisApp/places/PlaceTool.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

type PlacesSession = {
  workspaceId: Workspace.Id;
  userId: User.Id;
};

type SavePlaceVariables = {
  datasetId: Dataset.Id;
  placeId: string | undefined;
  input: PlaceInput;
};

type LoadPlaceVariables = {
  target: PlaceFeatureTarget;
  mode: "edit" | "move";
};

function usePlacesSession(app: GisAppState): PlacesSession {
  const user = useCurrentUser();
  return {
    workspaceId: app.avaMap.workspaceId,
    userId: user!.id as User.Id,
  };
}

function _addLayer(app: GisAppState, layer: MapLayer.T): void {
  app.updateConfig((current) => {
    return AvaMapConfig.withLayerAdded({ config: current, layer });
  });
  app.setSelectedLayerId(layer.id);
}

/**
 * Reads the rows, applies one edit, and writes them back when it applied.
 * The refresh goes through `AvaQueryClient` because that is the client QETL
 * caches `raw_sql` in (`VirtualDatasetClient.withCache(AvaQueryClient)`), so
 * dropping it anywhere else would leave the old places on the map.
 */
async function _editPlaces(
  options: Readonly<{
    session: PlacesSession;
    datasetId: Dataset.Id;
    edit: (rows: readonly PlaceRow[]) => PlaceEditResult;
  }>,
): Promise<PlaceEditResult["type"]> {
  const { session, datasetId } = options;
  const target = {
    workspaceId: session.workspaceId,
    userId: session.userId,
    datasetId,
  };
  const result = options.edit(await PlacesStore.readPlaces(target));
  if (result.type !== "ok") {
    return result.type;
  }
  await PlacesStore.writePlaces({ ...target, rows: result.rows });
  await refreshPlacesDatasetCaches({ ...target, queryClient: AvaQueryClient });
  return "ok";
}

function _applySave(
  variables: SavePlaceVariables,
): (rows: readonly PlaceRow[]) => PlaceEditResult {
  return (rows) => {
    return variables.placeId === undefined
      ? PlaceRowEdits.withPlaceAdded({
          rows,
          placeId: uuid(),
          place: variables.input,
        })
      : PlaceRowEdits.withPlaceReplaced({
          rows,
          placeId: variables.placeId,
          place: variables.input,
        });
  };
}

function useCreatePlacesDataset(
  app: GisAppState,
  session: PlacesSession,
): UseMutationResultTuple<MapLayer.T, string> {
  const { t } = useLingui();
  const toErrorMessage = usePlacesErrorMessage();
  return useMutation({
    mutationFn: async (datasetName: string): Promise<MapLayer.T> => {
      const dataset = await PlacesStore.createPlacesDataset({
        workspaceId: session.workspaceId,
        userId: session.userId,
        datasetName,
      });
      const datasetColumns = await DatasetColumnClient.getAll(
        where("dataset_id", "eq", dataset.id),
      );
      return createPlacesLayer({ dataset, datasetColumns });
    },
    queriesToInvalidate: [
      DatasetClient.QueryKeys.getAll(),
      DatasetColumnClient.QueryKeys.getAll(),
      [VirtualDatasetClient.getClientName()],
    ],
    onSuccess: (layer) => {
      _addLayer(app, layer);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Places dataset creation failed" });
      notifyError(
        toErrorMessage(error, t`Could not create the places dataset.`),
      );
    },
  });
}

function useSavePlace(
  app: GisAppState,
  session: PlacesSession,
): UseMutationResultTuple<PlaceEditResult["type"], SavePlaceVariables> {
  const { t } = useLingui();
  const toErrorMessage = usePlacesErrorMessage();
  const maxPlaces = PLACES_MAX_ROWS;
  return useMutation({
    mutationFn: async (variables: SavePlaceVariables) => {
      return await _editPlaces({
        session,
        datasetId: variables.datasetId,
        edit: _applySave(variables),
      });
    },
    onSuccess: (outcome) => {
      if (outcome === "ok") {
        notifySuccess(t`Place saved.`);
        app.placeToolState.close();
        return;
      }
      notifyError(
        outcome === "limitReached"
          ? t`A places dataset holds at most ${maxPlaces} places.`
          : t`This place no longer exists. Someone may have deleted it.`,
      );
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Saving a place failed" });
      notifyError(toErrorMessage(error, t`Could not save the place.`));
    },
  });
}

function useDeletePlace(
  session: PlacesSession,
): UseMutationResultTuple<PlaceEditResult["type"], PlaceFeatureTarget> {
  const { t } = useLingui();
  const toErrorMessage = usePlacesErrorMessage();
  return useMutation({
    mutationFn: async (target: PlaceFeatureTarget) => {
      return await _editPlaces({
        session,
        datasetId: target.datasetId,
        edit: (rows) => {
          return PlaceRowEdits.withPlaceRemoved({
            rows,
            placeId: target.placeId,
          });
        },
      });
    },
    onSuccess: (outcome) => {
      notifySuccess(
        outcome === "ok"
          ? t`Place deleted.`
          : t`This place was already deleted.`,
      );
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Deleting a place failed" });
      notifyError(toErrorMessage(error, t`Could not delete the place.`));
    },
  });
}

function useLoadPlace(
  app: GisAppState,
  session: PlacesSession,
): UseMutationResultTuple<PlaceRow | undefined, LoadPlaceVariables> {
  const { t } = useLingui();
  const toErrorMessage = usePlacesErrorMessage();
  return useMutation({
    mutationFn: async (variables: LoadPlaceVariables) => {
      const rows = await PlacesStore.readPlaces({
        workspaceId: session.workspaceId,
        userId: session.userId,
        datasetId: variables.target.datasetId,
      });
      return rows.find(propEq("placeId", variables.target.placeId));
    },
    onSuccess: (row, { target, mode }) => {
      if (!row) {
        notifyError(
          t`This place no longer exists. Someone may have deleted it.`,
        );
        return;
      }
      app.closeInspector();
      const openDraft =
        mode === "edit"
          ? app.placeToolState.startEdit
          : app.placeToolState.startMove;
      openDraft({ datasetId: target.datasetId, row });
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Loading a place failed" });
      notifyError(toErrorMessage(error, t`Could not open the place.`));
    },
  });
}

/**
 * The place tool's writes: create a places dataset, show one on the map,
 * save a place, and the inspector's Edit, Move, and Delete. Used only by
 * `usePlaceTool`.
 */
export function usePlacesActions(
  options: Readonly<{
    app: GisAppState;
    datasets: readonly Dataset.T[];
    datasetColumns: readonly DatasetColumn.T[];
    placesDatasetIds: ReadonlySet<Dataset.Id>;
    targetDatasetId: Dataset.Id | undefined;
  }>,
): Pick<
  PlaceToolController,
  | "isSaving"
  | "createPlacesDataset"
  | "addPlacesLayer"
  | "savePlace"
  | "featureActions"
> {
  const { app } = options;
  const session = usePlacesSession(app);
  const [createDataset, isCreating] = useCreatePlacesDataset(app, session);
  const [savePlace, isSavingPlace] = useSavePlace(app, session);
  const [deletePlace, isDeleting] = useDeletePlace(session);
  const [loadPlace, isLoading] = useLoadPlace(app, session);
  return {
    isSaving: isCreating || isSavingPlace || isDeleting || isLoading,
    createPlacesDataset: createDataset,
    addPlacesLayer: (datasetId) => {
      const dataset = options.datasets.find(propEq("id", datasetId));
      if (dataset) {
        _addLayer(
          app,
          createPlacesLayer({
            dataset,
            datasetColumns: options.datasetColumns,
          }),
        );
      }
    },
    savePlace: (input) => {
      const draft = app.placeToolState.draft;
      const datasetId = draft?.datasetId ?? options.targetDatasetId;
      if (draft && datasetId) {
        savePlace({ datasetId, placeId: draft.placeId, input });
      }
    },
    featureActions: {
      placesDatasetIds: options.placesDatasetIds,
      onEdit: (target) => {
        loadPlace({ target, mode: "edit" });
      },
      onMove: (target) => {
        loadPlace({ target, mode: "move" });
      },
      onDelete: (target) => {
        deletePlace(target);
      },
    },
  };
}
