import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/** The app directory every budget glob and file path is relative to. */
export const APP_ROOT: string = fileURLToPath(
  new URL("../../../", import.meta.url),
);
const BUDGET_DIRECTORY = fileURLToPath(new URL("./", import.meta.url));

const budgetSchema = z.strictObject({
  slice: z.string().regex(/^s\d+$/),
  title: z.string(),
  globs: z.array(z.string()).min(1),
  enforceLint: z.boolean(),
  coveredIds: z.array(z.string()),
  pendingTokens: z.array(z.string()),
  literals: z.record(z.string(), z.number().int().positive()),
});

/**
 * One implementation slice's budget file,
 * `scripts/videoTheme/themeLiteralBudgets/<slice>.json`. Each slice edits
 * only its own file, so slices that run in parallel never conflict:
 *
 * - `globs` are the renderer files the slice owns, relative to the app. A
 *   glob starting with `!` removes files a previous glob matched.
 * - `enforceLint` turns on the renderer ESLint restrictions for `globs`.
 * - `coveredIds` are Atlas ids the slice has made theme-driven. They join
 *   the parity gate, the slowest-tempo test, the token reader audit, and the
 *   sentinel theme test.
 * - `pendingTokens` are token paths no renderer reads until the slice lands.
 *   The reader audit skips them; the slice removes each one it starts reading.
 * - `literals` is the most theme literals each owned file may hold. Budgets
 *   only go down; the target is an empty object.
 */
export type ThemeLiteralBudget = z.infer<typeof budgetSchema>;

/** Every slice budget, ordered by slice number. */
export function listThemeLiteralBudgets(): ThemeLiteralBudget[] {
  return fs
    .readdirSync(BUDGET_DIRECTORY)
    .filter((file) => {
      return /^s\d+\.json$/.test(file);
    })
    .map((file) => {
      const budget = budgetSchema.parse(
        JSON.parse(fs.readFileSync(path.join(BUDGET_DIRECTORY, file), "utf8")),
      );
      if (`${budget.slice}.json` !== file) {
        throw new Error(`${file} declares slice ${budget.slice}`);
      }
      return budget;
    })
    .sort((left, right) => {
      return Number(left.slice.slice(1)) - Number(right.slice.slice(1));
    });
}

/** Whether an app-relative file path is matched by a budget's globs. */
export function isFileOwnedByBudget(
  budget: Pick<ThemeLiteralBudget, "globs">,
  file: string,
): boolean {
  return budget.globs.reduce((isOwned, glob) => {
    if (glob.startsWith("!")) {
      return isOwned && !path.matchesGlob(file, glob.slice(1));
    }
    return isOwned || path.matchesGlob(file, glob);
  }, false);
}

/**
 * Atlas ids every slice has made theme-driven, in slice order. The parity
 * gate, the tempo test, the reader audit, and the sentinel test add them to
 * their own fixed lists.
 */
export function getCoveredIdsFromBudgets(
  budgets: readonly ThemeLiteralBudget[] = listThemeLiteralBudgets(),
): string[] {
  return [
    ...new Set(
      budgets.flatMap((budget) => {
        return budget.coveredIds;
      }),
    ),
  ];
}

/** Token paths that wait for a later slice's renderer to read them. */
export function getPendingTokensFromBudgets(
  budgets: readonly ThemeLiteralBudget[] = listThemeLiteralBudgets(),
): Set<string> {
  return new Set(
    budgets.flatMap((budget) => {
      return budget.pendingTokens;
    }),
  );
}

/** Writes a slice budget back in the stable layout the files use. */
export function writeThemeLiteralBudget(budget: ThemeLiteralBudget): void {
  const sorted = {
    ...budget,
    literals: Object.fromEntries(
      Object.entries(budget.literals).sort(([left], [right]) => {
        return left.localeCompare(right);
      }),
    ),
  };
  fs.writeFileSync(
    path.join(BUDGET_DIRECTORY, `${budget.slice}.json`),
    `${JSON.stringify(sorted, null, 2)}\n`,
  );
}

/**
 * The renderer directories the literal budget test scans even where no slice
 * owns a file, so a literal in a new, unowned renderer file still fails. A
 * glob starting with `!` removes files, as in a budget.
 */
const RENDERER_GLOBS = [
  "src/stock/presets/**",
  "src/stock/graphics-*/**",
  "src/stock/primitives/**",
  "src/stock/graphics-common/**",
  "src/stock/StockGraphic/**",
  "src/scenes/**",
  "src/chrome/**",
  "src/title-card.tsx",
  "src/storyboard/StoryFilm/**",
  "src/motion-components/**",
  "src/continuity/**",
  "!src/continuity/gallery/**",
  "src/compositions/**",
  "src/gallery/HelperGallery/demos/**",
];
const SOURCE_DIRECTORIES = ["src", "showcase"];
const SOURCE_EXTENSION = /\.(?:tsx?|css)$/;
/**
 * Not renderer code: tests, test helpers, and the content and contract files
 * a stock preset declares beside its renderer.
 */
const EXCLUDED_FILE =
  /(?:^|\/)__tests__\/|\.test\.|TestHelpers|\.(?:schema|fixtures|metadata|contract|controls|types)\.ts$/;

/**
 * Every app-relative source file the literal budget test scans: renderer
 * files in the renderer directories, plus any file a slice budget owns.
 */
export function listScannedFiles(
  budgets: readonly ThemeLiteralBudget[] = listThemeLiteralBudgets(),
): string[] {
  return SOURCE_DIRECTORIES.flatMap((directory) => {
    return fs
      .readdirSync(path.join(APP_ROOT, directory), {
        recursive: true,
        encoding: "utf8",
      })
      .map((file) => {
        return path.posix.join(directory, file.split(path.sep).join("/"));
      });
  })
    .filter((file) => {
      return SOURCE_EXTENSION.test(file) && !EXCLUDED_FILE.test(file);
    })
    .filter((file) => {
      return (
        isFileOwnedByBudget({ globs: RENDERER_GLOBS }, file) ||
        budgets.some((budget) => {
          return isFileOwnedByBudget(budget, file);
        })
      );
    })
    .sort();
}
