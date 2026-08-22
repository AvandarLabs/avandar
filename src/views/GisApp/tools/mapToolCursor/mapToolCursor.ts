import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";

import { match } from "ts-pattern";

import {
  ARROW_CURSOR,
  PENCIL_CURSOR,
  POLYGON_CURSOR,
} from "@/views/GisApp/tools/mapToolCursor/mapToolCursorImages";

type Options = {
  mapToolMode: MapToolMode;
  isAltPanHeld: boolean;
  isPointerDown: boolean;
};

function _grabCursor(isPointerDown: boolean): "grab" | "grabbing" {
  return isPointerDown ? "grabbing" : "grab";
}

function _armedToolCursor(mapToolMode: MapToolMode): string {
  return match(mapToolMode)
    .with({ type: "pan" }, () => {
      return "grab";
    })
    .with({ type: "annotate", kind: "text" }, () => {
      return "text";
    })
    .with({ type: "annotate", kind: "arrow" }, () => {
      return ARROW_CURSOR;
    })
    .with({ type: "annotate", kind: "freehand" }, () => {
      return PENCIL_CURSOR;
    })
    .with({ type: "annotate", kind: "area" }, () => {
      return POLYGON_CURSOR;
    })
    .with({ type: "erase" }, () => {
      return "cell";
    })
    .with({ type: "buffer" }, { type: "goto" }, () => {
      return "grab";
    })
    .otherwise(() => {
      return "crosshair";
    });
}

/** CSS cursor for the map canvas given the armed tool and Alt-pan. */
export function mapToolCursor(options: Options): string {
  if (options.isAltPanHeld || options.mapToolMode.type === "pan") {
    return _grabCursor(options.isPointerDown);
  }
  return _armedToolCursor(options.mapToolMode);
}
