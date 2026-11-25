import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert, Button, Stack, Text } from "@avandar/plugin-ui";
import type { ReactNode } from "react";

type Props = {
  message: string;
  onChooseRecords: () => void;
};

/**
 * Says why the case epicurve cannot read the cases, with a "Choose records"
 * button that lets the user choose the case records it reads.
 * `CaseEpicurveModal` renders it while the cases slot is not bound or no
 * longer fits. A host that cannot open the binding shows no button.
 */
export function ChooseRecordsAlert(props: Readonly<Props>): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  return (
    <Alert color="yellow">
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{props.message}</Text>
        {avandar.ui.openDataSlotBinding === undefined ? null : (
          <Button size="xs" onClick={props.onChooseRecords}>
            {t("caseEpicurve.chooseRecords")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
