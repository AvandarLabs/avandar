import { Trans, useLingui } from "@lingui/react/macro";
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
import clsx from "clsx";
import css from "./PdfRegionCard.module.css";
import { getCoverageFlagFromTable } from "./runRegionModelAssist/runRegionModelAssist";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion/classifyRegion";
import type {
  ExtractedTable,
  PdfRegion,
  PdfRegionShape,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactNode } from "react";

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
  const { t } = useLingui();
  const coverageFlag = getCoverageFlagFromTable(table);
  const shapeOptions = [
    { value: "grid_table" as const, label: t`Table` },
    {
      value: "labelled_graphic" as const,
      label: t`Labelled graphic (map, chart, tiles)`,
    },
    {
      value: "repeating_blocks" as const,
      label: t`Repeating labelled blocks`,
    },
    { value: "prose_measures" as const, label: t`Numbers in prose` },
  ];

  return (
    <Paper
      withBorder
      p="sm"
      role="button"
      tabIndex={0}
      aria-label={t`Select ${region.label}`}
      className={clsx(css.card, isActive && css.cardActive)}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <TextInput
            size="xs"
            aria-label={t`Name of ${region.label}`}
            value={region.label}
            onChange={(event) => {
              onPatch({ label: event.currentTarget.value });
            }}
            className={css.nameInput}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={t`Remove ${region.label}`}
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
          label={t`Read as`}
          data={shapeOptions}
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

        {classification ?
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
        : null}

        {coverageFlag ?
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
              <Trans>Extract with the assistant</Trans>
            </Button>
            {!isOnline ?
              <Text size="xs" c="dimmed">
                {t`You are offline, so nothing can be sent. Kept the rule-based results.`}
              </Text>
            : null}
            {assistStatus?.message !== undefined ?
              <Text size="xs" c="dimmed">
                {assistStatus.message}
              </Text>
            : null}
          </Stack>
        : null}
      </Stack>
    </Paper>
  );
}
