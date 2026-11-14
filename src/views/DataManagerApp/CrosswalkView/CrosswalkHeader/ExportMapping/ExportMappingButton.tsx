import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useExportMapping } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/ExportMapping/useExportMapping";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  context: CrosswalkContext;
};

/**
 * The crosswalk header's Export mapping: downloads, as a CSV, how every
 * column of the combined dataset is filled for every dataset. Disabled
 * until the crosswalk has a dataset.
 */
export function ExportMappingButton({
  draft,
  context,
}: Readonly<Props>): ReactNode {
  const { exportMapping, canExport } = useExportMapping({ draft, context });
  return (
    <Button
      variant="default"
      leftSection={<IconDownload size={16} aria-hidden />}
      disabled={!canExport}
      onClick={exportMapping}
    >
      <Trans>Export mapping</Trans>
    </Button>
  );
}
