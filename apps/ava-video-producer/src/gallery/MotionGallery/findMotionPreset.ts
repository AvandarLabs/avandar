import { propEq } from "@avandar/utils";
import { STOCK_CATALOG } from "../../stock/stockEntry";
import type { Preset } from "./Preset.types";
/** Finds a catalog preset for gallery selections, such as a URL fragment. */
export function findMotionPreset(id: string): Preset | undefined {
  return STOCK_CATALOG.find(propEq<{ id: unknown }, "id", unknown>("id", id));
}
