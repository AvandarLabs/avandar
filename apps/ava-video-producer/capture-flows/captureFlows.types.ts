import type { CaptureFlowContext } from "../scripts/captureAvandar/captureAvandar.types";

/** A product record a flow created or reused, by ID and visible name. */
export type FlowRecord = { id: string; name: string };

/** The case type the cases flow creates or reuses, and what it observed. */
export type FlowCaseType = FlowRecord & {
  createdByRun: boolean;
  synced?: boolean;
  observedRecordCount?: number;
  recordName?: string;
  recordUrl?: string;
};

/**
 * What the Avandar capture flows remember across one run, so later flows
 * reuse the datasets, query, and records earlier flows made.
 */
export type FlowState = {
  datasets?: Record<string, FlowRecord>;
  explorerUrl?: string;
  dashboard?: FlowRecord;
  caseType?: FlowCaseType;
  map?: FlowRecord & { createdByRun: boolean };
};

/** A capture flow context whose shared state has the Avandar flows' shape. */
export type FlowContext = Omit<CaptureFlowContext, "state"> & {
  state: FlowState;
};
