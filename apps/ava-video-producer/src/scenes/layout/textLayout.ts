import type { MetricSceneProps } from "../scenes.types";
import { assertFinite } from "./geometry";

export function formatMetric(value: number, precision = 0): string {
  assertFinite(value, "metric value");
  if (!Number.isInteger(precision) || precision < 0 || precision > 6)
    throw new Error("Metric precision must be an integer from 0 to 6");
  const rounded = Number(value.toFixed(precision));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(Object.is(rounded, -0) ? 0 : rounded);
}

/** Conservative width estimate, used for a stable font size before rendering. */
export function textUnits(text: string): number {
  return Array.from(text).reduce(
    (sum, character) =>
      sum +
      (/[\s.,:;!'|ilI]/.test(character)
        ? 0.3
        : /[MW@%]/.test(character)
          ? 0.95
          : character.codePointAt(0)! > 0x2ff
            ? 1
            : 0.62),
    0,
  );
}

export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const result: string[] = [];
  let line = "";
  for (const word of words) {
    if (textUnits(word) * fontSize > maxWidth)
      throw new Error(`Word is too long for the available text width: ${word}`);
    const candidateLine = line ? `${line} ${word}` : word;
    if (line && textUnits(candidateLine) * fontSize > maxWidth) {
      result.push(line);
      line = word;
    } else line = candidateLine;
  }
  if (line) result.push(line);
  return result;
}

export function fitTextLines(
  lines: string[],
  width: number,
  height: number,
  requested = 92,
  minimum = 40,
): { fontSize: number; lines: string[] } {
  assertFinite(requested, "fontSize");
  if (requested < minimum || requested > 160)
    throw new Error(`fontSize must be from ${minimum} to 160`);
  for (let size = requested; size >= minimum; size -= 1) {
    try {
      const wrapped = lines.flatMap((line) => wrapText(line, width, size));
      if (wrapped.length && wrapped.length * size * 1.22 <= height)
        return { fontSize: size, lines: wrapped };
    } catch {
      /* Retry at a smaller fixed size. */
    }
  }
  throw new Error(
    "Text cannot fit legibly; shorten the copy or split it across scenes",
  );
}

/** Fit the complete metric stack once, including padding, gaps and both count endpoints. */
export function fitMetricContent({
  width,
  height,
  label,
  value,
  from = 0,
  unit,
  precision = 0,
  detail,
}: Pick<
  MetricSceneProps,
  "label" | "value" | "from" | "unit" | "precision" | "detail"
> & { width: number; height: number }) {
  assertFinite(width, "metric width");
  assertFinite(height, "metric height");
  const paddingX = 80;
  const contentWidth = width - paddingX * 2 - 2;
  const numberWidth = Math.max(
    textUnits(formatMetric(from, precision)),
    textUnits(formatMetric(value, precision)),
  );
  // Prefer the original spacious treatment; compact only when the whole stack needs it.
  for (let step = 0; step <= 24; step++) {
    const amount = step / 24;
    const choose = (large: number, small: number) =>
      Math.round(large + (small - large) * amount);
    const paddingY = choose(50, 20);
    const numberGap = choose(28, 12);
    const unitGap = choose(28, 14);
    const unitSize = choose(48, 28);
    const numberSize = Math.min(
      choose(154, 48),
      Math.floor(
        (contentWidth - (unit ? textUnits(unit) * unitSize + unitGap : 0)) /
          numberWidth,
      ),
    );
    if (numberSize < 48) continue;
    let labelFit: ReturnType<typeof fitTextLines>;
    let detailFit: ReturnType<typeof fitTextLines> | undefined;
    try {
      labelFit = fitTextLines([label], contentWidth, 106, choose(42, 28), 28);
      detailFit = detail
        ? fitTextLines([detail], contentWidth, 110, choose(28, 20), 20)
        : undefined;
    } catch {
      continue;
    }
    const numberHeight = Math.max(numberSize * 1.05, unit ? unitSize * 1.2 : 0);
    const contentHeight =
      labelFit.lines.length * labelFit.fontSize * 1.22 +
      numberHeight +
      numberGap * 2 +
      (detailFit ? detailFit.lines.length * detailFit.fontSize * 1.3 : 0);
    const requiredHeight = contentHeight + paddingY * 2 + 2;
    if (requiredHeight <= height)
      return {
        label: labelFit,
        detail: detailFit,
        numberSize,
        numberHeight,
        unitSize,
        paddingX,
        paddingY,
        numberGap,
        unitGap,
        contentHeight,
        requiredHeight,
      };
  }
  throw new Error(
    "Metric cannot fit legibly; shorten the copy, reduce the unit, or increase the scene height",
  );
}
