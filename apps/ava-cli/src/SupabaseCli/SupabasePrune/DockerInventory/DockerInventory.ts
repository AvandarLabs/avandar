import { RunLocalCommand } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/RunLocalCommand/RunLocalCommand";
import type { DockerSupabaseProject } from "@ava-cli/SupabaseCli/SupabasePrune/SupabasePrunePlan/SupabasePrunePlan";

/** The container runtime behind the `docker` CLI, as a person would name it. */
export type DockerRuntime = {
  label: string;
  /** How to bring the runtime up when Docker is unreachable. */
  startHint: string;
};

const PROJECT_LABEL = "com.supabase.cli.project";
const WORKDIR_LABEL = "com.supabase.cli.workdir";

function _getLines(listing: string): string[] {
  return listing.split("\n").filter((line) => {
    return line.trim() !== "";
  });
}

function _makeEmptyProject(projectId: string): DockerSupabaseProject {
  return {
    projectId,
    workdirs: [],
    containerCount: 0,
    volumeCount: 0,
    networkCount: 0,
    isRunning: false,
    images: [],
  };
}

function _addUnique(values: readonly string[], value: string): string[] {
  return value === "" || values.includes(value)
    ? [...values]
    : [...values, value];
}

function _makeProjectsFromListings(
  options: Readonly<{
    containerListing: string;
    volumeListing: string;
    networkListing: string;
  }>,
): DockerSupabaseProject[] {
  const projects = new Map<string, DockerSupabaseProject>();
  const update = (
    projectId: string,
    change: (project: DockerSupabaseProject) => DockerSupabaseProject,
  ) => {
    projects.set(
      projectId,
      change(projects.get(projectId) ?? _makeEmptyProject(projectId)),
    );
  };
  _getLines(options.containerListing).forEach((line) => {
    const [projectId = "", workdir = "", state = "", image = ""] =
      line.split("\t");
    update(projectId, (project) => {
      return {
        ...project,
        workdirs: _addUnique(project.workdirs, workdir),
        containerCount: project.containerCount + 1,
        isRunning: project.isRunning || state === "running",
        images: _addUnique(project.images, image),
      };
    });
  });
  _getLines(options.volumeListing).forEach((projectId) => {
    update(projectId, (project) => {
      return { ...project, volumeCount: project.volumeCount + 1 };
    });
  });
  _getLines(options.networkListing).forEach((projectId) => {
    update(projectId, (project) => {
      return { ...project, networkCount: project.networkCount + 1 };
    });
  });
  return [...projects.values()].sort((left, right) => {
    return left.projectId.localeCompare(right.projectId);
  });
}

function _getRuntimeFromContext(contextName: string): DockerRuntime {
  if (contextName === "colima" || contextName.startsWith("colima-")) {
    return {
      label: "Colima",
      startHint: "Start it with `colima start`, then retry.",
    };
  }
  if (contextName === "desktop-linux") {
    return {
      label: "Docker Desktop",
      startHint: "Open Docker Desktop and wait for it to finish starting.",
    };
  }
  if (contextName === "orbstack") {
    return { label: "OrbStack", startHint: "Open OrbStack, then retry." };
  }
  return {
    label: `Docker (context ${contextName})`,
    startHint: "Start your Docker runtime, then retry.",
  };
}

async function _runDocker(
  options: Readonly<{ projectRoot: string; args: readonly string[] }>,
): Promise<string> {
  const result = await RunLocalCommand.run({
    command: "docker",
    args: options.args,
    cwd: options.projectRoot,
  });
  if (!result.ok) {
    throw new Error(
      `docker ${options.args.slice(0, 2).join(" ")} failed: ${result.stderr || "unknown error"}`,
    );
  }
  return result.stdout;
}

/**
 * Reads which local Supabase projects Docker holds and which runtime serves
 * the `docker` CLI.
 *
 * `ava supabase prune` uses it to list projects by their Supabase labels and
 * to name Colima, Docker Desktop, or OrbStack when Docker is unreachable.
 * Colima needs no special handling beyond that: it serves the same `docker`
 * CLI through its own context.
 */
export const DockerInventory = {
  /** Groups `docker ... ls` label listings into one entry per project. */
  makeProjectsFromListings: _makeProjectsFromListings,

  /** Names the runtime behind a Docker context. */
  getRuntimeFromContext: _getRuntimeFromContext,

  /** Reads the current Docker context's runtime and whether it answers. */
  readRuntime: async (
    projectRoot: string,
  ): Promise<{ runtime: DockerRuntime; isReachable: boolean }> => {
    const contextName = await _runDocker({
      projectRoot,
      args: ["context", "show"],
    }).catch(() => {
      return "default";
    });
    const isReachable = await _runDocker({
      projectRoot,
      args: ["info", "--format", "{{.ServerVersion}}"],
    }).then(
      () => {
        return true;
      },
      () => {
        return false;
      },
    );
    return { runtime: _getRuntimeFromContext(contextName.trim()), isReachable };
  },

  /** Lists every local Supabase project Docker holds resources for. */
  readProjects: async (
    projectRoot: string,
  ): Promise<DockerSupabaseProject[]> => {
    const projectFormat = `{{.Label "${PROJECT_LABEL}"}}`;
    const [containerListing, volumeListing, networkListing] = await Promise.all(
      [
        _runDocker({
          projectRoot,
          args: [
            "ps",
            "-a",
            "--filter",
            `label=${PROJECT_LABEL}`,
            "--format",
            `${projectFormat}\t{{.Label "${WORKDIR_LABEL}"}}\t{{.State}}\t{{.Image}}`,
          ],
        }),
        _runDocker({
          projectRoot,
          args: [
            "volume",
            "ls",
            "--filter",
            `label=${PROJECT_LABEL}`,
            "--format",
            projectFormat,
          ],
        }),
        _runDocker({
          projectRoot,
          args: [
            "network",
            "ls",
            "--filter",
            `label=${PROJECT_LABEL}`,
            "--format",
            projectFormat,
          ],
        }),
      ],
    );
    return _makeProjectsFromListings({
      containerListing,
      volumeListing,
      networkListing,
    });
  },

  /** Images any container on this machine still uses, pruned or not. */
  readImagesInUse: async (projectRoot: string): Promise<string[]> => {
    return _getLines(
      await _runDocker({
        projectRoot,
        args: ["ps", "-a", "--format", "{{.Image}}"],
      }),
    );
  },

  /**
   * Removes one image without forcing it, so Docker refuses an image some
   * container still needs.
   */
  removeImage: async (
    options: Readonly<{ projectRoot: string; image: string }>,
  ): Promise<{ ok: boolean; stderr: string }> => {
    const result = await RunLocalCommand.run({
      command: "docker",
      args: ["image", "rm", options.image],
      cwd: options.projectRoot,
    });
    return { ok: result.ok, stderr: result.stderr };
  },
};
