import type { EtlRunReport } from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

type RunPipelineOptions = PipelineRunOptions &
  Readonly<{
    pipelineName: string;
  }>;

type PipelineRunModule = Readonly<{
  run: (options: PipelineRunOptions) => Promise<EtlRunReport>;
}>;

function _getPipelineModuleURL(pipelineName: string): URL {
  return new URL(
    `../../../../pipelines/${pipelineName}/run.ts`,
    import.meta.url,
  );
}

export async function run(
  options: RunPipelineOptions,
): Promise<EtlRunReport> {
  const pipelineModule: unknown = await import(
    _getPipelineModuleURL(options.pipelineName).href
  );

  if (
    typeof pipelineModule !== "object" ||
    pipelineModule === null ||
    !("run" in pipelineModule) ||
    typeof pipelineModule.run !== "function"
  ) {
    throw new Error(
      `Pipeline "${options.pipelineName}" does not export a run() function.`,
    );
  }

  const { mode, since, until, limit, scopes } = options;
  return await (pipelineModule as PipelineRunModule).run({
    mode,
    since,
    until,
    limit,
    ...(scopes === undefined ? {} : { scopes }),
  });
}
