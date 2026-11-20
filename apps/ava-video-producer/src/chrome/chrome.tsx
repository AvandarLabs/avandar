/**
 * The fake app window every composition is drawn inside, plus the pointer.
 *
 * Keep this shared. Three compositions each carrying their own copy of the
 * title bar and cursor is how they drift apart, and a fix stops being
 * inherited. Same reasoning as motion.ts.
 *
 * Never put a transform on the chrome container: it resamples every glyph
 * inside it, so the bar and the header must never sit inside a lasting
 * transform.
 */
export { AppFrame, BODY_Y } from "./AppFrame/AppFrame";
export { AppFrameShared } from "./AppFrame/AppFrameShared/AppFrameShared";
export { Orb } from "./Orb/Orb";
export { Cursor } from "./Cursor/Cursor";
