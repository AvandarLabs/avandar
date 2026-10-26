import { useForm } from "@avandar/ui/hooks";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { ConceptStatusesFieldset } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptStatusesFieldset/ConceptStatusesFieldset";
import { getDefaultConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

type HarnessProps = {
  onReadValues: (values: ConceptFormValues) => void;
};

function FormHarness({ onReadValues }: Readonly<HarnessProps>): ReactNode {
  const conceptForm: FormType<ConceptFormValues> = useForm({
    mode: "uncontrolled",
    initialValues: getDefaultConceptFormValues(),
  });
  return (
    <>
      <ConceptStatusesFieldset conceptForm={conceptForm} />
      <button
        type="button"
        onClick={() => {
          onReadValues(conceptForm.getValues());
        }}
      >
        Read values
      </button>
    </>
  );
}

function _readValues(
  onReadValues: ReturnType<typeof vi.fn>,
): ConceptFormValues {
  fireEvent.click(screen.getByRole("button", { name: "Read values" }));
  return onReadValues.mock.lastCall?.[0] as ConceptFormValues;
}

describe("ConceptStatusesFieldset", () => {
  it("starts a new case type with the default statuses", () => {
    render(<FormHarness onReadValues={vi.fn()} />);

    expect(
      screen.getAllByRole("textbox", { name: "Status name" }).map((input) => {
        return (input as HTMLInputElement).value;
      }),
    ).toEqual(["Active", "Inactive"]);
  });

  it("writes an added status back into the case type form", () => {
    const onReadValues = vi.fn();
    render(<FormHarness onReadValues={onReadValues} />);

    fireEvent.click(screen.getByRole("button", { name: "Add status" }));

    expect(_readValues(onReadValues).statuses).toHaveLength(3);
  });

  it("moves the form's default when the default status is removed", () => {
    const onReadValues = vi.fn();
    render(<FormHarness onReadValues={onReadValues} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Active" }));

    const values = _readValues(onReadValues);
    expect(values.defaultStatusId).toBe(values.statuses[0]?.id);
  });
});
