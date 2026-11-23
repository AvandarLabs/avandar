import { buildPipelineModuleUrl } from "@pipeline-server/routes/pipeline-name/buildPipelineModuleUrl/buildPipelineModuleUrl";
import type { EtlDriveScopes } from "@avandar/etl";

type PipelineScopesModule = Readonly<{
  listScopes: () => Promise<readonly EtlDriveScopes[]>;
}>;

/**
 * Loads a pipeline's module and lists each drive's live scopes. Reads no
 * database.
 *
 * @param pipelineName - The pipeline's directory name.
 * @returns Each drive's scope keys.
 * @throws When the module exports no `listScopes` function, or whatever it
 * throws.
 */
export async function listScopes(
  pipelineName: string,
): Promise<readonly EtlDriveScopes[]> {
  const pipelineModule: unknown = await import(
    buildPipelineModuleUrl(pipelineName).href
  );
  if (
    typeof pipelineModule !== "object" ||
    pipelineModule === null ||
    !("listScopes" in pipelineModule) ||
    typeof pipelineModule.listScopes !== "function"
  ) {
    throw new Error(
      `Pipeline "${pipelineName}" does not export a listScopes() function.`,
    );
  }
  return await (pipelineModule as PipelineScopesModule).listScopes();
}
