import { useContinuityCopy } from "../../../useContinuityCopy";
import type { ContinuityControl } from "../../../continuityCatalog";

type Props = { control: ContinuityControl };

/** One real schema control with its reuse consequence. */
export function VocabularyControl({ control }: Props) {
  const translate = useContinuityCopy();
  return (
    <li>
      <strong>{translate(control.label)}</strong>
      <code>{control.path}</code>
      <p>{translate(control.description)}</p>
    </li>
  );
}
