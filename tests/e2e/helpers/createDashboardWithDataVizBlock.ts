import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shape of the per-viz-type config payload seeded into the DataViz block.
 * Mirrors the in-app `VizConfig` discriminated union but is duplicated here
 * so this helper has no compile-time dependency on application code (which
 * keeps Playwright fixtures lightweight and reusable across versions).
 */
export type SeededVizConfig =
  | { vizType: "table" }
  | {
      vizType: "bar";
      xAxisKey: string;
      yAxisKey: string;
      withLegend: boolean;
    }
  | {
      vizType: "line";
      xAxisKey: string;
      yAxisKey: string;
      withLegend: boolean;
      curveType: "monotone" | "natural" | "linear" | "step";
    }
  | {
      vizType: "area";
      xAxisKey: string;
      yAxisKey: string;
      withLegend: boolean;
      curveType: "monotone" | "natural" | "linear" | "step";
    }
  | { vizType: "scatter"; xAxisKey: string; yAxisKey: string }
  | {
      vizType: "pie";
      nameKey: string;
      valueKey: string;
      isDonut: boolean;
      withLabels: boolean;
      labelsType: "value" | "percent";
    }
  | { vizType: "funnel"; nameKey: string; valueKey: string }
  | { vizType: "radar"; nameKey: string; valueKey: string }
  | {
      vizType: "bubble";
      xAxisKey: string;
      yAxisKey: string;
      sizeKey: string;
    };

/**
 * Inserts a dashboard owned by the given user with a single pre-configured
 * DataViz block. Returns the new dashboard id so the test can navigate
 * straight to its editor.
 */
export async function createDashboardWithDataVizBlock(options: {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
  rawSql: string;
  vizConfig: SeededVizConfig;
  name?: string;
}): Promise<string> {
  const { admin, workspaceId, ownerEmail, rawSql, vizConfig } = options;

  const { data: ownerUserIdRaw, error: ownerLookupError } = await admin.rpc(
    "util__get_user_id_by_email",
    { user_email: ownerEmail },
  );
  if (ownerLookupError) {
    throw new Error(
      `Could not find owner user by email "${ownerEmail}": ${ownerLookupError.message}`,
    );
  }
  const ownerUserId = ownerUserIdRaw as string;

  const { data: ownerProfile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("user_id", ownerUserId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (profileError) {
    throw new Error(`profile lookup failed: ${profileError.message}`);
  }
  if (!ownerProfile) {
    throw new Error(
      `No user_profile row for user_id ${ownerUserId} in workspace ${workspaceId}`,
    );
  }

  const dashboardName = options.name ?? `E2E DataViz ${vizConfig.vizType}`;
  const now = new Date().toISOString();
  const blockId = crypto.randomUUID();
  const config = {
    root: {
      props: {
        schemaVersion: 2,
        author: "",
        containerMaxWidth: { unit: "%", value: 100 },
        horizontalPadding: "md",
        isAuthorHidden: false,
        isPublishedAtHidden: false,
        isSubtitleHidden: false,
        isTitleHidden: false,
        publishedAt: "",
        subtitle: "",
        title: dashboardName,
        verticalPadding: "lg",
      },
    },
    content: [
      {
        type: "DataViz",
        props: {
          id: blockId,
          nlQuery: {
            prompt: "Seeded by E2E test",
            rawSql,
            generations: [{ prompt: "Seeded by E2E test", rawSql }],
          },
          vizType: vizConfig.vizType,
          vizConfig,
        },
      },
    ],
  };

  const { data: inserted, error: insertError } = await admin
    .from("dashboards")
    .insert({
      workspace_id: workspaceId,
      owner_id: ownerUserId,
      owner_profile_id: ownerProfile.id,
      name: dashboardName,
      slug: `e2e-dataviz-${vizConfig.vizType}-${blockId.slice(0, 8)}`,
      is_public: false,
      is_restricted: false,
      config,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert dashboard: ${insertError.message}`);
  }
  if (!inserted) {
    throw new Error("Dashboard insert returned no row");
  }

  return inserted.id;
}
