import { PLUGIN_AI_TOOLS } from "$/agent/dataAgent/pluginAiTools.gen";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { runPluginAiTool } from "@/lib/plugins/runPluginAiTool/runPluginAiTool";
import { runFitRegressionTool } from "../../../../plugins/epidemiology/src/fitRegression/runFitRegression";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { EvalQuestion } from "../../EvalQuestion";
import type { RunPluginAiTool } from "@/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool";
import type {
  AgentToolContext,
  AvandarApi,
  DataExplorerToolbarContext,
} from "@avandar/plugin-sdk";

const FIT_REGRESSION_DECLARATION: PluginAiToolDeclaration | undefined =
  PLUGIN_AI_TOOLS.find((declaration) => {
    return declaration.name === "fitRegression";
  });

/**
 * The plugin AI tools the eval offers: the epidemiology `fitRegression`
 * declaration while a question has published a result to the Data Explorer
 * store, and none otherwise. Other questions keep the tool set they had.
 */
export function getEvalPluginAiTools(): readonly PluginAiToolDeclaration[] {
  if (!FIT_REGRESSION_DECLARATION || !ExplorerPluginResultStore.get()) {
    return [];
  }
  return [FIT_REGRESSION_DECLARATION];
}

/** Just enough of the plugin API for `fitRegression` to read the rows. */
function _createEvalAvandarApi(context: AgentToolContext): AvandarApi {
  return {
    context,
    data: {
      fetchRows: async (handle: unknown) => {
        const rows = QueryHandleRegistry.getRows(
          handle as AgentToolContext["queryHandle"],
        );
        return { rows: rows ?? [], isTruncated: false };
      },
    },
  } as unknown as AvandarApi;
}

/**
 * Runs a plugin AI tool the model calls against the result the question
 * published, as the chat does on the Data Explorer, with the plugin's real
 * handler.
 */
export const runEvalPluginAiTool: RunPluginAiTool = (request) => {
  return runPluginAiTool({
    ...request,
    isDataExplorer: true,
    chatResults: [],
    runQuery: async () => {
      return { error: "The eval has no chat results to run again." };
    },
    invoke: async (context, args) => {
      return runFitRegressionTool(_createEvalAvandarApi(context), args);
    },
  });
};

/** Publishes a question's rows as the Data Explorer's result. */
export function publishFitRegressionResult(
  fitRegression: NonNullable<EvalQuestion["fitRegression"]>,
): void {
  const columns: DataExplorerToolbarContext["columns"] =
    fitRegression.columns.map((name) => {
      return { name, dataType: "double" as const };
    });
  ExplorerPluginResultStore.set({ columns, rows: fitRegression.rows });
}
