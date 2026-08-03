import { findLocalChatModel } from "./localChatModelCatalog";
import type { LocalChatModelId } from "./localChatModelCatalog";

/**
 * Deletes WebLLM weight/config cache for a model from the browser cache.
 */
export async function deleteLocalChatModelCache(
  modelId: LocalChatModelId,
): Promise<void> {
  const { mlcModelId } = findLocalChatModel(modelId);
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  await deleteModelAllInfoInCache(mlcModelId);
}
