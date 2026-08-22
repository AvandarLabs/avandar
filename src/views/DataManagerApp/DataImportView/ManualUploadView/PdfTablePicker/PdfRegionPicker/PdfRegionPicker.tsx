import type { Workspace } from "$/models/Workspace/Workspace";
import type { Highlight } from "../PdfPagePreview";
import type { AssistStatus } from "../PdfRegionCard";
import type { RegionAssistSkipReason } from "../runRegionModelAssist/runRegionModelAssist";
import type { AxisTick } from "@/workers/pdfSniff/calibrateAxis/calibrateAxis";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion/classifyRegion";
import type {
  BBox,
  ExtractedTable,
  PageGeometry,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactNode } from "react";

import { makeMap } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Alert, Box, Group, Pagination, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { match } from "ts-pattern";

import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";

import { PdfPagePreview } from "../PdfPagePreview";
import { PdfRegionCard } from "../PdfRegionCard";
import { PdfRegionOverlay } from "../PdfRegionOverlay/PdfRegionOverlay";
import { runRegionModelAssist } from "../runRegionModelAssist/runRegionModelAssist";
import { usePdfAxisCalibration } from "../usePdfAxisCalibration";

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
  /**
   * A row's origin, highlighted on top of the regions so clicking a row in
   * the review grid shows where its value came from.
   */
  focusedProvenance?: { page: number; bbox: BBox } | undefined;
  workspaceId: Workspace.Id;
  /** Undefined while the session is still loading; the assist needs it. */
  userId: string | undefined;
  onRegionsChange: (regions: readonly PdfRegion[]) => void;
  onActiveRegionChange: (regionId: string) => void;
  /**
   * Called once when the assistant contributed rows.
   *
   * The merged table and the model that produced it arrive together on
   * purpose. Two callbacks would be two state updates derived from the same
   * metadata, and whichever landed second would silently discard the other,
   * leaving a dataset that records a model in `llm_model` without the rows
   * that model wrote.
   */
  onAssistApplied: (result: {
    table: ExtractedTable;
    llmModel: string;
  }) => void;
};

/**
 * The working surface: a rendered page you can draw on, and the list of what
 * you have drawn.
 *
 * Detected tables arrive in `regions` like any other entry, so this
 * component has no concept of "found" versus "drawn". That is deliberate:
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
  focusedProvenance,
  workspaceId,
  userId,
  onRegionsChange,
  onActiveRegionChange,
  onAssistApplied,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(
    PREVIEW_WIDTH / FALLBACK_PAGE_SIZE.widthPt,
  );
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE);
  const [assistStatuses, setAssistStatuses] = useState<
    Readonly<Record<string, AssistStatus>>
  >({});
  const isOnline = useIsOnline();
  const calibration = usePdfAxisCalibration();

  const tablesByRegionId = makeMap(tables, { key: "regionId" });

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
        label: t`Region ${regions.length + 1}`,
        // A shape is required from the moment the box exists, because the
        // "Read as" control has to show something before the first extraction
        // comes back. Leaving `isShapeUserChosen` unset is what makes this a
        // default rather than a decision: the worker classifies the region and
        // the resolved shape is written back over this one.
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
  const assistSkipMessage = (reason: RegionAssistSkipReason): string => {
    return match(reason)
      .with("region_not_on_page", () => {
        return t`That region is not on a page we read. Kept the rule-based results.`;
      })
      .with("no_text", () => {
        return t`There is no text in this region to send. Kept the rule-based results.`;
      })
      .with("consent_declined", () => {
        return t`Kept the rule-based results.`;
      })
      .with("empty_model_response", () => {
        return t`The assistant read nothing we could use. Kept the rule-based results.`;
      })
      .exhaustive();
  };

  const onAssist = async (
    region: PdfRegion,
    ruleTable: ExtractedTable,
  ): Promise<void> => {
    if (userId === undefined) {
      setAssistStatus(region.id, {
        isRunning: false,
        message: t`You need to be signed in to ask the assistant. Kept the rule-based results.`,
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
          message: assistSkipMessage(outcome.reason),
        });
        return;
      }
      onAssistApplied({ table: outcome.table, llmModel: outcome.llmModel });
      setAssistStatus(region.id, {
        isRunning: false,
        message: t`Added ${outcome.addedRowCount} rows from the assistant. Check them before saving.`,
      });
    } catch {
      setAssistStatus(region.id, {
        isRunning: false,
        message: t`Could not reach the assistant. Kept the rule-based results.`,
      });
    }
  };

  /*
   * `PdfPagePreview` paints the highlights onto the same canvas as the page,
   * so a new array identity re-parses the whole document. Both this and the
   * two callbacks below are memoised for that reason, not for render cost.
   */
  const highlights = useMemo((): readonly Highlight[] => {
    const regionHighlights = regions.flatMap((region) => {
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
    return focusedProvenance !== undefined &&
      focusedProvenance.page === pageIndex
      ? [...regionHighlights, { bbox: focusedProvenance.bbox, isActive: true }]
      : regionHighlights;
  }, [regions, pageIndex, activeRegionId, focusedProvenance]);

  // A row's origin can be on a page the user is not looking at, and pointing
  // at an off-screen highlight would be no answer at all.
  useEffect(
    function followFocusedProvenanceToItsPage() {
      if (focusedProvenance !== undefined) {
        setPageIndex(focusedProvenance.page);
      }
    },
    [focusedProvenance],
  );

  const onScaleChange = useCallback((nextScale: number): void => {
    setScale(nextScale);
  }, []);

  const onPageSizeChange = useCallback(
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
            onScaleChange={onScaleChange}
            onPageSizeChange={onPageSizeChange}
          />
          <PdfRegionOverlay
            width={pageSize.widthPt * scale}
            height={pageSize.heightPt * scale}
            scale={scale}
            pageHeight={pageSize.heightPt}
            interaction={calibration.regionId === null ? "draw" : "pick"}
            markers={calibration.points}
            onRegionDrawn={addRegion}
            onPointPicked={calibration.pick}
          />
        </Box>
        {pageCount > 1 ? (
          <Pagination
            total={pageCount}
            value={pageIndex + 1}
            onChange={(page) => {
              setPageIndex(page - 1);
            }}
            size="sm"
          />
        ) : null}
      </Stack>

      <Stack gap="sm" flex={1}>
        {regions.length === 0 ? (
          <Alert variant="light" color="blue" title={t`Nothing selected yet`}>
            <Text size="sm">
              {t`Draw a box around a table, chart, map or block of text to extract it.`}
            </Text>
          </Alert>
        ) : null}

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
                  void onAssist(region, table);
                }
              }}
              isCalibrating={calibration.regionId === region.id}
              calibrationPoints={
                calibration.regionId === region.id ? calibration.points : []
              }
              onStartCalibration={() => {
                calibration.start(region.id);
              }}
              onApplyCalibration={(hints: readonly AxisTick[]) => {
                updateRegion(region.id, {
                  options: { ...region.options, yAxisHints: hints },
                });
                calibration.cancel();
              }}
              onCancelCalibration={calibration.cancel}
            />
          );
        })}
      </Stack>
    </Group>
  );
}
