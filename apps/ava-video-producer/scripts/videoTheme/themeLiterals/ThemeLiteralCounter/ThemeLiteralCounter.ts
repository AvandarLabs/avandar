import ts from "typescript";
import { countCssThemeLiteralsFromSource } from "./countCssThemeLiteralsFromSource";
import { reportScriptLiteralsFromNode } from "./reportScriptLiteralsFromNode";
import {
  type ThemeLiteralCounts,
  type ThemeLiteralArea,
} from "./ThemeLiteralCounter.types";

const EMPTY_COUNTS: ThemeLiteralCounts = {
  colour: 0,
  starter: 0,
  type: 0,
  line: 0,
  motion: 0,
  implicitEasing: 0,
  sketch: 0,
  spacing: 0,
  css: 0,
};
/**
 * The one stylesheet that declares the Atlas chrome scale (`--atlas-*` on
 * `:root`). It is the chrome's counterpart of `classic.theme.json`: the source
 * of the values every other chrome stylesheet reads, so it holds them by
 * design.
 */
const CHROME_TOKEN_SHEET = "showcase/chrome-tokens.css";
/**
 * Counts the theme literals in one renderer source file by area. TS and
 * TSX are parsed, so comments never count and a `fontSize` is judged by
 * the element it sits on; CSS is scanned declaration by declaration. The
 * literal scan test fails on any file whose total is above zero.
 */
function _countThemeLiteralsFromSource({
  fileName,
  source,
}: Readonly<{ fileName: string; source: string }>): ThemeLiteralCounts {
  if (fileName === CHROME_TOKEN_SHEET) {
    return { ...EMPTY_COUNTS };
  }
  if (fileName.endsWith(".css")) {
    return { ...EMPTY_COUNTS, css: countCssThemeLiteralsFromSource(source) };
  }
  const counts: Record<ThemeLiteralArea, number> = { ...EMPTY_COUNTS };
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  reportScriptLiteralsFromNode({
    node: sourceFile,
    count: (area, amount = 1) => {
      counts[area] += amount;
    },
  });
  return counts;
}
/** The total of every area's count. */
function _sumThemeLiteralCounts(counts: Readonly<ThemeLiteralCounts>): number {
  return Object.values(counts).reduce((total, numLiterals) => {
    return total + numLiterals;
  }, 0);
}
/** Counts renderer theme literals by area and totals the findings. */
export const ThemeLiteralCounter = {
  /**
   * Counts the theme literals in one renderer source file by area. TS and
   * TSX are parsed, so comments never count and a `fontSize` is judged by
   * the element it sits on; CSS is scanned declaration by declaration. The
   * literal scan test fails on any file whose total is above zero.
   */
  countThemeLiteralsFromSource: _countThemeLiteralsFromSource,
  /** The total of every area's count. */
  sumThemeLiteralCounts: _sumThemeLiteralCounts,
};
