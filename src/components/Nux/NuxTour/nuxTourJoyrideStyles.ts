import { NUX_TOUR_Z_INDEX } from "@/config/Theme/Theme";

/**
 * Joyride overlay and floater styles. Overlay is viewport-fixed so a flipped
 * tooltip cannot stretch the page.
 */
export const nuxTourJoyrideStyles = {
  floater: {
    filter: "none",
  },
  arrow: {
    zIndex: 1,
  },
  overlay: {
    position: "fixed",
    height: "100%",
    zIndex: NUX_TOUR_Z_INDEX,
  },
} as const;
