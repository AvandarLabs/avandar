// Registers the bundled faces the theme's text roles name.
import "../../../fonts";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import type { CSSProperties } from "react";

const ROWS_AT = 18;
const TYPE_AT = 68;
const COUNT_AT = 122;
const CLICK_AT = 192;
/** Animation lengths with no shared token, in frames at tempo 1. */
const FRAMES = { appIn: 14, appOut: 20, count: 36 };
/** The figure the counter lands on. */
const COUNT_TO = 1940;
const ITEMS = [
  ["01", "Staggered entrances", "Each row arrives in its own time."],
  ["02", "Typed text", "A sentence builds character by character."],
  ["03", "Animated counters", "A value travels toward its final number."],
  ["04", "Pointer choreography", "Arrive, pause, press, then hold."],
];
/** The panel every card in the study sits in: scene card, border, corner. */
function usePanelStyle(): CSSProperties {
  const { semantic } = useVideoTheme();
  const scales = useVideoShapeScales();
  return {
    position: "absolute",
    border: `${scales.stroke(semantic.stroke.hairline)}px solid ${semantic.color.scene.border}`,
    borderRadius: scales.corner(semantic.corner.panel),
    background: semantic.color.scene.card,
  };
}
/** Coordinates motion-study cues, explanatory rows, and themed panel styles. */
export const MotionLabShared = {
  /** The panel every card in the study sits in: scene card, border, corner. */
  usePanelStyle,
  /** Numbers, titles, and descriptions for the motion building-block rows. */
  ITEMS,
  /** Frame when the building-block rows start their staggered entrances. */
  ROWS_AT,
  /** Frame when the sample sentence starts typing. */
  TYPE_AT,
  /** Frame when the numeric counter starts moving toward its target. */
  COUNT_AT,
  /** Animation lengths with no shared token, in frames at tempo 1. */
  FRAMES,
  /** The figure the counter lands on. */
  COUNT_TO,
  /** Frame shared by the cursor press, button dip, and active highlight. */
  CLICK_AT,
} as const;
