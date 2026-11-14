/** What the colour field did that opens or closes its picker. */
export type ColorPopoverEvent =
  | "focus"
  | "click"
  | "type"
  | "enter"
  | "escape"
  | "blur";

/**
 * Whether the picker is open after an event. Focus, a click, or typing opens
 * it. Enter, Escape, and leaving the field close it, so the picker never stays
 * over the rows below once a colour is entered.
 */
export function isColorPopoverOpenAfter(event: ColorPopoverEvent): boolean {
  return event === "focus" || event === "click" || event === "type";
}

/**
 * Whether Escape is for the picker rather than the dialog around it. While the
 * picker is open Escape only closes the picker. With it closed Escape reaches
 * the dialog.
 */
export function doesEscapeBelongToColorPopover(isOpen: boolean): boolean {
  return isOpen;
}
