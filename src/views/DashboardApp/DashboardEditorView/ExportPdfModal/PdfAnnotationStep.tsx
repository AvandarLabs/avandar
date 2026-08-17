import { Stack } from "@mantine/core";
import { PdfAnnotator } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator";
import type { ReactNode } from "react";

type Props = {
  filename: string;
  hiddenRender: ReactNode;
  onBack: () => void;
  onClose: () => void;
  onExported: (durationMs: number) => void;
  sourceElement: HTMLDivElement | undefined;
  title: string;
};

/** The modal's annotate step: sketch on the snapshot, then export it. */
export function PdfAnnotationStep({
  filename,
  hiddenRender,
  onBack,
  onClose,
  onExported,
  sourceElement,
  title,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="sm">
      {hiddenRender}
      <PdfAnnotator
        sourceElement={sourceElement}
        filename={filename}
        title={title}
        onClose={onClose}
        onBack={onBack}
        onExported={onExported}
      />
    </Stack>
  );
}
