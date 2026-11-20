import { prop } from "@avandar/utils";
import { Fragment } from "react";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Pill } from "../graphics-common/Pill";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { DotMatrixInput } from "../presets/DotMatrix/DotMatrix.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: DotMatrixInput };
const FILL_AT = 18;
const HEADING_SIZE = "31";
const COUNT_SIZE = "79";
/** Draws the bounded authored dot-matrix study at an explicit frame. */
export function DotMatrix({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, alpha, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const selectedTotal = input.groups
    .filter(prop("selected"))
    .reduce((total, group) => {
      return total + group.value;
    }, 0);
  const cohortTotal = input.groups.reduce((sum, group) => {
    return sum + group.value;
  }, 0);
  const matrixPoints = Array.from({ length: cohortTotal }, (_, i) => {
    return {
      x: 78 + (i % 20) * 30,
      y: 222 + Math.floor(i / 20) * 48,
      selected: i < selectedTotal,
    };
  });
  const legendGroups = input.groups.map((group, index) => {
    return { ...group, x: 78 + index * 189 };
  });
  const selected = Math.round(
    matrixPoints.slice(0, selectedTotal).reduce((total, _, i) => {
      return total + motion.ramp(frame, FILL_AT + i, motion.chip);
    }, 0),
  );
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].cohortMatrix,
        })}
      </Eyebrow>
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].fictionalData,
        })}
        color={accent}
      />
      <Text role="title" x={64} y={118} size={HEADING_SIZE}>
        {input.heading}
      </Text>
      {matrixPoints.map((dot, i) => {
        const t = dot.selected
          ? motion.ramp(frame, FILL_AT + i, motion.chip)
          : 0;
        return (
          <g key={i}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={8}
              fill={color.inactive}
              fillOpacity={atomic.opacity["30"]}
            />
            {dot.selected ? (
              <circle cx={dot.x} cy={dot.y} r={8} fill={accent} opacity={t} />
            ) : null}
          </g>
        );
      })}
      <SketchedShape
        shape={{ kind: "path", d: "M705 181 V450" }}
        profile={sketch.shape}
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <Text role="figure" x={744} y={288} size={COUNT_SIZE} fill={accent}>
        {selected}
      </Text>
      <Text role="question" x={748} y={329}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].cohortTotal,
          values: { count: cohortTotal },
        })}
      </Text>
      <Text role="note" x={748} y={362}>
        {input.cohortLabel}
      </Text>
      {input.showLegend
        ? legendGroups.map((group) => {
            return (
              <Fragment key={group.x}>
                <circle
                  cx={group.x}
                  cy={492}
                  r={5}
                  fill={group.selected ? accent : color.inactive}
                  fillOpacity={group.selected ? undefined : alpha.dimmed}
                />
                <Text role="caption" x={group.x + 16} y={498}>
                  {group.value} {group.label}
                </Text>
              </Fragment>
            );
          })
        : null}
      <Text role="pill" x={64} y={553}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].illustrativeCohort,
          values: { count: cohortTotal },
        })}
      </Text>
    </g>
  );
}
