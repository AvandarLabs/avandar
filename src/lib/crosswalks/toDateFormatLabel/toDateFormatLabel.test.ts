import { describe, expect, it } from "vitest";
import { toDateFormatLabel } from "@/lib/crosswalks/toDateFormatLabel/toDateFormatLabel";

describe("toDateFormatLabel", () => {
  it("writes a strptime format the way people write dates", () => {
    expect(toDateFormatLabel("%m/%d/%Y")).toBe("MM/DD/YYYY");
    expect(toDateFormatLabel("%Y-%m-%d")).toBe("YYYY-MM-DD");
    expect(toDateFormatLabel("%d.%m.%y")).toBe("DD.MM.YY");
  });

  it("leaves a part it does not know as written", () => {
    expect(toDateFormatLabel("%d %b %Y")).toBe("DD %b YYYY");
  });
});
