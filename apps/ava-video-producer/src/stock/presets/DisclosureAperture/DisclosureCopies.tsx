import { DisclosureField } from "./DisclosureField";
import type { Input } from "./DisclosureAperture.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Only share fields receive duplicate geometry, in their original authored row
 * positions.
 */
export function DisclosureCopies({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  let numSharedFields = 0;
  return (
    <g>
      {input.fields.map((field, index) =>
        field.disclosure === "share" ? (
          <DisclosureField
            key={field.id}
            {...{ field, index, frame, input, accent }}
            shareIndex={numSharedFields++}
            isCopy
          />
        ) : undefined,
      )}
    </g>
  );
}
