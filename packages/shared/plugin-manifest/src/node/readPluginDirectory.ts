import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { compileManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError/PluginManifestError.ts";
import { getUnapprovedDependenciesFromPackageJson } from "@plugin-manifest/dependencies/getUnapprovedDependenciesFromPackageJson.ts";
import { makeTablerComponentNameFromIconName } from "@plugin-manifest/icons/makeTablerComponentNameFromIconName.ts";
import { z } from "zod";
import type { CompiledPluginManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";

/**
 * A plugin folder read from disk and fully validated, so a caller can use it
 * without re-checking anything. `readPluginDirectory` and `readBundledPlugins`
 * return it, for example to a Vite plugin that bundles `entryPath` or to a
 * command that reports on the folder.
 */
export type PluginDirectory = Readonly<{
  /** The folder's own name, such as `hello` for `plugins/hello`. */
  folderName: string;
  directory: string;
  /** The manifest's `entry` file, joined onto `directory`. */
  entryPath: string;
  compiled: CompiledPluginManifest;
  /** Every message in every `locales/<lang>.json`, not only referenced ones. */
  locales: PluginLocaleMessages;
}>;

const LocaleMessagesSchema = z.record(z.string(), z.string());

// Only `dependencies` is read. Every other field of a package.json is
// ignored, since plugins may carry any npm metadata.
const PackageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
});

type PackageJson = z.infer<typeof PackageJsonSchema>;

type JsonFileRead =
  | { isValid: true; value: unknown }
  | { isValid: false; issue: string };

type FileReadResult<T> = { data: T; issues: string[] };

function _readJsonFile(options: { path: string; label: string }): JsonFileRead {
  try {
    return {
      isValid: true,
      value: JSON.parse(readFileSync(options.path, "utf8")),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isValid: false, issue: `${options.label}: ${message}` };
  }
}

function _getLocaleFileIssues(options: {
  label: string;
  error: z.ZodError;
}): string[] {
  return options.error.issues.map((issue) => {
    const [key] = issue.path;
    return key === undefined
      ? `${options.label}: must be a JSON object of message keys to strings`
      : `${options.label}: "${String(key)}" must be a string`;
  });
}

function _readLocaleFile(options: {
  path: string;
  label: string;
}): FileReadResult<Record<string, string>> {
  const file = _readJsonFile(options);
  if (!file.isValid) {
    return { data: {}, issues: [file.issue] };
  }
  const result = LocaleMessagesSchema.safeParse(file.value);
  return result.success
    ? { data: result.data, issues: [] }
    : {
        data: {},
        issues: _getLocaleFileIssues({
          label: options.label,
          error: result.error,
        }),
      };
}

function _readLocales(directory: string): FileReadResult<PluginLocaleMessages> {
  const localesDirectory = join(directory, "locales");
  if (!existsSync(localesDirectory)) {
    return { data: {}, issues: [] };
  }
  const files = readdirSync(localesDirectory)
    .filter((fileName) => {
      return fileName.endsWith(".json");
    })
    .sort()
    .map((fileName) => {
      return {
        language: fileName.replace(/\.json$/, ""),
        ..._readLocaleFile({
          path: join(localesDirectory, fileName),
          label: `locales/${fileName}`,
        }),
      };
    });
  return {
    data: Object.fromEntries(
      files.map((file) => {
        return [file.language, file.data];
      }),
    ),
    issues: files.flatMap((file) => {
      return file.issues;
    }),
  };
}

function _getPackageJsonIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    if (issue.path.length === 0) {
      return "package.json: must be a JSON object";
    }
    return issue.path.length === 1
      ? 'package.json: "dependencies" must be an object of package names to version strings'
      : `package.json: "${issue.path.join(".")}" must be a string`;
  });
}

