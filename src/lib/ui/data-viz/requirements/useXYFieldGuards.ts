import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { UnknownDataFrame } from "@/lib/types/common";
import {
  classifyFieldsByKind,
  describeFieldKinds,
  FieldKind,
} from "@/lib/ui/data-viz/requirements/chartRequirements";

export type XYRequirements = { x: FieldKind[]; y: FieldKind[] };

export interface XYFieldGuardsResult {
  allowedXAxisNames: string[];
  allowedYAxisNames: string[];
  isXAxisDisabled: boolean;
  isYAxisDisabled: boolean;
  xAxisPlaceholder: string;
  yAxisPlaceholder: string;
}

export function useXYFieldGuards(params: {
  fields: readonly QueryResultField[];
  data: UnknownDataFrame;
  requirements: XYRequirements;
}): XYFieldGuardsResult {
  const { fields, data, requirements } = params;

  const fieldsByKind = classifyFieldsByKind(fields, data);

  const allowedXAxisNames = requirements.x.flatMap((kind) => {
    return fieldsByKind[kind];
  });
  const allowedYAxisNames = requirements.y.flatMap((kind) => {
    return fieldsByKind[kind];
  });

  const isXAxisDisabled = allowedXAxisNames.length === 0;
  const isYAxisDisabled = allowedYAxisNames.length === 0;

  const expectedXKinds = describeFieldKinds(requirements.x);
  const expectedYKinds = describeFieldKinds(requirements.y);

  const xAxisPlaceholder =
    isXAxisDisabled ?
      `Requires ${expectedXKinds}`
    : `Select X axis (${expectedXKinds})`;

  const yAxisPlaceholder =
    isYAxisDisabled ?
      `Requires ${expectedYKinds}`
    : `Select Y axis (${expectedYKinds})`;

  return {
    allowedXAxisNames,
    allowedYAxisNames,
    isXAxisDisabled,
    isYAxisDisabled,
    xAxisPlaceholder,
    yAxisPlaceholder,
  };
}
