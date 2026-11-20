import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DashboardWidgetContent } from "./DashboardWidgetContent";
import { getWidgetRectFromInput } from "./getWidgetRectFromInput";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  widget: Input["widgets"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
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
  const title = {
    text: widget.title,
    x: rect.x + 12,
    y: rect.y + 22,
    width: rect.width - 24,
    fontSize: 14 as const,
    maxLines: compact ? 2 : 3,
    breakLongWords: true,
    normalizeWhitespace: true,
  };
  const content = {
    widget,
    x: rect.x,
    y: rect.y + (compact ? 56 : 84),
    width: rect.width,
    bodyLines: compact ? 2 : 3,
    accent,
  };
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
