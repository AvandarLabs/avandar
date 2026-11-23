import { propEq, propNotEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./DashboardSlotAssembly.schema";
/** Inputs for getWidgetRectFromInput. */
type GetWidgetRectFromInputArguments = SlotOptions & {
  frame: number;
  motion: VideoMotion;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type SlotOptions = {
  input: Input;
  widgetId: string;
};
/** Frames a panel takes to travel into its slot. */
const DOCK_FRAMES = 24;
/** Frames between supporting panels docking one after another. */
const DOCK_STAGGER_FRAMES = 12;
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
  motion,
}: Readonly<GetWidgetRectFromInputArguments>): Rect {
  const slot = _getWidgetSlotFromInput({ input, widgetId });
  const featured = widgetId === input.featuredWidgetId;
  const position = input.widgets
    .filter(propNotEq("id", input.featuredWidgetId))
    .findIndex(propEq("id", widgetId));
  const dock = motion.scale(DOCK_FRAMES);
  const progress = Motion.ramp({
    frame,
    at: featured
      ? 40
      : 64 + position * motion.scaleStagger(DOCK_STAGGER_FRAMES),
    dur: dock,
    easing: motion.travel.easing,
  });
  const loose = _getLooseWidgetRectFromInput({ input, widgetId });
  const staging = featured
    ? 0
    : Motion.ramp({ frame, at: 40, dur: dock, easing: motion.travel.easing });
  const initial = {
    x: Motion.mix({ t: staging, from: loose.x, to: slot.x + 8 }),
    y: Motion.mix({ t: staging, from: loose.y, to: slot.y + 4 }),
    width: Motion.mix({ t: staging, from: loose.width, to: slot.width }),
    height: Motion.mix({ t: staging, from: loose.height, to: slot.height }),
  };
  return {
    x: Motion.mix({ t: progress, from: initial.x, to: slot.x }),
    y: Motion.mix({ t: progress, from: initial.y, to: slot.y }),
    width: Motion.mix({ t: progress, from: initial.width, to: slot.width }),
    height: Motion.mix({ t: progress, from: initial.height, to: slot.height }),
  };
}
