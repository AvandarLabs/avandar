import { Trans } from "@lingui/react/macro";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { PdfExportActions } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExportActions";
import type { ReactNode } from "react";

type Props = {
  hiddenRender: ReactNode;
  isExporting: boolean;
  onAnnotate: () => void;
  onClose: () => void;
  onDirectExport: () => Promise<void>;
};

/** The modal's first step: export straight away, or annotate first. */
export function PdfExportChoice({
  hiddenRender,
  isExporting,
  onAnnotate,
  onClose,
  onDirectExport,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="md">
      {hiddenRender}
      <Alert color="blue" variant="light">
        <Text size="sm">
          <Trans>
            Export this dashboard as a PDF, or sketch on it first. Annotations
            support text, arrows, and freehand drawing with adjustable roughness
            (RoughJS).
          </Trans>
        </Text>
      </Alert>
      <PdfExportActions
        isExporting={isExporting}
        onAnnotate={onAnnotate}
        onDirectExport={onDirectExport}
      />
      <Group justify="flex-end">
        <Button variant="subtle" color="neutral" onClick={onClose}>
          <Trans>Cancel</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
