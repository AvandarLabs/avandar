import { COVID_WORKSPACE_SCHEMA } from "../covid/covidWorkspace";
import { DenoChatTurnRunner } from "../harnesses/baseline/DenoChatTurnRunner";
import type { PreparedPdfAssistCase } from "./preparePdfAssistCase";

/** What one setup returned for one region. */
export type PdfAssistReply = { text: string; cost: number; error?: string };

/** A way of getting the assistant's answer for a region. */
export type PdfAssistSetup = {
  extract: (prepared: PreparedPdfAssistCase) => Promise<PdfAssistReply>;
  close: () => Promise<void>;
};

/**
 * The app's path before this eval: the prompt as a user message to the
 * `chat` edge function in the Data Sources context, which answers under its
 * full analyst system prompt for a workspace with data (the COVID schema).
 */
function _createChatRouteSetup(
  options: Readonly<{
    model: string;
    repoRoot: string;
    openRouterApiKey: string;
  }>,
): PdfAssistSetup {
  const runner = new DenoChatTurnRunner({
    repoRoot: options.repoRoot,
    openRouterApiKey: options.openRouterApiKey,
  });
  return {
    extract: async (prepared) => {
      const response = await runner.runTurn({
        messages: [{ role: "user", content: prepared.prompt }],
        context: { app: "data-sources" },
        model: options.model,
        retryContext: undefined,
        schema: COVID_WORKSPACE_SCHEMA,
      });
      return {
        text: response.result?.assistantText ?? "",
        cost: response.usage?.cost ?? 0,
        error: response.error,
      };
    },
    close: async () => {
      runner.close();
    },
  };
}

/**
 * The assistant's own route (`PostExtractMeasurements`): the server's
 * extraction prompt and no tools, run through the same Deno code.
 */
function _createExtractRouteSetup(
  options: Readonly<{
    model: string;
    repoRoot: string;
    openRouterApiKey: string;
  }>,
): PdfAssistSetup {
  const runner = new DenoChatTurnRunner({
    repoRoot: options.repoRoot,
    openRouterApiKey: options.openRouterApiKey,
  });
  return {
    extract: async (prepared) => {
      const response = await runner.runExtraction({
        regionText: prepared.regionText,
        alreadyExtracted: prepared.ruleResults.map((figure) => {
          return { metric: figure.metric, value: figure.value };
        }),
        model: options.model,
      });
      return {
        text: response.text ?? "",
        cost: response.usage?.cost ?? 0,
        error: response.error,
      };
    },
    close: async () => {
      runner.close();
    },
  };
}

/** Builds the named setup. */
export function createPdfAssistSetup(
  options: Readonly<{
    name: string;
    model: string;
    repoRoot: string;
    openRouterApiKey: string;
  }>,
): PdfAssistSetup {
  if (options.name === "chat-route") {
    return _createChatRouteSetup(options);
  }
  if (options.name === "extract-route") {
    return _createExtractRouteSetup(options);
  }
  throw new Error(`Unknown PDF assist setup "${options.name}"`);
}
