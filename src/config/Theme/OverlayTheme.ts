/**
 * Shared full-screen dim layer and elevated panel styling.
 * Used by AppDropzone import overlay and Mantine modals.
 */
export const OverlayTheme = {
  backdrop: {
    backgroundColor: "rgb(15 23 42 / 38%)",
    backdropFilter: "blur(6px) saturate(140%)",
  },
  panel: {
    /** Deep lift + inner highlight (matches import drop card). */
    shadow:
      "0 25px 50px -12px rgb(15 23 42 / 35%), 0 0 0 1px rgb(255 255 255 / 50%) inset",
    radius: "xl" as const,
  },
} as const;
