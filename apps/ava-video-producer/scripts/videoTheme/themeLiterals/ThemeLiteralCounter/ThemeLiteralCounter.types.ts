import ts from "typescript";
/** Inputs for counting literals in an object property or JSX attribute. */
export type CountKeyedValueOptions = {
  key: string;
  value: ts.Expression | undefined;
  count: LiteralCountReporter;
  isJsxAttribute?: boolean;
};
/**
 * The theme areas a literal can belong to, after Appendix A of the theme
 * coverage review: colour, the starter palette's `var(--…)` names, type,
 * line and shape, motion, ramps with implicit easing, stroked shapes that
 * bypass the sketch profiles, inline spacing, and stylesheet values.
 */
export type ThemeLiteralArea =
  | "colour"
  | "starter"
  | "type"
  | "line"
  | "motion"
  | "implicitEasing"
  | "sketch"
  | "spacing"
  | "css";
/** How many theme literals of each area one source file holds. */
export type ThemeLiteralCounts = Record<ThemeLiteralArea, number>;
/** Reports the area and size of discovered theme literals. */
export type LiteralCountReporter = (
  area: ThemeLiteralArea,
  amount?: number,
) => void;
