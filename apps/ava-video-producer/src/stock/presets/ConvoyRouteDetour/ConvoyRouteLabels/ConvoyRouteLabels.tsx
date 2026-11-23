import { FitText } from "../../../primitives/FitText/FitText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the label label with authored geometry. */
export function ConvoyRouteLabels({
  input,
  accent,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showRouteLabels
        ? input.routes.map((route, index) => {
            return (
              <FitText
                key={route.role}
                text={route.label}
                x={350 + index * 300}
                y={505}
                width={270}
                fontSize={14}
                maxLines={3}
                color={
                  route.role === "detour" ? accent : tokens.color.textMuted
                }
                normalizeWhitespace
                breakLongWords
              />
            );
          })
        : undefined}
    </>
  );
}
