import { Box } from "@remotion/rough-notation";
import { useContinuityAppearance } from "./ContinuityAppearanceContext";
import css from "./ContinuityOverlays.module.css";

/** A stationary sketch border for the enclosing editorial card or token. */
export function ContinuityBoxOutline() {
  const { boxRoughness } = useContinuityAppearance();
  if (boxRoughness === 0) return null;
  return (
    <div className={css.boxOutline}>
      <Box
        progress={1}
        roughness={boxRoughness}
        seed={17}
        padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        strokeWidth={2}
        style={{ width: "100%", height: "100%" }}
      >
        <div className={css.boxOutlineSize} />
      </Box>
    </div>
  );
}
