import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";
import { CaseTypeHome } from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome";

describe("CaseTypeHome", () => {
  it("shows each case type and a new-case-type card, never entity copy", () => {
    render(
      <CaseTypeHome
        caseTypes={[
          {
            id: "c1",
            name: "County",
            description: "US counties in the workspace",
          },
        ]}
        onCreate={vi.fn()}
        onOpenCaseType={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Case types" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "County" })).toBeInTheDocument();
    expect(
      screen.getByText("US counties in the workspace"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new case type/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/entity/i)).toBeNull();
    expect(screen.queryByText(/profile/i)).toBeNull();
  });

  it("deletes a case type from its card without opening it", () => {
    const onDeleteCaseType = vi.fn();
    const onOpenCaseType = vi.fn();
    render(
      <CaseTypeHome
        caseTypes={[{ id: "c1", name: "County", description: undefined }]}
        onCreate={vi.fn()}
        onOpenCaseType={onOpenCaseType}
        onDeleteCaseType={onDeleteCaseType}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete County" }));

    expect(onDeleteCaseType).toHaveBeenCalledWith({
      id: "c1",
      name: "County",
      description: undefined,
    });
    // The trash sits on top of the card, so it must not also open it.
    expect(onOpenCaseType).not.toHaveBeenCalled();
  });

  it("offers no delete control when the caller handles no deletion", () => {
    render(
      <CaseTypeHome
        caseTypes={[{ id: "c1", name: "County", description: undefined }]}
        onCreate={vi.fn()}
        onOpenCaseType={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Delete County" }),
    ).not.toBeInTheDocument();
  });

  it("opens a case type from its card and starts create from the dashed card", () => {
    const onCreate = vi.fn();
    const onOpenCaseType = vi.fn();
    render(
      <CaseTypeHome
        caseTypes={[{ id: "c1", name: "County", description: undefined }]}
        onCreate={onCreate}
        onOpenCaseType={onOpenCaseType}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open County" }));
    expect(onOpenCaseType).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /new case type/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("teaches the next action when no case types exist yet", () => {
    render(
      <CaseTypeHome
        caseTypes={[]}
        onCreate={vi.fn()}
        onOpenCaseType={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/describe what you want to manage/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new case type/i }),
    ).toBeInTheDocument();
  });
});
