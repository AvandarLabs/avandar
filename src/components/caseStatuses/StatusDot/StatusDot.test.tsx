import { describe, expect, it } from "vitest";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import { render, screen } from "@/test-utils";

describe("StatusDot", () => {
  it("is announced by the status name when it has a label", () => {
    render(<StatusDot color="#40c057" label="Active" />);

    expect(screen.getByRole("img", { name: "Active" })).toBeInTheDocument();
  });

  it("is hidden from assistive technology when the name is written beside it", () => {
    render(<StatusDot color="#40c057" />);

    expect(screen.queryByRole("img")).toBeNull();
  });
});
