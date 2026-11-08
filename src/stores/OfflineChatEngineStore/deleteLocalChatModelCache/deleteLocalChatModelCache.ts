/**
 * Deletes a WebLLM model's weights and config from the browser cache, for
 * example when the user removes the offline models to free disk space.
 */
export async function deleteLocalChatModelCache(
  modelId: string,
): Promise<void> {
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  await deleteModelAllInfoInCache(modelId);
}
