import type { ScanLinesInput } from "../../../presets/ScanLines/ScanLines.schema";
/** Inputs shared by the ScanLines visuals. */
export type ScanRowProps = Readonly<{
  row: string;
  index: number;
  isLast: boolean;
  scanY: number;
  accent: string;
  showChecks: ScanLinesInput["showChecks"];
}>;
