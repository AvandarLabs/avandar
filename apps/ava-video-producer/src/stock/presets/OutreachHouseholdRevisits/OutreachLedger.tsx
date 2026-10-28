import { prop } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
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
  const visited = new Set(completed.map(prop("householdId")));
  const contactedHouseholds = new Set(
    completed.filter(({ contacted }) => contacted).map(prop("householdId")),
  );
  const rows = [
    {
      label: input.copy.visits,
      value: completed.length,
      visible: input.showUniqueLedger,
      color: STOCK.text,
    },
    {
      label: input.copy.visited,
      value: visited.size,
      visible: input.showUniqueLedger,
      color: STOCK.text,
    },
    {
      label: input.copy.contacted,
      value: contactedHouseholds.size,
      visible: true,
      color: STOCK.mint,
    },
    {
      label: input.copy.noContact,
      value: visited.size - contactedHouseholds.size,
      visible: true,
      color: STOCK.orange,
    },
    {
      label: input.copy.unvisited,
      value: input.households.length - visited.size,
      visible: true,
      color: STOCK.muted,
    },
    {
      label: input.copy.denominator,
      value: input.households.length,
      visible: true,
      color: STOCK.text,
    },
  ];
  return (
    <g>
      {rows.map((row, index) =>
        row.visible ? (
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
        ) : undefined,
      )}
    </g>
  );
}
