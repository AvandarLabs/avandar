/**
 * Seeds this branch's local Supabase with 100 CSV-backed datasets in three
 * layouts and a crosswalk mapped onto them, to measure the combined
 * preview at scale. Local only: it refuses any Supabase not on this
 * machine. Run with:
 *
 *   dotenv -e .env.development -- pnpm vite-script \
 *     scripts/crosswalks/seedCrosswalkMeasurement.ts
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promiseMapSequential } from "@avandar/utils";
import { DuckDBInstance } from "@duckdb/node-api";
import { createClient } from "@supabase/supabase-js";
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_WORKSPACE_SLUG,
} from "seed/SeedData";
import {
  buildMeasurementDatasets,
  buildMeasurementSaveParams,
  buildParquetSql,
  MEASUREMENT_CROSSWALK_NAME,
  MEASUREMENT_LAYOUTS,
  MEASUREMENT_ROWS_PER_DATASET,
  toDatasetColumnInputs,
} from "./crosswalkMeasurementPlan/crosswalkMeasurementPlan";
import { MeasurementOutput, shouldRunScript } from "./measurementOutput";
import { getRemoteSupabaseRefusal } from "./requireLocalSupabase/requireLocalSupabase";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Database } from "$/types/database.types";
import type {
  MeasurementDataset,
  MeasurementLayout,
} from "./crosswalkMeasurementPlan/crosswalkMeasurementPlan";

const SCRIPT = "seedCrosswalkMeasurement";
const HELP = `Seeds this branch's local Supabase with 100 CSV-backed datasets in three
layouts (50, 35, 15) and a crosswalk mapped onto them, to measure the
combined preview. Refuses any Supabase that is not on this machine.

Usage:
  dotenv -e .env.development -- pnpm vite-script scripts/crosswalks/seedCrosswalkMeasurement.ts [-h|--help]

Options:
  -h, --help   Show this help and exit.

Output:
  stdout: the crosswalk's step-3 URL. Progress goes to stderr.

Examples:
  dotenv -e .env.development -- pnpm vite-script scripts/crosswalks/seedCrosswalkMeasurement.ts
  dotenv -e .env.development -- pnpm --silent vite-script scripts/crosswalks/seedCrosswalkMeasurement.ts > .temp/feat-crosswalks/crosswalk-url.txt

Remove what it seeds with scripts/crosswalks/cleanupCrosswalkMeasurement.ts.`;

const PARQUET_TYPE = "application/vnd.apache.parquet";

type SeedClients = {
  admin: AvaSupabaseDBClient;
  user: AvaSupabaseDBClient;
  userId: string;
};

function _readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Run the script through dotenv -e .env.development.`,
    );
  }
  return value;
}

async function _createClients(): Promise<SeedClients> {
  const url = _readEnv("SUPABASE_URL");
  const options = { auth: { autoRefreshToken: false, persistSession: false } };
  const admin = createClient<Database>(
    url,
    _readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    options,
  );
  const user = createClient<Database>(
    url,
    _readEnv("VITE_SUPABASE_ANON_KEY"),
    options,
  );
  const { data, error } = await user.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });
  if (error || !data.user) {
    throw new Error(
      `Could not sign in as ${TEST_USER_EMAIL}: ${error?.message ?? "no user"}`,
    );
  }
  return { admin, user, userId: data.user.id };
}

async function _getWorkspace(
  clients: SeedClients,
): Promise<{ workspaceId: string; profileId: string }> {
  const { data: workspace } = await clients.user
    .from("workspaces")
    .select("id")
    .eq("slug", TEST_WORKSPACE_SLUG)
    .single()
    .throwOnError();
  const { data: profile } = await clients.user
    .from("user_profiles")
    .select("id")
    .eq("user_id", clients.userId)
    .eq("workspace_id", workspace.id)
    .single()
    .throwOnError();
  return { workspaceId: workspace.id, profileId: profile.id };
}

async function _isAlreadySeeded(admin: AvaSupabaseDBClient): Promise<boolean> {
  const { data } = await admin
    .from("crosswalks")
    .select("id")
    .eq("name", MEASUREMENT_CROSSWALK_NAME)
    .throwOnError();
  return data.length > 0;
}

/**
 * One Parquet file per layout, written by node DuckDB into a temporary
 * folder.
 */
async function _writeParquetFiles(
  folder: string,
): Promise<Map<MeasurementLayout["key"], Uint8Array>> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    const entries = await promiseMapSequential(
      MEASUREMENT_LAYOUTS,
      async (layout) => {
        const outputPath = join(folder, `${layout.key}.parquet`);
        await connection.run(
          buildParquetSql({
            layout,
            rowCount: MEASUREMENT_ROWS_PER_DATASET,
            outputPath,
          }),
        );
        return [layout.key, new Uint8Array(readFileSync(outputPath))] as const;
      },
    );
    return new Map(entries);
  } finally {
    connection.closeSync();
  }
}

