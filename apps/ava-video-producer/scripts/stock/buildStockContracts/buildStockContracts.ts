import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { ensureDirectory } from "../../lib/planHelpers";
import { yamlPlugin } from "../../yaml/yamlPlugin/yamlPlugin";
import { buildStockMessages } from "../buildStockMessages/buildStockMessages";
import { StockFingerprintModule } from "../StockFingerprintModule/StockFingerprintModule";

type Contracts = Pick<
  typeof import("../../../src/stock/catalog"),
  "STOCK_CATALOG" | "STOCK_FPS"
> &
  Pick<
    typeof import("../../../src/stock/contracts/stockRequestSchema/stockRequestSchema"),
    "stockRequestSchema"
  >;
/** Data for StockContractGeneration. */
type StockContractGenerationResult = {
  hash: string;
  filename: string;
  sourceHash: string;
  retain: () => () => Promise<void>;
};

/** Immutable renderer-free defaults and validators, retained by active jobs. */
export type StockContractGeneration = Contracts & StockContractGenerationResult;
type GenerationInput = {
  root: string;
  hash: string;
  contents: Uint8Array;
  sourceHash: string;
};
type GenerationState = {
  generation: StockContractGeneration;
  references: number;
};
const pendingLifecycleOperations: Map<string, Promise<unknown>> = new Map<
  string,
  Promise<unknown>
>();
const generations: Map<
  string,
  { latest: string; entries: Map<string, GenerationState> }
> = new Map<
  string,
  { latest: string; entries: Map<string, GenerationState> }
>();

function _enqueueLifecycleOperation<Result>(
  options: Readonly<{ root: string; action: () => Promise<Result> }>,
): Promise<Result> {
  const previous =
    pendingLifecycleOperations.get(options.root) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(options.action);
  pendingLifecycleOperations.set(options.root, pending);
  return pending;
}

async function _cleanup(root: string): Promise<void> {
  const state = generations.get(root)!;
  await Promise.all(
    [...state.entries].map(async ([hash, entry]) => {
      if (hash !== state.latest && entry.references === 0) {
        state.entries.delete(hash);
        await fs.rm(entry.generation.filename, { force: true });
      }
    }),
  );
}

function _retainGeneration(
  options: Readonly<{ root: string; entry: GenerationState }>,
): () => Promise<void> {
  const { root, entry } = options;
  entry.references += 1;
  let released = false;
  return async () => {
    if (!released) {
      released = true;
      await _enqueueLifecycleOperation({
        root,
        action: async () => {
          entry.references -= 1;
          await _cleanup(root);
        },
      });
    }
  };
}

async function _createGeneration(
  options: Readonly<GenerationInput>,
): Promise<GenerationState> {
  const { root, hash, contents, sourceHash } = options;
  const directory = await ensureDirectory(root, "out/showcase/contracts");
  const filename = path.join(directory, `${hash}.mjs`);
  const temporary = path.join(directory, `${hash}-${randomUUID()}.tmp`);
  await fs.writeFile(temporary, contents, { flag: "wx" });
  await fs.rename(temporary, filename);
  const contracts: Contracts = await import(pathToFileURL(filename).href);
  const entry: GenerationState = {
    references: 0,
    generation: {
      ...contracts,
      hash,
      filename,
      sourceHash,
      retain: () => _retainGeneration({ root, entry }),
    },
  };
  return entry;
}

async function _loadGeneration(
  options: Readonly<GenerationInput>,
): Promise<StockContractGeneration> {
  const { root, hash, contents, sourceHash } = options;
  const state = generations.get(root) ?? {
    latest: hash,
    entries: new Map<string, GenerationState>(),
  };
  generations.set(root, state);
  const existing = state.entries.get(hash);
  if (existing) {
    state.latest = hash;
    await _cleanup(root);
    return { ...existing.generation, sourceHash };
  }
  const entry = await _createGeneration({
    root,
    hash,
    contents,
    sourceHash,
  });
  state.latest = hash;
  state.entries.set(hash, entry);
  await _cleanup(root);
  return entry.generation;
}

async function _dependencyHash(
  options: Readonly<{
    root: string;
    files: readonly string[];
    contents: Uint8Array;
  }>,
): Promise<string> {
  const { root, files, contents } = options;
  const hash = createHash("sha256");
  await files
    .filter((file) => file !== "stock-contract-generation.ts")
    .sort()
    .reduce(async (previous, file) => {
      await previous;
      const filename = await fs.realpath(path.resolve(root, file));
      if (
        !filename.startsWith(`${path.resolve(root, "src/stock")}${path.sep}`) ||
        /\.tsx$/.test(filename)
      ) {
        throw new Error(
          "Stock contract dependencies must be renderer-free files inside src/stock",
        );
      }
      const bytes = await fs.readFile(filename);
      hash.update(JSON.stringify([file, bytes.length])).update(bytes);
    }, Promise.resolve());
  return hash.update(contents).digest("hex");
}

async function _buildGeneration(
  root: string,
): Promise<StockContractGeneration> {
  await buildStockMessages(root);
  const sourceHash = await StockFingerprintModule.getSourceHashFromRoot(root);
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents:
        'export { STOCK_CATALOG, STOCK_FPS } from "./src/stock/catalog"; export { stockRequestSchema } from "./src/stock/contracts/stockRequestSchema/stockRequestSchema";',
      resolveDir: root,
      sourcefile: "stock-contract-generation.ts",
    },
    bundle: true,
    plugins: [yamlPlugin],
    format: "esm",
    platform: "node",
    packages: "external",
    write: false,
    metafile: true,
    logLevel: "silent",
  });
  const contents = result.outputFiles[0].contents;
  const hash = await _dependencyHash({
    root,
    files: Object.keys(result.metafile.inputs),
    contents,
  });
  await StockFingerprintModule.verifySources({ root, sourceHash });
  return _loadGeneration({ root, hash, contents, sourceHash });
}

/**
 * Bundle nested contract dependencies into one content-addressed Node module.
 */
export async function buildStockContracts(
  root: string,
): Promise<StockContractGeneration> {
  root = await fs.realpath(root);
  return _enqueueLifecycleOperation({
    root,
    action: () => _buildGeneration(root),
  });
}
