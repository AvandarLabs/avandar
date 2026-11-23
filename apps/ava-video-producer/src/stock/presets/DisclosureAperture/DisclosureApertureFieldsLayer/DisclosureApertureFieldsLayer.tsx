import { DisclosureField } from "../DisclosureField/DisclosureField";
import type { DisclosureAperture } from "../DisclosureAperture";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof DisclosureAperture>[0]["input"];
  frame: Parameters<typeof DisclosureAperture>[0]["frame"];
  accent: Parameters<typeof DisclosureAperture>[0]["accent"];
};

/** Renders the fields layer with authored geometry. */
export function DisclosureApertureFieldsLayer({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.fields.map((field, index) => {
        return (
          <DisclosureField
            key={field.id}
            {...{ field, index, frame, input, accent }}
            shareIndex={0}
            isCopy={false}
          />
        );
      })}
    </>
  );
}
