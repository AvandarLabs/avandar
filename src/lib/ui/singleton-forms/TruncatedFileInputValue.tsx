import { TruncatedText } from "@/lib/ui/text/TruncatedText";

type Props = {
  value: null | File | File[];
};

/**
 * Renders FileInput value with ellipsis and full-name tooltip when clipped.
 */
export function TruncatedFileInputValue({ value }: Props): JSX.Element | null {
  const label = Array.isArray(value) ?
    value
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
