import { ActionIcon, Box } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useViewport } from "@xyflow/react";
import { getStroke } from "perfect-freehand";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";
import { activeAnnotationColor } from "@/components/ChatPanel/PlanFlowView/annotationColor";
import { PlanAnnotationStateManager } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";
import type {
  Annotation,
  ArrowAnnotation,
  StickyAnnotation,
  StrokeAnnotation,
  TextAnnotation,
} from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";

/**
 * Annotation overlay rendered on top of the xyflow canvas.
 *
 * Pointer events:
 *   - When the active tool is `pan`, the overlay is pointer-events:
 *     none so xyflow handles pan/zoom natively.
 *   - For drawing tools, the overlay intercepts pointer events,
 *     converts them to canvas-space coordinates via the current
 *     xyflow viewport, and creates the annotation on pointerup.
 *
 * Coordinate space: annotation positions are stored in CANVAS
 * coordinates (untransformed), so they pan/zoom with the DAG nodes
 * automatically. We use `useViewport()` to translate pointer events
 * from screen to canvas.
 */

export type PlanAnnotationOverlayProps = {
  planId: string;
  /** Container element bounding rect used to subtract from pointer coords. */
  containerRef: React.RefObject<HTMLElement | null>;
};

export function PlanAnnotationOverlay({
  planId,
  containerRef,
}: PlanAnnotationOverlayProps): JSX.Element {
  const state = PlanAnnotationStateManager.useState();
  const dispatch = PlanAnnotationStateManager.useDispatch();
  const viewport = useViewport();

  const annotations = useMemo(() => {
    return Object.values(state.annotations).filter((a) => {
      return a.planId === planId;
    });
  }, [state.annotations, planId]);

  const [strokeInProgress, setStrokeInProgress] = useState<
    Array<[number, number]> | null
  >(null);
  const [arrowStart, setArrowStart] = useState<[number, number] | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: undo/redo + delete-selected.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          dispatch.undo();
        } else if (e.key === "z" && e.shiftKey) {
          e.preventDefault();
          dispatch.redo();
        }
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedId
      ) {
        e.preventDefault();
        dispatch.deleteAnnotation(state.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [dispatch, state.selectedId]);

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return [clientX, clientY];
      }
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      // xyflow's viewport applies x: translate, y: translate, zoom: scale.
      const cx = (px - viewport.x) / viewport.zoom;
      const cy = (py - viewport.y) / viewport.zoom;
      return [cx, cy];
    },
    [containerRef, viewport.x, viewport.y, viewport.zoom],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      const tool = state.activeTool;
      if (tool === "pan") {
        return;
      }
      const [x, y] = screenToCanvas(e.clientX, e.clientY);
      if (tool === "text") {
        const text = window.prompt("Annotation text");
        if (text && text.trim().length > 0) {
          const annotation: Omit<TextAnnotation, "id" | "createdAt" | "updatedAt"> = {
            kind: "text",
            planId,
            x,
            y,
            text: text.trim(),
            fontSize: 18,
            color: activeAnnotationColor(),
          };
          dispatch.addAnnotation({ annotation });
        }
      } else if (tool === "sticky") {
        const text = window.prompt("Sticky note");
        if (text && text.trim().length > 0) {
          const annotation: Omit<
            StickyAnnotation,
            "id" | "createdAt" | "updatedAt"
          > = {
            kind: "sticky",
            planId,
            x,
            y,
            width: 160,
            height: 100,
            text: text.trim(),
            color: activeAnnotationColor(),
          };
          dispatch.addAnnotation({ annotation });
        }
      } else if (tool === "arrow") {
        setArrowStart([x, y]);
      } else if (tool === "pen") {
        setStrokeInProgress([[x, y]]);
        (e.target as Element).setPointerCapture(e.pointerId);
      }
    },
    [state.activeTool, planId, screenToCanvas, dispatch],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (strokeInProgress) {
        const [x, y] = screenToCanvas(e.clientX, e.clientY);
        setStrokeInProgress((prev) => {
          return prev ? [...prev, [x, y]] : null;
        });
      }
    },
    [strokeInProgress, screenToCanvas],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      const tool = state.activeTool;
      const [x, y] = screenToCanvas(e.clientX, e.clientY);
      if (tool === "arrow" && arrowStart) {
        const annotation: Omit<
          ArrowAnnotation,
          "id" | "createdAt" | "updatedAt"
        > = {
          kind: "arrow",
          planId,
          fromX: arrowStart[0],
          fromY: arrowStart[1],
          toX: x,
          toY: y,
          color: activeAnnotationColor(),
        };
        dispatch.addAnnotation({ annotation });
        setArrowStart(null);
      } else if (tool === "pen" && strokeInProgress) {
        if (strokeInProgress.length >= 2) {
          const annotation: Omit<
            StrokeAnnotation,
            "id" | "createdAt" | "updatedAt"
          > = {
            kind: "stroke",
            planId,
            points: strokeInProgress,
            strokeWidth: 3,
            color: activeAnnotationColor(),
          };
          dispatch.addAnnotation({ annotation });
        }
        setStrokeInProgress(null);
      }
    },
    [
      state.activeTool,
      arrowStart,
      strokeInProgress,
      planId,
      screenToCanvas,
      dispatch,
    ],
  );

  const isDrawingTool: boolean = state.activeTool !== "pan";
  // While drawing, intercept pointer events. When panning, let xyflow handle.
  const pointerEvents: "auto" | "none" = isDrawingTool ? "auto" : "none";

  return (
    <Box
      ref={overlayRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents,
        // The annotations themselves are positioned in canvas space;
        // we apply the same xyflow transform here so they pan/zoom
        // with the DAG.
        zIndex: 5,
      }}
      // Important: when not drawing, the overlay must not capture
      // hits — annotations get their own pointer-events:auto.
      data-annotation-overlay
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {annotations.map((a) => {
          return (
            <AnnotationRenderer
              key={a.id}
              annotation={a}
              isSelected={state.selectedId === a.id}
              onSelect={() => {
                dispatch.selectAnnotation(a.id);
              }}
              onDelete={() => {
                dispatch.deleteAnnotation(a.id);
              }}
              isPanMode={!isDrawingTool}
              isEraseMode={state.activeTool === "erase"}
            />
          );
        })}
        {strokeInProgress ?
          <StrokeRender
            points={strokeInProgress}
            color={activeAnnotationColor()}
            strokeWidth={3}
          />
        : null}
        {arrowStart && state.activeTool === "arrow" ?
          <Box
            style={{
              position: "absolute",
              left: arrowStart[0] - 4,
              top: arrowStart[1] - 4,
              width: 8,
              height: 8,
              background: activeAnnotationColor(),
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
        : null}
      </div>
    </Box>
  );
}

