import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Where a product's tokens usually live. Ordered: the more specific a path is
 * to a framework, the more likely it is the real one rather than a reset.
 */
const STYLESHEET_CANDIDATES = [
  "src/app/globals.css",
  "app/globals.css",
  "src/styles/globals.css",
  "styles/globals.css",
  "src/app.css",
  "src/index.css",
  "src/styles/index.css",
] as const;

/** adopt-theme's command-line flags and positional stylesheet paths. */
export type AdoptThemeArgs = {
  isDryRun: boolean;
  shouldWriteCurves: boolean;
  mode: string;
  paths: string[];
};

/** Prints a one-line adopt-theme error and exits non-zero. */
export function exitWithAdoptThemeError(message: string): never {
  console.error(`\nadopt-theme: ${message}\n`);
  return process.exit(1);
}

/** Parses adopt-theme's CLI flags and positional stylesheet path. */
export function makeAdoptThemeArgsFromArgv(
  argv: readonly string[],
): AdoptThemeArgs {
  const hasFlag = (name: string) => argv.some((arg) => arg === `--${name}`);
  const getOptionValue = (name: string, fallback: string) => {
    const optionArgument = argv.find((arg) => arg.startsWith(`--${name}=`));
    return optionArgument ? optionArgument.slice(name.length + 3) : fallback;
  };
  return {
    isDryRun: hasFlag("dry-run"),
    shouldWriteCurves: hasFlag("curves"),
    mode: getOptionValue("mode", "auto"),
    paths: argv.filter((arg) => !arg.startsWith("--")),
  };
}

/**
 * The product stylesheet: the explicit path, or the first conventional one
 * that declares custom properties. The kit is normally a folder inside the
 * product, or a sibling of it, so it looks here first and then one level up.
 */
export function getStylesheetFromPaths(paths: readonly string[]): string {
  if (paths.length) {
    const stylesheet = resolve(paths[0]);
    if (!existsSync(stylesheet)) {
      exitWithAdoptThemeError(`no such file: ${paths[0]}`);
    }
    return stylesheet;
  }
  const stylesheetPath = [".", ".."]
    .flatMap((base) =>
      STYLESHEET_CANDIDATES.map((candidate) => resolve(base, candidate)),
    )
    .find(
      (candidate) =>
        existsSync(candidate) && readFileSync(candidate, "utf8").includes("--"),
    );
  return (
    stylesheetPath ??
    exitWithAdoptThemeError(
      `could not find a stylesheet. Pass one:\n  node --import tsx scripts/adoptTheme/adoptTheme.ts ../src/app/globals.css`,
    )
  );
}
