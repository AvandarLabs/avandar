import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_DIRECTORIES: string[] = [
  "../../packages/shared/utils/src",
  "src/stock",
  "src/showcase",
  "scripts/stock",
  "scripts/yaml",
  "public/fonts",
  "public/stock",
];
const SOURCE_FILES: string[] = [
  "../../packages/shared/utils/package.json",
  "scripts/lib/withWorkspaceAliases.mjs",
  "tsconfig.json",
  "src/stock-entry.tsx",
  "src/motion.ts",
  "src/theme.css",
  "remotion.config.ts",
  "package.json",
  "../../pnpm-lock.yaml",
  "scripts/render.sh",
  "scripts/render-sequence.mjs",
  "scripts/check-frames.mjs",
  "scripts/motion.ts",
  "scripts/showcase/render.ts",
];
/** Frame samples and fixed canvas geometry used for stock fingerprinting. */
type StockSampleParameters = {
  samples: number[];
  frames: number;
  fps: number;
  width: number;
  height: number;
};

/** Frame evidence and delivery settings shared by stock preview and export. */
const _STOCK_SAMPLE_PARAMETERS: StockSampleParameters = {
  samples: [0, 18, 36, 90, 150, 179],
  frames: 180,
  fps: 30,
  width: 1280,
  height: 800,
};

/**
 * Exact configuration evidence binds content, frame settings and source bytes.
 */
export type StockFingerprint = {
  sourceHash: string;
  configurationHash: string;
};
type StockPreviewOptions = {
  root: string;
  preset: string;
  fingerprint: Readonly<StockFingerprint>;
};
type StockValue =
  | null
  | boolean
  | number
  | string
  | StockValue[]
  | { [key: string]: StockValue };

function _canonicalize(
  options: Readonly<{ value: unknown; ancestors: Set<object> }>,
): StockValue {
  const { value, ancestors } = options;
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "object" || !value || ancestors.has(value)) {
    throw new Error("Unsupported stock value");
  }
  const prototype = Object.getPrototypeOf(value);
  if (
    (!Array.isArray(value) &&
      prototype !== Object.prototype &&
      prototype !== null) ||
    Object.getOwnPropertySymbols(value).length
  ) {
    throw new Error("Unsupported stock value");
  }
  ancestors.add(value);
  try {
    return _canonicalizeObject({ value, ancestors });
  } finally {
    ancestors.delete(value);
  }
}

function _canonicalizeObject(
  options: Readonly<{ value: object; ancestors: Set<object> }>,
): StockValue {
  const { value, ancestors } = options;
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) {
      throw new Error("Unsupported stock value: sparse or extended array");
    }
    return Array.from(value, (child) =>
      _canonicalize({ value: child, ancestors }),
    );
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!Object.hasOwn(descriptor, "value")) {
          throw new Error("Unsupported stock value: accessor");
        }
        return [key, _canonicalize({ value: descriptor.value, ancestors })];
      }),
  );
}

/** Sort plain-object keys recursively and reject lossy JSON values. */
function _getCanonicalStockValueFromValue(value: unknown): StockValue {
  return _canonicalize({ value, ancestors: new Set() });
}

