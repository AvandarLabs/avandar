import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CliOutput } from "../runProducerCommand/CliOutput/CliOutput.mjs";

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
function _exitWithAdoptThemeError(message: string): never {
  CliOutput.error(
    `adopt-theme: ${message}`,
    "Run pnpm adopt --help, correct the stylesheet or options, and retry.",
  );
  return process.exit(1);
}

/** Parses adopt-theme's CLI flags and positional stylesheet path. */
function _fromArgv(argv: readonly string[]): AdoptThemeArgs {
  const parsed = _readAdoptArguments(argv);
  return {
    isDryRun: parsed.flags.has("--dry-run"),
    shouldWriteCurves: parsed.flags.has("--curves"),
    mode: parsed.mode,
    paths: parsed.paths,
  };
}

/**
 * The product stylesheet: the explicit path, or the first conventional one
 * that declares custom properties. The kit is normally a folder inside the
 * product, or a sibling of it, so it looks here first and then one level up.
 */
function _getStylesheetFromPaths(paths: readonly string[]): string {
  if (paths.length) {
    const stylesheet = resolve(paths[0]);
    if (!existsSync(stylesheet)) {
      _exitWithAdoptThemeError(`no such file: ${paths[0]}`);
    }
    return stylesheet;
  }
  const stylesheetPath = [".", ".."]
    .flatMap((base) => {
      return STYLESHEET_CANDIDATES.map((candidate) => {
        return resolve(base, candidate);
      });
    })
    .find((candidate) => {
      return (
        // The lookup is a stylesheet substring search, not repeated array
        // membership.
        // react-doctor-disable-next-line js-set-map-lookups
        existsSync(candidate) && readFileSync(candidate, "utf8").includes("--")
      );
    });
  return (
    stylesheetPath ??
    _exitWithAdoptThemeError(
      `could not find a stylesheet. Pass one:\n  node --import tsx scripts/adoptTheme/adoptTheme.ts ../src/app/globals.css`,
    )
  );
}

function _readAdoptArguments(argv: readonly string[]): {
  flags: Set<string>;
  mode: string;
  paths: string[];
} {
  const flags = new Set<string>();
  const paths: string[] = [];
  let mode = "auto";
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const flag = argument.split("=")[0];
    if (["--curves", "--dry-run", "--mode"].includes(flag)) {
      if (flags.has(flag)) {throw new Error(`Repeated option: ${flag}`);}
      flags.add(flag);
      if (flag === "--mode") {
        mode = argument.includes("=")
          ? argument.slice(argument.indexOf("=") + 1)
          : argv[++index];
        if (!["auto", "light", "dark"].includes(mode))
          {throw new Error("--mode requires auto|dark|light");}
      } else if (argument.includes("="))
        {throw new Error(`${flag} does not take a value`);}
    } else if (argument.startsWith("-") || paths.length)
      {throw new Error(`Unexpected argument: ${argument}`);}
    else {paths.push(argument);}
  }
  return { flags, mode, paths };
}

/** Parses stylesheet and palette choices for the adopt theme command. */
export const AdoptThemeArgs = {
  /** Prints a one-line adopt-theme error and exits non-zero. */
  exitWithAdoptThemeError: _exitWithAdoptThemeError,
  /** Parses adopt-theme's CLI flags and positional stylesheet path. */
  fromArgv: _fromArgv,
  /**
   * The product stylesheet: the explicit path, or the first conventional one
   * that declares custom properties.
   */
  getStylesheetFromPaths: _getStylesheetFromPaths,
};
