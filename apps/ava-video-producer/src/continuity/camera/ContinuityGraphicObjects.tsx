import { SvgObjectDeparture } from "../../motion-components/SvgObjectDeparture";
import { StockGraphic } from "../../stock/StockGraphic";
import { useContinuityAppearance } from "../ContinuityAppearanceContext";
import { sampleStockFrame } from "../continuityTimeline";
import type { ContinuityBeat } from "../continuitySchema";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "stock" }>;
  frame: number;
};

/**
 * Isolate one graphic object so it can exit while its surroundings stay in
 * place. The stock graphic inherits the composition's theme and adds its
 * preset override.
 */
export function ContinuityGraphicObjects({ content, frame }: Props) {
  const { cameraMotion } = useContinuityAppearance();
  const flight = cameraMotion ? content.flight : undefined;
  const props = {
    ...content.request,
    frame: sampleStockFrame(frame, content.settleFrame),
    width: 960,
    height: 600,
  };
  if (!flight || frame < flight.at) {
    return <StockGraphic {...props} />;
  }
  return (
    <SvgObjectDeparture frame={frame} flight={flight}>
      <StockGraphic {...props} />
    </SvgObjectDeparture>
  );
}
