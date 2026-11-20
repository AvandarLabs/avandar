import type { ContinuityControl } from "../../../continuityCatalog";
import type { ReactNode } from "react";

type Props = { control: ContinuityControl };

/** One real schema control with its reuse consequence. */
export function VocabularyControl({ control }: Props): ReactNode {
  return (
    <li>
      <strong>{control.label}</strong>
      <code>{control.path}</code>
      <p>{control.description}</p>
    </li>
  );
}
