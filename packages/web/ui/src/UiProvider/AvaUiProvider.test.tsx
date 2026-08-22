import type { NotificationsProps } from "@mantine/notifications";

import { render, screen } from "@testing-library/react";
import { AvaUiProvider } from "@ui/UiProvider/AvaUiProvider";
import { describe, expect, it, vi } from "vitest";

/**
 * `Notifications` is stubbed so the assertions can read the exact `styles`
 * value AvaUiProvider computed, rather than inferring it from rendered CSS.
 */
const notificationsSpy = vi.fn();
vi.mock("@mantine/notifications", () => {
  return {
    Notifications: (props: NotificationsProps) => {
      notificationsSpy(props);
      return null;
    },
  };
});

function renderWith(props: {
  notificationsStyles?: NotificationsProps["styles"];
}): NotificationsProps {
  notificationsSpy.mockClear();
  render(
    <AvaUiProvider notificationsStyles={props.notificationsStyles}>
      <span>child</span>
    </AvaUiProvider>,
  );
  return notificationsSpy.mock.calls[0]![0] as NotificationsProps;
}

describe("AvaUiProvider", () => {
  it("renders its children", () => {
    renderWith({});
    expect(screen.getByText("child")).toBeDefined();
  });

  it("applies the click-through defaults when given no styles", () => {
    const { styles } = renderWith({});

    expect(styles).toEqual({
      root: { pointerEvents: "none" },
      notification: { pointerEvents: "auto" },
    });
  });

  it("keeps untouched selectors when overriding one of them", () => {
    const { styles } = renderWith({
      notificationsStyles: { notification: { borderRadius: 12 } },
    });

    expect(styles).toEqual({
      root: { pointerEvents: "none" },
      notification: { pointerEvents: "auto", borderRadius: 12 },
    });
  });

  it("lets an override win on a property it sets explicitly", () => {
    const { styles } = renderWith({
      notificationsStyles: { root: { pointerEvents: "auto" } },
    });

    expect(styles).toEqual({
      root: { pointerEvents: "auto" },
      notification: { pointerEvents: "auto" },
    });
  });

  it("merges the result of the callback form", () => {
    const { styles } = renderWith({
      notificationsStyles: () => {
        return { notification: { borderRadius: 12 } };
      },
    });

    expect(typeof styles).toBe("function");
    const resolved = (styles as (...args: never[]) => unknown)(
      ...([{}, {}, {}] as never[]),
    );

    expect(resolved).toEqual({
      root: { pointerEvents: "none" },
      notification: { pointerEvents: "auto", borderRadius: 12 },
    });
  });
});
