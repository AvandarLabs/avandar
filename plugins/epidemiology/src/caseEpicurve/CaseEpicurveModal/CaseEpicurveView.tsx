import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import { useMemo, useState } from "react";
import { makeEpicurveFromRows } from "../../epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { CaseEpicurveChart } from "./CaseEpicurveChart";
import { CaseEpicurveControls } from "./CaseEpicurveControls";
import type { EpicurveInterval } from "../../epicurve/getBucketStartFromDate/getBucketStartFromDate";
import type { FetchRowsResult } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  rows: FetchRowsResult["rows"];
  isTruncated: boolean;
};

function _hasDistrict(row: FetchRowsResult["rows"][number]): boolean {
  const { district } = row;
  return district !== null && district !== undefined && district !== "";
}

/**
 * The cases bucketed into an epicurve with its controls, a note when there
 * is nothing to chart, and a note when the slot held more cases than were
 * read. `CaseEpicurveModal` renders it once the cases are read.
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
  return (
    <Stack>
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
        <CaseEpicurveChart epicurve={epicurve} />
      )}
      {isTruncated ? (
        <Text size="xs" c="dimmed">
          {t("caseEpicurve.truncated", { count: rows.length })}
        </Text>
      ) : null}
    </Stack>
  );
}
