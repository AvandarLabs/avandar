import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert, Stack, Text } from "@avandar/plugin-ui";
import { useMemo, useState } from "react";
import { getDateFromCellValue } from "../../epicurve/getDateFromCellValue/getDateFromCellValue";
import { makeEpicurveFromRows } from "../../epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { CaseEpicurveChart } from "./CaseEpicurveChart";
import { CaseEpicurveControls } from "./CaseEpicurveControls";
import { CaseEpicurveDataTable } from "./CaseEpicurveDataTable";
import type { EpicurveInterval } from "../../epicurve/getBucketStartFromDate/getBucketStartFromDate";
import type {
  FetchRowsResult,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  rows: FetchRowsResult["rows"];
  isTruncated: boolean;
};

function _hasDistrict(row: FetchRowsResult["rows"][number]): boolean {
  const { district } = row;
  return district !== null && district !== undefined && district !== "";
}

function _hasOnsetDate(row: FetchRowsResult["rows"][number]): boolean {
  return getDateFromCellValue(row.onsetDate) !== undefined;
}

/** The cases the curve's bars add up to, over every series. */
function _getChartedCaseCount(epicurve: PluginVizTransformResult): number {
  return epicurve.rows.reduce((total, row) => {
    return (
      total +
      epicurve.chart.series.reduce((rowTotal, oneSeries) => {
        return rowTotal + Number(row[oneSeries.column]);
      }, 0)
    );
  }, 0);
}

/**
 * The cases bucketed into an epicurve with its controls and a table of its
 * counts, plus a note for every case left out of the curve: records the
 * slot did not return, cases with no onset date, and cases before the
 * latest buckets the curve keeps. `CaseEpicurveModal` renders it once the
 * cases are read.
 */
export function CaseEpicurveView({
  rows,
  isTruncated,
}: Readonly<Props>): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const [interval, setSelectedInterval] = useState<EpicurveInterval>("epiWeek");
  const [isStacked, setIsStacked] = useState(false);
  const canStackByDistrict = useMemo(() => {
    return rows.some(_hasDistrict);
  }, [rows]);
  const isStackedByDistrict = isStacked && canStackByDistrict;
  const datedCaseCount = useMemo(() => {
    return rows.filter(_hasOnsetDate).length;
  }, [rows]);
  const epicurve = useMemo(() => {
    return makeEpicurveFromRows(
      {
        rows,
        // The transform reads only the columns its settings name.
        columns: [],
        settings: {
          dateColumn: "onsetDate",
          interval,
          stackByColumn: isStackedByDistrict ? "district" : undefined,
        },
        isTruncated,
      },
      { i18n: avandar.i18n, locale: avandar.workspace.locale },
    );
  }, [rows, isTruncated, interval, isStackedByDistrict, avandar]);
  if (rows.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("caseEpicurve.noCases")}
      </Text>
    );
  }
  const undatedCaseCount = rows.length - datedCaseCount;
  const unchartedEarlierCount = datedCaseCount - _getChartedCaseCount(epicurve);
  return (
    <Stack>
      {isTruncated ? (
        <Alert color="yellow">
          {t("caseEpicurve.truncated", { count: rows.length })}
        </Alert>
      ) : null}
      <CaseEpicurveControls
        interval={interval}
        onIntervalChange={setSelectedInterval}
        isStackedByDistrict={isStackedByDistrict}
        canStackByDistrict={canStackByDistrict}
        onIsStackedByDistrictChange={setIsStacked}
      />
      {epicurve.rows.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("caseEpicurve.empty")}
        </Text>
      ) : (
        <>
          <CaseEpicurveChart epicurve={epicurve} />
          <CaseEpicurveDataTable epicurve={epicurve} />
        </>
      )}
      {unchartedEarlierCount > 0 ? (
        <Text size="xs" c="dimmed">
          {t("caseEpicurve.bucketsCapped", {
            count: epicurve.rows.length,
            interval,
            omitted: unchartedEarlierCount,
          })}
        </Text>
      ) : null}
      {undatedCaseCount > 0 && datedCaseCount > 0 ? (
        <Text size="xs" c="dimmed">
          {t("caseEpicurve.undated", { count: undatedCaseCount })}
        </Text>
      ) : null}
    </Stack>
  );
}
