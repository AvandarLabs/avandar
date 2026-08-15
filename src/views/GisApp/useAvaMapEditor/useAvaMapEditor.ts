import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dispatch, RefObject, SetStateAction } from "react";

/** What the top bar's indicator reports about persistence. */
export type MapSaveState = "saved" | "saving" | "unsaved" | "failed";

/** How long editing pauses before a save runs, in ms. */
const AUTOSAVE_DELAY_MS = 800;

type AvaMapEditor = {
  name: string;
  mapConfig: AvaMapConfig.T;
  saveState: MapSaveState;
  updateName: (name: string) => void;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  saveNow: () => void;
};

type PendingMapState = { name: string; mapConfig: AvaMapConfig.T };

type SaveQueueState = {
  editCount: number;
  updatedAt: string;
  requestedRevision: number;
  savedRevision: number;
  isSaveRunning: boolean;
  isMounted: boolean;
};

type MapSaveController = {
  markEdited: () => void;
  pendingRef: RefObject<PendingMapState>;
  saveNow: () => void;
  saveState: MapSaveState;
};

type MapDraftController = Pick<
  AvaMapEditor,
  "mapConfig" | "name" | "updateConfig" | "updateName"
>;

type DrainSaveQueueInput = {
  avaMapId: AvaMap.Id;
  pendingRef: RefObject<PendingMapState>;
  saveQueueRef: RefObject<SaveQueueState>;
  setSaveState: Dispatch<SetStateAction<MapSaveState>>;
};

/** Drains all requested revisions without overlapping persistence calls. */
async function _drainSaveQueue(options: DrainSaveQueueInput): Promise<void> {
  const queue = options.saveQueueRef.current;
  const revisionAtStart = queue.editCount;
  const pendingAtStart = options.pendingRef.current;
  if (queue.isMounted) {
    options.setSaveState("saving");
  }
  let didSaveSucceed = false;
  try {
    const savedMap = await AvaMapClient.saveMapConfig({
      mapId: options.avaMapId,
      name: pendingAtStart.name,
      mapConfig: pendingAtStart.mapConfig,
      expectedUpdatedAt: queue.updatedAt,
    });
    if (savedMap !== undefined) {
      queue.updatedAt = savedMap.updatedAt;
    }
    AvaQueryClient.invalidateQueries({
      queryKey: AvaMapClient.QueryKeys.getAll(),
    });
    didSaveSucceed = true;
    queue.savedRevision = revisionAtStart;
  } catch {
    didSaveSucceed = false;
  }
  if (queue.requestedRevision > revisionAtStart) {
    await _drainSaveQueue(options);
    return;
  }
  queue.isSaveRunning = false;
  if (queue.isMounted) {
    options.setSaveState(
      didSaveSucceed ?
        queue.editCount === revisionAtStart ?
          "saved"
        : "unsaved"
      : "failed",
    );
  }
}

function _makeSaveQueueState(avaMap: AvaMap.T): SaveQueueState {
  return {
    editCount: 0,
    updatedAt: avaMap.updatedAt,
    requestedRevision: 0,
    savedRevision: 0,
    isSaveRunning: false,
    isMounted: true,
  };
}

/** Flushes an edited map when its editor unmounts. */
function useFlushMapSaveOnUnmount(
  saveQueueRef: RefObject<SaveQueueState>,
  runSave: () => void,
  scheduleSave: ReturnType<typeof useDebouncedCallback>,
): void {
  const runSaveRef = useRef(runSave);
  const scheduleSaveRef = useRef(scheduleSave);
  runSaveRef.current = runSave;
  scheduleSaveRef.current = scheduleSave;
  useEffect(
    function flushPendingMapSaveOnUnmount() {
      const queue = saveQueueRef.current;
      queue.isMounted = true;
      return () => {
        queue.isMounted = false;
        scheduleSaveRef.current.cancel();
        if (queue.savedRevision < queue.editCount) {
          runSaveRef.current();
        }
      };
    },
    [saveQueueRef],
  );
}

/** Owns the queued persistence state and save commands. */
function useMapSaveController(avaMap: AvaMap.T): MapSaveController {
  const [saveState, setSaveState] = useState<MapSaveState>("saved");
  const pendingRef = useRef<PendingMapState>({
    name: avaMap.name,
    mapConfig: avaMap.config,
  });
  const saveQueueRef = useRef<SaveQueueState>(_makeSaveQueueState(avaMap));
  const runSave = useCallback((): void => {
    const queue = saveQueueRef.current;
    queue.requestedRevision = queue.editCount;
    if (queue.isSaveRunning) {
      return;
    }
    queue.isSaveRunning = true;
    void _drainSaveQueue({
      avaMapId: avaMap.id,
      pendingRef,
      saveQueueRef,
      setSaveState,
    });
  }, [avaMap.id]);
  const scheduleSave = useDebouncedCallback(runSave, AUTOSAVE_DELAY_MS);
  const markEdited = useCallback(() => {
    saveQueueRef.current.editCount += 1;
    setSaveState("unsaved");
    scheduleSave();
  }, [scheduleSave]);
  const saveNow = useCallback(() => {
    scheduleSave.cancel();
    runSave();
  }, [runSave, scheduleSave]);
  useFlushMapSaveOnUnmount(saveQueueRef, runSave, scheduleSave);
  return { markEdited, pendingRef, saveNow, saveState };
}

/** Owns the editable name and map configuration. */
function useMapDraftController(
  avaMap: AvaMap.T,
  pendingRef: RefObject<PendingMapState>,
  markEdited: () => void,
): MapDraftController {
  const [name, setName] = useState(avaMap.name);
  const [mapConfig, setMapConfig] = useState(avaMap.config);
  const updateName = useCallback(
    (updatedName: string) => {
      pendingRef.current = { ...pendingRef.current, name: updatedName };
      setName(updatedName);
      markEdited();
    },
    [markEdited, pendingRef],
  );
  const updateConfig = useCallback(
    (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
      const currentConfig = pendingRef.current.mapConfig;
      const updatedConfig = update(currentConfig);
      if (updatedConfig === currentConfig) {
        return;
      }
      pendingRef.current = { ...pendingRef.current, mapConfig: updatedConfig };
      setMapConfig(updatedConfig);
      markEdited();
    },
    [markEdited, pendingRef],
  );
  return { mapConfig, name, updateConfig, updateName };
}

/**
 * Holds the map being edited and autosaves it.
 *
 * Autosave rather than an explicit Save button, because a map is composed by
 * dozens of small adjustments and an unsaved sitrep map is the failure this
 * feature exists to prevent. `mod+S` still forces an immediate save, because
 * users who have been burned by autosave elsewhere reach for it.
 *
 * A failed save never rolls the config back. The author's last change stays on
 * screen and the indicator says the save failed: discarding work to keep a
 * status label honest is the wrong trade.
 */
export function useAvaMapEditor(avaMap: AvaMap.T): AvaMapEditor {
  const saveController = useMapSaveController(avaMap);
  const draftController = useMapDraftController(
    avaMap,
    saveController.pendingRef,
    saveController.markEdited,
  );
  return {
    ...draftController,
    saveNow: saveController.saveNow,
    saveState: saveController.saveState,
  };
}
