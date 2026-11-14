import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { CombiningProgress } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombiningProgress/CombiningProgress";

describe("CombiningProgress", () => {
  it("says how many datasets are read, as text and as a progress bar", () => {
    render(<CombiningProgress readCount={37} totalCount={100} />);

    expect(screen.getByText("Read 37 of 100 datasets")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Read 37 of 100 datasets" }),
    ).toHaveAttribute("aria-valuenow", "37");
  });

  it("reads one dataset in the singular", () => {
    render(<CombiningProgress readCount={0} totalCount={1} />);

    expect(screen.getByText("Read 0 of 1 dataset")).toBeInTheDocument();
  });
});
