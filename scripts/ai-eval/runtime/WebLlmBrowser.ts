import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import type {
  LocalLlm,
  LocalLlmCompletion,
  LocalLlmRequest,
} from "@/lib/agent/localModels/LocalLlm";
import type { BrowserContext, Page } from "@playwright/test";
import type { Server } from "node:http";

/** The context window the app gives offline models (`buildWebLlmChatOpts`). */
const EVAL_CONTEXT_WINDOW = 8192;

/**
 * The page the models run in. It loads WebLLM, keeps one engine, swaps the
 * resident model when a request names another, and decodes under the
 * request's JSON Schema when there is one.
 */
const PAGE_HTML = `<!doctype html><html><body><script type="module">
import * as webllm from "/web-llm.js";
const engine = new webllm.MLCEngine({
  initProgressCallback: (report) => console.log("[webllm] " + report.text),
});
let loadedModelId;
window.__complete = async (request) => {
  if (loadedModelId !== request.modelId) {
    await engine.reload(request.modelId, { context_window_size: ${EVAL_CONTEXT_WINDOW} });
    loadedModelId = request.modelId;
  }
  const reply = await engine.chat.completions.create({
    messages: request.messages,
    max_tokens: request.maxTokens,
    temperature: request.temperature ?? 0,
    response_format: request.jsonSchema
      ? { type: "json_object", schema: JSON.stringify(request.jsonSchema) }
      : undefined,
    extra_body: { enable_thinking: false },
  });
  return {
    text: reply.choices[0]?.message?.content ?? "",
    promptTokens: reply.usage?.prompt_tokens ?? 0,
    completionTokens: reply.usage?.completion_tokens ?? 0,
  };
};
window.__ready = true;
</script></body></html>`;

function _startServer(repoRoot: string): Promise<Server> {
  const webLlmPath = join(
    repoRoot,
    "node_modules/@mlc-ai/web-llm/lib/index.js",
  );
  const server = createServer((request, response) => {
    if (request.url === "/web-llm.js") {
      response.setHeader("content-type", "text/javascript");
      response.end(readFileSync(webLlmPath));
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(PAGE_HTML);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

/**
 * WebLLM in a headless Chromium with WebGPU, for evaluating the offline
 * agent on the same engine, models, and quantization the app runs. Models
 * download once into a persistent profile under `.temp/ai-eval/`. Requests
 * run one at a time because there is one GPU.
 */
export class WebLlmBrowser implements LocalLlm {
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly server: Server,
    private readonly context: BrowserContext,
    private readonly page: Page,
  ) {}

  static async open(repoRoot: string): Promise<WebLlmBrowser> {
    const server = await _startServer(repoRoot);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    // The full Chromium build (not the headless shell) exposes Metal WebGPU
    // with shader-f16 in headless mode.
    const context = await chromium.launchPersistentContext(
      join(repoRoot, ".temp/ai-eval/webllm-profile"),
      { channel: "chromium", headless: true, args: ["--enable-unsafe-webgpu"] },
    );
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.text().startsWith("[webllm]")) {
        process.stderr.write(`${message.text()}\r`);
      }
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction("window.__ready === true");
    return new WebLlmBrowser(server, context, page);
  }

  complete(request: Readonly<LocalLlmRequest>): Promise<LocalLlmCompletion> {
    const run = this.queue.then(() => {
      return this.page.evaluate((pageRequest) => {
        const pageWindow = window as unknown as {
          __complete: (input: unknown) => Promise<LocalLlmCompletion>;
        };
        return pageWindow.__complete(pageRequest);
      }, request);
    });
    this.queue = run.catch(() => {});
    return run;
  }

  async close(): Promise<void> {
    await this.context.close();
    this.server.close();
  }
}
