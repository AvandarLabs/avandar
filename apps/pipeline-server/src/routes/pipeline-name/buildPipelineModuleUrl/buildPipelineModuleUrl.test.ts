import {
  buildPipelineModuleUrl,
  INVALID_PIPELINE_NAME_ERROR_NAME,
} from "@pipeline-server/routes/pipeline-name/buildPipelineModuleUrl/buildPipelineModuleUrl";
import { describe, expect, it } from "vitest";

function _catchError(pipelineName: string): unknown {
  try {
    buildPipelineModuleUrl(pipelineName);
  } catch (error: unknown) {
    return error;
  }
  return undefined;
}

describe("buildPipelineModuleUrl", () => {
  it("builds the run.ts URL of every real pipeline", () => {
    const pathnames = ["hdx", "socrata", "world-bank__wdi"].map((name) => {
      return buildPipelineModuleUrl(name).pathname;
    });

    expect(pathnames).toEqual([
      expect.stringMatching(/\/apps\/pipeline-server\/pipelines\/hdx\/run\.ts$/),
      expect.stringMatching(
        /\/apps\/pipeline-server\/pipelines\/socrata\/run\.ts$/,
      ),
      expect.stringMatching(
        /\/apps\/pipeline-server\/pipelines\/world-bank__wdi\/run\.ts$/,
      ),
    ]);
  });

  it.each(["../hdx", "hdx?x", "HDX", "a/b"])(
    "throws a named error for %j",
    (pipelineName) => {
      const error = _catchError(pipelineName);

      expect(error).toMatchObject({
        name: INVALID_PIPELINE_NAME_ERROR_NAME,
        message: `Pipeline name ${JSON.stringify(pipelineName)} may only hold lowercase letters, digits, "_" and "-".`,
      });
    },
  );
});
