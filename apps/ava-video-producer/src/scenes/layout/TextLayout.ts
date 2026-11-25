import { SceneGeometry } from "./SceneGeometry";
import type { MetricSceneProps } from "../scenes.types";

type FitTextLinesParameters = {
  lines: string[];
  width: number;
  height: number;
  requested?: number;
  minimum?: number;
};
/** Formats a finite metric with fixed precision for scene labels. */
function _formatMetric({
  value,
  precision = 0,
}: Readonly<{
  value: number;
  precision?: number;
}>): string {
  SceneGeometry.assertFinite({
    value,
    name: "metric value",
  });
  if (!Number.isInteger(precision) || precision < 0 || precision > 6) {
    throw new Error("Metric precision must be an integer from 0 to 6");
  }
  const rounded = Number(value.toFixed(precision));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(Object.is(rounded, -0) ? 0 : rounded);
}
/**
 * Conservative width estimate, used for a stable font size before rendering.
 */
function _textUnits(text: string): number {
  return Array.from(text).reduce((sum, character) => {
    return (
      sum +
      (/[\s.,:;!'|ilI]/.test(character)
        ? 0.3
        : /[MW@%]/.test(character)
          ? 0.95
          : character.codePointAt(0)! > 0x2ff
            ? 1
            : 0.62)
    );
  }, 0);
}
/** Wraps text into estimated-width lines for scene layout. */
function _wrapText({
  text,
  maxWidth,
  fontSize,
}: Readonly<{
  text: string;
  maxWidth: number;
  fontSize: number;
}>): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }
  const result: string[] = [];
  let line = "";
  for (const word of words) {
    if (_textUnits(word) * fontSize > maxWidth) {
      throw new Error(`Word is too long for the available text width: ${word}`);
    }
    const candidateLine = line ? `${line} ${word}` : word;
    if (line && _textUnits(candidateLine) * fontSize > maxWidth) {
      result.push(line);
      line = word;
    } else {
      line = candidateLine;
    }
  }
  if (line) {
    result.push(line);
  }
  return result;
}
/** Wrapped lines and the font size they fit at. */
type FittedTextLines = {
  fontSize: number;
  lines: string[];
};
/** The metric stack's fitted copy, type sizes, spacing and heights. */
type MetricContentFit = {
  label: FittedTextLines;
  detail: FittedTextLines | undefined;
  numberSize: number;
  numberHeight: number;
  unitSize: number;
  paddingX: number;
  paddingY: number;
  numberGap: number;
  unitGap: number;
  contentHeight: number;
  requiredHeight: number;
};
/** Returns wrapped lines and a font size that fit the scene text box. */
function _fitTextLines({
  lines,
  width,
  height,
  requested = 92,
  minimum = 40,
}: Readonly<FitTextLinesParameters>): FittedTextLines {
  SceneGeometry.assertFinite({
    value: requested,
    name: "fontSize",
  });
  if (requested < minimum || requested > 160) {
    throw new Error(`fontSize must be from ${minimum} to 160`);
  }
  for (let size = requested; size >= minimum; size -= 1) {
    try {
      const wrapped = lines.flatMap((line) => {
        return _wrapText({
          text: line,
          maxWidth: width,
          fontSize: size,
        });
      });
      if (wrapped.length && wrapped.length * size * 1.22 <= height) {
        return { fontSize: size, lines: wrapped };
      }
    } catch {
      // Retry at a smaller fixed size.
    }
  }
  throw new Error(
    "Text cannot fit legibly; shorten the copy or split it across scenes",
  );
}
type FitMetricContentOptions = Pick<
  MetricSceneProps,
  "label" | "value" | "from" | "unit" | "precision" | "detail"
> & {
  width: number;
  height: number;
};
/**
 * Fit the complete metric stack once, including padding, gaps and both count
 * endpoints.
 */
function _fitMetricContent({
  width,
  height,
  label,
  value,
  from = 0,
  unit,
  precision = 0,
  detail,
}: FitMetricContentOptions): MetricContentFit {
  SceneGeometry.assertFinite({
    value: width,
    name: "metric width",
  });
  SceneGeometry.assertFinite({
    value: height,
    name: "metric height",
  });
  const paddingX = 80;
  const contentWidth = width - paddingX * 2 - 2;
  const numberWidth = _getMetricNumberWidthFromValues({
    from,
    value,
    precision,
  });
  // Prefer the original spacious treatment; compact only when the whole stack
  // needs it.
  for (let step = 0; step <= 24; step++) {
    const fitted = _getMetricStackFromStep({
      step,
      contentWidth,
      numberWidth,
      paddingX,
      height,
      label,
      detail,
      unit,
    });
    if (fitted) return fitted;
  }
  throw new Error(
    "Metric cannot fit legibly; shorten the copy, reduce the unit, or increase the scene height",
  );
}

