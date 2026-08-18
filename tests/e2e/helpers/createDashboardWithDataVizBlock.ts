import { DashboardSeedHelpers } from "./DashboardSeedHelpers";
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

type CreateDashboardWithDataVizBlockOptions = {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
  rawSql: string;
  vizConfig: SeededVizConfig;
  name?: string;
};

function _makeDataVizContent(
  options: Readonly<{
    blockId: string;
    rawSql: string;
    vizConfig: SeededVizConfig;
  }>,
): unknown[] {
  return [
    {
      type: "DataViz",
      props: {
        id: options.blockId,
        nlQuery: {
          prompt: "Seeded by E2E test",
          rawSql: options.rawSql,
          generations: [
            { prompt: "Seeded by E2E test", rawSql: options.rawSql },
          ],
        },
        vizType: options.vizConfig.vizType,
        vizConfig: options.vizConfig,
      },
    },
  ];
}

/**
 * Inserts a dashboard owned by the given user with a single pre-configured
 * DataViz block. Returns the new dashboard id so the test can navigate
 * straight to its editor.
 */
export async function createDashboardWithDataVizBlock(
  options: Readonly<CreateDashboardWithDataVizBlockOptions>,
): Promise<string> {
  const { admin, workspaceId, ownerEmail, rawSql, vizConfig } = options;
  const dashboardName = options.name ?? `E2E DataViz ${vizConfig.vizType}`;
  const blockId = crypto.randomUUID();
  const owner = await DashboardSeedHelpers.getOwner({
    admin,
    ownerEmail,
    workspaceId,
  });
  const config = DashboardSeedHelpers.makeDashboardConfigFromContent({
    title: dashboardName,
    content: _makeDataVizContent({ blockId, rawSql, vizConfig }),
  });
  return DashboardSeedHelpers.insertDashboard({
    admin,
    config,
    failureMessage: "Failed to insert dashboard",
    isRestricted: false,
    missingRowMessage: "Dashboard insert returned no row",
    name: dashboardName,
    owner,
    slug: `e2e-dataviz-${vizConfig.vizType}-${blockId.slice(0, 8)}`,
    visibility: "draft",
    workspaceId,
  });
}
