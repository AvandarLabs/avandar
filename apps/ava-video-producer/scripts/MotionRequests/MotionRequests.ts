import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STOCK_CATALOG,
  stockEntry,
  type StockEntry,
} from "../../src/stock/catalog";
import { STOCK } from "../../src/stock/stockPalette";
import { safeInputFile } from "../lib/planHelpers";
import { buildStockContracts } from "../stock/buildStockContracts/buildStockContracts";
import type { ResolvedStockRequest } from "../../src/stock/contracts/stockRequestSchema/stockRequestSchema";

const ROOT: string = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export type MotionRequest = {
  entry: StockEntry;
  request: ResolvedStockRequest;
  sourceHash: string;
};

/** Resolve stable CLI selections and the optional complete-input file. */
function _parseMotionArgs(args: readonly string[]): {
  command: string;
  entries: StockEntry[];
  inputFile: string | undefined;
} {
  const [command, selection = "all", ...extra] =
    args[0] === "--" ? args.slice(1) : args;
  const hasInput =
    extra.length === 2 && extra[0] === "--input" && Boolean(extra[1]);
  if (
    !["list", "preview", "render"].includes(command) ||
    (extra.length > 0 && !hasInput) ||
    (hasInput && (selection === "all" || command === "list"))
  ) {
    throw new Error(
      "Usage: pnpm motion -- list | preview [all|preset-id] [--input file.json] | render [all|preset-id] [--input file.json]",
    );
  }
  const entries =
    selection === "all" ? [...STOCK_CATALOG] : [stockEntry(selection)];
  return { command, entries, inputFile: hasInput ? extra[1] : undefined };
}

function _freezeSnapshot<Value>(value: Value): Value {
  if (value && typeof value === "object") {
    Object.values(value).forEach((child) => _freezeSnapshot(child));
    Object.freeze(value);
  }
  return value;
}

/** Validate complete authored requests before starting any renderer bundle. */
async function _makeMotionRequestsFromArgs(
  options: Readonly<{
    args: Readonly<ReturnType<typeof _parseMotionArgs>>;
    root?: string;
  }>,
): Promise<MotionRequest[]> {
  const { args, root = ROOT } = options;
  const contracts = await buildStockContracts(root);
  const supplied: unknown = args.inputFile
    ? JSON.parse(
        await fs.readFile(
          await safeInputFile(path.resolve(root, args.inputFile), [".json"]),
          "utf8",
        ),
      )
    : undefined;
  return args.entries.map((entry) => {
    const request = contracts.stockRequestSchema.parse(
      args.inputFile
        ? supplied
        : { preset: entry.id, accent: STOCK.mint, background: STOCK.ground },
    );
    if (request.preset !== entry.id) {
      throw new Error("Input preset must equal the selected CLI preset");
    }
    return {
      entry,
      request: _freezeSnapshot(request),
      sourceHash: contracts.sourceHash,
    };
  });
}
/** Related MotionRequests operations. */
export const MotionRequests = {
  /** Resolve stable CLI selections and the optional complete-input file. */
  parseArgs: _parseMotionArgs,
  /**
   * Validate complete authored requests before starting any renderer bundle.
   */
  fromArgs: _makeMotionRequestsFromArgs,
} satisfies {
  parseArgs: typeof _parseMotionArgs;
  fromArgs: typeof _makeMotionRequestsFromArgs;
};
