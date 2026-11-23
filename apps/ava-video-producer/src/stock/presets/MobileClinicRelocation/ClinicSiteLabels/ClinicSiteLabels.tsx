import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = {
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  sites: Input["sites"];
};
/** Connects each authored site to its local route position. */
export function ClinicSiteLabels({
  accent,
  tokens,
  sites,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {sites.map((site, index) => {
        return (
          <g key={site.id}>
            <g data-site-id={site.id}>
              <SketchedShape
                shape={{ kind: "circle", cx: site.x, cy: site.y, r: 9 }}
                profile={tokens.sketch.shape}
                fill={tokens.color.surface}
                stroke={accent}
              />
            </g>
            <FitText
              text={site.label}
              x={500}
              y={190 + index * 70}
              width={110}
              fontSize={12}
              maxLines={4}
              breakLongWords
              normalizeWhitespace
            />
            <SketchedShape
              shape={{
                kind: "path",
                d: `M490 ${190 + index * 70} L${site.x} ${site.y}`,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
            />
          </g>
        );
      })}
    </>
  );
}
