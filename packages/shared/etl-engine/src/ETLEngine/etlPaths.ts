import { join } from "node:path";
import type { UUID } from "@utils/types/common.types.ts";

type PipelineRunId = UUID<"PipelineRun">;

type ETLPipelineStage = "extract" | "transform";

/** Base directory segment for all ETL outputs under the project root. */
export const ETL_OUTPUT_BASE_DIR = "etl-output";

/**
 * Base directory for pipeline inputs: `etl-input/<pipeline-name>/` holds CSVs
 * consumed by extract (matches `.gitignore` `etl-input/`).
 */
export const ETL_INPUT_BASE_DIR = "etl-input";

/**
 * `etl-input/<pipeline-name>/` — CSV sources for a pipeline (shared across
 * runs).
 */
export function getETLPipelineInputDir(pipelineName: string): string {
  const root = _getETLPathsRoot();
  return join(root, ETL_INPUT_BASE_DIR, pipelineName);
}

/**
 * When set, all ETL path helpers resolve under this root (tests only).
 * Overrides {@link ETL_PATHS_ROOT_ENV}.
 */
let etlPathsRootForTesting: string | undefined;

/**
 * Env var: absolute root for `etl-input/` and `etl-output/` (no trailing
 * slash). In this monorepo, the pipeline server sets this to the repo root
 * (where `.gitignore` lists `etl-input/`).
 */
export const ETL_PATHS_ROOT_ENV = "ETL_PATHS_ROOT";

/**
 * Pins the filesystem root for path helpers to a temp directory (tests).
 * Call {@link resetETLPathsRootForTesting} in `afterEach`.
 */
export function setETLPathsRootForTesting(root: string): void {
  etlPathsRootForTesting = root;
}

/** Clears the root set by {@link setETLPathsRootForTesting}. */
export function resetETLPathsRootForTesting(): void {
  etlPathsRootForTesting = undefined;
}

function _getETLPathsRoot(): string {
  if (etlPathsRootForTesting !== undefined) {
    return etlPathsRootForTesting;
  }

  const fromEnv = process.env[ETL_PATHS_ROOT_ENV]?.trim();

  if (fromEnv !== undefined && fromEnv !== "") {
    return fromEnv;
  }

  return process.cwd();
}

/**
 * `etl-output/<pipeline-name>/<pipeline-run-id>/<stage>` for extract or
 * transform outputs.
 */
export function getETLOutputDir(
  pipelineName: string,
  pipelineRunId: PipelineRunId,
  stage: ETLPipelineStage,
): string {
  const root = _getETLPathsRoot();
  return join(root, ETL_OUTPUT_BASE_DIR, pipelineName, pipelineRunId, stage);
}

/**
 * `etl-output/<pipeline-name>/<pipeline-run-id>/load` — Parquet files for
 * the load step.
 */
export function getETLLoadDir(
  pipelineName: string,
  pipelineRunId: PipelineRunId,
): string {
  const root = _getETLPathsRoot();
  return join(root, ETL_OUTPUT_BASE_DIR, pipelineName, pipelineRunId, "load");
}

/**
 * Directory the transform step reads from (extract output for this run).
 */
export function getETLInputDir(
  pipelineName: string,
  pipelineRunId: PipelineRunId,
): string {
  return getETLOutputDir(pipelineName, pipelineRunId, "extract");
}
