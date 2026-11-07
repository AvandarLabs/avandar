import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

/** An OpenRouter model id and how hard it should think. */
export type PiEvalModelSpec = { id: string; thinkingLevel: ThinkingLevel };

/**
 * Named model policies the eval can run with `--harness pi --config <name>`.
 * A one-model run needs no entry: pass `--config single --model id@thinking`.
 */
export const PI_EVAL_CONFIGS: Record<
  string,
  { primary: PiEvalModelSpec; escalation?: PiEvalModelSpec }
> = {};
