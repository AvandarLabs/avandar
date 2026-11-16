import { PluginError, useAvandar } from "@avandar/plugin-sdk";
import { useEffect, useState } from "react";
import type { CaseSlotState } from "./CaseEpicurveModal.types";
import type { AvandarApi } from "@avandar/plugin-sdk";

/** The data slot the manifest declares for case records. */
const CASES_SLOT_ID = "cases";

/** The slot attributes the epicurve reads. */
const CASE_COLUMNS = ["onsetDate", "district"];

function _getStateFromError(options: {
  error: unknown;
  t: AvandarApi["i18n"]["t"];
}): CaseSlotState {
  const { error, t } = options;
  if (error instanceof PluginError && error.code === "SlotNotBound") {
    return { kind: "notBound" };
  }
  if (error instanceof PluginError && error.code === "SlotBroken") {
    return { kind: "broken" };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { kind: "failed", message: t("caseEpicurve.failed", { message }) };
}

/** Reads every case the slot returned. Never throws: failures are state. */
async function _loadCaseSlotState(avandar: AvandarApi): Promise<CaseSlotState> {
  const { querySlot } = avandar.data;
  if (querySlot === undefined) {
    return {
      kind: "failed",
      message: avandar.i18n.t("caseEpicurve.unavailable"),
    };
  }
  try {
    const slot = await querySlot(CASES_SLOT_ID);
    const { rows } = await avandar.data.fetchRows(slot.queryHandle, {
      columns: CASE_COLUMNS,
      limit: slot.rowCount,
    });
    return { kind: "loaded", rows, isTruncated: slot.isTruncated };
  } catch (error) {
    return _getStateFromError({ error, t: avandar.i18n.t });
  }
}

/**
 * Reads the onset date and district of every case the plugin's `cases`
 * data slot is bound to, for `CaseEpicurveModal`. `chooseRecords` lets the
 * user choose the case records, then reads the cases again once the binding
 * dialog closes.
 */
export function useCaseSlotRows(): Readonly<{
  state: CaseSlotState;
  chooseRecords: () => Promise<void>;
}> {
  const avandar = useAvandar();
  const [state, setState] = useState<CaseSlotState>({ kind: "loading" });
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    // A read that finishes after a newer one started, or after the modal
    // closed, must not overwrite what is shown.
    let isCurrentRead = true;
    void _loadCaseSlotState(avandar).then((loadedState) => {
      if (isCurrentRead) {
        setState(loadedState);
      }
    });
    return () => {
      isCurrentRead = false;
    };
  }, [avandar, readCount]);

  const chooseRecords = async (): Promise<void> => {
    // A binding dialog that fails to open leaves the slot as it was, which
    // the next read shows.
    await avandar.ui.openDataSlotBinding?.(CASES_SLOT_ID).catch(() => {});
    setState({ kind: "loading" });
    setReadCount((count) => {
      return count + 1;
    });
  };

  return { state, chooseRecords };
}
