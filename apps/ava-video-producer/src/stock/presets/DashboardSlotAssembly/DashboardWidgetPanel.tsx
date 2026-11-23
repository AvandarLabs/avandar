import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DashboardWidgetContent } from "./DashboardWidgetContent";
import { getWidgetRectFromInput } from "./getWidgetRectFromInput";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ReactNode } from "react";

type WidgetPanelStyle = {
  rx: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};
type WidgetPanelGeometry = {
  panel: ReturnType<typeof getWidgetRectFromInput> & WidgetPanelStyle;
  title: WidgetTitle;
  content: WidgetContent;
};
type WidgetTitle = {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: 14;
  maxLines: number;
  breakLongWords: boolean;
  normalizeWhitespace: boolean;
};
type WidgetContent = {
  widget: Input["widgets"][number];
  x: number;
  y: number;
  width: number;
  bodyLines: number;
  accent: string;
};

type Props = {
  widget: Input["widgets"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

type GetWidgetPanelGeometryOptions = {
  widget: Input["widgets"][number];
  input: Input;
  frame: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored widget panel geometry. */
function _getWidgetPanelGeometry({
  widget,
  input,
  frame,
  accent,
  tokens,
  scales,
  motion,
}: Readonly<GetWidgetPanelGeometryOptions>): WidgetPanelGeometry {
  const rect = getWidgetRectFromInput({
    input,
    widgetId: widget.id,
    frame,
    motion,
  });
  const featured = widget.id === input.featuredWidgetId;
  const compact = input.layout === "feature-left" ? !featured : featured;
  const panel = {
    ...rect,
    rx: scales.corner(tokens.corner.cell),
    fill: tokens.color.surface,
    stroke: featured ? accent : tokens.color.line,
    strokeWidth: scales.stroke(
      featured ? tokens.stroke.default : tokens.stroke.outline,
    ),
  };
  const title = _createWidgetTitleFromGeometry({ widget, rect, compact });
  const content = _createWidgetContentFromGeometry({
    widget,
    rect,
    compact,
    accent,
  });
  return { panel, title, content };
}

/** Builds the title layout while keeping the authored fixed font size. */
function _createWidgetTitleFromGeometry({
  widget,
  rect,
  compact,
}: Readonly<CreateWidgetTitleFromGeometryOptions>): WidgetTitle {
  return {
    text: widget.title,
    x: rect.x + 12,
    y: rect.y + 22,
    width: rect.width - 24,
    fontSize: 14 as const,
    maxLines: compact ? 2 : 3,
    breakLongWords: true,
    normalizeWhitespace: true,
  };
}

/** Builds the widget body layout with the authored compact-line limit. */
function _createWidgetContentFromGeometry({
  widget,
  rect,
  compact,
  accent,
}: Readonly<CreateWidgetContentFromGeometryOptions>): WidgetContent {
  return {
    widget,
    x: rect.x,
    y: rect.y + (compact ? 56 : 84),
    width: rect.width,
    bodyLines: compact ? 2 : 3,
    accent,
  };
}

/**
 * Panel geometry resizes while every title and body font size remains fixed.
 */
export function DashboardWidgetPanel({
  widget,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { panel, title, content } = _getWidgetPanelGeometry({
    widget,
    input,
    frame,
    accent,
    tokens,
    scales,
    motion,
  });
  return (
    <g
      data-widget-panel={widget.id}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    >
      <StockRect
        data-widget={widget.id}
        data-widget-kind={widget.kind}
        {...panel}
      />
      <FitText {...title} />
      <DashboardWidgetContent {...content} />
    </g>
  );
}

type CreateWidgetTitleFromGeometryOptions = {
  widget: Input["widgets"][number];
  rect: ReturnType<typeof getWidgetRectFromInput>;
  compact: boolean;
};

type CreateWidgetContentFromGeometryOptions = {
  widget: Input["widgets"][number];
  rect: ReturnType<typeof getWidgetRectFromInput>;
  compact: boolean;
  accent: string;
};
