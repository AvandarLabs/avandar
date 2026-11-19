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

export { AppFrame, BAR, HEAD, BODY_Y } from "./AppFrame";
export { Orb } from "./Orb";
export { Cursor } from "./Cursor";
