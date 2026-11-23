import { SvgObjectDeparture } from "../../motion-components/SvgObjectDeparture";
import { StockGraphic } from "../../stock/StockGraphic/StockGraphic";
import { useContinuityAppearance } from "../ContinuityAppearanceContext/useContinuityAppearance";
import { ContinuityTimeline } from "../ContinuityTimeline/ContinuityTimeline";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: Extract<
    ContinuityBeat["content"],
    {
      kind: "stock";
    }
  >;
  frame: number;
};
/**
 * Isolate one graphic object so it can exit while its surroundings stay in
 * place. The stock graphic inherits the composition's theme and adds its
 * preset override.
 */
export function ContinuityGraphicObjects({ content, frame }: Props): ReactNode {
  const { cameraMotion } = useContinuityAppearance();
  const flight = cameraMotion ? content.flight : undefined;
  const props = {
    ...content.request,
    frame: ContinuityTimeline.sampleStockFrame({
      frame,
      settleFrame: content.settleFrame,
    }),
    width: 960,
    height: 600,
  };
  return !flight || frame < flight.at ? (
    <StockGraphic {...props} />
  ) : (
    <SvgObjectDeparture frame={frame} flight={flight}>
      <StockGraphic {...props} />
    </SvgObjectDeparture>
  );
}
