/* oxlint-disable import/extensions -- Node needs source extensions. */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isRecord } from "./isRecord.ts";

const OFFICIAL_PLUGIN: string = "@avandar/lint-typescript/oxlint";
type PluginContext = { isSupported: boolean; hasOfficialRegistration: boolean };
type PackageMetadata = { directory: string; manifest: Record<string, unknown> };

function _findPackage(directory: string): PackageMetadata | undefined {
  const path = join(directory, "package.json");
  if (existsSync(path)) {
    const manifest: unknown = JSON.parse(readFileSync(path, "utf8"));
    return isRecord(manifest) ? { directory, manifest } : undefined;
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
  return isRecord(manifest)
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
    !isRecord(installed.manifest.exports)
  ) {
    return undefined;
  }
  const exported = installed.manifest.exports["./oxlint"];
  const target =
    typeof exported === "string"
      ? exported
      : isRecord(exported) &&
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

function _isOfficialDeclaration({
  plugin,
  origin,
  expected,
}: Readonly<{
  plugin: unknown;
  origin: string;
  expected: string | undefined;
}>): boolean {
  if (
    !expected ||
    !isRecord(plugin) ||
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

function _getDeclarationContext({
  plugins,
  origin,
  expected,
}: Readonly<{
  plugins: unknown;
  origin: string;
  expected: string | undefined;
}>): PluginContext {
  if (plugins === undefined || (Array.isArray(plugins) && !plugins.length)) {
    return { isSupported: true, hasOfficialRegistration: false };
  }
  if (!Array.isArray(plugins)) {
    return { isSupported: false, hasOfficialRegistration: false };
  }
  const hasOfficialRegistration = plugins.some((plugin) => {
    return _isOfficialDeclaration({
      plugin: plugin,
      origin: origin,
      expected: expected,
    });
  });
  // Every nonempty declaration group must reserve the canonical namespace with
  // the known implementation. Duplicate aliases fail in the engine loader.
  const hasUnprovenAlias = plugins.some((plugin) => {
    return (
      isRecord(plugin) &&
      plugin.name === "avandar" &&
      !_isOfficialDeclaration({
        plugin: plugin,
        origin: origin,
        expected: expected,
      })
    );
  });
  return {
    hasOfficialRegistration,
    isSupported: hasOfficialRegistration && !hasUnprovenAlias,
  };
}

/**
 * Reports whether a config's Avandar plugin declarations are supported and
 * whether they include the official registration. Use it, for example, when
 * deciding whether a config can be mirrored for native coverage.
 */
export function createNativePluginContextFromConfig({
  config,
  origin,
}: Readonly<{ config: unknown; origin: string }>): PluginContext {
  if (!isRecord(config)) {
    return { isSupported: false, hasOfficialRegistration: false };
  }
  const own = _getDeclarationContext({
    plugins: config.jsPlugins,
    origin: origin,
    expected: _getKnownEntry(),
  });
  const overrides = Array.isArray(config.overrides)
    ? config.overrides.map((override) => {
        return createNativePluginContextFromConfig({
          config: override,
          origin: origin,
        });
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
