import type { PdfAnnotationTool } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotation";
import type { ReactNode } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  ColorInput,
  Divider,
  Group,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowBack,
  IconArrowRight,
  IconClearAll,
  IconPencil,
  IconTypography,
} from "@tabler/icons-react";

type Props = {
  tool: PdfAnnotationTool;
  color: string;
  roughness: number;
  strokeWidth: number;
  hasStrokes: boolean;
  onToolChange: (tool: PdfAnnotationTool) => void;
  onColorChange: (color: string) => void;
  onRoughnessChange: (roughness: number) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
  onUndo: () => void;
  onClear: () => void;
};

/** Controls the active PDF annotation tool and drawing appearance. */
export function PdfAnnotationToolbar({
  tool,
  color,
  roughness,
  strokeWidth,
  hasStrokes,
  onToolChange,
  onColorChange,
  onRoughnessChange,
  onStrokeWidthChange,
  onUndo,
  onClear,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Group gap="md" wrap="wrap" align="end">
      <Stack gap={2}>
        <Text size="xs" c="dimmed">
          <Trans>Tool</Trans>
        </Text>
        <SegmentedControl
          size="xs"
          value={tool}
          onChange={(selectedTool) => {
            onToolChange(selectedTool as PdfAnnotationTool);
          }}
          data={[
            {
              value: "freehand",
              label: (
                <Group gap={4}>
                  <IconPencil size={14} />
                  <Trans>Freehand</Trans>
                </Group>
              ),
            },
            {
              value: "arrow",
              label: (
                <Group gap={4}>
                  <IconArrowRight size={14} />
                  <Trans>Arrow</Trans>
                </Group>
              ),
            },
            {
              value: "text",
              label: (
                <Group gap={4}>
                  <IconTypography size={14} />
                  <Trans>Text</Trans>
                </Group>
              ),
            },
          ]}
        />
      </Stack>
      <Stack gap={2} miw={180}>
        <Text size="xs" c="dimmed">
          <Trans>Roughness ({roughness.toFixed(1)})</Trans>
        </Text>
        <Slider
          size="xs"
          min={0}
          max={4}
          step={0.1}
          value={roughness}
          onChange={onRoughnessChange}
          marks={[
            { value: 0, label: t`Formal` },
            { value: 2, label: t`Sketch` },
            { value: 4, label: t`Loose` },
          ]}
        />
      </Stack>
      <Stack gap={2} miw={140}>
        <Text size="xs" c="dimmed">
          <Trans>Stroke ({strokeWidth}px)</Trans>
        </Text>
        <Slider
          size="xs"
          min={1}
          max={8}
          step={1}
          value={strokeWidth}
          onChange={onStrokeWidthChange}
        />
      </Stack>
      <Stack gap={2}>
        <Text size="xs" c="dimmed">
          <Trans>Color</Trans>
        </Text>
        <ColorInput
          w={140}
          size="xs"
          value={color}
          onChange={onColorChange}
          withEyeDropper={false}
          format="hex"
          swatches={[
            "#1e3a8a",
            "#dc2626",
            "#16a34a",
            "#f59e0b",
            "#0ea5e9",
            "#000000",
          ]}
        />
      </Stack>
      <Divider orientation="vertical" />
      <Group gap={4}>
        <ActionIcon
          variant="subtle"
          onClick={onUndo}
          disabled={!hasStrokes}
          aria-label={t`Undo`}
        >
          <IconArrowBack size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          onClick={onClear}
          disabled={!hasStrokes}
          aria-label={t`Clear all`}
        >
          <IconClearAll size={16} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