async function _sourceFiles(
  options: Readonly<{ root: string; relative: string }>,
): Promise<string[]> {
  const { root, relative } = options;
  const filename = path.join(root, relative);
  const stat = await (async () => {
    try {
      return await fs.lstat(filename);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  })();
  if (!stat) {
    return [];
  }
  if (
    stat.isSymbolicLink() ||
    (await fs.realpath(filename)) !== path.resolve(filename)
  ) {
    throw new Error("Stock source symlink cannot escape its bounded root");
  }
  if (stat.isFile()) {
    return /\.(?:tsx?|[cm]?js|css|json|ya?ml|svg|woff2?|png|jpe?g|webp|gif)$/.test(
      relative,
    ) && !/\.test\./.test(relative)
      ? [relative]
      : [];
  }
  const children = (await fs.readdir(filename)).filter(
    (name) =>
      !name.startsWith(".") &&
      !["out", "node_modules", "__tests__"].includes(name),
  );
  return (
    await Promise.all(
      children.map((name) =>
        _sourceFiles({ root, relative: `${relative}/${name}` }),
      ),
    )
  ).flat();
}

/**
 * Only bounded stock dependencies and assets are read, never env or outputs.
 */
async function _getStockSourceHashFromRoot(root: string): Promise<string> {
  root = await fs.realpath(root);
  const discovered = await Promise.all(
    SOURCE_DIRECTORIES.map((directory) =>
      _sourceFiles({ root, relative: directory }),
    ),
  );
  const optional = await Promise.all(
    SOURCE_FILES.map(async (file) => {
      try {
        await fs.lstat(path.join(root, file));
        return file;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
        return undefined;
      }
    }),
  );
  const files = [
    ...discovered.flat(),
    ...optional.filter((file): file is string => file !== undefined),
  ].sort();
  const hash = createHash("sha256");
  await files.reduce(async (previous, file) => {
    await previous;
    const filename = path.join(root, file);
    const resolved = await fs.realpath(filename);
    if (resolved !== path.resolve(filename)) {
      throw new Error("Stock source file cannot be a symlink");
    }
    const bytes = await fs.readFile(filename);
    hash.update(JSON.stringify([file, bytes.length])).update(bytes);
  }, Promise.resolve());
  return hash.digest("hex");
}
/** Inputs for createStockFingerprint. */
type CreateStockFingerprintOptions = {
  root: string;
  request: unknown;
  parameters?: unknown;
  expectedSourceHash?: string;
};

/**
 * Hash canonical resolved content with ordered frame samples and source bytes.
 */
async function _makeStockFingerprintFromRequest(
  options: Readonly<CreateStockFingerprintOptions>,
): Promise<StockFingerprint> {
  const { root, request, parameters = _STOCK_SAMPLE_PARAMETERS } = options;
  const sourceHash = await _getStockSourceHashFromRoot(root);
  if (options.expectedSourceHash && options.expectedSourceHash !== sourceHash) {
    throw new Error(
      "Stock sources changed during request resolution; reload the input",
    );
  }
  const serialized = JSON.stringify(
    _getCanonicalStockValueFromValue({ request, parameters, sourceHash }),
  );
  return {
    sourceHash,
    configurationHash: createHash("sha256").update(serialized).digest("hex"),
  };
}

/**
 * Refuse source changes before accepting completed preview or export output.
 */
async function _verifyStockSources(
  options: Readonly<{ root: string; sourceHash: string }>,
): Promise<void> {
  const { root, sourceHash } = options;
  if ((await _getStockSourceHashFromRoot(root)) !== sourceHash) {
    throw new Error(
      "Stock renderer changed during preview or render; regenerate it",
    );
  }
}

/**
 * Each content/source configuration owns a separate immutable evidence path.
 */
function _getStockPreviewDirectoryFromOptions(
  options: Readonly<StockPreviewOptions>,
): string {
  const { root, preset, fingerprint } = options;
  if (
    !/^[a-z][a-z0-9-]*$/.test(preset) ||
    !/^[a-f0-9]{64}$/.test(fingerprint.configurationHash)
  ) {
    throw new Error("Invalid stock preview identity");
  }
  return path.join(
    root,
    "out/motion/preview",
    preset,
    fingerprint.configurationHash,
  );
}

/** Locate complete evidence only for the exact selected configuration. */
async function _requireStockPreview(
  options: Readonly<StockPreviewOptions>,
): Promise<string> {
  const { root, preset, fingerprint } = options;
  const directory = _getStockPreviewDirectoryFromOptions({
    root,
    preset,
    fingerprint,
  });
  try {
    const manifest = JSON.parse(
      await fs.readFile(path.join(directory, "manifest.json"), "utf8"),
    );
    if (
      !manifest.complete ||
      JSON.stringify(_getCanonicalStockValueFromValue(manifest.fingerprint)) !==
        JSON.stringify(_getCanonicalStockValueFromValue(fingerprint))
    ) {
      throw new Error("Preview is stale");
    }
    await fs.access(path.join(directory, "contact-sheet.jpg"));
  } catch {
    throw new Error(`Run and inspect matching preview first: ${preset}`);
  }
  return directory;
}

/** Related stock fingerprint module operations. */
export const StockFingerprintModule = {
  /**
   * Frame evidence and delivery settings shared by stock preview and export.
   */
  SAMPLE_PARAMETERS: _STOCK_SAMPLE_PARAMETERS,
  /** Sort plain-object keys recursively and reject lossy JSON values. */
  getCanonicalValueFromValue: _getCanonicalStockValueFromValue,
  /**
   * Only bounded stock dependencies and assets are read, never env or outputs.
   */
  getSourceHashFromRoot: _getStockSourceHashFromRoot,
  /**
   * Hash canonical resolved content with ordered frame samples and source
   * bytes.
   */
  fromRequest: _makeStockFingerprintFromRequest,
  /**
   * Refuse source changes before accepting completed preview or export output.
   */
  verifySources: _verifyStockSources,
  /**
   * Each content/source configuration owns a separate immutable evidence path.
   */
  getPreviewDirectoryFromOptions: _getStockPreviewDirectoryFromOptions,
  /** Locate complete evidence only for the exact selected configuration. */
  requirePreview: _requireStockPreview,
} satisfies {
  SAMPLE_PARAMETERS: StockSampleParameters;
  getCanonicalValueFromValue: typeof _getCanonicalStockValueFromValue;
  getSourceHashFromRoot: typeof _getStockSourceHashFromRoot;
  fromRequest: typeof _makeStockFingerprintFromRequest;
  verifySources: typeof _verifyStockSources;
  getPreviewDirectoryFromOptions: typeof _getStockPreviewDirectoryFromOptions;
  requirePreview: typeof _requireStockPreview;
};
