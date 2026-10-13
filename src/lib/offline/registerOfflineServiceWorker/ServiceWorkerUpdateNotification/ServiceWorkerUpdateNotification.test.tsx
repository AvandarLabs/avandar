import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import { ServiceWorkerUpdateNotification } from "@/lib/offline/registerOfflineServiceWorker/ServiceWorkerUpdateNotification/ServiceWorkerUpdateNotification";

describe("ServiceWorkerUpdateNotification", () => {
  it("calls onUpdate when the update button is clicked", () => {
    const onUpdate = vi.fn();
    render(<ServiceWorkerUpdateNotification onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: /update now/i }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
