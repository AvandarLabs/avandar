import type { ReactNode } from "react";

type Props = {
  options: Array<{ value: unknown; label: string | { message: string } }>;
};
/** Shows fixed select slots with their serialized option indexes. */
export function SelectOptions({
  options,
}: Readonly<{
  options: ReadonlyArray<Readonly<Props["options"][number]>>;
}>): ReactNode {
  return (
    <>
      {options.map((option, index) => {
        return (
          // prettier-ignore
          // The option index is the serialized option value below.
          // It intentionally distinguishes duplicate authored
          // values in these fixed select slots.
          // react-doctor-disable-next-line no-array-index-as-key
          <option key={`${option.value}-${index}`} value={`option:${index}`}>
            {typeof option.label === "string"
              ? option.label
              : option.label.message}
          </option>
        );
      })}
    </>
  );
}
