import { useT } from "@avandar/plugin-sdk";
import { Alert, Loader, Stack, Text } from "@avandar/plugin-ui";
import { CaseEpicurveView } from "./CaseEpicurveView";
import { ChooseRecordsAlert } from "./ChooseRecordsAlert";
import { useCaseSlotRows } from "./useCaseSlotRows";
import type { ReactNode } from "react";

/**
 * The content of the "Case epicurve" command's modal. It reads every case
 * the plugin's `cases` data slot is bound to and draws them as an epidemic
 * curve by onset date, by day, epi week, or month, optionally stacked by
 * district. While the slot is not bound or no longer fits, it says so and
 * offers to choose the case records, then reads them again.
 */
export function CaseEpicurveModal(): ReactNode {
  const t = useT();
  const { state, chooseRecords } = useCaseSlotRows();
  const onChooseRecords = (): void => {
    void chooseRecords();
  };
  switch (state.kind) {
    case "loading":
      return (
        <Stack role="status" align="center" gap="xs" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {t("caseEpicurve.loading")}
          </Text>
        </Stack>
      );
    case "notBound":
      return (
        <ChooseRecordsAlert
          message={t("caseEpicurve.notBound")}
          onChooseRecords={onChooseRecords}
        />
      );
    case "broken":
      return (
        <ChooseRecordsAlert
          message={t("caseEpicurve.broken")}
          onChooseRecords={onChooseRecords}
        />
      );
    case "failed":
      return <Alert color="yellow">{state.message}</Alert>;
    case "loaded":
      return (
        <CaseEpicurveView rows={state.rows} isTruncated={state.isTruncated} />
      );
  }
}
