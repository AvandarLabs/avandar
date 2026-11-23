import { ReviewRoleBracket } from "./ReviewRoleBracket";
import type { ReactNode } from "react";

type Props = {
  labels: readonly string[];
  tokens: Parameters<typeof ReviewRoleBracket>[0]["tokens"];
};
/** Renders the authored role brackets with their original positional keys. */
export function ReviewRoleBrackets({
  labels,
  tokens,
}: Readonly<Props>): ReactNode {
  return labels.map((label, index) => {
    return (
      <ReviewRoleBracket
        key={index}
        tokens={tokens}
        label={label}
        index={index}
      />
    );
  });
}
