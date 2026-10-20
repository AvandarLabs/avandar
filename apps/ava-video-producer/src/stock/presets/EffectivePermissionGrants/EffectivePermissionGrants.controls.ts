import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./EffectivePermissionGrants.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Restriction has a visible meaning independent of excluded candidates. */
export const RESTRICTION_MESSAGE: { id: string; message: string } = {
  id: "motionAtlas.effective-permission-grants.controls.restricted.help",
  message: "App defaults excluded",
};
/** Serializable editors for every accepted field. */
export const controls: StockControl[] = makeStockControlsFromSchema({
  schema: jsonSchema,
  messageNamespace: "motionAtlas.effective-permission-grants",
}).map((control) =>
  control.path === "restricted"
    ? { ...control, help: RESTRICTION_MESSAGE }
    : control.path === "requiredRole"
      ? {
          ...control,
          label: {
            id: "motionAtlas.effective-permission-grants.controls.requiredRole",
            message: "Required role",
          },
        }
      : control,
);
