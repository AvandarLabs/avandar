import type { VoiceManagerStatus } from "./voiceManagerInterface";
import type { VoiceModelId } from "./voiceModels";

/** Per-asset row shown in the download panel. */
export type VoiceDownloadFileState = "pending" | "downloading" | "complete";

export type VoiceDownloadFileEntry = {
  fileName: string;
  progressPercent: number;
  state: VoiceDownloadFileState;
};

export type VoiceDownloadingStatus = Extract<
  VoiceManagerStatus,
  { kind: "downloading" }
>;

const LOADING_INTO_MEMORY_FILE_NAME = "Loading into memory…";

/** Synthetic row id for the post-download pipeline warm-up phase. */
export const VOICE_MODEL_LOADING_ROW_FILE_NAME = LOADING_INTO_MEMORY_FILE_NAME;

export function createDownloadingStatus(
  modelId: VoiceModelId,
): VoiceDownloadingStatus {
  return {
    kind: "downloading",
    modelId,
    phase: "files",
    files: [],
  };
}

export function overallDownloadPercent(
  files: readonly VoiceDownloadFileEntry[],
): number {
  const assetFiles = files.filter((file) => {
    return file.fileName !== LOADING_INTO_MEMORY_FILE_NAME;
  });
  if (assetFiles.length === 0) {
    return -1;
  }
  const total = assetFiles.reduce((sum, file) => {
    return sum + file.progressPercent;
  }, 0);
  return Math.round(total / assetFiles.length);
}

function derivePhase(
  files: readonly VoiceDownloadFileEntry[],
): VoiceDownloadingStatus["phase"] {
  const assetFiles = files.filter((file) => {
    return file.fileName !== LOADING_INTO_MEMORY_FILE_NAME;
  });
  if (assetFiles.length === 0) {
    return "files";
  }
  const anyIncomplete = assetFiles.some((file) => {
    return file.state !== "complete";
  });
  return anyIncomplete ? "files" : "loading";
}

function upsertFile(
  files: readonly VoiceDownloadFileEntry[],
  fileName: string,
  update: (
    existing: VoiceDownloadFileEntry | undefined,
  ) => VoiceDownloadFileEntry,
): VoiceDownloadFileEntry[] {
  const index = files.findIndex((file) => {
    return file.fileName === fileName;
  });
  if (index < 0) {
    return [...files, update(undefined)];
  }
  const next = [...files];
  next[index] = update(files[index]);
  return next;
}

function resolveFileName(
  file: string | undefined,
  name: string | undefined,
): string {
  const resolved = file ?? name;
  return resolved && resolved.length > 0 ? resolved : "model assets";
}

/**
 * Applies a transformers.js `progress_callback` event to the downloading
 * snapshot, preserving completed rows when later assets start.
 */
export function applyTransformersProgressEvent(
  current: VoiceDownloadingStatus,
  event: {
    status: string;
    file?: string;
    name?: string;
    progress?: number;
  },
): VoiceDownloadingStatus {
  const fileName = resolveFileName(event.file, event.name);

  if (event.status === "initiate" || event.status === "download") {
    const files = upsertFile(current.files, fileName, (existing) => {
      if (existing?.state === "complete") {
        return existing;
      }
      return {
        fileName,
        progressPercent: existing?.progressPercent ?? 0,
        state: "downloading",
      };
    });
    return {
      ...current,
      phase: derivePhase(files),
      files: files.filter((file) => {
        return file.fileName !== LOADING_INTO_MEMORY_FILE_NAME;
      }),
    };
  }

  if (event.status === "progress") {
    const rawPercent =
      typeof event.progress === "number" ?
        Math.max(0, Math.min(99, event.progress))
      : 0;
    const files = upsertFile(current.files, fileName, (existing) => {
      const previousPercent = existing?.progressPercent ?? 0;
      return {
        fileName,
        progressPercent: Math.max(previousPercent, rawPercent),
        state: "downloading",
      };
    });
    const withoutLoadingRow = files.filter((file) => {
      return file.fileName !== LOADING_INTO_MEMORY_FILE_NAME;
    });
    return {
      ...current,
      phase: derivePhase(withoutLoadingRow),
      files: withoutLoadingRow,
    };
  }

  if (event.status === "done" || event.status === "ready") {
    const files = upsertFile(current.files, fileName, () => {
      return {
        fileName,
        progressPercent: 100,
        state: "complete",
      };
    });
    const withoutLoadingRow = files.filter((file) => {
      return file.fileName !== LOADING_INTO_MEMORY_FILE_NAME;
    });
    const phase = derivePhase(withoutLoadingRow);
    const withLoadingRow =
      phase === "loading" ?
        [
          ...withoutLoadingRow,
          {
            fileName: LOADING_INTO_MEMORY_FILE_NAME,
            progressPercent: 0,
            state: "downloading" as const,
          },
        ]
      : withoutLoadingRow;
    return {
      ...current,
      phase,
      files: withLoadingRow,
    };
  }

  return current;
}

/** Maps a desktop single-file poll snapshot into the shared multi-row shape. */
export function downloadingStatusFromDesktopSnapshot(
  modelId: VoiceModelId,
  progressPercent: number,
  currentFile: string | undefined,
  previous: VoiceManagerStatus,
): VoiceDownloadingStatus {
  const fileName =
    currentFile && currentFile.length > 0 ? currentFile : "voice model weights";
  const priorFiles =
    previous.kind === "downloading" && previous.modelId === modelId ?
      previous.files
    : [];

  const percent =
    progressPercent < 0 ? 0 : Math.max(0, Math.min(100, progressPercent));
  const state: VoiceDownloadFileState =
    percent >= 100 ? "complete"
    : percent > 0 ? "downloading"
    : "pending";

  const files = upsertFile(priorFiles, fileName, () => {
    return { fileName, progressPercent: percent, state };
  });

  const phase = derivePhase(files);
  const filesWithLoadingRow =
    phase === "loading" ?
      [
        ...files,
        {
          fileName: LOADING_INTO_MEMORY_FILE_NAME,
          progressPercent: 0,
          state: "downloading" as const,
        },
      ]
    : files;

  return {
    kind: "downloading",
    modelId,
    phase,
    files: filesWithLoadingRow,
  };
}

export function setDownloadingLoadingPhase(
  current: VoiceDownloadingStatus,
): VoiceDownloadingStatus {
  const assetFiles = current.files
    .filter((file) => {
      return file.fileName !== LOADING_INTO_MEMORY_FILE_NAME;
    })
    .map((file) => {
      return {
        ...file,
        progressPercent: 100,
        state: "complete" as const,
      };
    });

  return {
    ...current,
    phase: "loading",
    files: [
      ...assetFiles,
      {
        fileName: LOADING_INTO_MEMORY_FILE_NAME,
        progressPercent: 0,
        state: "downloading",
      },
    ],
  };
}
