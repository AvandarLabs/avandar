import { propEq } from "@avandar/utils";
import {
  LOCAL_CHAT_MODEL_SPECS,
  OFFLINE_MODEL_BUNDLE,
  PEAK_MODEL_MEMORY_BUDGET_MB,
} from "$/models/chat/LocalChatModel/LocalChatModel.constants.ts";
import type { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel.ts";

const LOCAL_CHAT_MODELS: readonly LocalChatModel.T[] = Object.entries(
  LOCAL_CHAT_MODEL_SPECS,
).map(([id, spec]) => {
  return { id: id as LocalChatModel.Id, ...spec };
});

function _isValidId(id: string): id is LocalChatModel.Id {
  return Object.hasOwn(LOCAL_CHAT_MODEL_SPECS, id);
}

function _find(id: LocalChatModel.Id): LocalChatModel.T {
  const model = LOCAL_CHAT_MODELS.find(propEq("id", id));
  if (!model) {
    throw new Error(`Unknown local chat model id: ${id}`);
  }
  return model;
}

function _getModelIdsFromBundle(
  bundle: LocalChatModel.Bundle,
): LocalChatModel.Id[] {
  const ids = [bundle.router, bundle.escalation, bundle.answer].filter(
    (id): id is LocalChatModel.Id => {
      return id !== undefined;
    },
  );
  return [...new Set(ids)];
}

function _getDownloadMbFromBundle(bundle: LocalChatModel.Bundle): number {
  return _getModelIdsFromBundle(bundle).reduce((totalMb, id) => {
    return totalMb + _find(id).approxDownloadMb;
  }, 0);
}

function _getPeakMemoryMbFromBundle(bundle: LocalChatModel.Bundle): number {
  return Math.max(
    ..._getModelIdsFromBundle(bundle).map((id) => {
      return _find(id).peakMemoryMb;
    }),
  );
}

/**
 * Runtime surface for the {@link LocalChatModel} model: the catalog of
 * models that run on the user's device, and the offline bundle that says
 * which of them offline mode downloads and uses. Read by the offline chat
 * stores and the offline mode dialog, for example to show the download size.
 */
export const LocalChatModelModule = {
  /** The models offline mode downloads and the job each one does. */
  OFFLINE_BUNDLE: OFFLINE_MODEL_BUNDLE,

  /** Most GPU memory offline models may hold at once, in MB. */
  PEAK_MODEL_MEMORY_BUDGET_MB,

  /** Catalog of local chat models that run on the user's device. */
  Catalog: {
    values: LOCAL_CHAT_MODELS,
    isValidId: _isValidId,
    find: _find,
  },

  /**
   * Every distinct model in a bundle, each once, in download order. The
   * answer model comes last.
   */
  getModelIdsFromBundle: _getModelIdsFromBundle,

  /** The bundle's approximate total download size, in MB. */
  getDownloadMbFromBundle: _getDownloadMbFromBundle,

  /**
   * The most GPU memory the bundle needs at once, in MB. Models swap in and
   * out, so this is the largest single model.
   */
  getPeakMemoryMbFromBundle: _getPeakMemoryMbFromBundle,
};
