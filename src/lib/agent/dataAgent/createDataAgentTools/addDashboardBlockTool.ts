import { parseDashboardBlockFields } from "$/agent/dashboardBlocks/DashboardBlockFields";
import { ADD_DASHBOARD_BLOCK_TOOL } from "$/agent/dataAgent/dataAgentTools";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { extractSingleQuotedSqlLiterals } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import {
  MAX_QUERY_RUNS_PER_ANSWER,
  describeQueryShape,
} from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import { sanitizeQueryError } from "@/lib/agent/dataAgent/sanitizeQueryError/sanitizeQueryError";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { QueryToolContext } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import type {
  DataAgentDashboardBlockOutcome,
  DataAgentHost,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

type DashboardToolResult = AgentToolResult<{ outcome: string }>;

type ChartBlock = Extract<ChatGeneratedDashboardBlock, { kind: "DataViz" }>;

/**
 * The block to add, or the result that stops it. A chart that ran carries
 * its shape (row count and column names) for the model to read back.
 */
type CheckedBlock =
  | { block: ChatGeneratedDashboardBlock; shape?: string }
  | { result: DashboardToolResult };

function _reply(
  text: string,
  outcome: string,
  flags: Readonly<{ isError?: boolean; terminate?: boolean }> = {},
): DashboardToolResult {
  return {
    content: [{ type: "text", text }],
    details: { outcome },
    ...flags,
  };
}

/**
 * Resolves a chart's aliases to table names, asks consent for its filter
 * values as `run_query` does, and runs it on the device. A failed query
 * goes back to the model and asks for escalation.
 */
async function _checkChart(
  context: QueryToolContext,
  block: ChartBlock,
  checkQuery: NonNullable<DataAgentHost["checkQuery"]>,
): Promise<CheckedBlock> {
  const { host, state } = context;
  const sql = SqlTableAlias.applyToSql(block.sql, context.aliases);
  const isApproved = await host.approveValuesForModel({
    values: extractSingleQuotedSqlLiterals(sql),
    reason: "query_filter",
  });
  if (!isApproved) {
    return {
      result: _reply(
        "The user declined the filter values in this chart's query. Tell them they can add it from the Data Explorer instead.",
        "declined",
      ),
    };
  }
  state.queryRuns += 1;
  const outcome = await checkQuery(sql);
  if (outcome.kind !== "failed") {
    return {
      block: { ...block, sql },
      shape: describeQueryShape(outcome.columns, outcome.rowCount),
    };
  }
  state.needsEscalation = true;
  return {
    result: _reply(
      `The chart's query failed (${sanitizeQueryError(outcome.error)}). Fix the SQL and call add_dashboard_block again.`,
      "failed",
      {
        isError: true,
        terminate: state.queryRuns >= MAX_QUERY_RUNS_PER_ANSWER,
      },
    ),
  };
}

/**
 * What the model reads once a block is placed. A chart adds the shape of
 * its result, so a chart with no rows reads as "0 rows".
 */
function _describePlacement(
  kind: "added_to_editor" | "card_shown",
  shape: string | undefined,
): string {
  const placement =
    kind === "added_to_editor"
      ? "Added to the open dashboard (unsaved)."
      : "The card is on the user's screen. Nothing changes until they confirm.";
  return shape ? `${placement} The chart has ${shape}.` : placement;
}

/** What the model reads once the host has placed the block, or could not. */
function _toToolResult(
  outcome: DataAgentDashboardBlockOutcome,
  request: Readonly<{ dashboard: string; summary: string }>,
  context: QueryToolContext,
  shape?: string,
): DashboardToolResult {
  switch (outcome.kind) {
    case "added_to_editor":
    case "card_shown":
      context.state.dashboardBlock = {
        summary: request.summary,
        outcome: outcome.kind,
      };
      return _reply(_describePlacement(outcome.kind, shape), outcome.kind, {
        terminate: true,
      });
    case "no_current":
      return _reply(
        "No dashboard is on this page. Ask the user which dashboard they mean.",
        outcome.kind,
      );
    case "not_found":
      return _reply(
        `No dashboard named "${request.dashboard}" that the user can edit. Tell the user, and ask which dashboard they mean.`,
        outcome.kind,
      );
  }
}

/**
 * The tool that adds one block to a dashboard. It validates the block,
 * checks a chart's SQL on the device, and lets the host place it: unsaved
 * in the open editor, or on a card the user confirms. Either way the turn
 * ends and the tool's summary is the reply. One block per answer.
 */
export function createAddDashboardBlockTool(
  context: QueryToolContext,
): AgentTool<typeof ADD_DASHBOARD_BLOCK_TOOL.parameters> {
  return {
    ...ADD_DASHBOARD_BLOCK_TOOL,
    executionMode: "sequential",
    execute: async (_toolCallId, params) => {
      const { addDashboardBlock, checkQuery } = context.host;
      if (!addDashboardBlock || !checkQuery) {
        return _reply(
          "Dashboards cannot be changed from here. Tell the user.",
          "unavailable",
        );
      }
      if (context.state.dashboardBlock) {
        return _reply(
          "Only one block per answer. Tell the user what else you would add.",
          "second_block",
        );
      }
      const parsed = parseDashboardBlockFields(params.block);
      if (parsed.kind === "invalid") {
        return _reply(`Invalid block: ${parsed.reason}`, "invalid", {
          isError: true,
        });
      }
      const checked: CheckedBlock =
        parsed.block.kind === "DataViz"
          ? await _checkChart(context, parsed.block, checkQuery)
          : { block: parsed.block };
      if ("result" in checked) {
        return checked.result;
      }
      const outcome = await addDashboardBlock({
        dashboard: params.dashboard,
        block: checked.block,
        summary: params.summary,
      });
      return _toToolResult(outcome, params, context, checked.shape);
    },
  };
}
