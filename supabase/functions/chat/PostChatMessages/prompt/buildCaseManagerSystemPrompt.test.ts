import { buildCaseManagerSystemPrompt } from "@sbfn/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts";
import { describe, expect, it } from "vitest";

describe("buildCaseManagerSystemPrompt", () => {
  it("tells the model to open with a case-type question and Volunteer/Donor fallback", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain("Which case type would you like to");
    expect(prompt).toContain("Volunteer");
    expect(prompt).toContain("Donor");
    expect(prompt).not.toContain("I want to define a new case type");
  });

  it("directs the model to the draft card instead of persisting directly", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain("proposeCaseType");
    expect(prompt).toContain("Do not call `createCaseTypes`");
  });

  it("tells the model to draw a case type from several datasets", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain("A case type is NOT a view of one dataset");
    expect(prompt).toContain("sourceDatasets");
    expect(prompt).toContain(
      "Never confine a draft to the dataset the user happened to name",
    );
  });

  it("warns that a source without a usable join key must be left out", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [],
      columns: [],
      concepts: [],
    });

    expect(prompt).toContain("leave that dataset out");
    expect(prompt).toContain("unqueryable");
  });

  it("lists the dataset columns the draft may reference", () => {
    const prompt = buildCaseManagerSystemPrompt({
      datasets: [{ id: "dataset-1", name: "long-us-deaths.csv" }],
      columns: [
        {
          dataset_id: "dataset-1",
          id: "column-1",
          name: "state",
          data_type: "varchar",
        },
      ],
      concepts: [],
    });

    expect(prompt).toContain("long-us-deaths.csv id=dataset-1");
    expect(prompt).toContain("state (varchar id=column-1)");
  });
});
