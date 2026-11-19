/*
 * Renderers draw no new theme literals. Every renderer file is scanned with
 * the theme coverage patterns (colour, starter palette, type, line and shape,
 * motion, implicit easing, sketch bypass, stylesheet values) and compared
 * with its slice budget in `scripts/videoTheme/themeLiteralBudgets/`. A count
 * above budget fails, and so does any literal in a file no budget lists.
 * Budgets only go down: lower them with `lowerThemeLiteralBudgets.ts`. Every
 * slice has landed, so every budget must stay empty, and the retired stock
 * palette module must not come back.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  countThemeLiteralsFromSource,
  sumThemeLiteralCounts,
  type ThemeLiteralCounts,
} from "../themeLiteralBudgets/countThemeLiterals/countThemeLiterals";
import {
  APP_ROOT,
  isFileOwnedByBudget,
  listScannedFiles,
  listThemeLiteralBudgets,
} from "../themeLiteralBudgets/themeLiteralBudgets";

const BUDGETS = listThemeLiteralBudgets();
const FILES = listScannedFiles(BUDGETS);

function _counts(file: string): ThemeLiteralCounts {
  return countThemeLiteralsFromSource(
    file,
    fs.readFileSync(path.join(APP_ROOT, file), "utf8"),
  );
}

function _describe(counts: ThemeLiteralCounts): string {
  return Object.entries(counts)
    .filter(([, count]) => {
      return count > 0;
    })
    .map(([area, count]) => {
      return `${area} ${count}`;
    })
    .join(", ");
}

test("every renderer file belongs to exactly one slice budget", () => {
  const unowned = FILES.flatMap((file) => {
    const owners = BUDGETS.filter((budget) => {
      return isFileOwnedByBudget(budget, file);
    });
    return owners.length === 1
      ? []
      : [
          `${file}: ${owners
            .map((budget) => {
              return budget.slice;
            })
            .join(", ")}`,
        ];
  });
  assert.deepEqual(unowned, []);
});

test("no renderer file holds more theme literals than its slice budget", () => {
  const overBudget = FILES.flatMap((file) => {
    const counts = _counts(file);
    const total = sumThemeLiteralCounts(counts);
    const budget = BUDGETS.find((candidate) => {
      return isFileOwnedByBudget(candidate, file);
    });
    const allowed = budget?.literals[file] ?? 0;
    return total > allowed
      ? [
          `${file} (${budget?.slice ?? "no slice"}): ${total} > ${allowed} (${_describe(counts)})`,
        ]
      : [];
  });
  assert.deepEqual(overBudget, []);
});

test("every budgeted file exists and is owned by the budget that lists it", () => {
  const stale = BUDGETS.flatMap((budget) => {
    return Object.keys(budget.literals)
      .filter((file) => {
        return !FILES.includes(file) || !isFileOwnedByBudget(budget, file);
      })
      .map((file) => {
        return `${budget.slice}: ${file}`;
      });
  });
  assert.deepEqual(stale, []);
});

test("every slice has landed: no literal, pending token, or tempo exception is left", () => {
  assert.deepEqual(
    BUDGETS.flatMap((budget) => {
      return [
        ...(budget.enforceLint ? [] : [`${budget.slice}: enforceLint off`]),
        ...Object.keys(budget.literals).map((file) => {
          return `${budget.slice}: literals in ${file}`;
        }),
        ...budget.pendingTokens.map((token) => {
          return `${budget.slice}: pending ${token}`;
        }),
        ...budget.tempoPendingIds.map((id) => {
          return `${budget.slice}: tempo-pending ${id}`;
        }),
        ...Object.keys(budget.handoffTokens ?? {}).map((token) => {
          return `${budget.slice}: handoff ${token}`;
        }),
      ];
    }),
    [],
  );
});

test("the stock palette module stays retired", () => {
  assert.deepEqual(
    fs
      .readdirSync(path.join(APP_ROOT, "src"), {
        recursive: true,
        encoding: "utf8",
      })
      .filter((file) => {
        return /(?:^|\/)stockPalette\.[jt]sx?$/.test(file);
      }),
    [],
  );
});
