import { DockerPublishedPorts } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/DockerPublishedPorts/DockerPublishedPorts";
import { describe, expect, it } from "vitest";

describe("DockerPublishedPorts.fromPsOutput", () => {
  it("reads host ports Docker has already published, including 55322", () => {
    expect(
      DockerPublishedPorts.fromPsOutput(
        [
          "0.0.0.0:54321->8000/tcp, [::]:54321->8000/tcp",
          "0.0.0.0:55322->5432/tcp, [::]:55322->5432/tcp",
          "127.0.0.1:54323->3000/tcp",
        ].join("\n"),
      ),
    ).toEqual([54321, 54323, 55322]);
  });
});
