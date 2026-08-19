import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { findCoverageFlag, KEPT_RULE_RESULTS } from "./runRegionModelAssist";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion";
import type {
  ExtractedTable,
  PdfRegion,
  PdfRegionShape,
} from "@/workers/pdfSniff/types";
import type { ReactNode } from "react";

const SHAPE_OPTIONS: ReadonlyArray<{ value: PdfRegionShape; label: string }> = [
  { value: "grid_table", label: "Table" },
  { value: "labelled_graphic", label: "Labelled graphic (map, chart, tiles)" },
  { value: "repeating_blocks", label: "Repeating labelled blocks" },
  { value: "prose_measures", label: "Numbers in prose" },
];

/** Per-region state of the assistant offer. */
export type AssistStatus = {
  isRunning: boolean;
  message?: string;
};

type Props = {
  region: PdfRegion;
  /** What extraction produced for this region, if it has run. */
  table: ExtractedTable | undefined;
  classification: RegionClassification | undefined;
  isActive: boolean;
  assistStatus: AssistStatus | undefined;
  /** False hides the send path entirely rather than letting it fail. */
  isOnline: boolean;
  onSelect: () => void;
  onPatch: (patch: Partial<PdfRegion>) => void;
  onRemove: () => void;
  onAssist: () => void;
};

/**
 * One region in the picker's list: its name, the shape it is read as, why the
 * classifier chose that shape, and the assistant offer when the rules say
 * they probably missed figures.
 */
export function PdfRegionCard({
  region,
  table,
  classification,
  isActive,
  assistStatus,
  isOnline,
  onSelect,
  onPatch,
  onRemove,
  onAssist,
}: Readonly<Props>): ReactNode {
  const coverageFlag = findCoverageFlag(table);

  return (
    <Paper
      withBorder
      p="sm"
      onClick={onSelect}
      style={{
        cursor: "pointer",
        borderColor: isActive ? "var(--mantine-color-blue-5)" : undefined,
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <TextInput
            size="xs"
            aria-label={`Name of ${region.label}`}
            value={region.label}
            onChange={(event) => {
              onPatch({ label: event.currentTarget.value });
            }}
            style={{ flex: 1 }}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`Remove ${region.label}`}
            onClick={(event) => {
              // Otherwise the click also reaches the card and makes the
              // region we are deleting the active one.
              event.stopPropagation();
              onRemove();
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        <Select
          size="xs"
          label="Read as"
          data={[...SHAPE_OPTIONS]}
          value={region.shape}
          allowDeselect={false}
          onChange={(value) => {
            if (value) {
              // The flag rides along with the shape, and is the whole reason
              // the next extraction does not classify over the top of it.
              onPatch({
                shape: value as PdfRegionShape,
                isShapeUserChosen: true,
              });
            }
          }}
        />

        {classification && (
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Badge
              size="xs"
              color={
                classification.confidence === "high" ? "green"
                : classification.confidence === "medium" ?
                  "yellow"
                : "gray"
              }
            >
              {classification.confidence}
            </Badge>
            <Text size="xs" c="dimmed">
              {classification.evidence.join(" ")}
            </Text>
          </Group>
        )}

        {coverageFlag && (
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {coverageFlag.detail}
            </Text>
            <Button
              size="xs"
              variant="light"
              loading={assistStatus?.isRunning ?? false}
              disabled={!isOnline}
              onClick={(event) => {
                event.stopPropagation();
                onAssist();
              }}
            >
              Extract with the assistant
            </Button>
            {!isOnline && (
              <Text size="xs" c="dimmed">
                {`You are offline, so nothing can be sent. ${KEPT_RULE_RESULTS}`}
              </Text>
            )}
            {assistStatus?.message !== undefined && (
              <Text size="xs" c="dimmed">
                {assistStatus.message}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