/** Measures the wider formatted endpoint of a counting metric. */
function _getMetricNumberWidthFromValues({
  from,
  value,
  precision,
}: Readonly<{ from: number; value: number; precision: number }>): number {
  return Math.max(
    _textUnits(
      _formatMetric({
        value: from,
        precision,
      }),
    ),
    _textUnits(
      _formatMetric({
        value,
        precision,
      }),
    ),
  );
}

type MetricStepOptions = {
  step: number;
  contentWidth: number;
  numberWidth: number;
  paddingX: number;
  height: number;
  label: string;
  detail: string | undefined;
  unit: string | undefined;
};
type MetricSizes = Pick<
  MetricContentFit,
  "paddingY" | "numberGap" | "unitGap" | "unitSize" | "numberSize"
>;
/** Interpolates spacing and figure sizes for one metric fit attempt. */
function _getMetricSizesFromStep({
  step,
  contentWidth,
  numberWidth,
  unit,
}: Readonly<
  Pick<MetricStepOptions, "step" | "contentWidth" | "numberWidth" | "unit">
>): MetricSizes {
  const amount = step / 24;
  const choose = (large: number, small: number) => {
    return Math.round(large + (small - large) * amount);
  };
  const paddingY = choose(50, 20),
    numberGap = choose(28, 12),
    unitGap = choose(28, 14),
    unitSize = choose(48, 28);
  const numberSize = Math.min(
    choose(154, 48),
    Math.floor(
      (contentWidth - (unit ? _textUnits(unit) * unitSize + unitGap : 0)) /
        numberWidth,
    ),
  );
  return { paddingY, numberGap, unitGap, unitSize, numberSize };
}
/** Fits both copy roles at the size used by one metric fit attempt. */
function _getMetricCopyFromStep({
  step,
  contentWidth,
  label,
  detail,
}: Readonly<
  Pick<MetricStepOptions, "step" | "contentWidth" | "label" | "detail">
>): Pick<MetricContentFit, "label" | "detail"> {
  const amount = step / 24;
  const choose = (large: number, small: number) => {
    return Math.round(large + (small - large) * amount);
  };
  return {
    label: _fitTextLines({
      lines: [label],
      width: contentWidth,
      height: 106,
      requested: choose(42, 28),
      minimum: 28,
    }),
    detail: detail
      ? _fitTextLines({
          lines: [detail],
          width: contentWidth,
          height: 110,
          requested: choose(28, 20),
          minimum: 20,
        })
      : undefined,
  };
}
/** Returns a legible stack for one metric fit attempt, if it fits. */
function _getMetricStackFromStep(
  options: Readonly<MetricStepOptions>,
): MetricContentFit | undefined {
  const { height, paddingX, unit } = options;
  const sizes = _getMetricSizesFromStep(options);
  if (sizes.numberSize < 48) return undefined;
  let copy: Pick<MetricContentFit, "label" | "detail">;
  try {
    copy = _getMetricCopyFromStep(options);
  } catch {
    return undefined;
  }
  const numberHeight = Math.max(
    sizes.numberSize * 1.05,
    unit ? sizes.unitSize * 1.2 : 0,
  );
  const contentHeight =
    copy.label.lines.length * copy.label.fontSize * 1.22 +
    numberHeight +
    sizes.numberGap * 2 +
    (copy.detail ? copy.detail.lines.length * copy.detail.fontSize * 1.3 : 0);
  const requiredHeight = contentHeight + sizes.paddingY * 2 + 2;
  return requiredHeight <= height
    ? {
        ...copy,
        ...sizes,
        numberHeight,
        paddingX,
        contentHeight,
        requiredHeight,
      }
    : undefined;
}

/** Formats and fits metric and paragraph text within authored scene bounds. */
export const TextLayout = {
  /** Formats a finite metric with fixed precision for scene labels. */
  formatMetric: _formatMetric,
  /**
   * Conservative width estimate, used for a stable font size before rendering.
   */
  textUnits: _textUnits,
  /** Wraps text into estimated-width lines for scene layout. */
  wrapText: _wrapText,
  /** Returns wrapped lines and a font size that fit the scene text box. */
  fitTextLines: _fitTextLines,
  /**
   * Fit the complete metric stack once, including padding, gaps and both count
   * endpoints.
   */
  fitMetricContent: _fitMetricContent,
};
