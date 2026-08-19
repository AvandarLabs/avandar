import { Alert, Box, Group, Pagination, Stack, Text } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { PdfPagePreview } from "./PdfPagePreview";
import { PdfRegionCard } from "./PdfRegionCard";
import { PdfRegionOverlay } from "./PdfRegionOverlay";
import {
  KEPT_RULE_RESULTS,
  runRegionModelAssist,
} from "./runRegionModelAssist";
import type { Highlight } from "./PdfPagePreview";
import type { AssistStatus } from "./PdfRegionCard";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion";
import type {
  BBox,
  ExtractedTable,
  PageGeometry,
  PdfRegion,
} from "@/workers/pdfSniff/types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const PREVIEW_WIDTH = 420;

/** A4 portrait, used only until the first page has actually rendered. */
const FALLBACK_PAGE_SIZE = { widthPt: 595, heightPt: 842 };

type Props = {
  file: File;
  pageCount: number;
  /** Page geometry, so a region's own text can be read for the assist. */
  pages: readonly PageGeometry[];
  regions: readonly PdfRegion[];
  /** What extraction produced, one per region. */
  tables: readonly ExtractedTable[];
  classifications: Readonly<Record<string, RegionClassification>>;
  activeRegionId: string | null;
  workspaceId: Workspace.Id;
  /** Undefined while the session is still loading; the assist needs it. */
  userId: string | undefined;
  onRegionsChange: (regions: readonly PdfRegion[]) => void;
  onActiveRegionChange: (regionId: string) => void;
  /** Called with a region's table once model rows have been merged in. */
  onTableChange: (table: ExtractedTable) => void;
  /** Records which model contributed, so the save can write `llm_model`. */
  onLlmModelUsed: (llmModel: string) => void;
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
  pages,
  regions,
  tables,
  classifications,
  activeRegionId,
  workspaceId,
  userId,
  onRegionsChange,
  onActiveRegionChange,
  onTableChange,
  onLlmModelUsed,
}: Readonly<Props>): ReactNode {
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(
    PREVIEW_WIDTH / FALLBACK_PAGE_SIZE.widthPt,
  );
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE);
  const [assistStatuses, setAssistStatuses] = useState<
    Readonly<Record<string, AssistStatus>>
  >({});
  const isOnline = useIsOnline();

  const tablesByRegionId = useMemo(() => {
    return new Map(
      tables.map((table) => {
        return [table.regionId, table];
      }),
    );
  }, [tables]);

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

  const setAssistStatus = (regionId: string, status: AssistStatus): void => {
    setAssistStatuses((currentStatuses) => {
      return { ...currentStatuses, [regionId]: status };
    });
  };

  /**
   * Runs the assist for one region and reports what happened.
   *
   * A thrown error is caught rather than surfaced, because the promise this
   * feature makes is that the rule-based rows survive whatever the network
   * does. The table is replaced only on the one path that produced rows.
   */
  const handleAssist = async (
    region: PdfRegion,
    ruleTable: ExtractedTable,
  ): Promise<void> => {
    if (userId === undefined) {
      setAssistStatus(region.id, {
        isRunning: false,
        message: `You need to be signed in to ask the assistant. ${KEPT_RULE_RESULTS}`,
      });
      return;
    }
    setAssistStatus(region.id, { isRunning: true });
    try {
      const outcome = await runRegionModelAssist({
        pages,
        region,
        ruleTable,
        workspaceId,
        userId,
      });
      if (outcome.kind === "skipped") {
        setAssistStatus(region.id, {
          isRunning: false,
          message: outcome.message,
        });
        return;
      }
      onTableChange(outcome.table);
      onLlmModelUsed(outcome.llmModel);
      setAssistStatus(region.id, {
        isRunning: false,
        message: `Added ${outcome.addedRowCount} rows from the assistant. Check them before saving.`,
      });
    } catch {
      setAssistStatus(region.id, {
        isRunning: false,
        message: `Could not reach the assistant. ${KEPT_RULE_RESULTS}`,
      });
    }
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
          const table = tablesByRegionId.get(region.id);
          return (
            <PdfRegionCard
              key={region.id}
              region={region}
              table={table}
              classification={classifications[region.id]}
              isActive={region.id === activeRegionId}
              assistStatus={assistStatuses[region.id]}
              isOnline={isOnline}
              onSelect={() => {
                onActiveRegionChange(region.id);
              }}
              onPatch={(patch) => {
                updateRegion(region.id, patch);
              }}
              onRemove={() => {
                onRegionsChange(
                  regions.filter((other) => {
                    return other.id !== region.id;
                  }),
                );
              }}
              onAssist={() => {
                if (table) {
                  void handleAssist(region, table);
                }
              }}
            />
          );
        })}
      </Stack>
    </Group>
  );
}
