import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Group,
  Pagination,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { PdfPagePreview } from "./PdfPagePreview";
import { PdfRegionOverlay } from "./PdfRegionOverlay";
import type { Highlight } from "./PdfPagePreview";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion";
import type { BBox, PdfRegion, PdfRegionShape } from "@/workers/pdfSniff/types";
import type { ReactNode } from "react";

const SHAPE_OPTIONS: ReadonlyArray<{ value: PdfRegionShape; label: string }> = [
  { value: "grid_table", label: "Table" },
  { value: "labelled_graphic", label: "Labelled graphic (map, chart, tiles)" },
  { value: "repeating_blocks", label: "Repeating labelled blocks" },
  { value: "prose_measures", label: "Numbers in prose" },
];

const PREVIEW_WIDTH = 420;

/** A4 portrait, used only until the first page has actually rendered. */
const FALLBACK_PAGE_SIZE = { widthPt: 595, heightPt: 842 };

type Props = {
  file: File;
  pageCount: number;
  regions: readonly PdfRegion[];
  classifications: Readonly<Record<string, RegionClassification>>;
  activeRegionId: string | null;
  onRegionsChange: (regions: readonly PdfRegion[]) => void;
  onActiveRegionChange: (regionId: string) => void;
};

/**
 * The working surface: a rendered page you can draw on, and the list of what
 * you have drawn.
 *
 * Detected tables from Phase B3 arrive in `regions` like any other entry, so
 * this component has no concept of "found" versus "drawn". That is deliberate:
 * the user is choosing regions either way.
 */
export function PdfRegionPicker({
  file,
  pageCount,
  regions,
  classifications,
  activeRegionId,
  onRegionsChange,
  onActiveRegionChange,
}: Readonly<Props>): ReactNode {
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(
    PREVIEW_WIDTH / FALLBACK_PAGE_SIZE.widthPt,
  );
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE);

  const updateRegion = (id: string, patch: Partial<PdfRegion>): void => {
    onRegionsChange(
      regions.map((region) => {
        return region.id === id ? { ...region, ...patch } : region;
      }),
    );
  };

  const addRegion = (bbox: BBox): void => {
    const id = `r-${crypto.randomUUID()}`;
    onRegionsChange([
      ...regions,
      {
        id,
        label: `Region ${regions.length + 1}`,
        // The classifier decides on the next extract; this is a placeholder
        // that the worker's result immediately replaces.
        shape: "prose_measures",
        detectionMode: "manual",
        fragments: [{ page: pageIndex, bbox }],
        options: {},
      },
    ]);
    onActiveRegionChange(id);
  };

  /*
   * `PdfPagePreview` paints the highlights onto the same canvas as the page,
   * so a new array identity re-parses the whole document. Both this and the
   * two callbacks below are memoised for that reason, not for render cost.
   */
  const highlights = useMemo((): readonly Highlight[] => {
    return regions.flatMap((region) => {
      return region.fragments
        .filter((fragment) => {
          return fragment.page === pageIndex;
        })
        .map((fragment) => {
          return {
            bbox: fragment.bbox,
            isActive: region.id === activeRegionId,
          };
        });
    });
  }, [regions, pageIndex, activeRegionId]);

  const handleScaleChange = useCallback((nextScale: number): void => {
    setScale(nextScale);
  }, []);

  const handlePageSizeChange = useCallback(
    (size: { widthPt: number; heightPt: number }): void => {
      setPageSize(size);
    },
    [],
  );

  return (
    <Group align="flex-start" gap="lg" wrap="nowrap">
      <Stack gap="xs">
        <Box pos="relative" w={PREVIEW_WIDTH}>
          <PdfPagePreview
            file={file}
            pageIndex={pageIndex}
            width={PREVIEW_WIDTH}
            highlights={highlights}
            onScaleChange={handleScaleChange}
            onPageSizeChange={handlePageSizeChange}
          />
          <PdfRegionOverlay
            width={pageSize.widthPt * scale}
            height={pageSize.heightPt * scale}
            scale={scale}
            pageHeight={pageSize.heightPt}
            onRegionDrawn={addRegion}
          />
        </Box>
        {pageCount > 1 && (
          <Pagination
            total={pageCount}
            value={pageIndex + 1}
            onChange={(page) => {
              setPageIndex(page - 1);
            }}
            size="sm"
          />
        )}
      </Stack>

      <Stack gap="sm" style={{ flex: 1 }}>
        {regions.length === 0 && (
          <Alert variant="light" color="blue" title="Nothing selected yet">
            <Text size="sm">
              Draw a box around a table, chart, map or block of text to extract
              it.
            </Text>
          </Alert>
        )}

        {regions.map((region) => {
          const classification = classifications[region.id];
          return (
            <Paper
              key={region.id}
              withBorder
              p="sm"
              onClick={() => {
                onActiveRegionChange(region.id);
              }}
              style={{
                cursor: "pointer",
                borderColor:
                  region.id === activeRegionId ?
                    "var(--mantine-color-blue-5)"
                  : undefined,
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <TextInput
                    size="xs"
                    aria-label={`Name of ${region.label}`}
                    value={region.label}
                    onChange={(event) => {
                      updateRegion(region.id, {
                        label: event.currentTarget.value,
                      });
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={`Remove ${region.label}`}
                    onClick={(event) => {
                      // Otherwise the click also reaches the card and makes
                      // the region we are deleting the active one.
                      event.stopPropagation();
                      onRegionsChange(
                        regions.filter((other) => {
                          return other.id !== region.id;
                        }),
                      );
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
                      updateRegion(region.id, {
                        shape: value as PdfRegionShape,
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
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Group>
  );
}
