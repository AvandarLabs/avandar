import type {
  StockInputByPreset,
  StockPresetId,
} from "../../stock/contracts/StockContract.types";
import type { Preset } from "./Preset.types";

type Configuration = {
  preset: Preset;
  input: StockInputByPreset[StockPresetId];
  accent: string;
  background: string;
};
type ConfiguredStockRequest = {
  preset: StockPresetId;
  schemaVersion: 1;
  input: StockInputByPreset[StockPresetId];
  accent: string;
  background: string;
};
/** A standalone request containing an independent copy of the preview input. */
export function makeStockRequestFromConfiguration({
  preset,
  input,
  accent,
  background,
}: Readonly<Configuration>): ConfiguredStockRequest {
  return {
    preset: preset.id,
    schemaVersion: 1,
    input: structuredClone(input),
    accent,
    background,
  };
}
