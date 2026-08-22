import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Stack } from "@mantine/core";
import {
  IconArrowRight,
  IconFileExport,
  IconPencil,
} from "@tabler/icons-react";

type Props = {
  isExporting: boolean;
  onAnnotate: () => void;
  onDirectExport: () => Promise<void>;
};

/** The two export paths offered on the modal's first step. */
export function PdfExportActions({
  isExporting,
  onAnnotate,
  onDirectExport,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="sm">
      <Button
        size="md"
        variant="outline"
        leftSection={<IconFileExport size={18} />}
        rightSection={<IconArrowRight size={16} />}
        loading={isExporting}
        onClick={onDirectExport}
        justify="space-between"
      >
        <Trans>Export as PDF</Trans>
      </Button>
      <Button
        size="md"
        leftSection={<IconPencil size={18} />}
        rightSection={<IconArrowRight size={16} />}
        onClick={onAnnotate}
        justify="space-between"
      >
        <Trans>Annotate, then export</Trans>
      </Button>
    </Stack>
  );
}
