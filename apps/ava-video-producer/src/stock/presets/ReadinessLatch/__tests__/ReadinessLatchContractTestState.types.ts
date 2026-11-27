import { type Input } from "../ReadinessLatch.schema";
import type {
  _render,
  _getResultBoundsFromMarkup,
} from "./ReadinessLatchTestHelpers";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertFullLabeledResultStaysMarkupOptions = {
  markup: ReturnType<typeof _render>;
  orientation: "horizontal" | "vertical";
  moving: ReturnType<typeof _getResultBoundsFromMarkup>;
  input: Readonly<Input>;
};
