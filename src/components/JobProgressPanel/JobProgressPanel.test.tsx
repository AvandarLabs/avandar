import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { afterEach, describe, expect, it } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { render, screen } from "@/test-utils";
import { JobProgressPanel } from "./JobProgressPanel";

function _renderPanel(): void {
  render(
    <I18nProvider i18n={i18n}>
      <AvandarAppProvider>
        <JobProgressPanel />
      </AvandarAppProvider>
    </I18nProvider>,
  );
}

describe("JobProgressPanel", () => {
  afterEach(() => {
    JobProgressStore.getAllJobs().forEach(({ id }) => {
      JobProgressStore.finishJob(id);
    });
  });

  it("renders nothing when no job is live", () => {
    _renderPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders one indicator per live job, each labeled", () => {
    JobProgressStore.startJob("Refreshing Facility records");
    JobProgressStore.startJob("Uploading dataset");

    _renderPanel();

    expect(screen.getByText("Refreshing Facility records")).toBeInTheDocument();
    expect(screen.getByText("Uploading dataset")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("shows a determinate progress bar with the job's current/total", () => {
    const jobId = JobProgressStore.startJob("Refreshing Facility records");
    JobProgressStore.updateJob(jobId, {
      status: "determinate",
      label: "Refreshing Facility records",
      current: 2,
      total: 4,
    });

    _renderPanel();

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("shows a dismissible error panel for a failed job", () => {
    const jobId = JobProgressStore.startJob("Uploading dataset");
    JobProgressStore.failJob(jobId, "Network error");

    _renderPanel();

    expect(screen.getByText("Network error")).toBeInTheDocument();
    screen.getByRole("button", { name: /dismiss/i }).click();

    expect(JobProgressStore.getJob(jobId)).toBeUndefined();
  });
});
