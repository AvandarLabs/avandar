/** Cues after the rows land, in frames. */
const CUES = { panel: 4, facts: 16 };
/** How far each part rises as it arrives, in pixels. */
const RISE = { panel: 14, fact: 8, toast: 16 };
/** The lit chip presses half as deep again as a button. */
const CHIP_PRESS_SCALE = 1.5;
/** Shared values and calculations for the SidePanel visuals. */
export const SidePanelShared = {
  /** The lit chip presses half as deep again as a button. */
  CHIP_PRESS_SCALE,
  /** Cues after the rows land, in frames. */
  CUES,
  /** How far each part rises as it arrives, in pixels. */
  RISE,
} as const;
