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

    expect(screen.getByRole("status")).toHaveTextContent(
      "Read 3 of 10 datasets",
    );
    expect(
      screen.getByRole("progressbar", { name: "Read 3 of 10 datasets" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reading 10 datasets on this device. The first time can take a few minutes.",
      ),
    ).toBeInTheDocument();
  });
});
