import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Button, Stack } from "@avandar/plugin-ui";
import { useState } from "react";
import { fitLinearRegression } from "../fitLinearRegression/fitLinearRegression";
import { makeRegressionPointsFromRows } from "../makeRegressionPointsFromRows/makeRegressionPointsFromRows";
import { ColumnPickers } from "./ColumnPickers";
import { FitOutcome } from "./FitOutcome";
import { IDLE_FIT_STATE } from "./RegressionModal.constants";
import type { FitState } from "./RegressionModal.types";
import type { AvandarApi } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  columnNames: string[];
  initialXColumn: string;
  initialYColumn: string;
};

/** Reads the two columns and fits them. Never throws: failures are state. */
async function _fetchFitState(options: {
  avandar: AvandarApi;
  xColumn: string;
  yColumn: string;
}): Promise<FitState> {
  const { avandar, xColumn, yColumn } = options;
  const { t } = avandar.i18n;
  if (xColumn === yColumn) {
    return { kind: "error", message: t("modal.notEnoughData") };
  }
  try {
    const { rows, isTruncated } = await avandar.data.fetchRows(
      avandar.context.queryHandle,
      { columns: [xColumn, yColumn] },
    );
    const fit = fitLinearRegression(
      makeRegressionPointsFromRows({ rows, xColumn, yColumn }),
    );
    if (fit === undefined) {
      return { kind: "error", message: t("modal.notEnoughData") };
    }
    return { kind: "fitted", fit, isTruncated, rowCount: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "error", message: t("modal.failed", { message }) };
  }
}

/**
 * The column pickers, the fit button, and the outcome of the last fit.
 * `RegressionModal` renders it once the result has two numeric columns.
 */
export function RegressionForm(props: Readonly<Props>): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const [xColumn, setXColumn] = useState(props.initialXColumn);
  const [yColumn, setYColumn] = useState(props.initialYColumn);
  const [fitState, setFitState] = useState<FitState>(IDLE_FIT_STATE);
  const [isFitting, setIsFitting] = useState(false);

  const onFit = async (): Promise<void> => {
    setIsFitting(true);
    try {
      setFitState(await _fetchFitState({ avandar, xColumn, yColumn }));
    } finally {
      setIsFitting(false);
    }
  };

  return (
    <Stack>
      <ColumnPickers
        columnNames={props.columnNames}
        xColumn={xColumn}
        yColumn={yColumn}
        isDisabled={isFitting}
        onXColumnChange={(column) => {
          setXColumn(column);
          setFitState(IDLE_FIT_STATE);
        }}
        onYColumnChange={(column) => {
          setYColumn(column);
          setFitState(IDLE_FIT_STATE);
        }}
      />
      <Button
        loading={isFitting}
        onClick={() => {
          void onFit();
        }}
      >
        {t("modal.fit")}
      </Button>
      <FitOutcome fitState={fitState} />
    </Stack>
  );
}
