import { describe, expect, it } from "vitest";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";

describe("JobProgressStore", () => {
  it("starts a job in the indeterminate state with the given label", () => {
    const jobId = JobProgressStore.startJob("Downloading model");

    expect(JobProgressStore.getJob(jobId)).toEqual({
      status: "indeterminate",
      label: "Downloading model",
      detail: undefined,
    });

    JobProgressStore.finishJob(jobId);
  });

  it("replaces a job's entry on update, including switching status", () => {
    const jobId = JobProgressStore.startJob("Uploading dataset");

    JobProgressStore.updateJob(jobId, {
      status: "determinate",
      label: "Uploading dataset",
      current: 3,
      total: 10,
    });

    expect(JobProgressStore.getJob(jobId)).toEqual({
      status: "determinate",
      label: "Uploading dataset",
      current: 3,
      total: 10,
    });

    JobProgressStore.finishJob(jobId);
  });

  it("does nothing when updating a job id that was already finished", () => {
    const jobId = JobProgressStore.startJob("Uploading dataset");
    JobProgressStore.finishJob(jobId);

    JobProgressStore.updateJob(jobId, {
      status: "determinate",
      label: "Uploading dataset",
      current: 1,
      total: 1,
    });

    expect(JobProgressStore.getJob(jobId)).toBeUndefined();
  });

  it("removes the entry entirely when a job finishes", () => {
    const jobId = JobProgressStore.startJob("Downloading model");
    JobProgressStore.finishJob(jobId);

    expect(JobProgressStore.getJob(jobId)).toBeUndefined();
  });

  it("moves a job to the error state, keeping its label, when it fails", () => {
    const jobId = JobProgressStore.startJob("Refreshing Facility records");

    JobProgressStore.failJob(jobId, "Network error");

    expect(JobProgressStore.getJob(jobId)).toEqual({
      status: "error",
      label: "Refreshing Facility records",
      message: "Network error",
    });

    JobProgressStore.finishJob(jobId);
  });

  it("does nothing when failing a job id that was already finished", () => {
    const jobId = JobProgressStore.startJob("Refreshing Facility records");
    JobProgressStore.finishJob(jobId);

    JobProgressStore.failJob(jobId, "Network error");

    expect(JobProgressStore.getJob(jobId)).toBeUndefined();
  });

  it("gives two jobs started back to back distinct ids and independent state", () => {
    const firstJobId = JobProgressStore.startJob("First job");
    const secondJobId = JobProgressStore.startJob("Second job");

    expect(firstJobId).not.toBe(secondJobId);

    JobProgressStore.updateJob(firstJobId, {
      status: "determinate",
      label: "First job",
      current: 1,
      total: 2,
    });

    expect(JobProgressStore.getJob(secondJobId)).toEqual({
      status: "indeterminate",
      label: "Second job",
      detail: undefined,
    });

    JobProgressStore.finishJob(firstJobId);
    JobProgressStore.finishJob(secondJobId);
  });

  it("lists every live job from getAllJobs", () => {
    const jobId = JobProgressStore.startJob("Downloading model");

    expect(JobProgressStore.getAllJobs()).toEqual([
      {
        id: jobId,
        entry: {
          status: "indeterminate",
          label: "Downloading model",
          detail: undefined,
        },
      },
    ]);

    JobProgressStore.finishJob(jobId);
  });
});
