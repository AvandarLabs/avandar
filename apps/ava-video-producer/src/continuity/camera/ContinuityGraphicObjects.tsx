import { SvgObjectDeparture } from "../../motion-components/SvgObjectDeparture";
import { StockGraphic } from "../../stock/StockGraphic";
import { createThemePatchFromLegacyAppearance } from "../../videoTheme/themePatches/themePatches";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { useContinuityAppearance } from "../ContinuityAppearanceContext";
import { sampleStockFrame } from "../continuityTimeline";
import type { ContinuityBeat } from "../continuitySchema";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "stock" }>;
  frame: number;
};

/** Isolate one graphic object so it can exit while its surroundings stay in place. */
export function ContinuityGraphicObjects({ content, frame }: Props) {
  const { accent, background, cameraMotion, boxRoughness } =
    useContinuityAppearance();
  const flight = cameraMotion ? content.flight : undefined;
  const props = {
    ...content.request,
    frame: sampleStockFrame(frame, content.settleFrame),
    accent,
    background,
    width: 960,
    height: 600,
  };
  const patches = [createThemePatchFromLegacyAppearance({ boxRoughness })];
  if (!flight || frame < flight.at) {
    return (
      <VideoThemeScope patches={patches}>
        <StockGraphic {...props} />
      </VideoThemeScope>
    );
  }
  return (
    <SvgObjectDeparture frame={frame} flight={flight}>
      <VideoThemeScope patches={patches}>
        <StockGraphic {...props} />
      </VideoThemeScope>
    </SvgObjectDeparture>
  );
}
