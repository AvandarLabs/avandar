import { propEq, propNotEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./DashboardSlotAssembly.schema";
type Rect = { x: number; y: number; width: number; height: number };
type SlotOptions = { input: Input; widgetId: string };
const LOOSE_PANELS: Rect[] = [
  { x: 24, y: 108, width: 400, height: 232 },
  { x: 472, y: 124, width: 464, height: 232 },
  { x: 48, y: 348, width: 408, height: 240 },
  { x: 496, y: 368, width: 440, height: 220 },
];

function _getLooseWidgetRectFromInput({
  input,
  widgetId,
}: Readonly<SlotOptions>): Rect {
  const index = input.widgets.findIndex(propEq("id", widgetId));
  const widget = input.widgets[index];
  const panel = LOOSE_PANELS[index];
  return widget.kind === "value"
    ? { ...panel, width: panel.width - 64, height: 168 }
    : { ...panel };
}
/** Each identity gets one reserved slot, independent of its content values. */
function _getWidgetSlotFromInput({
  input,
  widgetId,
}: Readonly<SlotOptions>): Rect {
  const featured = widgetId === input.featuredWidgetId;
  const supporting = input.widgets.filter(
    propNotEq("id", input.featuredWidgetId),
  );
  const position = supporting.findIndex(propEq("id", widgetId));
  const numSupporting = supporting.length;
  if (input.layout === "feature-left") {
    if (featured) {
      return { x: 24, y: 132, width: 396, height: 444 };
    }
    const height = (444 - 8 * (numSupporting - 1)) / numSupporting;
    return { x: 432, y: 132 + position * (height + 8), width: 504, height };
  }
  if (featured) {
    return { x: 24, y: 132, width: 912, height: 198 };
  }
  const width = (912 - 8 * (numSupporting - 1)) / numSupporting;
  return { x: 24 + position * (width + 8), y: 342, width, height: 234 };
}
/**
 * Independent loose panels travel and resize into their assigned final slots.
 */
export function getWidgetRectFromInput({
  input,
  widgetId,
  frame,
}: Readonly<SlotOptions & { frame: number }>): Rect {
  const slot = _getWidgetSlotFromInput({ input, widgetId });
  const featured = widgetId === input.featuredWidgetId;
  const position = input.widgets
    .filter((widget) => widget.id !== input.featuredWidgetId)
    .findIndex(propEq("id", widgetId));
  const progress = ramp(
    frame,
    featured ? 40 : 64 + position * 12,
    24,
    EASE.inOut,
  );
  const loose = _getLooseWidgetRectFromInput({ input, widgetId });
  const staging = featured ? 0 : ramp(frame, 40, 24, EASE.inOut);
  const initial = {
    x: mix(staging, loose.x, slot.x + 8),
    y: mix(staging, loose.y, slot.y + 4),
    width: mix(staging, loose.width, slot.width),
    height: mix(staging, loose.height, slot.height),
  };
  return {
    x: mix(progress, initial.x, slot.x),
    y: mix(progress, initial.y, slot.y),
    width: mix(progress, initial.width, slot.width),
    height: mix(progress, initial.height, slot.height),
  };
}
