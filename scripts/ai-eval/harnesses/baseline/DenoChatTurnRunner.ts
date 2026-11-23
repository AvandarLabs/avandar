import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { EvalUsage } from "../EvalHarness";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

/** The request `supabase/functions/_eval/runChatTurnCli.ts` reads per line. */
export type DenoChatTurn = {
  messages: ReadonlyArray<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  context: Record<string, unknown>;
  model: string;
  retryContext: undefined;
  schema: unknown;
};

/** A PDF assistant extraction request (`runMeasurementExtraction`). */
export type DenoExtraction = {
  regionText: string;
  alreadyExtracted: ReadonlyArray<{ metric: string; value: number }>;
  model: string;
};

/** The extraction's reply text, usage, and latency. */
export type DenoExtractionResponse = {
  text?: string;
  usage?: EvalUsage;
  error?: string;
  latencyMs: number;
};

/** The edge function's response for one turn, plus usage and latency. */
export type DenoChatTurnResponse = {
  result?: {
    assistantText: string;
    generatedSql?: { sql: string };
    clarification?: {
      question: string;
      responseShape:
        | { kind: "free_text" }
        | { kind: "fixed_options"; options: string[]; multi: boolean }
        | {
            kind: "discovery";
            query: string;
            column: string;
            multi: boolean;
            candidateValues: string[];
            candidateGroups?: string[][];
          };
    };
    dashboardBlock?: { kind: string; sql?: string; vizType?: string };
  };
  usage?: EvalUsage;
  error?: string;
  latencyMs: number;
};

type PendingTurn = (
  response: DenoChatTurnResponse & DenoExtractionResponse,
) => void;

/**
 * One long-lived Deno process that runs `chat` edge function turns for the
 * baseline harness. Turns run concurrently and are matched back by id.
 */
export class DenoChatTurnRunner {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<string, PendingTurn>();
  private nextId = 0;

  constructor(
    options: Readonly<{ repoRoot: string; openRouterApiKey: string }>,
  ) {
    this.process = spawn(
      "deno",
      [
        "run",
        "--allow-env",
        "--allow-net",
        "--allow-read",
        "--config",
        "supabase/functions/chat/deno.json",
        "supabase/functions/_eval/runChatTurnCli.ts",
      ],
      {
        cwd: options.repoRoot,
        env: { ...process.env, OPEN_ROUTER_API_KEY: options.openRouterApiKey },
      },
    );
    this.process.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (
        !/^(Download|Warning|Check)|experimentalDecorators/.test(text.trim())
      ) {
        process.stderr.write(`[deno] ${text}`);
      }
    });
    this.process.on("exit", (code) => {
      for (const [id, resolvePending] of this.pending) {
        resolvePending({
          error: `Deno exited with code ${code}`,
          latencyMs: 0,
        });
        this.pending.delete(id);
      }
    });
    createInterface({ input: this.process.stdout }).on("line", (line) => {
      const response = JSON.parse(line) as DenoChatTurnResponse & {
        id: string;
      };
      this.pending.get(response.id)?.(response);
      this.pending.delete(response.id);
    });
  }

  /** Runs one turn and resolves with the edge function's response. */
  runTurn(turn: DenoChatTurn): Promise<DenoChatTurnResponse> {
    return this._send({ turn });
  }

  /** Runs one PDF assistant extraction on the server's code. */
  runExtraction(extraction: DenoExtraction): Promise<DenoExtractionResponse> {
    return this._send({ extraction });
  }

  private _send(
    payload: Record<string, unknown>,
  ): Promise<DenoChatTurnResponse & DenoExtractionResponse> {
    this.nextId += 1;
    const id = String(this.nextId);
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.process.stdin.write(`${JSON.stringify({ id, ...payload })}\n`);
    });
  }

  /** Stops the Deno process. */
  close(): void {
    this.process.stdin.end();
    this.process.kill();
  }
}
