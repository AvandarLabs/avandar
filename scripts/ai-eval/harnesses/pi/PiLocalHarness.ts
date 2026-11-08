import { createOfflineDataAgent } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";
import { COVID_DATASETS } from "../../covid/covidWorkspace";
import { WebLlmBrowser } from "../../runtime/WebLlmBrowser";
import { createPiConversation } from "./PiHarness";
import type { EvalDatabase } from "../../runtime/EvalDatabase";
import type { EvalHarness } from "../EvalHarness";
import type { OfflineDataAgentModels } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";

/** The context window the app gives offline models. */
const LOCAL_CONTEXT_WINDOW = 8192;

/**
 * Named offline model sets for `--harness pi-local --config <name>`. Each
 * value is a WebLLM model id. A one-model run needs no entry: pass
 * `--config single --model <WebLLM id>`, which also routes with that model,
 * or `--config plan --model <WebLLM id>` to answer with query plans.
 */
const PI_LOCAL_EVAL_CONFIGS: Record<string, OfflineDataAgentModels> = {};

/**
 * The offline harness: the app's offline data agent, with its model calls
 * answered by WebLLM in a headless Chromium (WebGPU), as the app does
 * offline.
 */
export async function createPiLocalHarness(
  options: Readonly<{
    repoRoot: string;
    database: EvalDatabase;
    configName: string;
    model: string;
  }>,
): Promise<EvalHarness> {
  const isPlan = options.configName === "plan";
  const isSingle =
    isPlan ||
    options.configName === "single" ||
    options.configName === "default";
  const models = isSingle
    ? { answer: options.model, router: options.model }
    : PI_LOCAL_EVAL_CONFIGS[options.configName];
  if (!models) {
    throw new Error(`Unknown local eval config "${options.configName}"`);
  }
  const browser = await WebLlmBrowser.open(options.repoRoot);
  return {
    label: isSingle
      ? `pi-local:${options.model}${isPlan ? ":plan" : ""}`
      : `pi-local:${options.configName}`,
    startConversation: () => {
      return createPiConversation({
        database: options.database,
        createAgent: (host) => {
          return createOfflineDataAgent({
            datasets: COVID_DATASETS,
            host,
            llm: browser,
            models,
            contextWindow: LOCAL_CONTEXT_WINDOW,
            today: new Date().toISOString().slice(0, 10),
            queryStyle: isPlan ? "plan" : "sql",
          });
        },
      });
    },
    close: async () => {
      await browser.close();
    },
  };
}