function AnnotationRenderer({
  annotation,
  isSelected,
  onSelect,
  onDelete,
  isPanMode,
  isEraseMode,
}: {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isPanMode: boolean;
  isEraseMode: boolean;
}): JSX.Element | null {
  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (isEraseMode) {
      onDelete();
    } else {
      onSelect();
    }
  };

  const sharedStyle: React.CSSProperties = {
    position: "absolute",
    pointerEvents: isPanMode ? "none" : "auto",
    cursor: isEraseMode ? "crosshair" : "pointer",
    outline:
      isSelected ? "2px dashed var(--mantine-color-blue-5)" : undefined,
  };

  if (annotation.kind === "text") {
    return (
      <Box
        onClick={handleClick}
        style={{
          ...sharedStyle,
          left: annotation.x,
          top: annotation.y,
          fontSize: annotation.fontSize,
          color: annotation.color ?? "#1c7ed6",
          transform:
            annotation.rotation ? `rotate(${annotation.rotation}deg)` : undefined,
          fontFamily:
            'Caveat, "Patrick Hand", "Comic Sans MS", system-ui',
        }}
      >
        {annotation.text}
        {isSelected && !isPanMode ?
          <DeleteHandle onDelete={onDelete} />
        : null}
      </Box>
    );
  }
  if (annotation.kind === "sticky") {
    return (
      <Box
        onClick={handleClick}
        style={{
          ...sharedStyle,
          left: annotation.x,
          top: annotation.y,
          width: annotation.width,
          height: annotation.height,
          background: annotation.color ?? "#fff3bf",
          padding: 8,
          borderRadius: 4,
          boxShadow: "2px 2px 6px rgba(0,0,0,0.15)",
          fontSize: 13,
          color: "#1a1a1a",
          fontFamily:
            'Caveat, "Patrick Hand", "Comic Sans MS", system-ui',
          whiteSpace: "pre-wrap",
        }}
      >
        {annotation.text}
        {isSelected && !isPanMode ?
          <DeleteHandle onDelete={onDelete} />
        : null}
      </Box>
    );
  }
  if (annotation.kind === "arrow") {
    return (
      <ArrowRender
        annotation={annotation}
        isSelected={isSelected}
        onClick={handleClick}
        isPanMode={isPanMode}
        onDelete={onDelete}
      />
    );
  }
  if (annotation.kind === "stroke") {
    return (
      <StrokeWrapper
        annotation={annotation}
        isSelected={isSelected}
        onClick={handleClick}
        isPanMode={isPanMode}
        onDelete={onDelete}
      />
    );
  }
  return null;
}

