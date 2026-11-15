import { prop } from "@avandar/utils";
import { Fragment } from "react";
import { DUR, ramp } from "../../motion";
import {
  Eyebrow,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { DotMatrixInput } from "../presets/DotMatrix/DotMatrix.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: DotMatrixInput };

/** Draws the bounded authored dot-matrix study at an explicit frame. */
export function DotMatrix({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const selectedTotal = input.groups
    .filter(prop("selected"))
    .reduce((total, group) => total + group.value, 0);
  const cohortTotal = input.groups.reduce((sum, group) => sum + group.value, 0);
  const matrixPoints = Array.from({ length: cohortTotal }, (_, i) => ({
    x: 78 + (i % 20) * 30,
    y: 222 + Math.floor(i / 20) * 48,
    selected: i < selectedTotal,
  }));
  const legendGroups = input.groups.map((group, index) => ({
    ...group,
    x: 78 + index * 189,
  }));
  const selected = Math.round(
    matrixPoints
      .slice(0, selectedTotal)
      .reduce((total, _, i) => total + ramp(frame, 18 + i, DUR.chip), 0),
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
      <Text x={64} y={118} size={31} weight={600}>
        {input.heading}
      </Text>
      {matrixPoints.map((dot, i) => {
        const t = dot.selected ? ramp(frame, 18 + i, DUR.chip) : 0;
        return (
          <g key={i}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={8}
              fill={STOCK.muted}
              fillOpacity={0.3}
            />
            {dot.selected ? (
              <circle cx={dot.x} cy={dot.y} r={8} fill={accent} opacity={t} />
            ) : null}
          </g>
        );
      })}
      <path d="M705 181 V450" stroke={STOCK.line} />
      <Text x={744} y={288} size={79} weight={600} fill={accent}>
        {selected}
      </Text>
      <Text x={748} y={329} size={24}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].cohortTotal,
          values: {
            count: cohortTotal,
          },
        })}
      </Text>
      <Text x={748} y={362} size={15} fill={STOCK.muted}>
        {input.cohortLabel}
      </Text>
      {input.showLegend
        ? legendGroups.map((group) => (
            <Fragment key={group.x}>
              <circle
                cx={group.x}
                cy={492}
                r={5}
                fill={group.selected ? accent : STOCK.muted}
                fillOpacity={group.selected ? undefined : 0.4}
              />
              <Text x={group.x + 16} y={498} size={17} fill={STOCK.muted}>
                {group.value} {group.label}
              </Text>
            </Fragment>
          ))
        : null}
      <Text x={64} y={553} size={13} fill={STOCK.muted} mono>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].illustrativeCohort,
          values: { count: cohortTotal },
        })}
      </Text>
    </g>
  );
}
