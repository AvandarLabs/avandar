import { Acclimate } from "@avandar/acclimate";
import { SupabaseClient } from "@supabase/supabase-js";
import { upgradePuckConfig } from "@/views/DashboardApp/DashboardEditorView/utils/upgradePuckConfig";
import type { DashboardGenericData } from "@/views/DashboardApp/DashboardEditorView/utils/puck.types";
import type { Database } from "$/types/database.types";

/**
 * This script should be run manually only when we feel that a public dashboard
 * is in an invalid state where datasets referenced in some of its raw SQL
 * queries are not available in the public bucket.
 *
 * 1. Get all public dashboard configs
 * 2. Upgrade the configs to the most recent version
 * 3. Get all dataset IDs referenced in the raw SQL queries
 * 4. Verify that these datasets are available in the dashboard's public storage
 *    bucket.
 * 5. For any datasets missing, check that they exist in the workspace's private
 *    bucket.
 * 6. If available, then copy the full dataset to the dashbaord's public bucket.
 *    Otherwise, do nothing.
 */
export default async function syncPublicDatasets({
  supabaseAdminClient,
}: {
  supabaseAdminClient: SupabaseClient<Database>;
}): Promise<void> {
  const { data: dashboards } = await supabaseAdminClient
    .from("dashboards")
    .select("*")
    .eq("is_public", true);

  if (!dashboards) {
    Acclimate.log("|red|No public dashboards found");
    return;
  }

  // upgrade the configs to the most recent version
  const upgradedDashboards = dashboards.map((dashboard) => {
    return upgradePuckConfig(dashboard.config as DashboardGenericData);
  });
  console.log("|yellow|Syncing public datasets...", upgradedDashboards);
}
