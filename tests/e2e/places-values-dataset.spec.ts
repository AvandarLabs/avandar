import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { runSqlOverDataset } from "./helpers/dataExplorerFlow";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

const DATASET_NAME = "E2E VALUES places spike";
const PLACE_NAME = "O'Brien's Café";
const RAW_SQL = `SELECT * FROM (VALUES (CAST('p1' AS VARCHAR), 'O''Brien''s Café', CAST(40.7603 AS DOUBLE))) AS places(place_id, name, latitude)`;

/** Inserts a virtual dataset owned by the workspace owner, before page load. */
async function _seedValuesDataset(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
}): Promise<string> {
  const { supabaseAdminClient, workspaceId } = options;
  const { data: workspace } = await supabaseAdminClient
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single()
    .throwOnError();
  const { data: profile } = await supabaseAdminClient
    .from("user_profiles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", workspace.owner_id)
    .single()
    .throwOnError();
  const { data: dataset } = await supabaseAdminClient
    .from("datasets")
    .insert({
      workspace_id: workspaceId,
      owner_id: workspace.owner_id,
      owner_profile_id: profile.id,
      name: DATASET_NAME,
      source_type: "virtual",
    })
    .select("id")
    .single()
    .throwOnError();
  await supabaseAdminClient
    .from("dataset_columns")
    .insert(
      [
        ["place_id", "VARCHAR", "varchar"],
        ["name", "VARCHAR", "varchar"],
        ["latitude", "DOUBLE", "double"],
      ].map(([name, duckDbType, dataType], columnIdx) => {
        return {
          dataset_id: dataset.id,
          workspace_id: workspaceId,
          original_name: name!,
          name: name!,
          original_data_type: duckDbType!,
          detected_data_type: duckDbType as "VARCHAR" | "DOUBLE",
          data_type: dataType as "varchar" | "double",
          column_idx: columnIdx,
        };
      }),
    )
    .throwOnError();
  await supabaseAdminClient
    .from("datasets__virtual")
    .insert({
      dataset_id: dataset.id,
      workspace_id: workspaceId,
      raw_sql: RAW_SQL,
    })
    .throwOnError();
  return dataset.id;
}

test("a VALUES virtual dataset shows its rows in the Data Explorer", async ({
  page,
  e2eWorkerDb,
}) => {
  const supabaseAdminClient = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let datasetId = "";
  try {
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient,
      slug: workspaceSlug,
    });
    datasetId = await _seedValuesDataset({ supabaseAdminClient, workspaceId });
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    await runSqlOverDataset({
      page,
      datasetName: DATASET_NAME,
      columnName: "name",
      sql: `SELECT name, typeof(latitude) AS latitude_type FROM "${datasetId}"`,
    });
    await expect(page.getByRole("gridcell")).toHaveText(
      [PLACE_NAME, "DOUBLE"],
      { timeout: LONG_WAIT },
    );
  } finally {
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient, datasetId });
    }
  }
});
