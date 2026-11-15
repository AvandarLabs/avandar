import { Modal, Stack, Text, Title } from "@mantine/core";
import { useLayoutEffect, useRef } from "react";
import { SaveToDashboardCreateMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardCreateMode";
import { enter, ramp, typed } from "../../src/motion";
import { DASHBOARD_NAME } from "../shims/import-dashboard/DashboardFixtureContext";

const _noop = () => {};

/** The real "Save to dashboard" create form, typed out letter-by-letter from the dashboard's default name. */
export function CreateModal({ frame }: { frame: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const name = typed(frame, 148, DASHBOARD_NAME, 27);
  useLayoutEffect(function markCreateModalVideoTargets() {
    const input = rootRef.current?.querySelector("input");
    input?.setAttribute("data-video-target", "dashboard-name");
    // The genuine create form selects its default name on focus. Each frame's
    // controlled remount supplies the next typed value, then restores the
    // normal insertion point so completed text does not stay selected.
    input?.setSelectionRange(name.length, name.length);
    [...(rootRef.current?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent?.includes("Create dashboard"))
      ?.setAttribute("data-video-target", "dashboard-create");
  });
  return (
    <Modal
      opened
      onClose={_noop}
      size="lg"
      withinPortal={false}
      transitionProps={{ duration: 0 }}
      styles={{
        inner: { position: "absolute", inset: 0 },
        content: { ...enter(frame, 101, { y: 12, dur: 16 }) },
        overlay: {
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(0,0,0,${ramp(frame, 101, 16) * 0.6})`,
        },
      }}
    >
      <Stack gap="md" ref={rootRef}>
        <Stack gap={2}>
          <Title order={4}>Save to dashboard</Title>
          <Text c="dimmed" size="sm">
            We'll add this visualization to your new dashboard.
          </Text>
        </Stack>
        <SaveToDashboardCreateMode
          key={name}
          defaultName={name}
          isCreating={frame >= 306}
          isDisabled={false}
          showEmptyStateBanner={false}
          onBack={undefined}
          onCancel={_noop}
          onSubmit={_noop}
        />
      </Stack>
    </Modal>
  );
}
