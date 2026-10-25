import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { getPipelineServerClientConfig } from "@ava-cli/PipelineCli/getPipelineServerClientConfig";
import { findAvandarRepoRoot } from "@ava-cli/PipelineCli/runPipelineLocal";
import { z } from "zod";

/** One drive's live scope keys, as a pipeline declares them today. */
export type LiveDriveScopes = Readonly<{
  driveKey: string;
  scopeKeys: readonly string[];
}>;

/** `GET /:pipelineName/scopes`'s body, which the local script also prints. */
const LiveScopesBodySchema = z.object({
  drives: z.array(
    z.object({ driveKey: z.string(), scopeKeys: z.array(z.string()) }),
  ),
});

/** How much of an unreadable answer an error message quotes. */
const MAX_QUOTED_LENGTH = 200;

/**
 * Parses what the server or the local script answered. Throws an error that
 * names the pipeline, the source, and the start of the text, with the JSON
 * or schema error as its `cause`.
 */
function _parseLiveScopesBody(args: {
  text: string;
  pipelineName: string;
  source: string;
}): readonly LiveDriveScopes[] {
  try {
    return LiveScopesBodySchema.parse(JSON.parse(args.text)).drives;
  } catch (error: unknown) {
    const quoted = args.text.trim().slice(0, MAX_QUOTED_LENGTH);
    throw new Error(
      `Could not read the ${args.pipelineName} pipeline's scopes from ${args.source}. It answered: ${JSON.stringify(quoted)}`,
      { cause: error },
    );
  }
}

async function _fetchServerScopes(
  pipelineName: string,
): Promise<readonly LiveDriveScopes[]> {
  const config = getPipelineServerClientConfig();
  const response = await fetch(
    `${config.baseURL}/${encodeURIComponent(pipelineName)}/scopes`,
    { headers: { authorization: `Bearer ${config.serverSecret}` } },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `The pipeline server answered ${response.status} listing the ${pipelineName} pipeline's scopes: ${text}`,
    );
  }
  return _parseLiveScopesBody({
    text,
    pipelineName,
    source: "the pipeline server",
  });
}

function _readLocalScopes(pipelineName: string): readonly LiveDriveScopes[] {
  const repoRoot = findAvandarRepoRoot();
  if (repoRoot === undefined) {
    throw new Error(
      "Could not find the Avandar repo root. Run this command from inside the repository.",
    );
  }
  const spawnResult = spawnSync(
    "pnpm",
    [
      "exec",
      "vite-node",
      "--config",
      "vite.script.config.ts",
      join(repoRoot, "scripts", "listPipelineScopes.ts"),
      pipelineName,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (spawnResult.error) {
    throw spawnResult.error;
  }
  if (spawnResult.status !== 0) {
    throw new Error(
      `Listing the ${pipelineName} pipeline's scopes locally failed: ${(spawnResult.stderr ?? "").trim()}`,
    );
  }
  const lastLine = (spawnResult.stdout ?? "").trim().split("\n").at(-1) ?? "";
  return _parseLiveScopesBody({
    text: lastLine,
    pipelineName,
    source: "scripts/listPipelineScopes.ts",
  });
}

/**
 * Lists a pipeline's live scopes: from the pipeline server named by the
 * loaded env file, or with `local`, from this checkout's code through
 * `scripts/listPipelineScopes.ts`.
 *
 * @throws When the server or the script fails, or answers in another shape.
 */
export async function fetchLivePipelineScopes(options: {
  pipelineName: string;
  local: boolean;
}): Promise<readonly LiveDriveScopes[]> {
  return options.local
    ? _readLocalScopes(options.pipelineName)
    : await _fetchServerScopes(options.pipelineName);
}
