import fs from "node:fs";
import path from "node:path";
import {
  countThemeLiteralsFromSource,
  sumThemeLiteralCounts,
} from "./countThemeLiterals/countThemeLiterals";
import {
  APP_ROOT,
  isFileOwnedByBudget,
  listScannedFiles,
  listThemeLiteralBudgets,
  writeThemeLiteralBudget,
} from "./themeLiteralBudgets";

/**
 * Lowers each named slice budget (every slice when none is named) to the
 * literals its files hold now. It never raises a budget and never adds a
 * file, so it is safe to run after a migration. From the app directory:
 * `node --import tsx <this file> s3`.
 */
function _lowerThemeLiteralBudgets(slices: readonly string[]): void {
  const budgets = listThemeLiteralBudgets();
  const files = listScannedFiles(budgets);
  budgets
    .filter((budget) => {
      return slices.length === 0 || slices.includes(budget.slice);
    })
    .forEach((budget) => {
      const literals = Object.fromEntries(
        files
          .filter((file) => {
            return isFileOwnedByBudget(budget, file);
          })
          .flatMap((file) => {
            const allowed = budget.literals[file] ?? 0;
            const current = sumThemeLiteralCounts(
              countThemeLiteralsFromSource(
                file,
                fs.readFileSync(path.join(APP_ROOT, file), "utf8"),
              ),
            );
            const lowered = Math.min(allowed, current);
            return lowered > 0 ? [[file, lowered]] : [];
          }),
      );
      writeThemeLiteralBudget({ ...budget, literals });
      console.log(
        `${budget.slice}: ${Object.keys(literals).length} files with literals`,
      );
    });
}

_lowerThemeLiteralBudgets(process.argv.slice(2));
