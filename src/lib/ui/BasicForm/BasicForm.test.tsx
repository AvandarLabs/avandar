import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test-utils";
import { BasicForm } from ".";

describe("BasicForm", () => {
  it("renders text fields", () => {
    render(
      <BasicForm
        fields={{
          name: {
            type: "text",
            initialValue: "",
          },
        }}
        formElements={["name"]}
        onSubmit={() => {
          console.log("Submitting!");
        }}
      />,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
