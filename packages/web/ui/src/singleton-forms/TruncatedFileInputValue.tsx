import { TruncatedText } from "../text/TruncatedText";

type Props = {
  value: null | File | File[];
};

/**
 * Displays selected file names with truncation and a full-text tooltip when
 * clipped.
 * Use it, for example, as a FileInput value component in an upload form.
 * Returns null when no file name is available.
 */
export function TruncatedFileInputValue({ value }: Props): JSX.Element | null {
  const label = Array.isArray(value)
    ? value
        .map((file) => {
          return file.name;
        })
        .join(", ")
    : (value?.name ?? "");

  if (label.length === 0) {
    return null;
  }

  return (
    <TruncatedText
      maw="100%"
      w="100%"
      withFullTextTooltip
      size="sm"
      tooltipProps={{
        position: "bottom",
        floatingStrategy: "fixed",
        maw: "min(22rem, calc(100vw - 2rem))",
        zIndex: 520,
      }}
    >
      {label}
    </TruncatedText>
  );
}
