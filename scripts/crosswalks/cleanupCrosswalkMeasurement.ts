/**
 * Removes what seedCrosswalkMeasurement seeded from this branch's local
 * Supabase: the crosswalk, its combined dataset if one was created, every
 * dataset named "Crosswalk measurement ...", and their Parquet files. Local
 * only: it refuses any Supabase not on this machine. Run with:
 *
 *   dotenv -e .env.development -- pnpm vite-script \
 *     scripts/crosswalks/cleanupCrosswalkMeasurement.ts
 */
import { promiseMapSequential } from "@avandar/utils";
import { createClient } from "@supabase/supabase-js";
import { TEST_WORKSPACE_SLUG } from "seed/SeedData";
import {
  MEASUREMENT_CROSSWALK_NAME,
  MEASUREMENT_NAME_PREFIX,
} from "./crosswalkMeasurementPlan/crosswalkMeasurementPlan";
import { MeasurementOutput, shouldRunScript } from "./measurementOutput";
import { getRemoteSupabaseRefusal } from "./requireLocalSupabase/requireLocalSupabase";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Database } from "$/types/database.types";

const SCRIPT = "cleanupCrosswalkMeasurement";
const HELP = `Removes the crosswalk measurement's crosswalk, its combined dataset, the
100 "Crosswalk measurement ..." datasets, and their Parquet files from this
branch's local Supabase. Refuses any Supabase that is not on this machine.

Usage:
  dotenv -e .env.development -- pnpm vite-script scripts/crosswalks/cleanupCrosswalkMeasurement.ts [-h|--help]

Options:
  -h, --help   Show this help and exit.

Examples:
  dotenv -e .env.development -- pnpm vite-script scripts/crosswalks/cleanupCrosswalkMeasurement.ts
  dotenv -e .env.development -- pnpm vite-script scripts/crosswalks/cleanupCrosswalkMeasurement.ts --help`;

/** Storage removes at most this many objects per call here. */
const REMOVE_BATCH_SIZE = 100;

async function _findSeeded(admin: AvaSupabaseDBClient): Promise<{
  workspaceId: string;
  crosswalkIds: string[];
  datasetIds: string[];
}> {
  const { data: workspace } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", TEST_WORKSPACE_SLUG)
    .single()
    .throwOnError();
  const { data: crosswalks } = await admin
    .from("crosswalks")
    .select("id, output_dataset_id")
    .eq("workspace_id", workspace.id)
    .eq("name", MEASUREMENT_CROSSWALK_NAME)
    .throwOnError();
  const { data: datasets } = await admin
    .from("datasets")
    .select("id")
    .eq("workspace_id", workspace.id)
    .like("name", `${MEASUREMENT_NAME_PREFIX} %`)
    .throwOnError();
  const outputIds = crosswalks.flatMap((crosswalk) => {
    return crosswalk.output_dataset_id ? [crosswalk.output_dataset_id] : [];
  });
  return {
    workspaceId: workspace.id,
    crosswalkIds: crosswalks.map((crosswalk) => {
      return crosswalk.id;
    }),
    datasetIds: [
      ...new Set([
        ...outputIds,
        ...datasets.map((dataset) => {
          return dataset.id;
        }),
      ]),
    ],
  };
}

async function _removeParquet(
  admin: AvaSupabaseDBClient,
  workspaceId: string,
  datasetIds: readonly string[],
): Promise<void> {
  const batches = Array.from(
    { length: Math.ceil(datasetIds.length / REMOVE_BATCH_SIZE) },
    (_item, index) => {
      return datasetIds.slice(
        index * REMOVE_BATCH_SIZE,
        (index + 1) * REMOVE_BATCH_SIZE,
      );
    },
  );
  await promiseMapSequential(batches, async (batch) => {
    const paths = batch.map((datasetId) => {
      return `${workspaceId}/datasets/${datasetId}.parquet`;
    });
    const { error } = await admin.storage.from("workspaces").remove(paths);
    if (error) {
      throw new Error(`Could not remove Parquet files: ${error.message}`);
    }
  });
}

async function _cleanUp(): Promise<{
  crosswalkCount: number;
  datasetCount: number;
}> {
  const admin = createClient<Database>(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  MeasurementOutput.step("Finding the seeded crosswalk and datasets");
  const seeded = await _findSeeded(admin);
  MeasurementOutput.step(
    `Deleting ${seeded.crosswalkIds.length} crosswalk and ${seeded.datasetIds.length} datasets`,
  );
  if (seeded.crosswalkIds.length > 0) {
    await admin
      .from("crosswalks")
      .delete()
      .in("id", seeded.crosswalkIds)
      .throwOnError();
  }
  if (seeded.datasetIds.length > 0) {
    await admin
      .from("datasets")
      .delete()
      .in("id", seeded.datasetIds)
      .throwOnError();
    MeasurementOutput.step("Removing their Parquet files");
    await _removeParquet(admin, seeded.workspaceId, seeded.datasetIds);
  }
  return {
    crosswalkCount: seeded.crosswalkIds.length,
    datasetCount: seeded.datasetIds.length,
  };
}

async function main(): Promise<void> {
  if (
    !shouldRunScript({
      script: SCRIPT,
      argv: process.argv.slice(2),
      help: HELP,
    })
  ) {
    return;
  }
  const refusal = getRemoteSupabaseRefusal(process.env);
  if (refusal) {
    MeasurementOutput.fail({
      script: SCRIPT,
      message: refusal,
      hint: "Run ava supabase status, point this worktree at its local stack, and retry.",
    });
    return;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    MeasurementOutput.fail({
      script: SCRIPT,
      message: "SUPABASE_SERVICE_ROLE_KEY is not set.",
      hint: "Run the script through dotenv -e .env.development.",
    });
    return;
  }
  try {
    const removed = await _cleanUp();
    MeasurementOutput.success(
      `Removed ${removed.crosswalkCount} crosswalk and ${removed.datasetCount} datasets.`,
    );
  } catch (error) {
    MeasurementOutput.fail({
      script: SCRIPT,
      message: error instanceof Error ? error.message : String(error),
      hint: "Fix the cause above and run the cleanup again: it only removes what is still there.",
    });
  }
}

void main();
