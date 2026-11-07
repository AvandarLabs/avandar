import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { compileManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { getUnapprovedDependenciesFromPackageJson } from "@plugin-manifest/dependencies/approvedDependencies.ts";
import { makeTablerComponentNameFromIconName } from "@plugin-manifest/icons/makeTablerComponentNameFromIconName.ts";
import type { CompiledPluginManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";

/** A plugin folder read from disk and fully validated. */
export type PluginDirectory = Readonly<{
  folderName: string;
  directory: string;
  entryPath: string;
  compiled: CompiledPluginManifest;
  locales: PluginLocaleMessages;
}>;

function _readLocales(directory: string): PluginLocaleMessages {
  const localesDirectory = join(directory, "locales");
  if (!existsSync(localesDirectory)) {
    return {};
  }
  return Object.fromEntries(
    readdirSync(localesDirectory)
      .filter((fileName) => {
        return fileName.endsWith(".json");
      })
      .map((fileName) => {
        const messages = JSON.parse(
          readFileSync(join(localesDirectory, fileName), "utf8"),
        ) as Record<string, string>;
        return [fileName.replace(/\.json$/, ""), messages];
      }),
  );
}

function _getIconIssues(options: {
  repoRoot: string;
  compiled: CompiledPluginManifest;
}): string[] {
  const { repoRoot, compiled } = options;
  const { manifest } = compiled;
  const iconsDirectory = join(
    repoRoot,
    "node_modules/@tabler/icons-react/dist/esm/icons",
  );
  const iconNames = new Set([
    manifest.icon,
    ...manifest.contributes.commands.map((command) => {
      return command.icon;
    }),
  ]);
  return [...iconNames].flatMap((iconName) => {
    const iconFile = `${makeTablerComponentNameFromIconName(iconName)}.mjs`;
    return existsSync(join(iconsDirectory, iconFile))
      ? []
      : [`unknown Tabler icon "${iconName}"`];
  });
}

function _getDependencyIssues(directory: string): string[] {
  const packageJsonPath = join(directory, "package.json");
  if (!existsSync(packageJsonPath)) {
    return [];
  }
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  return getUnapprovedDependenciesFromPackageJson(packageJson).map((name) => {
    return `dependency "${name}" is not approved for plugins`;
  });
}

function _getFileIssues(options: {
  directory: string;
  repoRoot: string;
  compiled: CompiledPluginManifest;
}): string[] {
  const { directory, repoRoot, compiled } = options;
  const entryIssues = existsSync(join(directory, compiled.manifest.entry))
    ? []
    : [`entry: ${compiled.manifest.entry} does not exist`];
  return [
    ...entryIssues,
    ..._getIconIssues({ repoRoot, compiled }),
    ..._getDependencyIssues(directory),
  ];
}

/**
 * Reads a plugin folder: compiles `ava.yaml` against its locales, then checks
 * that the entry file exists, every icon is a real Tabler icon, and every
 * dependency is approved. Throws `PluginManifestError` listing every problem.
 */
export function readPluginDirectory(options: {
  directory: string;
  repoRoot: string;
}): PluginDirectory {
  const { directory, repoRoot } = options;
  const manifestPath = join(directory, "ava.yaml");
  const sourcePath = relative(repoRoot, manifestPath);
  if (!existsSync(manifestPath)) {
    throw new PluginManifestError({
      sourcePath,
      issues: ["ava.yaml not found"],
    });
  }
  const locales = _readLocales(directory);
  const compiled = compileManifest({
    yamlText: readFileSync(manifestPath, "utf8"),
    sourcePath,
    locales,
  });
  const issues = _getFileIssues({ directory, repoRoot, compiled });
  if (issues.length > 0) {
    throw new PluginManifestError({ sourcePath, issues });
  }
  return {
    folderName: basename(directory),
    directory,
    entryPath: join(directory, compiled.manifest.entry),
    compiled,
    locales,
  };
}
