import { propEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AccessParticipant } from "./AccessParticipant";
import { DEFAULT_INPUT } from "./ChosenServiceAccess.fixtures";
import { ChosenServiceAccessAccessRoute } from "./ChosenServiceAccessAccessRoute/ChosenServiceAccessAccessRoute";
import { ChosenServiceAccessParticipantLabel } from "./ChosenServiceAccessParticipantLabel/ChosenServiceAccessParticipantLabel";
import { ChosenServiceAccessServicesLayer } from "./ChosenServiceAccessServicesLayer/ChosenServiceAccessServicesLayer";
import { ChosenServiceAccessStaffLabel } from "./ChosenServiceAccessStaffLabel/ChosenServiceAccessStaffLabel";
import { ServiceAccessCaption } from "./ServiceAccessCaption/ServiceAccessCaption";
import { ServiceStaff } from "./ServiceStaff";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * Choice precedes a targeted physical access change and self-directed entry.
 */
export function ChosenServiceAccess({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const chosenIndex = input.services.findIndex(
    propEq("id", input.chosenServiceId),
  );
  const doorX = 160 + ((chosenIndex + 0.5) * 640) / input.services.length;
  const threshold = input.accessChange === "clear-entrance" ? 356 : 326;
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M50 356 H860" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <ChosenServiceAccessServicesLayer {...{ input, frame, accent }} />
      <ChosenServiceAccessAccessRoute
        {...{ doorX, threshold, tokens, scales }}
      />
      <ServiceStaff
        input={input}
        frame={frame}
        accent={tokens.color.highlight}
      />
      <AccessParticipant {...{ input, frame, accent }} />
      <ChosenServiceAccessParticipantLabel input={input} />
      <ChosenServiceAccessStaffLabel input={input} />
      <ServiceAccessCaption input={input} />
    </g>
  );
}
