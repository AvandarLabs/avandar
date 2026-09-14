const BYTES_PER_UNIT = 1024;

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export type FormatFileSizeOptions = {
  /** BCP 47 locale used to group digits and place the decimal separator. */
  locale?: string;
};

/**
 * Formats a byte count at the largest unit that keeps it under four digits.
 *
 * Whole bytes never get a fraction, because "512.0 B" reads as a measurement
 * rather than a file size; every larger unit gets one decimal place, so a
 * difference of a tenth of a megabyte stays visible.
 */
export function formatFileSize(
  bytes: number,
  options: FormatFileSizeOptions = {},
): string {
  const { locale } = options;

  let size = bytes;
  let unitIndex = 0;
  while (size >= BYTES_PER_UNIT && unitIndex < UNITS.length - 1) {
    size = size / BYTES_PER_UNIT;
    unitIndex = unitIndex + 1;
  }

  const rounded = size.toLocaleString(locale, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  });
  return `${rounded} ${UNITS[unitIndex]}`;
}
