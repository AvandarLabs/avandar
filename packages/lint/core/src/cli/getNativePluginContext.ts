import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OFFICIAL_PLUGIN = "@avandar/lint-typescript/oxlint";
type PluginContext = { isSupported: boolean; hasOfficialRegistration: boolean };
type PackageMetadata = { directory: string; manifest: Record<string, unknown> };

function _isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function _findPackage(directory: string): PackageMetadata | undefined {
  const path = join(directory, "package.json");
  if (existsSync(path)) {
    const manifest: unknown = JSON.parse(readFileSync(path, "utf8"));
    return _isRecord(manifest) ? { directory, manifest } : undefined;
  }
  const parent = dirname(directory);
  return parent === directory ? undefined : _findPackage(parent);
}

function _getInstalledPackage(origin: string): PackageMetadata | undefined {
  const enclosing = _findPackage(dirname(origin));
  if (enclosing?.manifest.name === "@avandar/lint-typescript") {
    return enclosing;
  }
  const path = createRequire(origin)
    .resolve.paths(OFFICIAL_PLUGIN)
    ?.map((directory) => {
      return join(directory, "@avandar/lint-typescript/package.json");
    })
    .find((candidate) => {
      return existsSync(candidate);
    });
  if (!path) {
    return undefined;
  }
  const manifest: unknown = JSON.parse(readFileSync(path, "utf8"));
  return _isRecord(manifest)
    ? { directory: dirname(path), manifest }
    : undefined;
}

function _getStaticPublicEntry(origin: string): string | undefined {
  const entry = realpathSync(createRequire(origin).resolve(OFFICIAL_PLUGIN));
  const installed = _getInstalledPackage(origin);
  const host = _findPackage(dirname(fileURLToPath(import.meta.url)));
  if (
    !installed ||
    typeof host?.manifest.version !== "string" ||
    installed.manifest.name !== "@avandar/lint-typescript" ||
    installed.manifest.version !== host?.manifest.version ||
    !_isRecord(installed.manifest.exports)
  ) {
    return undefined;
  }
  const exported = installed.manifest.exports["./oxlint"];
  const target =
    typeof exported === "string"
      ? exported
      : _isRecord(exported) &&
          Object.keys(exported).every((key) => {
            return ["types", "default"].includes(key);
          })
        ? exported.default
        : undefined;
  return typeof target === "string" &&
    realpathSync(resolve(installed.directory, target)) === entry
    ? entry
    : undefined;
}

function _isOfficialDeclaration(
  plugin: unknown,
  origin: string,
  expected: string | undefined,
): boolean {
  if (
    !expected ||
    !_isRecord(plugin) ||
    plugin.name !== "avandar" ||
    typeof plugin.specifier !== "string"
  ) {
    return false;
  }
  try {
    if (plugin.specifier === OFFICIAL_PLUGIN) {
      return _getStaticPublicEntry(origin) === expected;
    }
    if (
      (!plugin.specifier.startsWith(".") && !isAbsolute(plugin.specifier)) ||
      !/\.m?js$/.test(plugin.specifier)
    ) {
      return false;
    }
    return (
      realpathSync(createRequire(origin).resolve(plugin.specifier)) === expected
    );
  } catch {
    return false;
  }
}

function _getKnownEntry(): string | undefined {
  try {
    return _getStaticPublicEntry(fileURLToPath(import.meta.url));
  } catch {
    return undefined;
  }
}

function _getDeclarationContext(
  plugins: unknown,
  origin: string,
  expected: string | undefined,
): PluginContext {
  if (plugins === undefined || (Array.isArray(plugins) && !plugins.length)) {
    return { isSupported: true, hasOfficialRegistration: false };
  }
  if (!Array.isArray(plugins)) {
    return { isSupported: false, hasOfficialRegistration: false };
  }
  const hasOfficialRegistration = plugins.some((plugin) => {
    return _isOfficialDeclaration(plugin, origin, expected);
  });
  // Every nonempty declaration group must reserve the canonical namespace with
  // the known implementation. Duplicate aliases fail in the engine loader.
  const hasUnprovenAlias = plugins.some((plugin) => {
    return (
      _isRecord(plugin) &&
      plugin.name === "avandar" &&
      !_isOfficialDeclaration(plugin, origin, expected)
    );
  });
  return {
    hasOfficialRegistration,
    isSupported: hasOfficialRegistration && !hasUnprovenAlias,
  };
}

/**
 * Gives native coverage's config copier the supported Avandar implementation
 * boundary. Unknown wrappers, versions, conditional exports and inherited
 * configuration cannot establish custom AF enforcement in a mirrored runtime.
 */
export function getNativePluginContext(
  config: unknown,
  origin: string,
): PluginContext {
  if (!_isRecord(config)) {
    return { isSupported: false, hasOfficialRegistration: false };
  }
  const own = _getDeclarationContext(
    config.jsPlugins,
    origin,
    _getKnownEntry(),
  );
  const overrides = Array.isArray(config.overrides)
    ? config.overrides.map((override) => {
        return getNativePluginContext(override, origin);
      })
    : [];
  return {
    isSupported:
      own.isSupported &&
      (config.extends === undefined ||
        (Array.isArray(config.extends) && !config.extends.length)) &&
      overrides.every((context) => {
        return context.isSupported;
      }),
    hasOfficialRegistration:
      own.hasOfficialRegistration ||
      overrides.some((context) => {
        return context.hasOfficialRegistration;
      }),
  };
}
