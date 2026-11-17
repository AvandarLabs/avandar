import { notifications } from "@mantine/notifications";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { notifyError } from "@/utils/notifications/notify";
import { render, screen } from "@/test-utils";

afterEach(() => {
  act(() => {
    notifications.clean();
  });
});

describe("notifyError", () => {
  it("shows the detail as English text apart from the message", () => {
    render(<div />);

    act(() => {
      notifyError({
        title: "Failed",
        message: "Could not parse.",
        detail: "Invalid Input Error: row 4",
      });
    });

    expect(screen.getByText("Could not parse.")).toBeInTheDocument();
    expect(screen.getByText("Invalid Input Error: row 4")).toHaveAttribute(
      "lang",
      "en",
    );
  });
});
