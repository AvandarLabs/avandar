import { describe, expect, it } from "vitest";

/**
 * Offline prompts must show short table aliases, never dataset UUIDs.
 */
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { truncateSchemaForOffline } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline";
import {
  buildOfflineAnalyzePrompt,
  buildOfflineFixSqlPrompt,
  buildOfflineSqlPrompt,
} from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts";

const DEATHS_TABLE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const CONCEPT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const SCHEMA = {
  datasets: [{ id: DEATHS_TABLE_ID, name: "LONG_us_deaths.csv" }],
  columns: [
    {
      dataset_id: DEATHS_TABLE_ID,
      name: "Province/State",
      data_type: "string",
    },
  ],
} as const;

const SCHEMA_WITH_CONCEPT = {
  ...SCHEMA,
  concepts: [{ id: CONCEPT_ID, name: "Case" }],
  conceptAttributes: [{ concept_id: CONCEPT_ID, name: "status" }],
} as const;

describe("buildOfflineSqlPrompt", () => {
  it("requires resolved dataset FROM by alias and SQL-only output", () => {
    const prompt = buildOfflineSqlPrompt({
      schema: SCHEMA,
      pageContext: ChatPageContext.createDataExplorerViewContext({
        openDatasetId: DEATHS_TABLE_ID,
      }),
      analysisSummary: "Filter rows",
      lastUserPrompt: "covid deaths top 100",
      resolvedDataset: {
        id: DEATHS_TABLE_ID,
        name: "LONG_us_deaths.csv",
      },
    });

    expect(prompt).toContain('Required: use FROM "t0"');
    expect(prompt).toContain("- t0: LONG_us_deaths.csv (Province/State)");
    expect(prompt).not.toContain(DEATHS_TABLE_ID);
    expect(prompt).toContain("Output ONLY");
    expect(prompt).toContain("LIMIT, not SELECT TOP");
  });

  it("lists concept aliases and attribute names without concept UUIDs", () => {
    const prompt = buildOfflineSqlPrompt({
      schema: SCHEMA_WITH_CONCEPT,
      pageContext: ChatPageContext.createDataExplorerViewContext(),
      analysisSummary: "Count cases",
      lastUserPrompt: "how many cases",
    });

    expect(prompt).toContain("- c0: Case (status)");
    expect(prompt).not.toContain(CONCEPT_ID);
  });
});

describe("buildOfflineFixSqlPrompt", () => {
  it("lists allowed aliases and forbids system catalogs", () => {
    const prompt = buildOfflineFixSqlPrompt({
      schema: SCHEMA,
      sql: 'SELECT * FROM "pg_database"',
      error: "Table does not exist",
      lastUserPrompt: "deaths",
      resolvedDataset: {
        id: DEATHS_TABLE_ID,
        name: "LONG_us_deaths.csv",
      },
    });

    expect(prompt).toContain("Allowed table names");
    expect(prompt).toContain("pg_database");
    expect(prompt).toContain('"t0"');
    expect(prompt).not.toContain(DEATHS_TABLE_ID);
  });
});

describe("buildOfflineAnalyzePrompt", () => {
  it("does not lock the offline analyze prompt to a single app", () => {
    const sharedArgs = {
      schema: SCHEMA,
      lastUserPrompt: "deaths",
    } as const;

    const dashboardsPrompt = buildOfflineAnalyzePrompt({
      ...sharedArgs,
      pageContext: ChatPageContext.createDashboardsViewContext({
        dashboardId: "11111111-1111-4111-8111-111111111111",
      }),
    });

    const dataExplorerPrompt = buildOfflineAnalyzePrompt({
      ...sharedArgs,
      pageContext: ChatPageContext.createDataExplorerViewContext({
        openDatasetId: DEATHS_TABLE_ID,
      }),
    });

    expect(dashboardsPrompt).toBe(dataExplorerPrompt);
    expect(dashboardsPrompt).toContain("[View changed]");
    expect(dashboardsPrompt.toLowerCase()).not.toContain("currently");
    expect(dashboardsPrompt).not.toContain("editing a dashboard");
    expect(dashboardsPrompt).not.toContain("Data Explorer");
    expect(dashboardsPrompt).toContain("offline assistant");
  });

  it("asks for a table alias, not a UUID", () => {
    const prompt = buildOfflineAnalyzePrompt({
      schema: SCHEMA,
      pageContext: ChatPageContext.createDataExplorerViewContext(),
      lastUserPrompt: "deaths",
    });

    expect(prompt).toContain('"tableName"');
    expect(prompt).toContain("- t0: LONG_us_deaths.csv (Province/State)");
    expect(prompt).not.toContain(DEATHS_TABLE_ID);
    expect(prompt).toContain("exact alias from Available datasets");
  });

  it("keeps the truncated Phase 0 fixture free of dataset UUIDs", () => {
    const datasets = Array.from({ length: 12 }, (_, datasetIndex) => {
      const id = `00000000-0000-4000-8000-${String(datasetIndex).padStart(12, "0")}`;
      return {
        id,
        name: `Dataset ${datasetIndex}`,
      };
    });
    const columns = datasets.flatMap((dataset) => {
      return Array.from({ length: 24 }, (_, columnIndex) => {
        return {
          dataset_id: dataset.id,
          name: `col_${String(columnIndex).padStart(2, "0")}`,
          data_type: "string",
        };
      });
    });
    const schema = truncateSchemaForOffline({ datasets, columns });
    const prompt = buildOfflineAnalyzePrompt({
      schema,
      pageContext: ChatPageContext.createDataExplorerViewContext(),
      lastUserPrompt: "preview",
    });
    expect(prompt).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });
});