function _readPackageJson(directory: string): FileReadResult<PackageJson> {
  const packageJsonPath = join(directory, "package.json");
  if (!existsSync(packageJsonPath)) {
    return { data: {}, issues: [] };
  }
  const file = _readJsonFile({
    path: packageJsonPath,
    label: "package.json",
  });
  if (!file.isValid) {
    return { data: {}, issues: [file.issue] };
  }
  const result = PackageJsonSchema.safeParse(file.value);
  return result.success
    ? { data: result.data, issues: [] }
    : { data: {}, issues: _getPackageJsonIssues(result.error) };
}

/**
 * The exact-case file names in the Tabler icons directory. Membership is
 * checked against this set instead of `existsSync`, because a
 * case-insensitive filesystem (the macOS default) would accept `IconTrendingup`
 * when only `IconTrendingUp.mjs` exists, and the later import would fail.
 */
function _readTablerIconFileNames(repoRoot: string): ReadonlySet<string> {
  const iconsDirectory = join(
    repoRoot,
    "node_modules/@tabler/icons-react/dist/esm/icons",
  );
  return existsSync(iconsDirectory)
    ? new Set(readdirSync(iconsDirectory))
    : new Set();
}

function _getIconIssues(options: {
  repoRoot: string;
  compiled: CompiledPluginManifest;
}): string[] {
  const { repoRoot, compiled } = options;
  const { manifest } = compiled;
  const iconFileNames = _readTablerIconFileNames(repoRoot);
  const iconNames = new Set([
    manifest.icon,
    ...manifest.contributes.commands.map((command) => {
      return command.icon;
    }),
    ...manifest.contributes.vizTypes.map((vizType) => {
      return vizType.icon;
    }),
  ]);
  return [...iconNames].flatMap((iconName) => {
    const iconFile = `${makeTablerComponentNameFromIconName(iconName)}.mjs`;
    return iconFileNames.has(iconFile)
      ? []
      : [`unknown Tabler icon "${iconName}"`];
  });
}

function _getFileIssues(options: {
  directory: string;
  repoRoot: string;
  compiled: CompiledPluginManifest;
  packageJson: PackageJson;
}): string[] {
  const { directory, repoRoot, compiled, packageJson } = options;
  const entryIssues = existsSync(join(directory, compiled.manifest.entry))
    ? []
    : [`entry: ${compiled.manifest.entry} does not exist`];
  const dependencyIssues = getUnapprovedDependenciesFromPackageJson(
    packageJson,
  ).map((name) => {
    return `dependency "${name}" is not approved for plugins`;
  });
  return [
    ...entryIssues,
    ..._getIconIssues({ repoRoot, compiled }),
    ...dependencyIssues,
  ];
}

function _readSupportingFiles(options: {
  directory: string;
  sourcePath: string;
}): { locales: PluginLocaleMessages; packageJson: PackageJson } {
  const locales = _readLocales(options.directory);
  const packageJson = _readPackageJson(options.directory);
  const issues = [...locales.issues, ...packageJson.issues];
  if (issues.length > 0) {
    throw new PluginManifestError({ sourcePath: options.sourcePath, issues });
  }
  return { locales: locales.data, packageJson: packageJson.data };
}

/**
 * Reads one plugin folder from disk into a validated `PluginDirectory`: its
 * `ava.yaml` compiled against its `locales/*.json` files, plus checks that
 * the entry file exists, every icon is a real Tabler icon, and every
 * `package.json` dependency is approved.
 *
 * Use it wherever a plugin's source must be loaded and trusted, such as a
 * Vite plugin that bundles plugins or a command that validates them.
 *
 * Throws `PluginManifestError` for the first stage that finds problems and
 * lists every problem within that stage. The stages run in order: malformed
 * locale files or `package.json`, then `ava.yaml` compilation, then the
 * entry, icon, and dependency checks.
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
  const { locales, packageJson } = _readSupportingFiles({
    directory,
    sourcePath,
  });
  const compiled = compileManifest({
    yamlText: readFileSync(manifestPath, "utf8"),
    sourcePath,
    locales,
  });
  const issues = _getFileIssues({ directory, repoRoot, compiled, packageJson });
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
