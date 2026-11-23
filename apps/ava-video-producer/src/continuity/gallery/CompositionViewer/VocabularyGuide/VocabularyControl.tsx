import type { ContinuityControl } from "../../../continuityCatalog";

type Props = { control: ContinuityControl };

/** One real schema control with its reuse consequence. */
export function VocabularyControl({ control }: Props) {
  return (
    <li>
      <strong>{control.label}</strong>
      <code>{control.path}</code>
      <p>{control.description}</p>
    </li>
  );
}
