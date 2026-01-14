import { Accordion } from "@mantine/core";
import { LLMQueryForm } from "./LLMQueryForm";
import { ManualQueryForm } from "./ManualQueryForm";

type Props = {
  withinPortal?: boolean;
};

export function QueryForm({ withinPortal = true }: Props): JSX.Element {
  return (
    <Accordion defaultValue="llm-query">
      <Accordion.Item value="llm-query">
        <Accordion.Control>AI Query Builder</Accordion.Control>
        <Accordion.Panel>
          <LLMQueryForm />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="manual-query">
        <Accordion.Control>Manual Query Builder</Accordion.Control>
        <Accordion.Panel>
          <ManualQueryForm withinPortal={withinPortal} />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
