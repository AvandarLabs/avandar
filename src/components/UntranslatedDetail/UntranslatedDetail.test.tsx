import { describe, expect, it } from "vitest";
import { UntranslatedDetail } from "@/components/UntranslatedDetail/UntranslatedDetail";
import { render, screen } from "@/test-utils";

describe("UntranslatedDetail", () => {
  it("marks the detail as English and labels it", () => {
    render(<UntranslatedDetail detail="HTTP 404 from storage" />);

    const detail = screen.getByText("HTTP 404 from storage");
    expect(detail).toHaveAttribute("lang", "en");
    expect(screen.getByText("Details:")).toBeInTheDocument();
  });

  it("renders nothing for an empty detail", () => {
    render(<UntranslatedDetail detail="" />);

    expect(screen.queryByText("Details:")).toBeNull();
  });
});
