import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import { getNativePluginContext } from "../getNativePluginContext.ts";
import type { PluginContext } from "./nativeSafeRules.types.ts";

/**
 * Signals unsupported mirror contexts to loadNativeProof without an engine
 * claim.
 */
export class UnsupportedProofContext extends Error {}

function _rebasePlugins(
  plugins: unknown,
  origin: string,
): unknown[] | undefined {
  if (plugins === undefined) {
    return undefined;
  }
  if (!Array.isArray(plugins)) {
    throw new UnsupportedProofContext(
      "Coverage cannot safely relocate this plugin configuration.",
    );
  }
  return plugins.map((plugin: unknown) => {
    const specifier =
      typeof plugin === "string"
        ? plugin
        : _isRecord(plugin)
          ? plugin.specifier
          : undefined;
    if (typeof specifier !== "string") {
      throw new UnsupportedProofContext(
        "Coverage cannot safely relocate this plugin configuration.",
      );
    }
    const original = specifier.startsWith(".")
      ? resolve(dirname(origin), specifier)
      : specifier;
    return typeof plugin === "string"
      ? original
      : { ...(plugin as Record<string, unknown>), specifier: original };
  });
}

function _rebaseInheritedPaths(
  inherited: unknown,
  origin: string,
): string[] | undefined {
  if (inherited === undefined) {
    return undefined;
  }
  if (
    !Array.isArray(inherited) ||
    inherited.some((entry) => {
      return typeof entry !== "string" || !/\.jsonc?$/.test(entry);
    })
  ) {
    throw new UnsupportedProofContext(
      "Coverage cannot safely relocate this inherited configuration.",
    );
  }
  return inherited.map((entry: string) => {
    return resolve(dirname(origin), entry);
  });
}

function _rebaseConfig(config: unknown, origin: string): unknown {
  if (!_isRecord(config)) {
    throw new UnsupportedProofContext(
      "Coverage requires a supported JSON object configuration.",
    );
  }
  const plugins = _rebasePlugins(config.jsPlugins, origin);
  const inherited = _rebaseInheritedPaths(config.extends, origin);
  const overrides = config.overrides;
  if (overrides !== undefined && !Array.isArray(overrides)) {
    throw new UnsupportedProofContext(
      "Coverage cannot safely relocate these overrides.",
    );
  }
  return {
    ...config,
    ...(plugins ? { jsPlugins: plugins } : {}),
    ...(inherited ? { extends: inherited } : {}),
    ...(overrides
      ? {
          overrides: overrides.map((override) => {
            return _rebaseConfig(override, origin);
          }),
        }
      : {}),
  };
}

function _copyConfig(origin: string, target: string): PluginContext {
  let config: unknown;
  try {
    config = JSON.parse(readFileSync(origin, "utf8"));
  } catch {
    throw new UnsupportedProofContext(
      "Coverage requires strict JSON when relocating local plugin configuration.",
    );
  }
  writeFileSync(target, JSON.stringify(_rebaseConfig(config, origin)));
  return getNativePluginContext(config, origin);
}

/**
 * Mirrors original configuration context for loadNativeProof without editing
 * it.
 */
export function mirrorNativeDirectory(
  source: string,
  destination: string,
  segments: string[],
): PluginContext {
  const contexts: PluginContext[] = [];
  mkdirSync(destination, { recursive: true });
  readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    const origin = join(source, entry.name);
    const target = join(destination, entry.name);
    if (
      /^(?:oxlint\.config\.[cm]?[jt]s|\.oxlintrc\.[cm]?[jt]s)$/.test(
        entry.name,
      ) ||
      (entry.isSymbolicLink() && /^\.oxlintrc(?:\..+)?$/.test(entry.name))
    ) {
      throw new UnsupportedProofContext(
        "Coverage cannot safely mirror dynamic or symlinked lint configuration.",
      );
    }
    if (entry.name === segments[0]) {
      if (segments.length > 1) {
        contexts.push(mirrorNativeDirectory(origin, target, segments.slice(1)));
      }
    } else if (
      entry.isFile() &&
      /^(?:\.oxlintrc|tsconfig).*\.jsonc?$/.test(entry.name)
    ) {
      if (/^\.oxlintrc/.test(entry.name)) {
        contexts.push(_copyConfig(origin, target));
      } else {
        copyFileSync(origin, target);
      }
    } else {
      symlinkSync(origin, target);
    }
  });
  return {
    isSupported: contexts.every((context) => {
      return context.isSupported;
    }),
    hasOfficialRegistration: contexts.some((context) => {
      return context.hasOfficialRegistration;
    }),
  };
}

function _isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
