import { useAvandar, useT } from "@avandar/plugin-sdk";
import {
  Alert,
  Button,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@avandar/plugin-ui";
import { useState } from "react";
import { fitLinearRegression } from "../fitLinearRegression/fitLinearRegression";
import { makeRegressionPointsFromRows } from "../makeRegressionPointsFromRows/makeRegressionPointsFromRows";
import type { LinearRegressionFit } from "../fitLinearRegression/fitLinearRegression";
import type { AvandarApi } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type FitState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{
      kind: "fitted";
      fit: LinearRegressionFit;
      isTruncated: boolean;
      rowCount: number;
    }>
  | Readonly<{ kind: "error"; message: string }>;

type FittedProps = Readonly<{
  fitState: Extract<FitState, { kind: "fitted" }>;
}>;

type PickersProps = Readonly<{
  columnNames: string[];
  xColumn: string;
  yColumn: string;
  isDisabled: boolean;
  onXColumnChange: (column: string) => void;
  onYColumnChange: (column: string) => void;
}>;

type FormProps = Readonly<{
  columnNames: string[];
  initialXColumn: string;
  initialYColumn: string;
}>;

const IDLE_FIT_STATE: FitState = { kind: "idle" };

function _getNumericColumnNames(
  columns: AvandarApi["context"]["columns"],
): string[] {
  return columns
    .filter((column) => {
      return column.dataType === "bigint" || column.dataType === "double";
    })
    .map((column) => {
      return column.name;
    });
}

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

/** Shows a fitted regression's statistics and any truncation note. */
function FittedResult({ fitState }: FittedProps): ReactNode {
  const { fit, isTruncated, rowCount } = fitState;
  const avandar = useAvandar();
  const t = useT();
  const formatNumber = (value: number): string => {
    return value.toLocaleString(avandar.workspace.locale, {
      maximumFractionDigits: 4,
    });
  };
  return (
    <Stack gap="xs">
      <SimpleGrid cols={4}>
        {[
          [t("modal.slope"), formatNumber(fit.slope)],
          [t("modal.intercept"), formatNumber(fit.intercept)],
          [t("modal.rSquared"), formatNumber(fit.rSquared)],
          [t("modal.n"), formatNumber(fit.n)],
        ].map(([label, value]) => {
          return (
            <Stack key={label} gap={0} role="group" aria-label={label}>
              <Text size="xs" c="dimmed">
                {label}
              </Text>
              <Text fw={600}>{value}</Text>
            </Stack>
          );
        })}
      </SimpleGrid>
      {isTruncated ? (
        <Text size="xs" c="dimmed">
          {t("modal.truncated", { count: rowCount })}
        </Text>
      ) : null}
    </Stack>
  );
}

/** Shows what a fit produced: its statistics, or why it produced none. */
function FitOutcome({ fitState }: Readonly<{ fitState: FitState }>): ReactNode {
  if (fitState.kind === "error") {
    return <Alert color="yellow">{fitState.message}</Alert>;
  }
  return fitState.kind === "fitted" ? (
    <FittedResult fitState={fitState} />
  ) : null;
}

/** The predictor (X) and outcome (Y) pickers, over the numeric columns. */
function ColumnPickers(props: PickersProps): ReactNode {
  const t = useT();
  return (
    <Group grow>
      <Select
        label={t("modal.xColumn")}
        data={props.columnNames}
        value={props.xColumn}
        disabled={props.isDisabled}
        allowDeselect={false}
        onChange={(column) => {
          if (column !== null) {
            props.onXColumnChange(column);
          }
        }}
      />
      <Select
        label={t("modal.yColumn")}
        data={props.columnNames}
        value={props.yColumn}
        disabled={props.isDisabled}
        allowDeselect={false}
        onChange={(column) => {
          if (column !== null) {
            props.onYColumnChange(column);
          }
        }}
      />
    </Group>
  );
}

/** The column pickers, the fit button, and the outcome of the last fit. */
function RegressionForm(props: FormProps): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const [xColumn, setXColumn] = useState(props.initialXColumn);
  const [yColumn, setYColumn] = useState(props.initialYColumn);
  const [fitState, setFitState] = useState<FitState>(IDLE_FIT_STATE);
  const [isFitting, setIsFitting] = useState(false);

  const onFit = async (): Promise<void> => {
    setIsFitting(true);
    setFitState(await _fetchFitState({ avandar, xColumn, yColumn }));
    setIsFitting(false);
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

/**
 * The content of the "Linear regression" command's modal. The user picks a
 * numeric predictor (X) and outcome (Y) from the open query result and fits a
 * least-squares line to them, then reads the slope, intercept, R squared, and
 * the number of rows used. With fewer than two numeric columns it explains
 * that there is nothing to fit instead.
 */
export function RegressionModal(): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const columnNames = _getNumericColumnNames(avandar.context.columns);
  const [firstColumn, secondColumn] = columnNames;
  if (firstColumn === undefined || secondColumn === undefined) {
    return <Alert color="yellow">{t("modal.notEnoughData")}</Alert>;
  }
  return (
    <RegressionForm
      columnNames={columnNames}
      initialXColumn={firstColumn}
      initialYColumn={secondColumn}
    />
  );
}
