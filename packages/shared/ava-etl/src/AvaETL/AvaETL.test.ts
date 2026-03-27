import { describe, expect, it, vi } from "vitest";
import { AvaETL } from "./AvaETL.ts";

describe("AvaETL", () => {
  it("prints helloworld", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    AvaETL.print();

    expect(consoleLogSpy).toHaveBeenCalledWith("helloworld");

    consoleLogSpy.mockRestore();
  });
});
