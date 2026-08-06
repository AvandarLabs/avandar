import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";

/**
 * Deletes WebLLM weight/config cache for a model from the browser cache.
 */
export async function deleteLocalChatModelCache(
  modelId: LocalChatModel.Id,
): Promise<void> {
  const { mlcModelId } = LocalChatModel.Catalog.find(modelId);
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  await deleteModelAllInfoInCache(mlcModelId);
}
