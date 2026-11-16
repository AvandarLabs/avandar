import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProductRootFromProducerRoot } from "../lib/productSourceHelpers";

/** The producer app directory, which holds the adapter and the bundle. */
export const PRODUCER_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** The Avandar checkout that contains the producer app. */
export const PRODUCT_ROOT = getProductRootFromProducerRoot(PRODUCER_ROOT);

/** The producer folder of adapters, shims, and alias maps for the product. */
export const ADAPTER_ROOT = path.join(PRODUCER_ROOT, "avandar-adapter");
