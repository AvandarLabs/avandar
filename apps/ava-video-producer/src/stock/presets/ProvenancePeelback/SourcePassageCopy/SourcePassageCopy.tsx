import { FitText } from "../../../primitives/FitText/FitText";
import { useSourcePassageCopyPresentation } from "./useSourcePassageCopyPresentation";
import type { Input } from "../ProvenancePeelback.schema.ts";
import type { ReactNode } from "react";

type Props = {
  source: Input["sources"][number];
  selected: boolean;
  showLocators: boolean;
  height: number;
  accent: string;
};
/** Source text stays upright even when its background sheet fans out. */
export function SourcePassageCopy(props: Readonly<Props>): ReactNode {
  const presentation = useSourcePassageCopyPresentation(props);

  return (
    <g data-copy-block={props.source.id} data-bottom={props.height - 8}>
      {presentation.slots.map((slot) => {
        return (
          <FitText key={slot.y} {...slot} breakLongWords normalizeWhitespace />
        );
      })}
    </g>
  );
}
