import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { CombinedPreview } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombinedPreview/CombinedPreview";

describe("CombinedPreview", () => {
  it("says how many datasets are read while the preview reads", () => {
    render(
      <CombinedPreview
        preview={{
          status: "reading",
          progress: { readCount: 3, totalCount: 10 },
        }}
        columnNames={["case_id"]}
        datasetCount={10}
      />,
    );

    expect(screen.getByText("Read 3 of 10 datasets")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Read 3 of 10 datasets" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reading 10 datasets on this device. The first time can take a few minutes.",
      ),
    ).toBeInTheDocument();
  });

  it("announces the count in steps of 10 percent, not for every dataset", () => {
    const { rerender } = render(
      <CombinedPreview
        preview={{
          status: "reading",
          progress: { readCount: 4, totalCount: 100 },
        }}
        columnNames={["case_id"]}
        datasetCount={100}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "0% of the datasets read",
    );

    rerender(
      <CombinedPreview
        preview={{
          status: "reading",
          progress: { readCount: 19, totalCount: 100 },
        }}
        columnNames={["case_id"]}
        datasetCount={100}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "10% of the datasets read",
    );
    expect(screen.getByText("Read 19 of 100 datasets")).toBeInTheDocument();
  });
});
