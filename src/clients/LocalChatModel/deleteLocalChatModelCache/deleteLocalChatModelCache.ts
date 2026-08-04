import { LocalChatModelCatalog } from "@/clients/LocalChatModel/LocalChatModelCatalog/LocalChatModelCatalog";
import type { LocalChatModelId } from "@/clients/LocalChatModel/LocalChatModelCatalog/LocalChatModelCatalog";

/**
 * Deletes WebLLM weight/config cache for a model from the browser cache.
 */
export async function deleteLocalChatModelCache(
  modelId: LocalChatModelId,
): Promise<void> {
  const { mlcModelId } = LocalChatModelCatalog.find(modelId);
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  await deleteModelAllInfoInCache(mlcModelId);
}
