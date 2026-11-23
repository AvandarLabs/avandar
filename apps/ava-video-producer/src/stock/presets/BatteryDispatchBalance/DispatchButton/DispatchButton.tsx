import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  accent: string;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  reach: number;
};
/** Shows the dispatch button press at the operator reach cue. */
export function DispatchButton({
  accent,
  atomic,
  reach,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <circle
        data-dispatch-button="true"
        cx={480}
        cy={105}
        r={9}
        fill={accent}
        fillOpacity={atomic.opacity["20"] + atomic.opacity["60"] * reach}
      />
    </>
  );
}
