import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./AtomicOutboxCommit.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Committed obligations remain pending rather than implying delivery. */
export const PENDING_DELIVERY_MESSAGE: { id: string; message: string } = {
  id: "motionAtlas.atomic-outbox-commit.controls.outcome.help",
  message: "Pending delivery",
};
/** Serializable editors preserve the one shared commit outcome. */
export const controls: StockControl[] = makeStockControlsFromSchema({
  schema: jsonSchema,
  messageNamespace: "motionAtlas.atomic-outbox-commit",
}).map((control) =>
  control.path === "outcome"
    ? { ...control, help: PENDING_DELIVERY_MESSAGE }
    : control,
);