async function _createDataset(
  options: Readonly<{
    clients: SeedClients;
    workspaceId: string;
    dataset: MeasurementDataset;
    bytes: Uint8Array;
  }>,
): Promise<void> {
  const { clients, workspaceId, dataset, bytes } = options;
  const layout = MEASUREMENT_LAYOUTS.find((candidate) => {
    return candidate.key === dataset.layoutKey;
  })!;
  await clients.user
    .rpc("rpc_datasets__add_csv_file_dataset", {
      p_dataset_id: dataset.id,
      p_workspace_id: workspaceId,
      p_dataset_name: dataset.name,
      p_dataset_description:
        "Seeded to measure a crosswalk's combined preview.",
      p_columns: toDatasetColumnInputs(layout),
      p_is_in_cloud_storage: true,
      p_size_in_bytes: bytes.byteLength,
      p_rows_to_skip: 0,
      p_quote_char: { value: '"' },
      p_escape_char: { value: '"' },
      p_delimiter: ",",
      p_newline_delimiter: "\n",
      p_comment_char: { value: null },
      p_has_header: true,
      p_date_format: { date_format: null, timestamp_format: null },
    })
    .throwOnError();
  const { error } = await clients.admin.storage
    .from("workspaces")
    .upload(`${workspaceId}/datasets/${dataset.id}.parquet`, bytes, {
      contentType: PARQUET_TYPE,
      upsert: true,
    });
  if (error) {
    throw new Error(
      `Could not upload ${dataset.name}'s Parquet: ${error.message}`,
    );
  }
}

async function _createDatasets(
  options: Readonly<{
    clients: SeedClients;
    workspaceId: string;
    datasets: readonly MeasurementDataset[];
    bytesByLayout: ReadonlyMap<MeasurementLayout["key"], Uint8Array>;
  }>,
): Promise<void> {
  // One at a time, so a failure stops at the dataset that failed and the
  // progress lines stay in order.
  await promiseMapSequential(
    [...options.datasets.entries()],
    async ([index, dataset]) => {
      await _createDataset({
        ...options,
        dataset,
        bytes: options.bytesByLayout.get(dataset.layoutKey)!,
      });
      if ((index + 1) % 10 === 0) {
        MeasurementOutput.step(
          `Seeded ${index + 1} of ${options.datasets.length} datasets`,
        );
      }
    },
  );
}

async function _createCrosswalk(
  options: Readonly<{
    clients: SeedClients;
    workspaceId: string;
    profileId: string;
    datasets: readonly MeasurementDataset[];
  }>,
): Promise<string> {
  const { clients } = options;
  const { data: crosswalk } = await clients.user
    .from("crosswalks")
    .insert({
      workspace_id: options.workspaceId,
      owner_id: clients.userId,
      owner_profile_id: options.profileId,
      name: MEASUREMENT_CROSSWALK_NAME,
    })
    .select("id")
    .single()
    .throwOnError();
  await clients.user
    .rpc(
      "rpc_crosswalks__save",
      buildMeasurementSaveParams({
        crosswalkId: crosswalk.id,
        datasets: options.datasets,
        makeId: () => {
          return crypto.randomUUID();
        },
      }),
    )
    .throwOnError();
  return crosswalk.id;
}

async function _seed(): Promise<string> {
  MeasurementOutput.step("Signing in as the seeded workspace owner");
  const clients = await _createClients();
  if (await _isAlreadySeeded(clients.admin)) {
    throw new Error("ALREADY_SEEDED");
  }
  const { workspaceId, profileId } = await _getWorkspace(clients);
  const folder = mkdtempSync(join(tmpdir(), "crosswalk-measurement-"));
  try {
    MeasurementOutput.step(
      `Writing ${MEASUREMENT_LAYOUTS.length} Parquet files of ${MEASUREMENT_ROWS_PER_DATASET} rows`,
    );
    const bytesByLayout = await _writeParquetFiles(folder);
    const datasets = buildMeasurementDatasets(() => {
      return crypto.randomUUID();
    });
    MeasurementOutput.step(
      `Creating ${datasets.length} datasets and uploading their Parquet`,
    );
    await _createDatasets({ clients, workspaceId, datasets, bytesByLayout });
    MeasurementOutput.step("Creating and saving the crosswalk");
    return await _createCrosswalk({
      clients,
      workspaceId,
      profileId,
      datasets,
    });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
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
      hint: "Run ava supabase status, switch this branch to its own local stack with ava supabase switch, and retry.",
    });
    return;
  }
  try {
    const crosswalkId = await _seed();
    const appUrl = (process.env.VITE_APP_URL ?? "").replace(/\/+$/, "");
    MeasurementOutput.success("Seeded 100 datasets and the crosswalk.");
    process.stdout.write(
      `${appUrl}/${TEST_WORKSPACE_SLUG}/data-manager/crosswalks/${crosswalkId}?step=combine\n`,
    );
  } catch (error) {
    const isSeeded =
      error instanceof Error && error.message === "ALREADY_SEEDED";
    MeasurementOutput.fail({
      script: SCRIPT,
      message: isSeeded
        ? `${MEASUREMENT_CROSSWALK_NAME} already exists.`
        : String(error instanceof Error ? error.message : error),
      hint: "Run dotenv -e .env.development -- pnpm vite-script scripts/crosswalks/cleanupCrosswalkMeasurement.ts, then retry.",
    });
  }
}

void main();
