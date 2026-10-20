import { createHdxEtlEngine } from "@pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine";
import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { HDX_BASE_URL } from "@pipelines/hdx/hdxDrive";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/**
 * Runs the HDX pipeline over its one drive (`hdxDrive.ts`) and returns the
 * run id. HDX needs no API key to read.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<string> {
  const discovery = createCkanDiscoveryClient(
    createHdxHttpClient({ baseUrl: HDX_BASE_URL }),
  );
  const report = await createHdxEtlEngine({
    ...getPipelineEtlDestination(),
    discovery,
  }).run(options);
  return report.pipelineRunId;
}