function DeleteHandle({ onDelete }: { onDelete: () => void }): JSX.Element {
  return (
    <ActionIcon
      size="xs"
      variant="filled"
      color="red"
      style={{
        position: "absolute",
        top: -10,
        right: -10,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      aria-label="Delete annotation"
    >
      <IconX size={10} />
    </ActionIcon>
  );
}

function ArrowRender({
  annotation,
  isSelected,
  onClick,
  isPanMode,
  onDelete,
}: {
  annotation: ArrowAnnotation;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  isPanMode: boolean;
  onDelete: () => void;
}): JSX.Element {
  const { fromX, fromY, toX, toY, color } = annotation;
  const pathD = useMemo(() => {
    const svgNs = "http://www.w3.org/2000/svg";
    const tmpSvg = document.createElementNS(svgNs, "svg");
    const rc = rough.svg(tmpSvg);
    const stroke = color ?? "#495057";
    const line = rc.line(fromX, fromY, toX, toY, {
      roughness: 1.6,
      bowing: 1.4,
      stroke,
      strokeWidth: 2,
      seed: hashSeed(annotation.id),
    });
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const arrowLen = 14;
    const arrowWidth = 7;
    const baseX = toX - ux * arrowLen;
    const baseY = toY - uy * arrowLen;
    const leftX = baseX + uy * arrowWidth;
    const leftY = baseY - ux * arrowWidth;
    const rightX = baseX - uy * arrowWidth;
    const rightY = baseY + ux * arrowWidth;
    const head = rc.path(
      `M ${toX} ${toY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`,
      {
        roughness: 1.2,
        stroke,
        fill: stroke,
        fillStyle: "solid",
        strokeWidth: 1.6,
        seed: hashSeed(annotation.id) + 1,
      },
    );
    return Array.from([line, head])
      .flatMap((g) => {
        return Array.from(g.querySelectorAll("path"));
      })
      .map((p) => {
        return p.getAttribute("d") ?? "";
      })
      .filter(Boolean)
      .join(" ");
  }, [fromX, fromY, toX, toY, color, annotation.id]);

  const minX = Math.min(fromX, toX) - 10;
  const minY = Math.min(fromY, toY) - 10;
  const maxX = Math.max(fromX, toX) + 10;
  const maxY = Math.max(fromY, toY) + 10;
  const w = maxX - minX;
  const h = maxY - minY;

  return (
    <svg
      onClick={onClick}
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        width: w,
        height: h,
        overflow: "visible",
        pointerEvents: isPanMode ? "none" : "auto",
        cursor: "pointer",
      }}
      viewBox={`${minX} ${minY} ${w} ${h}`}
    >
      <path
        d={pathD}
        stroke={color ?? "#495057"}
        strokeWidth={2}
        fill="none"
      />
      {isSelected && !isPanMode ?
        <foreignObject x={toX} y={toY - 10} width={20} height={20}>
          <DeleteHandle onDelete={onDelete} />
        </foreignObject>
      : null}
    </svg>
  );
}

function StrokeRender({
  points,
  color,
  strokeWidth,
}: {
  points: ReadonlyArray<[number, number, number?] | [number, number]>;
  color: string;
  strokeWidth: number;
}): JSX.Element {
  const pathD = useMemo(() => {
    const outline = getStroke(
      points.map((p) => {
        return [p[0], p[1], p[2] ?? 0.5];
      }),
      {
        size: strokeWidth * 3,
        smoothing: 0.5,
        thinning: 0.5,
        streamline: 0.5,
      },
    );
    if (outline.length === 0) {
      return "";
    }
    let d = `M ${outline[0]![0]} ${outline[0]![1]}`;
    for (let i = 1; i < outline.length; i++) {
      d += ` L ${outline[i]![0]} ${outline[i]![1]}`;
    }
    return `${d} Z`;
  }, [points, strokeWidth]);

  const xs = points.map((p) => {
    return p[0];
  });
  const ys = points.map((p) => {
    return p[1];
  });
  const minX = Math.min(...xs) - 10;
  const minY = Math.min(...ys) - 10;
  const maxX = Math.max(...xs) + 10;
  const maxY = Math.max(...ys) + 10;
  const w = maxX - minX;
  const h = maxY - minY;

  return (
    <svg
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        width: w,
        height: h,
        overflow: "visible",
        pointerEvents: "none",
      }}
      viewBox={`${minX} ${minY} ${w} ${h}`}
    >
      <path d={pathD} fill={color} />
    </svg>
  );
}

function StrokeWrapper({
  annotation,
  isSelected,
  onClick,
  isPanMode,
  onDelete,
}: {
  annotation: StrokeAnnotation;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  isPanMode: boolean;
  onDelete: () => void;
}): JSX.Element {
  // Bounding box for click target.
  const xs = annotation.points.map((p) => {
    return p[0];
  });
  const ys = annotation.points.map((p) => {
    return p[1];
  });
  const minX = Math.min(...xs) - 10;
  const minY = Math.min(...ys) - 10;
  const maxX = Math.max(...xs) + 10;
  const maxY = Math.max(...ys) + 10;
  const w = maxX - minX;
  const h = maxY - minY;
  return (
    <Box
      onClick={onClick}
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        width: w,
        height: h,
        pointerEvents: isPanMode ? "none" : "auto",
        cursor: "pointer",
        outline:
          isSelected ? "2px dashed var(--mantine-color-blue-5)" : undefined,
      }}
    >
      <StrokeRender
        points={annotation.points}
        color={annotation.color ?? "#1c7ed6"}
        strokeWidth={annotation.strokeWidth}
      />
      {isSelected && !isPanMode ?
        <DeleteHandle onDelete={onDelete} />
      : null}
    </Box>
  );
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 65535;
}
