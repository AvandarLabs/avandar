/* oxlint-disable import/extensions -- Node needs source extensions. */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createNativePluginContextFromConfig } from "../createNativePluginContextFromConfig.ts";
import { isRecord } from "../isRecord.ts";
import { UnsupportedProofContextError } from "./UnsupportedProofContextError.ts";
import type { PluginContext } from "./nativeSafeRules.types.ts";

function _rebasePlugins({
  plugins,
  origin,
}: Readonly<{ plugins: unknown; origin: string }>): unknown[] | undefined {
  if (plugins === undefined) {
    return undefined;
  }
  if (!Array.isArray(plugins)) {
    throw new UnsupportedProofContextError(
      "Coverage cannot safely relocate this plugin configuration.",
    );
  }
  return plugins.map((plugin: unknown) => {
    const specifier =
      typeof plugin === "string"
        ? plugin
        : isRecord(plugin)
          ? plugin.specifier
          : undefined;
    if (typeof specifier !== "string") {
      throw new UnsupportedProofContextError(
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

function _rebaseInheritedPaths({
  inherited,
  origin,
}: Readonly<{ inherited: unknown; origin: string }>): string[] | undefined {
  if (inherited === undefined) {
    return undefined;
  }
  if (
    !Array.isArray(inherited) ||
    inherited.some((entry) => {
      return typeof entry !== "string" || !/\.jsonc?$/.test(entry);
    })
  ) {
    throw new UnsupportedProofContextError(
      "Coverage cannot safely relocate this inherited configuration.",
    );
  }
  return inherited.map((entry: string) => {
    return resolve(dirname(origin), entry);
  });
}

function _rebaseConfig({
  config,
  origin,
}: Readonly<{ config: unknown; origin: string }>): unknown {
  if (!isRecord(config)) {
    throw new UnsupportedProofContextError(
      "Coverage requires a supported JSON object configuration.",
    );
  }
  const plugins = _rebasePlugins({ plugins: config.jsPlugins, origin: origin });
  const inherited = _rebaseInheritedPaths({
    inherited: config.extends,
    origin: origin,
  });
  const overrides = config.overrides;
  if (overrides !== undefined && !Array.isArray(overrides)) {
    throw new UnsupportedProofContextError(
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
            return _rebaseConfig({ config: override, origin: origin });
          }),
        }
      : {}),
  };
}

function _copyConfig({
  origin,
  target,
}: Readonly<{ origin: string; target: string }>): PluginContext {
  const config: unknown = (() => {
    try {
      return JSON.parse(readFileSync(origin, "utf8"));
    } catch {
      throw new UnsupportedProofContextError(
        "Coverage requires strict JSON when relocating local plugin configuration.",
      );
    }
  })();
  writeFileSync(
    target,
    JSON.stringify(_rebaseConfig({ config: config, origin: origin })),
  );
  return createNativePluginContextFromConfig({
    config: config,
    origin: origin,
  });
}

/**
 * Mirrors original configuration context for loadNativeProof without editing
 * it.
 */
export function mirrorNativeDirectory({
  source,
  destination,
  segments,
}: Readonly<{
  source: string;
  destination: string;
  segments: readonly string[];
}>): PluginContext {
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
      throw new UnsupportedProofContextError(
        "Coverage cannot safely mirror dynamic or symlinked lint configuration.",
      );
    }
    if (entry.name === segments[0]) {
      if (segments.length > 1) {
        contexts.push(
          mirrorNativeDirectory({
            source: origin,
            destination: target,
            segments: segments.slice(1),
          }),
        );
      }
    } else if (
      entry.isFile() &&
      /^(?:\.oxlintrc|tsconfig).*\.jsonc?$/.test(entry.name)
    ) {
      if (/^\.oxlintrc/.test(entry.name)) {
        contexts.push(_copyConfig({ origin: origin, target: target }));
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
