import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/* Where a product's tokens usually live. Ordered: the more specific a path is
   to a framework, the more likely it is the real one rather than a reset. */
const CANDIDATES = [
  "src/app/globals.css",
  "app/globals.css",
  "src/styles/globals.css",
  "styles/globals.css",
  "src/app.css",
  "src/index.css",
  "src/styles/index.css",
];

/** Print a one-line adopt-theme error and exit non-zero. */
export function fail(msg) {
  console.error(`\nadopt-theme: ${msg}\n`);
  process.exit(1);
}

/** Parse adopt-theme's CLI flags and positional stylesheet path. */
export function parseArgs(argv) {
  const flag = (name) => argv.some((a) => a === `--${name}`);
  const opt = (name, fallback) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return {
    dryRun: flag("dry-run"),
    curves: flag("curves"),
    mode: opt("mode", "auto"),
    paths: argv.filter((a) => !a.startsWith("--")),
  };
}

/** Find the product stylesheet from an explicit path, or by repo convention. */
export function findStylesheet(paths) {
  if (paths.length) {
    const p = resolve(paths[0]);
    if (!existsSync(p)) fail(`no such file: ${paths[0]}`);
    return p;
  }
  /* The kit is normally a folder inside the product, or a sibling of it, so
     look at this repo first and then one level up. */
  for (const base of [".", ".."]) {
    for (const c of CANDIDATES) {
      const p = resolve(base, c);
      if (existsSync(p) && readFileSync(p, "utf8").includes("--")) return p;
    }
  }
  fail(
    "could not find a stylesheet. Pass one:\n" +
      "  node scripts/adopt-theme.mjs ../src/app/globals.css",
  );
}
