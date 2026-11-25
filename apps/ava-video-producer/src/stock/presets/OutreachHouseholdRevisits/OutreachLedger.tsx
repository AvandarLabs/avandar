import { prop } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./OutreachHouseholdRevisits.schema";
import type { ReactNode } from "react";

type Props = { input: Input; completed: Input["visits"] };
/**
 * Event and household totals remain separate from the exclusive final states.
 */
export function OutreachLedger({
  input,
  completed,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const visited = new Set(completed.map(prop("householdId")));
  const contactedHouseholds = new Set(
    completed.filter(prop("contacted")).map(prop("householdId")),
  );
  const rows = _getLedgerRowsFromVisitCounts({
    input,
    completed,
    visited,
    contactedHouseholds,
    tokens,
  });
  return _getLedgerFromRows(rows);
}

/** A displayed household ledger row with an independent visibility rule. */
type LedgerRow = {
  label: string;
  value: number;
  visible: boolean;
  color: string;
};
/**
 * The ledger preserves separate event counts and exclusive household states.
 */
function _getLedgerRowsFromVisitCounts({
  input,
  completed,
  visited,
  contactedHouseholds,
  tokens,
}: Readonly<LedgerRowsOptions>): LedgerRow[] {
  const rows: Array<[string, number, boolean, string]> = [
    [
      input.copy.visits,
      completed.length,
      input.showUniqueLedger,
      tokens.color.text,
    ],
    [
      input.copy.visited,
      visited.size,
      input.showUniqueLedger,
      tokens.color.text,
    ],
    [
      input.copy.contacted,
      contactedHouseholds.size,
      true,
      tokens.color.positive,
    ],
    [
      input.copy.noContact,
      visited.size - contactedHouseholds.size,
      true,
      tokens.color.highlight,
    ],
    [
      input.copy.unvisited,
      input.households.length - visited.size,
      true,
      tokens.color.textMuted,
    ],
    [input.copy.denominator, input.households.length, true, tokens.color.text],
  ];
  return rows.map(([label, value, visible, color]) => {
    return { label, value, visible, color };
  });
}
/** Both literal values and labels retain their fixed ledger columns. */
function _getLedgerFromRows(rows: readonly LedgerRow[]): ReactNode {
  return (
    <g>
      {rows.map((row, index) => {
        return row.visible ? (
          <g key={index}>
            <FitText
              text={String(row.value)}
              x={45 + index * 150}
              y={448}
              width={135}
              fontSize={20}
              maxLines={1}
              color={row.color}
              normalizeWhitespace
            />
            <FitText
              text={row.label}
              x={45 + index * 150}
              y={478}
              width={135}
              fontSize={12}
              maxLines={7}
              color={row.color}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        ) : undefined;
      })}
    </g>
  );
}

/** Counts and theme values used to assemble the visible household ledger. */
type LedgerRowsOptions = Props & {
  visited: ReadonlySet<string>;
  contactedHouseholds: ReadonlySet<string>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};
