import { DockerInventory } from "@ava-cli/SupabaseCli/SupabasePrune/DockerInventory/DockerInventory";
import { describe, expect, it } from "vitest";

describe("DockerInventory.makeProjectsFromListings", () => {
  it("groups containers, volumes, and networks by their project label", () => {
    expect(
      DockerInventory.makeProjectsFromListings({
        containerListing: [
          "feat-old\t/wt/feat/old\texited\tpublic.ecr.aws/supabase/postgres:17",
          "feat-old\t/wt/feat/old\trunning\tpublic.ecr.aws/supabase/kong:2",
          "avandar\t/src/avandar\trunning\tpublic.ecr.aws/supabase/kong:2",
        ].join("\n"),
        volumeListing: "feat-old\nfeat-old\nfix-gone\n",
        networkListing: "feat-old\n",
      }),
    ).toEqual([
      {
        projectId: "avandar",
        workdirs: ["/src/avandar"],
        containerCount: 1,
        volumeCount: 0,
        networkCount: 0,
        isRunning: true,
        images: ["public.ecr.aws/supabase/kong:2"],
      },
      {
        projectId: "feat-old",
        workdirs: ["/wt/feat/old"],
        containerCount: 2,
        volumeCount: 2,
        networkCount: 1,
        isRunning: true,
        images: [
          "public.ecr.aws/supabase/postgres:17",
          "public.ecr.aws/supabase/kong:2",
        ],
      },
      {
        projectId: "fix-gone",
        workdirs: [],
        containerCount: 0,
        volumeCount: 1,
        networkCount: 0,
        isRunning: false,
        images: [],
      },
    ]);
  });
});

describe("DockerInventory.getRuntimeFromContext", () => {
  it("names Colima and says how to start it", () => {
    expect(DockerInventory.getRuntimeFromContext("colima")).toEqual({
      label: "Colima",
      startHint: "Start it with `colima start`, then retry.",
    });
  });

  it("names Docker Desktop for its default context", () => {
    expect(DockerInventory.getRuntimeFromContext("desktop-linux").label).toBe(
      "Docker Desktop",
    );
  });

  it("falls back to the context name for anything else", () => {
    expect(DockerInventory.getRuntimeFromContext("remote-box").label).toBe(
      "Docker (context remote-box)",
    );
  });
});
