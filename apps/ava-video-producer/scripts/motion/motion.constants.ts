import path from "node:path";
import { fileURLToPath } from "node:url";
import { StockFingerprintModule } from "../stock/StockFingerprintModule/StockFingerprintModule";

/** The producer app's root directory, which every motion output lives under. */
export const ROOT: string = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** The frames each stock preview renders as a still. */
export const SAMPLES: number[] =
  StockFingerprintModule.SAMPLE_PARAMETERS.samples;
