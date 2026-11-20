import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STOCK_CATALOG,
  stockEntry,
  type StockEntry,
} from "../../src/stock/catalog";
import { safeInputFile } from "../lib/planHelpers/planHelpers";
import { buildStockContracts } from "../stock/buildStockContracts/buildStockContracts";
import { loadVideoThemeSnapshot } from "../videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot";
import type { ResolvedStockRequest } from "../../src/stock/contracts/stockRequestSchema/stockRequestSchema";
import type { VideoThemeSnapshot } from "../../src/videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";

const ROOT: string = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export type MotionRequest = {
  entry: StockEntry;
  request: ResolvedStockRequest;
  sourceHash: string;
  theme: VideoThemeSnapshot;
};

const MOTION_USAGE =
  "Usage: pnpm motion -- list | preview [all|preset-id] [--input file.json] [--theme id] | render [all|preset-id] [--input file.json] [--theme id]";

function _parseFlags(
  extra: readonly string[],
): Readonly<Record<string, string>> {
  const pairs = Array.from(
    { length: Math.ceil(extra.length / 2) },
    (_, pairIndex): [string, string] => {
      return [extra[pairIndex * 2], extra[pairIndex * 2 + 1]];
    },
  );
  const isInvalid = pairs.some(([flag, value], pairIndex) => {
    return (
      !["--input", "--theme"].includes(flag) ||
      !value ||
      pairs.findIndex(([otherFlag]) => {
        return otherFlag === flag;
      }) !== pairIndex
    );
  });
  if (isInvalid) {
    throw new Error(MOTION_USAGE);
  }
  return Object.fromEntries(pairs);
}

/**
 * Resolve stable CLI selections, the optional complete-input file, and the
 * theme.
 */
function _parseMotionArgs(args: readonly string[]): {
  command: string;
  entries: StockEntry[];
  inputFile: string | undefined;
  themeId: string;
} {
  const [command, selection = "all", ...extra] =
    args[0] === "--" ? args.slice(1) : args;
  const flags = _parseFlags(extra);
  const hasInput = "--input" in flags;
  if (
    !["list", "preview", "render"].includes(command) ||
    (command === "list" && extra.length > 0) ||
    (hasInput && selection === "all")
  ) {
    throw new Error(MOTION_USAGE);
  }
  const entries =
    selection === "all" ? [...STOCK_CATALOG] : [stockEntry(selection)];
  return {
    command,
    entries,
    inputFile: flags["--input"],
    themeId: flags["--theme"] ?? "classic",
  };
}

function _freezeSnapshot<Value>(value: Value): Value {
  if (value && typeof value === "object") {
    Object.values(value).forEach((child) => {
      return _freezeSnapshot(child);
    });
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
  const theme = await loadVideoThemeSnapshot({ id: args.themeId });
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
      args.inputFile ? supplied : { preset: entry.id },
    );
    if (request.preset !== entry.id) {
      throw new Error("Input preset must equal the selected CLI preset");
    }
    return {
      entry,
      request: _freezeSnapshot(request),
      sourceHash: contracts.sourceHash,
      theme,
    };
  });
}
/** Related MotionRequests operations. */
export const MotionRequests = {
  /**
   * Resolve stable CLI selections, the optional complete-input file, and the
   * theme.
   */
  parseArgs: _parseMotionArgs,
  /**
   * Validate complete authored requests before starting any renderer bundle.
   */
  fromArgs: _makeMotionRequestsFromArgs,
} satisfies {
  parseArgs: typeof _parseMotionArgs;
  fromArgs: typeof _makeMotionRequestsFromArgs;
};
