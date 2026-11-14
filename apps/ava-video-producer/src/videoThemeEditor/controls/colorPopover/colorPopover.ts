/** What the colour field did that opens or closes its picker. */
export type ColorPopoverEvent = "focus" | "click" | "type" | "enter" | "blur";

/**
 * Whether the picker is open after an event. Focus, a click, or typing opens
 * it. Enter and leaving the field close it, so the picker never stays over the
 * rows below once a colour is entered.
 */
export function isColorPopoverOpenAfter(event: ColorPopoverEvent): boolean {
  return event === "focus" || event === "click" || event === "type";
}
