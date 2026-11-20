import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { CHIP_CLICK, CHIPS, LIT_CHIP } from "../timeline";
import { FilterChip } from "./FilterChip";
import { SidePanelShared } from "./SidePanelShared/SidePanelShared";
import type { ReactNode } from "react";
/** Animates the handoff from all channels to paid channels for `SidePanel`. */
export function FilterChips({
  frame,
  chipOn,
}: {
  frame: number;
  chipOn: number;
}): ReactNode {
  const { mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const chipPress = motion.press(
    frame,
    CHIP_CLICK,
    motion.pressDepth * SidePanelShared.CHIP_PRESS_SCALE,
  );
  return (
    <div
      style={{
        display: "flex",
        gap: mantine.spacing["10"],
        marginTop: mantine.spacing["30"],
        flexWrap: "wrap",
      }}
    >
      {CHIPS.map((chip, index) => {
        // A filter group always has exactly one selection. "All channels"
        // is lit from the start and hands over to "Paid only" on the same
        // ramp: three inert chips are a control in no state at all, which
        // no real UI ever shows.
        const lit = index === 0 ? 1 - chipOn : index === LIT_CHIP ? chipOn : 0;
        return (
          <FilterChip
            key={chip}
            chip={chip}
            lit={lit}
            scale={index === LIT_CHIP ? chipPress : 1}
          />
        );
      })}
    </div>
  );
}
